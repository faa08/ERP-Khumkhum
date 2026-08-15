-- ==============================================================================
-- MANAGEMENT MODULE SCHEMA
-- ==============================================================================

-- 1. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Settings
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Executive KPI Views (Optional/Helpers for Management Dashboard)
CREATE OR REPLACE VIEW v_executive_kpi AS
SELECT
  (SELECT COALESCE(SUM(weight), 0) FROM receivings) AS total_supply_kg,
  (SELECT COALESCE(AVG(yield_percentage), 0) FROM production_results) AS avg_yield_percentage,
  (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders WHERE status = 'COMPLETED') AS total_sales_revenue,
  (SELECT COUNT(*) FROM production_orders) AS total_production_batches;

-- 4. Farmer Ranking View
CREATE OR REPLACE VIEW v_farmer_ranking AS
SELECT 
  f.id AS farmer_id,
  f.name AS farmer_name,
  COALESCE(SUM(r.weight), 0) AS total_supply_kg,
  COALESCE(AVG(s.leaf_percentage), 0) AS avg_leaf_percentage,
  COUNT(r.id) AS delivery_count,
  COUNT(CASE WHEN s.quality_grade = 'A' THEN 1 END) AS grade_a_count,
  RANK() OVER (ORDER BY COALESCE(SUM(r.weight), 0) DESC, COALESCE(AVG(s.leaf_percentage), 0) DESC) as rank
FROM farmers f
LEFT JOIN receivings r ON f.id = r.farmer_id
LEFT JOIN sortings s ON r.id = s.receiving_id
GROUP BY f.id, f.name;
