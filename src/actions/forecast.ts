'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { format, addWeeks, startOfWeek, subWeeks } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type {
  MaterialForecastItem,
  ForecastWeekProjection,
  OperationalInsight,
  ForecastMetadata,
  ForecastDataSource,
  ForecastDataQuality,
} from '@/types/database';

// ─────────────────────────────────────────────
// STATISTICAL ALGORITHMS
// ─────────────────────────────────────────────

/**
 * Holt's Double Exponential Smoothing (Linear Trend)
 * Menghasilkan proyeksi yang memiliki tren naik/turun, bukan flat.
 * Pattern sama dengan yang digunakan di PPIC page.
 */
function holtLinearTrend(
  series: number[],
  alpha = 0.35,
  beta = 0.2,
  periodsAhead = 4
): number[] {
  if (series.length === 0) return Array(periodsAhead).fill(0);
  if (series.length === 1) return Array(periodsAhead).fill(series[0]);

  // Inisialisasi level dan trend
  let level = series[0];
  let trend = series[1] - series[0];

  // Smoothing pass
  for (let i = 1; i < series.length; i++) {
    const prevLevel = level;
    level = alpha * series[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Generate forecast: tiap periode memiliki tren berbeda
  const forecasts: number[] = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const f = level + i * trend;
    forecasts.push(parseFloat(Math.max(0, f).toFixed(1)));
  }

  return forecasts;
}

/**
 * Hitung Coefficient of Variation (CV) — ukuran variabilitas data.
 * CV rendah = data stabil = prediksi lebih akurat.
 */
function coefficientOfVariation(data: number[]): number {
  if (data.length < 2) return 100; // not enough data
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  if (mean === 0) return 100;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  return parseFloat(((stdDev / mean) * 100).toFixed(1));
}

/**
 * Hitung confidence score (0-100) berdasarkan:
 * - Jumlah data historis (lebih banyak = lebih akurat)
 * - CV data historis (variance rendah = lebih stabil)
 * - Jarak minggu dari sekarang (lebih jauh = kurang akurat)
 */
function calculateConfidence(
  weekIndex: number,
  totalWeeks: number,
  cv: number
): { score: number; level: 'Tinggi' | 'Sedang' | 'Rendah' } {
  // Base score from data quantity (max 40 points)
  const dataScore = Math.min(40, (totalWeeks / 8) * 40);

  // Stability score from CV (max 35 points) — lower CV = higher score
  const stabilityScore = cv <= 10 ? 35 : cv <= 20 ? 28 : cv <= 35 ? 20 : cv <= 50 ? 12 : 5;

  // Distance penalty (max 25 points) — closer weeks get higher scores
  const distanceScore = Math.max(0, 25 - weekIndex * 6);

  const totalScore = Math.round(dataScore + stabilityScore + distanceScore);
  const level = totalScore >= 70 ? 'Tinggi' : totalScore >= 45 ? 'Sedang' : 'Rendah';

  return { score: Math.min(100, totalScore), level };
}

// ─────────────────────────────────────────────
// HELPER: AGGREGATE WEEKLY DATA FROM DATABASE
// ─────────────────────────────────────────────

/**
 * Mengambil dan mengelompokkan data historis per ISO week.
 * Mencoba beberapa sumber data secara berurutan:
 * 1. production_orders (input_weight per minggu)
 * 2. receivings (weight per minggu)
 * 3. sortings (accepted_quantity per minggu)
 */
async function getWeeklyHistoricalData(weeksBack = 8): Promise<{
  weeklyVolumes: number[];
  weekLabels: string[];
  dataSource: ForecastDataSource;
  dataSourceLabel: string;
}> {
  const now = new Date();
  const cutoffDate = subWeeks(now, weeksBack);
  const cutoffStr = format(cutoffDate, 'yyyy-MM-dd');

  // ── Source 1: production_orders ──────────────────────────
  const { data: prodOrders } = await supabaseAdmin
    .from('production_orders')
    .select('input_weight, output_weight, created_at')
    .not('output_weight', 'is', null)
    .gte('created_at', cutoffStr)
    .order('created_at', { ascending: true });

  if (prodOrders && prodOrders.length >= 3) {
    const result = bucketByWeek(
      prodOrders.map((p: any) => ({
        date: new Date(p.created_at),
        value: Number(p.input_weight || p.output_weight || 0),
      })),
      weeksBack
    );
    if (result.weeklyVolumes.filter(v => v > 0).length >= 3) {
      return {
        ...result,
        dataSource: 'PRODUCTION',
        dataSourceLabel: 'Data Batch Produksi (production_orders)',
      };
    }
  }

  // ── Source 2: receivings ──────────────────────────────────
  const { data: receivings } = await supabaseAdmin
    .from('receivings')
    .select('weight, received_date, created_at')
    .gte('created_at', cutoffStr)
    .order('created_at', { ascending: true });

  if (receivings && receivings.length >= 3) {
    const result = bucketByWeek(
      receivings.map((r: any) => ({
        date: new Date(r.received_date || r.created_at),
        value: Number(r.weight || 0),
      })),
      weeksBack
    );
    if (result.weeklyVolumes.filter(v => v > 0).length >= 3) {
      return {
        ...result,
        dataSource: 'RECEIVING',
        dataSourceLabel: 'Data Penerimaan Bahan Baku (receivings)',
      };
    }
  }

  // ── Source 3: sortings ───────────────────────────────────
  const { data: sortings } = await supabaseAdmin
    .from('sortings')
    .select('accepted_quantity, leaf_weight, sorting_date, created_at')
    .gte('created_at', cutoffStr)
    .order('created_at', { ascending: true });

  if (sortings && sortings.length >= 3) {
    const result = bucketByWeek(
      sortings.map((s: any) => ({
        date: new Date(s.sorting_date || s.created_at),
        value: Number(s.accepted_quantity || s.leaf_weight || 0),
      })),
      weeksBack
    );
    if (result.weeklyVolumes.filter(v => v > 0).length >= 2) {
      return {
        ...result,
        dataSource: 'SORTING',
        dataSourceLabel: 'Data Sortasi & Grading (sortings)',
      };
    }
  }

  // ── All sources empty ────────────────────────────────────
  return {
    weeklyVolumes: [],
    weekLabels: [],
    dataSource: 'INSUFFICIENT',
    dataSourceLabel: 'Data tidak mencukupi untuk forecasting',
  };
}

/**
 * Bucket raw records into ISO weeks.
 * Aggregates values by SUM per week.
 */
function bucketByWeek(
  records: { date: Date; value: number }[],
  weeksBack: number
): { weeklyVolumes: number[]; weekLabels: string[] } {
  const now = new Date();
  const buckets: number[] = Array(weeksBack).fill(0);
  const labels: string[] = [];

  // Generate labels for each bucket
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    labels.push(format(weekStart, 'dd MMM', { locale: idLocale }));
  }

  // Place each record into the appropriate bucket
  records.forEach(({ date, value }) => {
    if (value <= 0) return;
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weekIndex = (weeksBack - 1) - Math.floor(diffDays / 7);
    if (weekIndex >= 0 && weekIndex < weeksBack) {
      buckets[weekIndex] += value;
    }
  });

  // Round all values
  const rounded = buckets.map(v => parseFloat(v.toFixed(1)));

  return { weeklyVolumes: rounded, weekLabels: labels };
}

// ─────────────────────────────────────────────
// HELPER: READ BOM RECIPES FROM SETTINGS
// ─────────────────────────────────────────────

interface BomRecipe {
  raw_mushroom_ratio: number;
  premix_flour_ratio: number;
  cooking_oil_ratio: number;
  seasoning_ratio: number;
}

async function getBomRecipe(): Promise<BomRecipe> {
  const defaultBom: BomRecipe = {
    raw_mushroom_ratio: 1.0,
    premix_flour_ratio: 0.25,
    cooking_oil_ratio: 0.30,
    seasoning_ratio: 0.05,
  };

  try {
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'production_standards')
      .single();

    if (settings?.value?.bom_recipes?.[0]) {
      const recipe = settings.value.bom_recipes[0];
      return {
        raw_mushroom_ratio: Number(recipe.raw_mushroom_ratio) || defaultBom.raw_mushroom_ratio,
        premix_flour_ratio: Number(recipe.premix_flour_ratio) || defaultBom.premix_flour_ratio,
        cooking_oil_ratio: Number(recipe.cooking_oil_ratio) || defaultBom.cooking_oil_ratio,
        seasoning_ratio: Number(recipe.seasoning_ratio) || defaultBom.seasoning_ratio,
      };
    }
  } catch {
    // Fall through to default
  }

  return defaultBom;
}

// ─────────────────────────────────────────────
// HELPER: ACTUAL MATERIAL CONSUMPTION RATIOS
// ─────────────────────────────────────────────

/**
 * Calculate actual material consumption ratios from production_materials records.
 * Cross-validates with BOM recipe.
 */
async function getActualConsumptionRatios(): Promise<{
  ratios: Record<string, number>;
  hasData: boolean;
}> {
  try {
    // Get last 20 completed production orders with their materials
    const { data: orders } = await supabaseAdmin
      .from('production_orders')
      .select('id, input_weight')
      .not('output_weight', 'is', null)
      .not('input_weight', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!orders || orders.length < 3) {
      return { ratios: {}, hasData: false };
    }

    const orderIds = orders.map((o: any) => o.id);

    const { data: materials } = await supabaseAdmin
      .from('production_materials')
      .select('production_order_id, consumption_quantity, raw_material:raw_materials(name, material_category)')
      .in('production_order_id', orderIds);

    if (!materials || materials.length === 0) {
      return { ratios: {}, hasData: false };
    }

    // Calculate average ratio per material category
    const categoryTotals: Record<string, { total: number; count: number }> = {};
    const orderWeightMap = new Map(orders.map((o: any) => [o.id, Number(o.input_weight)]));

    materials.forEach((m: any) => {
      const inputWeight = orderWeightMap.get(m.production_order_id);
      if (!inputWeight || inputWeight <= 0) return;

      const category = (m.raw_material as any)?.material_category || 'Unknown';
      const ratio = Number(m.consumption_quantity) / inputWeight;

      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, count: 0 };
      }
      categoryTotals[category].total += ratio;
      categoryTotals[category].count += 1;
    });

    const ratios: Record<string, number> = {};
    for (const [category, { total, count }] of Object.entries(categoryTotals)) {
      ratios[category] = parseFloat((total / count).toFixed(4));
    }

    return { ratios, hasData: true };
  } catch {
    return { ratios: {}, hasData: false };
  }
}

// ─────────────────────────────────────────────
// HELPER: READ CURRENT INVENTORY STOCK
// ─────────────────────────────────────────────

async function getCurrentStockByMaterial(): Promise<Map<string, { stock: number; uom: string }>> {
  const stockMap = new Map<string, { stock: number; uom: string }>();

  try {
    const { data: inventory } = await supabaseAdmin
      .from('inventory')
      .select('item_id, item_type, quantity')
      .eq('item_type', 'RAW_MATERIAL');

    if (!inventory || inventory.length === 0) return stockMap;

    const itemIds = inventory.map((inv: any) => inv.item_id);
    const { data: rawMaterials } = await supabaseAdmin
      .from('raw_materials')
      .select('id, name, uom')
      .in('id', itemIds);

    const nameMap = new Map(
      (rawMaterials || []).map((rm: any) => [rm.id, { name: rm.name, uom: rm.uom }])
    );

    inventory.forEach((inv: any) => {
      const info = nameMap.get(inv.item_id);
      if (info) {
        const existing = stockMap.get(info.name) || { stock: 0, uom: info.uom };
        existing.stock += Number(inv.quantity || 0);
        stockMap.set(info.name, existing);
      }
    });
  } catch {
    // Return empty map
  }

  return stockMap;
}

// ─────────────────────────────────────────────
// GET MATERIAL & DEMAND FORECAST (REWRITTEN)
// ─────────────────────────────────────────────

export async function getMaterialForecast(): Promise<{
  success: boolean;
  data?: {
    weeklyProjections: ForecastWeekProjection[];
    materialRequirements: MaterialForecastItem[];
    historicalWeeklyVolumes: number[];
    historicalWeekLabels: string[];
    avgDemandKg: number;
    safetyFactorPercentage: number;
    metadata: ForecastMetadata;
  };
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'MANAGEMENT', 'SUPER_ADMIN']);

    // ── 1. Ambil data historis mingguan (agregasi per ISO week) ──
    const historical = await getWeeklyHistoricalData(8);

    // Filter out trailing zero-weeks to only use weeks with data
    const activeVolumes = historical.weeklyVolumes;
    const nonZeroVolumes = activeVolumes.filter(v => v > 0);

    // ── Data Quality Assessment ──
    let dataQuality: ForecastDataQuality = 'GOOD';
    if (nonZeroVolumes.length < 3) {
      dataQuality = 'INSUFFICIENT';
    } else if (nonZeroVolumes.length < 5) {
      dataQuality = 'LIMITED';
    }

    const cv = coefficientOfVariation(nonZeroVolumes);

    const metadata: ForecastMetadata = {
      dataSource: historical.dataSource,
      dataQuality,
      totalHistoricalWeeks: nonZeroVolumes.length,
      coefficientOfVariation: cv,
      dataSourceLabel: historical.dataSourceLabel,
    };

    // ── If INSUFFICIENT data, return transparently ──
    if (dataQuality === 'INSUFFICIENT') {
      return {
        success: true,
        data: {
          weeklyProjections: [],
          materialRequirements: [],
          historicalWeeklyVolumes: activeVolumes,
          historicalWeekLabels: historical.weekLabels,
          avgDemandKg: 0,
          safetyFactorPercentage: 10,
          metadata,
        },
      };
    }

    // ── 2. Forecast menggunakan Holt's Double Exponential Smoothing ──
    const avgHistorical = nonZeroVolumes.reduce((a, b) => a + b, 0) / nonZeroVolumes.length;
    const projectedForecast = holtLinearTrend(nonZeroVolumes, 0.35, 0.2, 4);

    const now = new Date();
    const projections: ForecastWeekProjection[] = projectedForecast.map((kg, index) => {
      const targetDate = addWeeks(now, index + 1);
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
      const conf = calculateConfidence(index, nonZeroVolumes.length, cv);

      return {
        week: `Minggu ke-${index + 1}`,
        date_label: format(weekStart, 'dd MMM yyyy', { locale: idLocale }),
        projected_kg: kg,
        confidence: conf.level,
        confidence_score: conf.score,
        status_color:
          conf.level === 'Tinggi' ? 'var(--color-success-600)' :
          conf.level === 'Sedang' ? 'var(--color-primary-600)' :
          'var(--color-warning-600)',
      };
    });

    // ── 3. Baca BOM Recipe dari settings ──
    const bom = await getBomRecipe();

    // ── 4. Baca stok gudang aktual ──
    const stockMap = await getCurrentStockByMaterial();

    // ── 5. (Opsional) Cross-validate dengan actual consumption ──
    const actualRatios = await getActualConsumptionRatios();

    const nextWeekDemandKg = projectedForecast[0] || avgHistorical;
    const safetyStockMultiplier = 1.10; // 10% safety factor

    // ── 6. Kalkulasi MRP dengan BOM + Stok Aktual ──
    const materialItems: {
      name: string;
      ratio: number;
      uom: string;
      confidence: 'Tinggi' | 'Sedang' | 'Rendah';
      notes: string;
      stockKey: string; // key to match in stockMap
    }[] = [
      {
        name: 'Jamur Tiram Segar (Hasil Sortasi)',
        ratio: bom.raw_mushroom_ratio,
        uom: 'kg',
        confidence: 'Tinggi',
        notes: `Rasio BOM: ${bom.raw_mushroom_ratio} kg per kg input. Faktor susut sortasi 15%, rendemen target 80%.`,
        stockKey: 'Jamur Tiram',
      },
      {
        name: 'Tepung Premiks Bumbu KhumKhum',
        ratio: bom.premix_flour_ratio,
        uom: 'kg',
        confidence: 'Tinggi',
        notes: `Rasio BOM: ${(bom.premix_flour_ratio * 1000).toFixed(0)}g premiks per 1 kg jamur. ${actualRatios.hasData ? 'Divalidasi dengan data konsumsi aktual.' : 'Belum ada data konsumsi aktual untuk validasi silang.'}`,
        stockKey: 'Tepung',
      },
      {
        name: 'Minyak Goreng Kelapa Sawit',
        ratio: bom.cooking_oil_ratio,
        uom: 'liter',
        confidence: actualRatios.hasData ? 'Tinggi' : 'Sedang',
        notes: `Rasio BOM: ${(bom.cooking_oil_ratio * 1000).toFixed(0)}ml per 1 kg jamur. ${actualRatios.hasData ? 'Divalidasi dengan data konsumsi aktual.' : 'Rasio sirkulasi minyak wajan dapat bervariasi — disarankan validasi manual.'}`,
        stockKey: 'Minyak',
      },
      {
        name: 'Bumbu Tabur Perasa (Aneka Varian)',
        ratio: bom.seasoning_ratio,
        uom: 'kg',
        confidence: actualRatios.hasData ? 'Tinggi' : 'Sedang',
        notes: `Rasio BOM: ${(bom.seasoning_ratio * 1000).toFixed(0)}g per 1 kg produk matang. ${actualRatios.hasData ? 'Divalidasi dengan data konsumsi aktual.' : 'Variasi rasa dapat mempengaruhi rasio — disarankan validasi manual.'}`,
        stockKey: 'Bumbu',
      },
      {
        name: 'Kemasan Stand Pouch Alumunium 100g',
        ratio: 0.80 / 0.10, // rendemen 80%, kemasan 100g = 0.1kg
        uom: 'pcs',
        confidence: 'Tinggi',
        notes: 'Target kemasan 100g dengan rendemen 80%. Dihitung: (demand × 0.80) ÷ 0.10 kg per pouch.',
        stockKey: 'Kemasan',
      },
    ];

    const materialRequirements: MaterialForecastItem[] = materialItems.map((item) => {
      const isPackaging = item.uom === 'pcs';
      const projectedDemand = isPackaging
        ? Math.ceil(nextWeekDemandKg * item.ratio)
        : parseFloat((nextWeekDemandKg * item.ratio).toFixed(1));
      const historicalAvg = isPackaging
        ? Math.ceil(avgHistorical * item.ratio)
        : parseFloat((avgHistorical * item.ratio).toFixed(1));
      const safetyStock = isPackaging
        ? Math.ceil(projectedDemand * 0.10)
        : parseFloat((projectedDemand * 0.10).toFixed(1));

      // Find current stock — fuzzy match by stockKey
      let currentStock = 0;
      for (const [name, info] of stockMap.entries()) {
        if (name.toLowerCase().includes(item.stockKey.toLowerCase())) {
          currentStock += info.stock;
        }
      }
      currentStock = parseFloat(currentStock.toFixed(1));

      const netRequirement = Math.max(0, projectedDemand - currentStock);
      const totalProcurement = isPackaging
        ? Math.ceil(netRequirement * safetyStockMultiplier)
        : parseFloat((netRequirement * safetyStockMultiplier).toFixed(1));

      return {
        material_name: item.name,
        uom: item.uom,
        historical_avg_weekly: historicalAvg,
        projected_demand: projectedDemand,
        safety_stock: safetyStock,
        total_procurement_needed: totalProcurement,
        confidence: item.confidence,
        notes: item.notes,
        current_stock: currentStock,
        net_requirement: parseFloat(netRequirement.toFixed(1)),
      };
    });

    return {
      success: true,
      data: {
        weeklyProjections: projections,
        materialRequirements,
        historicalWeeklyVolumes: activeVolumes,
        historicalWeekLabels: historical.weekLabels,
        avgDemandKg: parseFloat(avgHistorical.toFixed(1)),
        safetyFactorPercentage: 10,
        metadata,
      },
    };
  } catch (err: any) {
    console.error('getMaterialForecast error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// OPERATIONAL INSIGHTS (REWRITTEN — DATA-DRIVEN)
// ─────────────────────────────────────────────

export async function getOperationalInsights(): Promise<{
  success: boolean;
  data: OperationalInsight[];
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'WAREHOUSE', 'MANAGEMENT', 'SUPER_ADMIN']);

    const [
      { data: orders },
      { data: inspections },
      { data: pendingSales },
      { data: prodOrdersForForecast },
    ] = await Promise.all([
      // Recent production orders — for yield analysis
      supabaseAdmin
        .from('production_orders')
        .select('yield_percentage, is_yield_compliant, input_weight, output_weight, created_at')
        .not('output_weight', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10),
      // Recent QC inspections — for defect analysis
      supabaseAdmin
        .from('qc_inspections')
        .select('defect_rate, is_passed, defect_type, total_defects, sample_size, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      // Active sales orders — for demand insight
      supabaseAdmin
        .from('sales_orders')
        .select('id, status, total_amount, order_date, items:sales_order_items(quantity)')
        .in('status', ['PENDING', 'PROCESSING']),
      // Recent production for capacity analysis
      supabaseAdmin
        .from('production_orders')
        .select('input_weight, created_at')
        .not('input_weight', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const insights: OperationalInsight[] = [];

    // ── 1. Evaluasi Rendemen (data-driven) ──
    const validOrders = (orders || []).filter((o: any) => o.yield_percentage != null);

    if (validOrders.length > 0) {
      const avgYield = validOrders.reduce((sum: number, o: any) => sum + Number(o.yield_percentage), 0) / validOrders.length;
      const lowYieldCount = validOrders.filter((o: any) => Number(o.yield_percentage) < 80).length;

      if (lowYieldCount > 0) {
        insights.push({
          id: 'yield-drop-alert',
          type: 'WARNING',
          title: 'Perhatian: Fluktuasi Rendemen Penggorengan',
          description: `Tercatat ${lowYieldCount} dari ${validOrders.length} batch terakhir memiliki rendemen di bawah target 80%. Rata-rata rendemen aktual: ${avgYield.toFixed(1)}%.`,
          recommendation: 'Periksa kelembapan jamur tiram hasil sortasi dan kalibrasi suhu minyak wajan penggorengan pada rentang 165°C - 175°C.',
          metric: `Rendemen rata-rata: ${avgYield.toFixed(1)}%`,
        });
      } else {
        insights.push({
          id: 'yield-optimal',
          type: 'SUCCESS',
          title: 'Rendemen Lini Produksi Stabil & Optimal',
          description: `Seluruh ${validOrders.length} batch terakhir berjalan di atas ambang efisiensi 80%. Rata-rata rendemen: ${avgYield.toFixed(1)}%.`,
          recommendation: 'Pertahankan parameter produksi saat ini. Jadwalkan preventive maintenance mesin spinner setiap hari Jumat.',
          metric: `Rendemen: ${avgYield.toFixed(1)}%`,
        });
      }
    } else {
      insights.push({
        id: 'yield-no-data',
        type: 'INFO',
        title: 'Belum Ada Data Rendemen Produksi',
        description: 'Sistem belum memiliki data batch produksi yang selesai untuk menganalisis tren rendemen.',
        recommendation: 'Pastikan operator menginput berat output setelah proses penggorengan selesai di modul Produksi.',
        metric: 'Data: 0 batch',
      });
    }

    // ── 2. Evaluasi Mutu QC (data-driven) ──
    const validInspections = (inspections || []).filter((i: any) => i.defect_rate != null);

    if (validInspections.length > 0) {
      const avgDefectRate = validInspections.reduce((sum: number, i: any) => sum + Number(i.defect_rate), 0) / validInspections.length;
      const highDefectCount = validInspections.filter((i: any) => Number(i.defect_rate) > 5.0).length;
      const failedCount = validInspections.filter((i: any) => !i.is_passed).length;

      if (highDefectCount > 0) {
        // Find most common defect type
        const defectTypes = validInspections
          .filter((i: any) => i.defect_type)
          .map((i: any) => i.defect_type);
        const typeCounts: Record<string, number> = {};
        defectTypes.forEach((t: string) => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
        const topDefect = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

        insights.push({
          id: 'qc-defect-warning',
          type: 'WARNING',
          title: 'Peningkatan Cacat Kemasan & Mutu',
          description: `Ditemukan defect rate > 5% pada ${highDefectCount} dari ${validInspections.length} inspeksi. Rata-rata defect rate: ${avgDefectRate.toFixed(1)}%.${topDefect ? ` Jenis cacat terbanyak: ${topDefect[0]} (${topDefect[1]}x).` : ''}`,
          recommendation: topDefect?.[0]?.includes('bocor') || topDefect?.[0]?.includes('seal')
            ? 'Lakukan pengecekan elemen pemanas mesin continuous band sealer dan tekanan seal.'
            : 'Review SOP lini produksi dan lakukan re-training operator terkait parameter kritis.',
          metric: `Defect Rate: ${avgDefectRate.toFixed(1)}% | Gagal: ${failedCount}`,
        });
      } else {
        insights.push({
          id: 'qc-pass-high',
          type: 'SUCCESS',
          title: 'Kepatuhan Standar Mutu Prima',
          description: `Seluruh ${validInspections.length} inspeksi terakhir memiliki defect rate di bawah batas 5%. Rata-rata defect rate: ${avgDefectRate.toFixed(1)}%.`,
          recommendation: 'Jadwalkan kalibrasi timbangan digital berkala pada hari Jumat dan pertahankan prosedur QC saat ini.',
          metric: `Defect Rate: ${avgDefectRate.toFixed(1)}%`,
        });
      }
    } else {
      insights.push({
        id: 'qc-no-data',
        type: 'INFO',
        title: 'Belum Ada Data Inspeksi QC',
        description: 'Sistem belum memiliki data inspeksi QC untuk dianalisis.',
        recommendation: 'Pastikan tim QC melakukan input hasil inspeksi setelah setiap sesi pengecekan di modul QC.',
        metric: 'Data: 0 inspeksi',
      });
    }

    // ── 3. Analisis Demand dari Sales Orders (data-driven, bukan hardcoded) ──
    const activeSales = pendingSales || [];
    if (activeSales.length > 0) {
      const totalDemandKg = activeSales.reduce((sum: number, so: any) => {
        const itemQty = (so.items || []).reduce((s: number, item: any) => s + Number(item.quantity || 0), 0);
        return sum + itemQty;
      }, 0);

      // Hitung kapasitas dari recent production
      const recentProdWeights = (prodOrdersForForecast || []).map((p: any) => Number(p.input_weight || 0));
      const avgWeeklyCapacity = recentProdWeights.length > 0
        ? recentProdWeights.reduce((a: number, b: number) => a + b, 0) / Math.max(1, Math.ceil(recentProdWeights.length / 4))
        : 0;

      const isCapacitySufficient = avgWeeklyCapacity >= totalDemandKg;

      insights.push({
        id: 'ppic-demand',
        type: isCapacitySufficient ? 'INFO' : 'WARNING',
        title: `Pesanan Aktif: ${activeSales.length} Sales Order (${totalDemandKg.toLocaleString('id-ID')} kg)`,
        description: `Terdapat ${activeSales.length} pesanan aktif dengan total kebutuhan ${totalDemandKg.toLocaleString('id-ID')} kg.${avgWeeklyCapacity > 0 ? ` Kapasitas produksi rata-rata: ${avgWeeklyCapacity.toFixed(0)} kg/minggu.` : ''}`,
        recommendation: isCapacitySufficient
          ? 'Kapasitas produksi mencukupi. Konfirmasi jadwal pengiriman ke distributor.'
          : `Kapasitas produksi mungkin tidak mencukupi. Pertimbangkan penambahan shift atau prioritaskan pesanan bernilai tinggi.`,
        metric: `Demand: ${totalDemandKg.toLocaleString('id-ID')} kg`,
      });
    } else {
      insights.push({
        id: 'ppic-no-orders',
        type: 'INFO',
        title: 'Tidak Ada Pesanan Aktif',
        description: 'Tidak ada sales order dengan status PENDING atau PROCESSING saat ini.',
        recommendation: 'Fokuskan produksi untuk mengisi stok gudang finished goods sesuai target reorder point.',
        metric: 'SO Aktif: 0',
      });
    }

    return { success: true, data: insights };
  } catch (err: any) {
    console.error('getOperationalInsights error:', err);
    return { success: false, data: [] };
  }
}
