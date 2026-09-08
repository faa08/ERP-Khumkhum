'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { getProductionStandards, getQcStandards } from '@/actions/standards';
import {
  STOCK_ACCURACY_TARGET,
  type KpiKey,
  type KpiTrendPoint,
  type KpiDelta,
} from '@/lib/kpi-config';
import {
  format,
  subDays,
  startOfMonth,
  startOfDay,
  startOfWeek,
  addDays,
  addWeeks,
  differenceInCalendarDays,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type {
  DbKpiMetrics,
  TraceabilityResult,
  TraceabilityNode,
  FarmerRanking,
} from '@/types/database';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type KpiDateRange = 'today' | '7days' | 'month' | 'custom';

export interface KpiFilter {
  range: KpiDateRange;
  from?: string; // ISO date string, only for 'custom'
  to?: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getDateRange(filter: KpiFilter): { from: string; to: string } {
  const now = new Date();
  const toStr = now.toISOString();

  switch (filter.range) {
    case 'today':
      return { from: new Date(now.setHours(0, 0, 0, 0)).toISOString(), to: toStr };
    case '7days':
      return { from: subDays(now, 7).toISOString(), to: toStr };
    case 'month':
      return { from: startOfMonth(now).toISOString(), to: toStr };
    case 'custom':
      return {
        from: filter.from ? new Date(filter.from).toISOString() : subDays(now, 30).toISOString(),
        to: filter.to ? new Date(filter.to + 'T23:59:59').toISOString() : toStr,
      };
    default:
      return { from: subDays(now, 30).toISOString(), to: toStr };
  }
}

/**
 * Akurasi satu baris stock opname, dalam persen.
 * null bila stok sistem 0 (pembagian nol) sehingga baris itu harus diabaikan.
 * Dipakai bersama oleh getKpiMetrics dan getKpiTrend agar rumusnya tidak bercabang.
 */
function opnameRowAccuracy(o: any): number | null {
  const systemQty = Number(o.system_quantity);
  if (!(systemQty > 0)) return null;

  const diff = Math.abs(
    o.difference !== null && o.difference !== undefined
      ? Number(o.difference)
      : Number(o.physical_quantity) - systemQty
  );

  // Clamp di 0 agar selisih yang melebihi stok sistem tidak jadi persentase negatif
  return Math.max(0, 1 - diff / systemQty) * 100;
}

// ─────────────────────────────────────────────
// KPI METRICS
// ─────────────────────────────────────────────

export async function getKpiMetrics(filter: KpiFilter = { range: 'month' }): Promise<{
  success: boolean;
  data?: DbKpiMetrics;
  error?: string;
}> {
  try {
    await requireAuth(['MANAGEMENT', 'SUPER_ADMIN']);

    const { from, to } = getDateRange(filter);

    // 1. Total supply (berat timbang masuk)
    const { data: receivings } = await supabaseAdmin
      .from('receivings')
      .select('weight')
      .gte('created_at', from)
      .lte('created_at', to);

    const total_supply_kg = (receivings || []).reduce((sum: number, r: any) => sum + (r.weight || 0), 0);

    // 2. Avg yield dari production results
    const { data: prodResults } = await supabaseAdmin
      .from('production_results')
      .select('yield_percentage')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('yield_percentage', 'is', null);

    const yieldList = (prodResults || []).map((r: any) => r.yield_percentage || 0);
    const avg_yield_percentage = yieldList.length > 0
      ? yieldList.reduce((s: number, v: number) => s + v, 0) / yieldList.length
      : 0;

    // 3. Production batches count
    const { count: total_production_batches } = await supabaseAdmin
      .from('production_orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', from)
      .lte('created_at', to);

    // 4. Overall defect rate dari QC inspections
    const { data: qcData } = await supabaseAdmin
      .from('qc_inspections')
      .select('defect_rate')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('defect_rate', 'is', null);

    const defectRates = (qcData || []).map((q: any) => q.defect_rate || 0);
    const overall_defect_rate = defectRates.length > 0
      ? defectRates.reduce((s: number, v: number) => s + v, 0) / defectRates.length
      : 0;

    // 5. Akurasi stok — dihitung dari selisih stock opname pada periode terpilih.
    //    Per baris: akurasi = 1 - |selisih| / stok_sistem.
    //    Baris dengan stok sistem 0 diabaikan (pembagian nol).
    const { data: opnameRows } = await supabaseAdmin
      .from('stock_opnames')
      .select('system_quantity, physical_quantity, difference')
      .gte('created_at', from)
      .lte('created_at', to);

    const rowAccuracies = (opnameRows || [])
      .map(opnameRowAccuracy)
      .filter((v): v is number => v !== null);

    // null (bukan 0) bila belum ada opname — 0% akan terbaca sebagai gudang kacau,
    // padahal artinya "belum diukur".
    const stock_accuracy_percentage =
      rowAccuracies.length > 0
        ? parseFloat(
            (rowAccuracies.reduce((s: number, v: number) => s + v, 0) / rowAccuracies.length).toFixed(1)
          )
        : null;

    // 6. Total sales revenue
    const { data: salesData } = await supabaseAdmin
      .from('sales_orders')
      .select('total_amount')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('status', 'eq', 'CANCELLED');

    const total_sales_revenue = (salesData || []).reduce(
      (sum: number, s: any) => sum + (s.total_amount || 0),
      0
    );

    const metrics: DbKpiMetrics = {
      total_supply_kg: parseFloat(total_supply_kg.toFixed(2)),
      avg_yield_percentage: parseFloat(avg_yield_percentage.toFixed(1)),
      overall_defect_rate: parseFloat(overall_defect_rate.toFixed(2)),
      stock_accuracy_percentage,
      total_sales_revenue,
      total_production_batches: total_production_batches || 0,
      period_from: from,
      period_to: to,
    };

    return { success: true, data: metrics };
  } catch (err: any) {
    console.error('getKpiMetrics error:', err);
    // Removed fallback mock
    return {
      success: true,
      data: {
        total_supply_kg: 0,
        avg_yield_percentage: 0,
        overall_defect_rate: 0,
        stock_accuracy_percentage: null,
        total_sales_revenue: 0,
        total_production_batches: 0,
        period_from: subDays(new Date(), 30).toISOString(),
        period_to: new Date().toISOString(),
      },
    };
  }
}

// ─────────────────────────────────────────────
// KPI TREND — deret waktu + perbandingan antar periode
// ─────────────────────────────────────────────

// KpiTrendPoint & KpiDelta tinggal di lib/kpi-config.ts agar komponen client
// dapat memakainya tanpa mengimpor modul 'use server' ini.

type BucketUnit = 'day' | 'week' | 'none';
type AggMode = 'sum' | 'avg' | 'count';

interface DatedValue {
  date: string;
  value: number;
}

export interface KpiTrendData {
  series: Record<KpiKey, KpiTrendPoint[]>;
  delta: Record<KpiKey, KpiDelta>;
  /** Target aktif, dibaca dari tabel settings — bukan angka mati di komponen */
  targets: Record<KpiKey, number | null>;
  bucketUnit: BucketUnit;
  period: { from: string; to: string; previousFrom: string; previousTo: string };
}

/** Rentang "Hari Ini" terlalu pendek untuk dibaca sebagai garis — cukup delta-nya saja. */
function resolveBucketUnit(filter: KpiFilter, from: string, to: string): BucketUnit {
  if (filter.range === 'today') return 'none';
  return differenceInCalendarDays(new Date(to), new Date(from)) > 31 ? 'week' : 'day';
}

function bucketKeyOf(date: Date, unit: BucketUnit): string {
  const start = unit === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfDay(date);
  return format(start, 'yyyy-MM-dd');
}

function buildBucketKeys(from: string, to: string, unit: BucketUnit): string[] {
  if (unit === 'none') return [];

  const end = new Date(to);
  let cursor =
    unit === 'week'
      ? startOfWeek(new Date(from), { weekStartsOn: 1 })
      : startOfDay(new Date(from));

  const keys: string[] = [];
  // Batas aman agar rentang custom yang ekstrem tidak membengkakkan loop
  while (cursor <= end && keys.length < 400) {
    keys.push(format(cursor, 'yyyy-MM-dd'));
    cursor = unit === 'week' ? addWeeks(cursor, 1) : addDays(cursor, 1);
  }
  return keys;
}

function roundOrNull(v: number | null, digits = 2): number | null {
  if (v === null || !Number.isFinite(v)) return null;
  return parseFloat(v.toFixed(digits));
}

/**
 * 'sum' dan 'count' mengembalikan 0 untuk bucket kosong — hari tanpa penerimaan
 * memang benar-benar 0 kg. 'avg' mengembalikan null, karena hari tanpa produksi
 * bukan berarti rendemennya 0%, melainkan tidak punya rendemen sama sekali.
 */
function aggregate(values: number[], mode: AggMode): number | null {
  if (mode === 'count') return values.length;
  if (mode === 'sum') return values.reduce((s, v) => s + v, 0);
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function withinRange(dateStr: string, from: string, to: string): boolean {
  const t = new Date(dateStr).getTime();
  return t >= new Date(from).getTime() && t <= new Date(to).getTime();
}

function buildSeries(
  rows: DatedValue[],
  bucketKeys: string[],
  unit: BucketUnit,
  mode: AggMode
): KpiTrendPoint[] {
  if (unit === 'none') return [];

  const grouped = new Map<string, number[]>();
  for (const key of bucketKeys) grouped.set(key, []);

  for (const row of rows) {
    const arr = grouped.get(bucketKeyOf(new Date(row.date), unit));
    if (arr) arr.push(row.value);
  }

  return bucketKeys.map((key) => ({
    bucket: key,
    label: format(new Date(`${key}T00:00:00`), unit === 'week' ? "'Mgg' d MMM" : 'd MMM', {
      locale: idLocale,
    }),
    value: roundOrNull(aggregate(grouped.get(key) ?? [], mode)),
  }));
}

function computeDelta(
  rows: DatedValue[],
  current: { from: string; to: string },
  previous: { from: string; to: string },
  mode: AggMode
): KpiDelta {
  const currentAgg = aggregate(
    rows.filter((r) => withinRange(r.date, current.from, current.to)).map((r) => r.value),
    mode
  );
  const previousAgg = aggregate(
    rows.filter((r) => withinRange(r.date, previous.from, previous.to)).map((r) => r.value),
    mode
  );

  const deltaPct =
    currentAgg !== null && previousAgg !== null && previousAgg !== 0
      ? ((currentAgg - previousAgg) / Math.abs(previousAgg)) * 100
      : null;

  return {
    current: roundOrNull(currentAgg),
    previous: roundOrNull(previousAgg),
    deltaPct: roundOrNull(deltaPct, 1),
  };
}

export async function getKpiTrend(filter: KpiFilter = { range: 'month' }): Promise<{
  success: boolean;
  data?: KpiTrendData;
  error?: string;
}> {
  try {
    await requireAuth(['MANAGEMENT', 'SUPER_ADMIN']);

    const { from, to } = getDateRange(filter);

    // Periode pembanding: selebar periode berjalan, tepat sebelum `from`.
    const fromMs = new Date(from).getTime();
    const spanMs = Math.max(1, new Date(to).getTime() - fromMs);
    const previousFrom = new Date(fromMs - spanMs).toISOString();
    const previousTo = new Date(fromMs - 1).toISOString();

    const unit = resolveBucketUnit(filter, from, to);
    const bucketKeys = buildBucketKeys(from, to, unit);

    // Satu query per metrik untuk seluruh rentang (periode berjalan + pembanding),
    // lalu dikelompokkan di sini. Query per bucket akan mengulang pola N+1 yang
    // baru dibersihkan di commit c7fbf93.
    const [receivingsRes, yieldRes, batchRes, qcRes, opnameRes, salesRes, prodStdRes, qcStdRes] =
      await Promise.all([
        supabaseAdmin
          .from('receivings')
          .select('created_at, weight')
          .gte('created_at', previousFrom)
          .lte('created_at', to),
        supabaseAdmin
          .from('production_results')
          .select('created_at, yield_percentage')
          .gte('created_at', previousFrom)
          .lte('created_at', to)
          .not('yield_percentage', 'is', null),
        supabaseAdmin
          .from('production_orders')
          .select('created_at')
          .gte('created_at', previousFrom)
          .lte('created_at', to),
        supabaseAdmin
          .from('qc_inspections')
          .select('created_at, defect_rate')
          .gte('created_at', previousFrom)
          .lte('created_at', to)
          .not('defect_rate', 'is', null),
        supabaseAdmin
          .from('stock_opnames')
          .select('created_at, system_quantity, physical_quantity, difference')
          .gte('created_at', previousFrom)
          .lte('created_at', to),
        supabaseAdmin
          .from('sales_orders')
          .select('created_at, total_amount')
          .gte('created_at', previousFrom)
          .lte('created_at', to)
          .not('status', 'eq', 'CANCELLED'),
        getProductionStandards(),
        getQcStandards(),
      ]);

    const rowsByKpi: Record<KpiKey, DatedValue[]> = {
      supply: (receivingsRes.data || []).map((r: any) => ({
        date: r.created_at,
        value: Number(r.weight) || 0,
      })),
      yield: (yieldRes.data || []).map((r: any) => ({
        date: r.created_at,
        value: Number(r.yield_percentage) || 0,
      })),
      defectRate: (qcRes.data || []).map((r: any) => ({
        date: r.created_at,
        value: Number(r.defect_rate) || 0,
      })),
      stockAccuracy: (opnameRes.data || [])
        .map((r: any) => ({ date: r.created_at as string, value: opnameRowAccuracy(r) }))
        .filter((r): r is DatedValue => r.value !== null),
      revenue: (salesRes.data || []).map((r: any) => ({
        date: r.created_at,
        value: Number(r.total_amount) || 0,
      })),
      batches: (batchRes.data || []).map((r: any) => ({ date: r.created_at, value: 1 })),
    };

    const modeByKpi: Record<KpiKey, AggMode> = {
      supply: 'sum',
      yield: 'avg',
      defectRate: 'avg',
      stockAccuracy: 'avg',
      revenue: 'sum',
      batches: 'count',
    };

    const currentRange = { from, to };
    const previousRange = { from: previousFrom, to: previousTo };

    const series = {} as Record<KpiKey, KpiTrendPoint[]>;
    const delta = {} as Record<KpiKey, KpiDelta>;

    (Object.keys(modeByKpi) as KpiKey[]).forEach((key) => {
      const rows = rowsByKpi[key];
      const mode = modeByKpi[key];

      series[key] = buildSeries(
        rows.filter((r) => withinRange(r.date, from, to)),
        bucketKeys,
        unit,
        mode
      );
      delta[key] = computeDelta(rows, currentRange, previousRange, mode);
    });

    // Target rendemen & defect rate ikut konfigurasi admin (PRD bab 10.3),
    // bukan angka 80/5 yang sebelumnya ditulis langsung di JSX dashboard.
    const targets: Record<KpiKey, number | null> = {
      supply: null,
      yield: prodStdRes.data.min_yield_percentage,
      defectRate: qcStdRes.data.max_defect_rate,
      stockAccuracy: STOCK_ACCURACY_TARGET,
      revenue: null,
      batches: null,
    };

    return {
      success: true,
      data: {
        series,
        delta,
        targets,
        bucketUnit: unit,
        period: { from, to, previousFrom, previousTo },
      },
    };
  } catch (err: any) {
    console.error('getKpiTrend error:', err);
    // Sengaja melaporkan kegagalan apa adanya. getKpiMetrics masih menelan error
    // menjadi deretan angka nol — itu diperbaiki terpisah pada tugas 3.4.
    return { success: false, error: err.message || 'Gagal memuat tren KPI' };
  }
}

// ─────────────────────────────────────────────
// TWO-WAY TRACEABILITY
// ─────────────────────────────────────────────

export async function searchTraceability(keyword: string): Promise<{
  success: boolean;
  data?: TraceabilityResult;
  error?: string;
}> {
  try {
    await requireAuth(['MANAGEMENT', 'SUPER_ADMIN', 'WAREHOUSE', 'QC', 'PRODUCTION']);

    const kw = keyword.trim().toUpperCase();
    const isForward = kw.startsWith('RM-');
    const isBackward = kw.startsWith('PRD-');

    if (!isForward && !isBackward) {
      return {
        success: true,
        data: { search_type: 'FORWARD', search_keyword: keyword, chain: [], found: false },
      };
    }

    const chain: TraceabilityNode[] = [];
    let step = 1;

    if (isForward) {
      // Forward: RM → Sortasi → Produksi → QC → SO → Distributor
      const { data: receiving } = await supabaseAdmin
        .from('receivings')
        .select(`*, farmer:farmers(id, name, contact, phone_number)`)
        .ilike('batch_number', kw)
        .single();

      if (!receiving) {
        return {
          success: true,
          data: { search_type: 'FORWARD', search_keyword: keyword, chain: [], found: false },
        };
      }

      chain.push({
        step: step++,
        label: 'Petani Asal',
        id: receiving.farmer?.id || '-',
        status: 'completed',
        data: {
          'Nama Petani': receiving.farmer?.name || '-',
          'Kontak': receiving.farmer?.contact || '-',
          'No. HP': receiving.farmer?.phone_number || '-',
        },
      });

      chain.push({
        step: step++,
        label: 'Penerimaan Bahan Baku',
        id: receiving.batch_number,
        status: receiving.status || 'completed',
        data: {
          'No. Penerimaan': receiving.batch_number,
          'Berat Terima': `${receiving.weight} kg`,
          'Berat Kirim': receiving.weight_sent ? `${receiving.weight_sent} kg` : '-',
          'Selisih': receiving.diff_percentage ? `${receiving.diff_percentage}%` : '-',
          'Tanggal': format(new Date(receiving.received_date), 'dd/MM/yyyy HH:mm'),
        },
      });

      // Sortasi
      const { data: sorting } = await supabaseAdmin
        .from('sortings')
        .select('*')
        .eq('receiving_id', receiving.id)
        .single();

      if (sorting) {
        chain.push({
          step: step++,
          label: 'Sortasi & Grading',
          id: sorting.id,
          status: 'completed',
          data: {
            'Berat Daun': `${sorting.leaf_weight || sorting.accepted_quantity} kg`,
            'Berat Batang': `${sorting.stem_weight || sorting.waste} kg`,
            '% Daun': sorting.leaf_percentage ? `${sorting.leaf_percentage}%` : '-',
            'Grade': sorting.quality_grade || sorting.grade || '-',
            'Standar': sorting.is_standard_compliant ? 'Lolos' : 'Tidak Lolos',
          },
        });

        // Produksi yang menggunakan sortasi ini
        const { data: prodOrder } = await supabaseAdmin
          .from('production_orders')
          .select('*')
          .eq('status', 'COMPLETED')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (prodOrder) {
          chain.push({
            step: step++,
            label: 'Batch Produksi',
            id: prodOrder.batch_number,
            status: prodOrder.status.toLowerCase(),
            data: {
              'No. Batch': prodOrder.batch_number,
              'Varian': prodOrder.product_variant || '-',
              'Berat Input': prodOrder.input_weight ? `${prodOrder.input_weight} kg` : '-',
              'Berat Output': prodOrder.output_weight ? `${prodOrder.output_weight} kg` : '-',
              'Rendemen': prodOrder.yield_percentage ? `${prodOrder.yield_percentage}%` : '-',
            },
          });

          // QC
          const { data: qc } = await supabaseAdmin
            .from('qc_inspections')
            .select('*')
            .eq('reference_id', prodOrder.id)
            .single();

          if (qc) {
            chain.push({
              step: step++,
              label: 'Quality Control',
              id: qc.id,
              status: qc.decision?.toLowerCase() || (qc.is_passed ? 'passed' : 'failed'),
              data: {
                'Keputusan': qc.decision || (qc.is_passed ? 'RELEASED' : 'REJECTED'),
                'Defect Rate': qc.defect_rate ? `${qc.defect_rate}%` : '-',
                'Sample': qc.sample_size ? `${qc.sample_size} pcs` : '-',
                'Catatan': qc.notes || '-',
              },
            });
          }
        }
      }

    } else {
      // Backward: PRD → QC → Sortasi → RM → Petani
      const { data: prodOrder } = await supabaseAdmin
        .from('production_orders')
        .select('*')
        .ilike('batch_number', kw)
        .single();

      if (!prodOrder) {
        return {
          success: true,
          data: { search_type: 'BACKWARD', search_keyword: keyword, chain: [], found: false },
        };
      }

      // QC
      const { data: qc } = await supabaseAdmin
        .from('qc_inspections')
        .select('*')
        .eq('reference_id', prodOrder.id)
        .single();

      chain.push({
        step: step++,
        label: 'Batch Produksi',
        id: prodOrder.batch_number,
        status: prodOrder.status.toLowerCase(),
        data: {
          'No. Batch': prodOrder.batch_number,
          'Varian': prodOrder.product_variant || '-',
          'Rendemen': prodOrder.yield_percentage ? `${prodOrder.yield_percentage}%` : '-',
          'Status': prodOrder.status,
        },
      });

      if (qc) {
        chain.push({
          step: step++,
          label: 'Quality Control',
          id: qc.id,
          status: qc.decision?.toLowerCase() || (qc.is_passed ? 'passed' : 'failed'),
          data: {
            'Keputusan': qc.decision || (qc.is_passed ? 'RELEASED' : 'REJECTED'),
            'Defect Rate': qc.defect_rate ? `${qc.defect_rate}%` : '-',
          },
        });
      }

      // Sortasi
      const { data: sortings } = await supabaseAdmin
        .from('sortings')
        .select(`*, receiving:receivings(*, farmer:farmers(id, name, contact, phone_number))`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sortings && sortings.length > 0) {
        const sorting = sortings[0];
        chain.push({
          step: step++,
          label: 'Sortasi & Grading',
          id: sorting.id,
          status: 'completed',
          data: {
            '% Daun': sorting.leaf_percentage ? `${sorting.leaf_percentage}%` : '-',
            'Grade': sorting.quality_grade || '-',
            'Berat Daun': sorting.leaf_weight ? `${sorting.leaf_weight} kg` : '-',
          },
        });

        if (sorting.receiving) {
          chain.push({
            step: step++,
            label: 'Penerimaan Bahan Baku',
            id: sorting.receiving.batch_number,
            status: sorting.receiving.status || 'completed',
            data: {
              'No. Penerimaan': sorting.receiving.batch_number,
              'Berat Terima': `${sorting.receiving.weight} kg`,
              'Tanggal': format(new Date(sorting.receiving.received_date), 'dd/MM/yyyy'),
            },
          });

          if (sorting.receiving.farmer) {
            chain.push({
              step: step++,
              label: 'Petani Asal',
              id: sorting.receiving.farmer.id,
              status: 'completed',
              data: {
                'Nama Petani': sorting.receiving.farmer.name,
                'Kontak': sorting.receiving.farmer.contact || '-',
                'No. HP': sorting.receiving.farmer.phone_number || '-',
              },
            });
          }
        }
      }
    }

    return {
      success: true,
      data: {
        search_type: isForward ? 'FORWARD' : 'BACKWARD',
        search_keyword: keyword,
        chain,
        found: chain.length > 0,
      },
    };
  } catch (err: any) {
    console.error('searchTraceability error:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// FARMER RANKING
// ─────────────────────────────────────────────

export async function getFarmerRanking(): Promise<{
  success: boolean;
  data?: FarmerRanking[];
  error?: string;
}> {
  try {
    await requireAuth(['MANAGEMENT', 'SUPER_ADMIN']);

    const { data: receivings } = await supabaseAdmin
      .from('receivings')
      .select(`
        farmer_id, weight,
        sortings(leaf_percentage, quality_grade)
      `)
      .not('farmer_id', 'is', null);

    const { data: farmers } = await supabaseAdmin
      .from('farmers')
      .select('id, name');

    if (!receivings || !farmers) {
      return { success: true, data: [] };
    }

    // Aggregate per farmer
    const farmerMap = new Map<string, {
      name: string;
      total_supply: number;
      leaf_pcts: number[];
      deliveries: number;
      grade_a: number;
    }>();

    for (const r of receivings as any[]) {
      if (!r.farmer_id) continue;
      const farmer = farmers.find((f: any) => f.id === r.farmer_id);
      if (!farmer) continue;

      if (!farmerMap.has(r.farmer_id)) {
        farmerMap.set(r.farmer_id, {
          name: farmer.name,
          total_supply: 0,
          leaf_pcts: [],
          deliveries: 0,
          grade_a: 0,
        });
      }
      const entry = farmerMap.get(r.farmer_id)!;
      entry.total_supply += r.weight || 0;
      entry.deliveries += 1;

      if (r.sortings && r.sortings.length > 0) {
        const sorting = r.sortings[0];
        if (sorting.leaf_percentage) entry.leaf_pcts.push(sorting.leaf_percentage);
        if (sorting.quality_grade === 'A') entry.grade_a += 1;
      }
    }

    const ranking: FarmerRanking[] = [];
    farmerMap.forEach((val, farmerId) => {
      const avg_leaf = val.leaf_pcts.length > 0
        ? val.leaf_pcts.reduce((s, v) => s + v, 0) / val.leaf_pcts.length
        : 0;
      ranking.push({
        rank: 0,
        farmer_id: farmerId,
        farmer_name: val.name,
        total_supply_kg: parseFloat(val.total_supply.toFixed(2)),
        avg_leaf_percentage: parseFloat(avg_leaf.toFixed(1)),
        delivery_count: val.deliveries,
        grade_a_count: val.grade_a,
      });
    });

    // Sort by total_supply DESC then avg_leaf DESC
    ranking.sort((a, b) =>
      b.total_supply_kg - a.total_supply_kg || b.avg_leaf_percentage - a.avg_leaf_percentage
    );
    ranking.forEach((r, i) => (r.rank = i + 1));

    return { success: true, data: ranking };
  } catch (err: any) {
    console.error('getFarmerRanking error:', err);
    // Removed fallback mock
    return {
      success: true,
      data: [],
    };
  }
}
