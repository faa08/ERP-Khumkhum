-- ============================================================
-- Migration: Fix Missing Columns (Schema Sync)
-- Date: 2026-08-21
-- Purpose: Add all columns that are used by code but missing
--          from the actual database schema.
-- ============================================================

-- ──────────────────────────────────────────────
-- FIX 1: stock_movements — missing reference_type & notes
-- Used by: inventory.ts, production.ts, sorting.ts, sales.ts, qc.ts
-- ──────────────────────────────────────────────
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ──────────────────────────────────────────────
-- FIX 2: production_orders — missing production tracking columns
-- Used by: production.ts (createProductionOrder, recordProductionResult, etc.)
-- ──────────────────────────────────────────────
ALTER TABLE production_orders
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id),
ADD COLUMN IF NOT EXISTS product_variant VARCHAR(255),
ADD COLUMN IF NOT EXISTS target_quantity DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS input_weight DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS output_weight DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS yield_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS is_yield_compliant BOOLEAN,
ADD COLUMN IF NOT EXISTS anomaly_reason TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ──────────────────────────────────────────────
-- FIX 3: inventory — missing reorder_point column
-- Used by: inventory.ts (getInventoryForecasting, receiveNonMushroomItem)
-- ──────────────────────────────────────────────
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(10,2) DEFAULT 0;

-- ──────────────────────────────────────────────
-- FIX 4: raw_materials — missing material_category (per PRD)
-- PRD requires: ENUM(Jamur, Bumbu, Tepung, Minyak, Packaging)
-- ──────────────────────────────────────────────
ALTER TABLE raw_materials
ADD COLUMN IF NOT EXISTS material_category VARCHAR(50);

-- ──────────────────────────────────────────────
-- FIX 5: Refresh Supabase PostgREST schema cache
-- ──────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
