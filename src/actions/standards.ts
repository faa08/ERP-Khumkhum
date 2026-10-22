'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';
import { logAuditEvent } from '@/actions/audit';
import { revalidatePath } from 'next/cache';
import type { ProductionStandardConfig, QcStandardConfig } from '@/types/database';

const DEFAULT_PRODUCTION_STANDARDS: ProductionStandardConfig = {
  min_yield_percentage: 80.0,
  warning_yield_percentage: 75.0,
  oil_temp_min: 160,
  oil_temp_max: 180,
  frying_duration_minutes: 15,
  spinning_duration_minutes: 5,
  default_batch_weight_gram: 800,
  default_rating_factor: 1.0,
  default_allowance_factor: 0.15,
  bom_recipes: [
    {
      product_name: 'Jamur Crispy Polos (Resep Dasar Penggorengan Curah)',
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
      seasoning_ratio: 0.0,
    },
  ],
  premix_recipes: [
    {
      premix_name: 'Tepung Premix KhumKhum',
      output_qty: 10,
      ingredients: [
        { name: 'Tepung Terigu', qty: 6.5 },
        { name: 'Tepung Tapioka', qty: 2.5 },
        { name: 'Bawang Putih Bubuk', qty: 0.5 },
        { name: 'Garam Halus', qty: 0.5 },
      ],
    },
  ],
  seasoning_per_variant: [
    { variant: 'Original', seasoning_ratio_per_kg: 0.0, seasoning_name: 'Tanpa Bumbu (Original)' },
    { variant: 'Balado', seasoning_ratio_per_kg: 0.08, seasoning_name: 'Bumbu Tabur Balado Pedas' },
    { variant: 'BBQ', seasoning_ratio_per_kg: 0.08, seasoning_name: 'Bumbu Tabur BBQ Smoked' },
    { variant: 'Pedas Manis', seasoning_ratio_per_kg: 0.08, seasoning_name: 'Bumbu Tabur Pedas Manis' },
    { variant: 'Super Pedas', seasoning_ratio_per_kg: 0.10, seasoning_name: 'Bumbu Tabur Super Pedas' },
    { variant: 'Jagung Bakar', seasoning_ratio_per_kg: 0.08, seasoning_name: 'Bumbu Tabur Jagung Bakar' },
    { variant: 'Keju', seasoning_ratio_per_kg: 0.08, seasoning_name: 'Bumbu Tabur Keju' },
  ],
  packaging_configs: [
    { packaging_type: 'Standing Pouch 60g', packaging_name: 'Standing Pouch KhumKhum 60g', pieces_per_unit: 1 },
    { packaging_type: 'Standing Pouch 75g', packaging_name: 'Standing Pouch KhumKhum 75g', pieces_per_unit: 1 },
    { packaging_type: 'Toples 500g', packaging_name: 'Toples KhumKhum 500g', pieces_per_unit: 1 },
    { packaging_type: 'Pouch Bantal 100g', packaging_name: 'Pouch Bantal KhumKhum 100g', pieces_per_unit: 1 },
  ],
};

const DEFAULT_QC_STANDARDS: QcStandardConfig = {
  max_defect_rate: 5.0,
  max_moisture_percentage: 12.0,
  min_sample_size: 20,
  defect_categories: [
    { id: 'defect_burnt', name: 'Gosong / Overcooked', weight: 1.0, severity: 'HIGH' },
    { id: 'defect_salty', name: 'Keasinan / Bumbu Tidak Rata', weight: 0.8, severity: 'MEDIUM' },
    { id: 'defect_leaking_pack', name: 'Kemasan Bocor / Seal Rusak', weight: 1.0, severity: 'CRITICAL' },
    { id: 'defect_crushed', name: 'Remuk / Patah Berlebih', weight: 0.6, severity: 'LOW' },
    { id: 'defect_soggy', name: 'Melempem / Kurang Renyah', weight: 0.9, severity: 'HIGH' },
  ],
};

// ─────────────────────────────────────────────
// PRODUCTION STANDARDS
// ─────────────────────────────────────────────

export async function getProductionStandards(): Promise<{
  success: boolean;
  data: ProductionStandardConfig;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'SUPER_ADMIN', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'production_standards')
      .single();

    let mergedConfig: ProductionStandardConfig = {
      ...DEFAULT_PRODUCTION_STANDARDS,
      ...(data?.value || {}),
    };

    // Auto-match & link raw materials jika ID belum terisi
    try {
      const { data: rawMats } = await supabaseAdmin
        .from('raw_materials')
        .select('id, name, code, material_category')
        .is('deleted_at', null);

      if (rawMats && rawMats.length > 0) {
        const findRm = (keywords: string[]) =>
          rawMats.find((rm: any) =>
            keywords.some(
              (k) =>
                rm.name.toLowerCase().includes(k) ||
                (rm.code && rm.code.toLowerCase().includes(k))
            )
          )?.id;

        const mushroomId = findRm(['jamur tiram segar', 'jamur tiram', 'jmr-trm']) || rawMats[0]?.id;
        const premixId = findRm(['tepung premix', 'premix', 'rm-prx']) || rawMats[1]?.id;
        const oilId = findRm(['minyak goreng', 'minyak', 'rm-miny']) || rawMats[2]?.id;

        // Pastikan minimal ada 1 resep dasar goreng
        if (!mergedConfig.bom_recipes || mergedConfig.bom_recipes.length === 0) {
          mergedConfig.bom_recipes = [...DEFAULT_PRODUCTION_STANDARDS.bom_recipes];
        }

        // Auto-link bom_recipes
        mergedConfig.bom_recipes = mergedConfig.bom_recipes.map((r: any) => ({
          ...r,
          raw_mushroom_id: r.raw_mushroom_id || mushroomId,
          premix_flour_id: r.premix_flour_id || premixId,
          cooking_oil_id: r.cooking_oil_id || oilId,
        }));

        // Auto-link seasoning per variant
        const baladoId = findRm(['balado', 'bt-bld']);
        const bbqId = findRm(['barbeque', 'bbq', 'bt-bbq']);
        const pmId = findRm(['pedas manis', 'bt-pm']);
        const spId = findRm(['super pedas', 'bt-sp']);
        const oriId = findRm(['gurih', 'paket bumbu', 'rm-pake', 'ori']) || findRm(['bumbu']);
        const pouchId = findRm(['kemasan bantal', 'packaging', 'pck', 'rm-kema']) || findRm(['pouch', 'kemasan']);
        const toplesId = findRm(['toples', 'rm-topl']);

        const defaultSeasonings = DEFAULT_PRODUCTION_STANDARDS.seasoning_per_variant || [];
        const existingSeasonings = mergedConfig.seasoning_per_variant || defaultSeasonings;

        mergedConfig.seasoning_per_variant = existingSeasonings.map((s: any) => {
          let sId = s.seasoning_material_id;
          if (!sId) {
            if (s.variant === 'Balado') sId = baladoId;
            else if (s.variant === 'BBQ') sId = bbqId;
            else if (s.variant === 'Pedas Manis') sId = pmId;
            else if (s.variant === 'Super Pedas') sId = spId;
            else if (s.variant === 'Original') sId = oriId;
          }
          return {
            ...s,
            seasoning_material_id: sId,
            packaging_material_id: s.packaging_material_id || (s.packaging_type === 'Toples' ? toplesId : pouchId),
          };
        });

        // Auto-link premix recipes
        if (!mergedConfig.premix_recipes || mergedConfig.premix_recipes.length === 0) {
          mergedConfig.premix_recipes = [...(DEFAULT_PRODUCTION_STANDARDS.premix_recipes || [])];
        }
        const teriguId = findRm(['tepung terigu', 'tpg-trg', 'terigu']);
        const tapiokaId = findRm(['tapioka', 'tepung tapioka']);
        const bawangId = findRm(['bawang putih', 'bawang']);
        const garamId = findRm(['garam', 'garam halus']);

        mergedConfig.premix_recipes = mergedConfig.premix_recipes.map((pr: any) => ({
          ...pr,
          ingredients: (pr.ingredients || []).map((ing: any) => {
            let rmId = ing.raw_material_id;
            if (!rmId) {
              const n = (ing.name || '').toLowerCase();
              if (n.includes('terigu')) rmId = teriguId;
              else if (n.includes('tapioka')) rmId = tapiokaId;
              else if (n.includes('bawang')) rmId = bawangId;
              else if (n.includes('garam')) rmId = garamId;
            }
            return { ...ing, raw_material_id: rmId };
          }),
        }));

        // Auto-link packaging configs
        if (!mergedConfig.packaging_configs || mergedConfig.packaging_configs.length === 0) {
          mergedConfig.packaging_configs = [...(DEFAULT_PRODUCTION_STANDARDS.packaging_configs || [])];
        }
        mergedConfig.packaging_configs = mergedConfig.packaging_configs.map((p: any) => ({
          ...p,
          packaging_material_id:
            p.packaging_material_id ||
            (p.packaging_type.toLowerCase().includes('toples') ? toplesId : pouchId),
        }));
      }
    } catch (enrichErr) {
      console.warn('Auto-match raw materials warning:', enrichErr);
    }

    return { success: true, data: mergedConfig };
  } catch (err: any) {
    console.error('getProductionStandards error:', err);
    return { success: true, data: DEFAULT_PRODUCTION_STANDARDS };
  }
}

export async function saveProductionStandards(
  config: ProductionStandardConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN', 'PRODUCTION', 'QC', 'MANAGEMENT']);

    const { error } = await supabaseAdmin.from('settings').upsert(
      {
        key: 'production_standards',
        value: config,
        updated_by: user.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'settings',
      entityId: 'production_standards',
      details: config,
    });

    revalidatePath('/master/production-standards');
    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('saveProductionStandards error:', err);
    return { success: false, error: err.message || 'Gagal menyimpan standar produksi' };
  }
}

// ─────────────────────────────────────────────
// QC STANDARDS
// ─────────────────────────────────────────────

export async function getQcStandards(): Promise<{
  success: boolean;
  data: QcStandardConfig;
  error?: string;
}> {
  try {
    await requireAuth(['QC', 'SUPER_ADMIN', 'PRODUCTION', 'MANAGEMENT']);

    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'qc_standards')
      .single();

    if (error || !data?.value) {
      return { success: true, data: DEFAULT_QC_STANDARDS };
    }

    return { success: true, data: { ...DEFAULT_QC_STANDARDS, ...data.value } };
  } catch (err: any) {
    console.error('getQcStandards error:', err);
    return { success: true, data: DEFAULT_QC_STANDARDS };
  }
}

export async function saveQcStandards(
  config: QcStandardConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN', 'QC']);

    const { error } = await supabaseAdmin.from('settings').upsert(
      {
        key: 'qc_standards',
        value: config,
        updated_by: user.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (error) throw error;

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'settings',
      entityId: 'qc_standards',
      details: config,
    });

    revalidatePath('/master/qc-standards');
    revalidatePath('/quality-control');
    return { success: true };
  } catch (err: any) {
    console.error('saveQcStandards error:', err);
    return { success: false, error: err.message || 'Gagal menyimpan standar QC' };
  }
}

// ─────────────────────────────────────────────
// END OF STANDARDS
// ─────────────────────────────────────────────

