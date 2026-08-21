-- Migration: Add fields for Dev 2 (Warehouse, Inventory & Master Data)
-- Date: 2026-08-21

-- Add stock limits to raw_materials
ALTER TABLE raw_materials
ADD COLUMN min_stock DECIMAL(10,2) DEFAULT 0,
ADD COLUMN rop DECIMAL(10,2) DEFAULT 0;


-- Create stock_opnames table
CREATE TABLE stock_opnames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventory(id) NOT NULL,
  system_quantity DECIMAL(10,2) NOT NULL,
  physical_quantity DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
