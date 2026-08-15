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
  bom_recipes: [
    {
      product_name: 'Jamur Crispy Original 100g',
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
      seasoning_ratio: 0.05,
    },
    {
      product_name: 'Jamur Crispy Balado Pedas 100g',
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
      seasoning_ratio: 0.08,
    },
    {
      product_name: 'Jamur Crispy BBQ Smoked 100g',
      raw_mushroom_ratio: 1.0,
      premix_flour_ratio: 0.25,
      cooking_oil_ratio: 0.30,
      seasoning_ratio: 0.07,
    },
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

    if (error || !data?.value) {
      return { success: true, data: DEFAULT_PRODUCTION_STANDARDS };
    }

    return { success: true, data: { ...DEFAULT_PRODUCTION_STANDARDS, ...data.value } };
  } catch (err: any) {
    console.error('getProductionStandards error:', err);
    return { success: true, data: DEFAULT_PRODUCTION_STANDARDS };
  }
}

export async function saveProductionStandards(
  config: ProductionStandardConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN', 'PRODUCTION', 'QC']);

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
