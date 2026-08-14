-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for User Roles (6 Core Roles sesuai PRD)
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',   -- Kontrol penuh sistem, user management, audit, void
  'QC',            -- Quality Control & Ops, inspeksi, standar mutu
  'WAREHOUSE',     -- Gudang, Logistik, Sales, PPIC, Penerimaan, Sortasi
  'PRODUCTION',    -- Operator Lini Produksi, Batch WIP, Rendemen
  'MANAGEMENT',    -- Eksekutif & Viewer, Dashboard KPI, Traceability
  'FARMER'         -- Petani Mitra (interaksi via WhatsApp, bukan web login)
);

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master Data: Farmers
CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master Data: Products (Finished Goods)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master Data: Raw Materials
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  uom VARCHAR(20) NOT NULL, -- Unit of Measure (e.g., kg, gram, pcs)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master Data: Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master Data: Warehouses
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Raw Material Receiving
CREATE TABLE receivings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number VARCHAR(100) UNIQUE NOT NULL,
  farmer_id UUID REFERENCES farmers(id),
  raw_material_id UUID REFERENCES raw_materials(id) NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  notes TEXT,
  received_by UUID REFERENCES users(id),
  received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sorting & Grading
CREATE TABLE sortings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_id UUID REFERENCES receivings(id) NOT NULL,
  grade VARCHAR(50),
  accepted_quantity DECIMAL(10,2) NOT NULL,
  rejected_quantity DECIMAL(10,2) NOT NULL,
  waste DECIMAL(10,2) NOT NULL,
  sorted_by UUID REFERENCES users(id),
  sorting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Production Orders
CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, IN_PROGRESS, QC_PENDING, COMPLETED, CANCELLED
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Material Consumption
CREATE TABLE production_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID REFERENCES production_orders(id) NOT NULL,
  raw_material_id UUID REFERENCES raw_materials(id) NOT NULL,
  consumption_quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Finished Goods Result
CREATE TABLE production_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_order_id UUID REFERENCES production_orders(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  finished_goods_quantity DECIMAL(10,2) NOT NULL,
  wip_quantity DECIMAL(10,2) DEFAULT 0,
  yield_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Quality Control
CREATE TABLE qc_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_type VARCHAR(50) NOT NULL, -- e.g., 'RECEIVING', 'SORTING', 'PRODUCTION'
  reference_id UUID NOT NULL,
  is_passed BOOLEAN NOT NULL,
  defect_type VARCHAR(100),
  notes TEXT,
  inspected_by UUID REFERENCES users(id),
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID REFERENCES warehouses(id) NOT NULL,
  item_type VARCHAR(50) NOT NULL, -- 'RAW_MATERIAL', 'PRODUCT'
  item_id UUID NOT NULL, 
  batch_number VARCHAR(100),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventory(id) NOT NULL,
  movement_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'
  quantity DECIMAL(10,2) NOT NULL,
  reference_id UUID, -- e.g., receiving_id, production_order_id, sales_order_id
  movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 6. Sales Orders
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, SHIPPED, COMPLETED, CANCELLED
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID REFERENCES sales_orders(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Audit Log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Settings
CREATE TABLE settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
