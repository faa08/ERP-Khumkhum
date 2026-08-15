import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lkyoshivpvtggzrfruzd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxreW9zaGl2cHZ0Z2d6cmZydXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0OTk5OCwiZXhwIjoyMTAyMDI1OTk4fQ.0VAFkwI53yGZT1LBF9T_1h1n5zkEUk29UVURPBDYIfU';

const supabase = createClient(supabaseUrl, serviceKey);

async function seedSettings() {
  console.log('Seeding initial standards settings to live Supabase...');
  try {
    const prodStandards = {
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
      ],
    };

    const qcStandards = {
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

    await supabase.from('settings').upsert([
      { key: 'production_standards', value: prodStandards, updated_at: new Date().toISOString() },
      { key: 'qc_standards', value: qcStandards, updated_at: new Date().toISOString() },
    ], { onConflict: 'key' });

    console.log('✅ Settings seeded successfully.');
  } catch (err) {
    console.error('Seed error:', err);
  }
}

seedSettings();
