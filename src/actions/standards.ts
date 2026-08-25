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

// ─────────────────────────────────────────────
// JAM OPERASIONAL PABRIK (Operating Hours)
// ─────────────────────────────────────────────

export interface ShiftConfig {
  shift_id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  effective_hours: number;
  max_fryer_batches: number;
  is_active: boolean;
}

export interface BatchParameters {
  standard_frying_minutes: number;
  standard_spinning_minutes: number;
  standard_seasoning_minutes: number;
  total_cycle_minutes: number;
}

export interface OperatingHoursConfig {
  work_days: string[];
  shifts: ShiftConfig[];
  batch_parameters: BatchParameters;
}

const DEFAULT_OPERATING_HOURS: OperatingHoursConfig = {
  work_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  shifts: [
    {
      shift_id: 'SHIFT_1',
      shift_name: 'Shift 1 (Pagi - Reguler)',
      start_time: '08:00',
      end_time: '16:00',
      break_minutes: 60,
      effective_hours: 7.0,
      max_fryer_batches: 14,
      is_active: true,
    },
    {
      shift_id: 'SHIFT_2',
      shift_name: 'Shift 2 (Sore - Lembur)',
      start_time: '16:00',
      end_time: '21:00',
      break_minutes: 30,
      effective_hours: 4.5,
      max_fryer_batches: 9,
      is_active: false,
    },
  ],
  batch_parameters: {
    standard_frying_minutes: 15,
    standard_spinning_minutes: 5,
    standard_seasoning_minutes: 10,
    total_cycle_minutes: 30,
  },
};

export async function getOperatingHoursStandards(): Promise<{
  success: boolean;
  data: OperatingHoursConfig;
  error?: string;
}> {
  try {
    await requireAuth(['PRODUCTION', 'QC', 'SUPER_ADMIN', 'MANAGEMENT', 'WAREHOUSE']);

    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'operating_hours_standards')
      .single();

    if (error || !data?.value) {
      return { success: true, data: DEFAULT_OPERATING_HOURS };
    }

    return { success: true, data: { ...DEFAULT_OPERATING_HOURS, ...data.value } };
  } catch (err: any) {
    console.error('getOperatingHoursStandards error:', err);
    return { success: true, data: DEFAULT_OPERATING_HOURS };
  }
}

export async function saveOperatingHoursStandards(
  config: OperatingHoursConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAuth(['SUPER_ADMIN', 'PRODUCTION']);

    const { error } = await supabaseAdmin.from('settings').upsert(
      {
        key: 'operating_hours_standards',
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
      entityId: 'operating_hours_standards',
      details: config,
    });

    revalidatePath('/master/operating-hours');
    revalidatePath('/production');
    return { success: true };
  } catch (err: any) {
    console.error('saveOperatingHoursStandards error:', err);
    return { success: false, error: err.message || 'Gagal menyimpan konfigurasi jam operasional' };
  }
}
