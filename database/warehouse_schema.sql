-- ==============================================================================
-- WAREHOUSE MODULE SCHEMA
-- ==============================================================================

-- 1. Raw Material Receiving
CREATE TABLE IF NOT EXISTS receivings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number VARCHAR(100) UNIQUE NOT NULL,
  farmer_id UUID REFERENCES farmers(id),
  raw_material_id UUID REFERENCES raw_materials(id) NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  weight_sent DECIMAL(10,2),
  weight_difference DECIMAL(10,2),
  diff_percentage DECIMAL(5,2),
  scale_photo_url TEXT,
  status VARCHAR(50) DEFAULT 'RECEIVED',
  notes TEXT,
  received_by UUID REFERENCES users(id),
  received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sorting & Grading
CREATE TABLE IF NOT EXISTS sortings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_id UUID REFERENCES receivings(id) NOT NULL,
  leaf_weight DECIMAL(10,2),
  stem_weight DECIMAL(10,2),
  leaf_percentage DECIMAL(5,2),
  quality_grade VARCHAR(50),
  is_standard_compliant BOOLEAN,
  accepted_quantity DECIMAL(10,2) NOT NULL,
  rejected_quantity DECIMAL(10,2) NOT NULL,
  waste DECIMAL(10,2) NOT NULL,
  sorted_by UUID REFERENCES users(id),
  sorting_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID REFERENCES warehouses(id) NOT NULL,
  item_type VARCHAR(50) NOT NULL, -- 'RAW_MATERIAL', 'PRODUCT'
  item_id UUID NOT NULL, 
  batch_number VARCHAR(100),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  reorder_point DECIMAL(10,2),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventory(id) NOT NULL,
  movement_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'
  quantity DECIMAL(10,2) NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(50),
  notes TEXT,
  movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 5. Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(100) UNIQUE,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'PENDING',
  total_amount DECIMAL(15,2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID REFERENCES sales_orders(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(15,2),
  subtotal DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PPIC / Farmer Harvest Estimates
CREATE TABLE IF NOT EXISTS farmer_harvest_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id) NOT NULL,
  expected_date DATE NOT NULL,
  estimated_kg DECIMAL(10,2) NOT NULL,
  source VARCHAR(50) DEFAULT 'MANUAL', -- 'WA_BOT' | 'MANUAL'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. WhatsApp Logs
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmers(id),
  phone_number VARCHAR(50) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  payload JSONB,
  status VARCHAR(50) DEFAULT 'PENDING',
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
