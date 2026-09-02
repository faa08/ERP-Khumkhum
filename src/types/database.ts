/**
 * Supabase Database Types
 * Matched with database/schema.sql + PRD Spesifikasi 6 Role
 *
 * 6 Core Roles:
 * SUPER_ADMIN, QC, WAREHOUSE, PRODUCTION, MANAGEMENT, FARMER
 */

export type UserRole =
  | 'SUPER_ADMIN'
  | 'QC'
  | 'WAREHOUSE'
  | 'PRODUCTION'
  | 'MANAGEMENT'
  | 'SALES'
  | 'FARMER';

export interface DbUser {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  whatsapp_number?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFarmer {
  id: string;
  name: string;
  contact?: string | null;
  address?: string | null;
  phone_number?: string | null;
  price_per_kg?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRawMaterial {
  id: string;
  code: string;
  name: string;
  uom: string;
  min_stock?: number | null;
  rop?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbCustomer {
  id: string;
  name: string;
  contact?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWarehouse {
  id: string;
  name: string;
  location?: string | null;
  pic_id?: string | null;
  warehouse_pics?: DbWarehousePic | null;
  created_at: string;
  updated_at: string;
}

export interface DbWarehousePic {
  id: string;
  name: string;
  phone_number: string;
  next_reminder_datetime?: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// WAREHOUSE MODULE TYPES
// ─────────────────────────────────────────────

/** Penerimaan Bahan Baku Jamur (table: receivings) */
export interface DbReceiving {
  id: string;
  batch_number: string;              // RM-YYYYMMDD-XXX
  farmer_id?: string | null;
  raw_material_id: string;
  weight: number;                    // W_terima (berat timbang aktual)
  weight_sent?: number | null;       // W_kirim (berat kirim petani)
  weight_difference?: number | null; // ΔW = W_terima - W_kirim
  diff_percentage?: number | null;   // %ΔW
  scale_photo_url?: string | null;
  notes?: string | null;
  received_by?: string | null;
  received_date: string;
  status?: string | null;            // 'RECEIVED' | 'SORTED' | 'VOIDED'
  created_at: string;
  updated_at: string;
  // Joined fields
  farmer?: Pick<DbFarmer, 'id' | 'name' | 'contact' | 'phone_number'> | null;
}

/** Sortasi & Grading (table: sortings) */
export interface DbSorting {
  id: string;
  receiving_id: string;
  leaf_weight?: number | null;          // W_daun (kg)
  stem_weight?: number | null;          // W_batang (kg)
  leaf_percentage?: number | null;      // %Daun = W_daun/(W_daun+W_batang)×100
  quality_grade?: string | null;        // 'A' | 'B' | 'C'
  is_standard_compliant?: boolean | null; // leaf_percentage >= 75
  accepted_quantity: number;
  rejected_quantity: number;
  waste: number;
  sorted_by?: string | null;
  sorting_date: string;
  created_at: string;
  updated_at: string;
  // Joined
  receiving?: Pick<DbReceiving, 'id' | 'batch_number' | 'weight' | 'farmer_id'> | null;
  farmer?: Pick<DbFarmer, 'name' | 'phone_number'> | null;
}

/** Estimasi Panen Petani untuk PPIC */
export interface DbFarmerHarvestEstimate {
  id: string;
  farmer_id: string;
  expected_date: string;
  estimated_kg: number;
  source: 'WA_BOT' | 'MANUAL';
  created_at: string;
  farmer?: Pick<DbFarmer, 'id' | 'name' | 'phone_number'> | null;
}

/** Log WhatsApp Gateway */
export interface DbWhatsappLog {
  id: string;
  farmer_id?: string | null;
  phone_number: string;
  message_type: 'RECEIPT_NOTA' | 'SORTATION_INFO' | 'HARVEST_REMINDER' | 'HARVEST_CONFIRM' | 'OTHER';
  payload: Record<string, any>;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SIMULATED';
  gateway_response?: Record<string, any> | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// PRODUCTION MODULE TYPES
// ─────────────────────────────────────────────

export interface DbProductionOrder {
  id: string;
  batch_number: string;
  product_id?: string | null;
  target_quantity?: number | null;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED_WIP' | 'QC_PENDING' | 'RELEASED' | 'COMPLETED' | 'CANCELLED';
  product_variant?: string | null;
  input_weight?: number | null;
  output_weight?: number | null;
  yield_percentage?: number | null;
  is_yield_compliant?: boolean | null;
  anomaly_reason?: string | null;
  notes?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_by?: string | null;
  // Revisi: kolom tambahan produksi goreng & packing
  total_kremesan_gram?: number | null;
  total_longsong_count?: number | null;
  unpacked_longsong_count?: number | null;
  cycle_time_avg_seconds?: number | null;
  normal_time_seconds?: number | null;
  standard_time_seconds?: number | null;
  rating_factor?: number | null;
  allowance_factor?: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product?: Pick<DbProduct, 'id' | 'sku' | 'name'> | null;
  creator?: { id: string; name: string } | null;
  materials?: DbProductionMaterial[];
  results?: DbProductionResult[];
  frying_batches?: DbFryingBatch[];
  packing_entries?: DbPackingEntry[];
}

export interface DbProductionMaterial {
  id: string;
  production_order_id: string;
  raw_material_id: string;
  consumption_quantity: number;
  created_at: string;
  // Joined
  raw_material?: Pick<DbRawMaterial, 'id' | 'code' | 'name' | 'uom'> | null;
}

export interface DbProductionResult {
  id: string;
  production_order_id: string;
  product_id: string;
  finished_goods_quantity: number;
  wip_quantity: number;
  yield_percentage?: number | null;
  created_at: string;
  // Joined
  product?: Pick<DbProduct, 'id' | 'sku' | 'name'> | null;
}

// ─────────────────────────────────────────────
// PRODUCTION FRYING & PACKING TYPES (Revisi)
// ─────────────────────────────────────────────

export interface DbFryingBatch {
  id: string;
  production_order_id: string;
  wajan_number: number;
  batch_weight_gram: number;
  oil_temp_celsius?: number | null;
  frying_duration_minutes?: number | null;
  output_weight_gram?: number | null;
  longsong_count: number;
  kremesan_weight_gram: number;
  notes?: string | null;
  operator_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
  // Joined
  operator?: { id: string; name: string } | null;
}

export interface DbPackingEntry {
  id: string;
  frying_batch_id?: string | null;
  production_order_id: string;
  flavor_variant: string;
  longsong_number: number;
  longsong_weight_gram?: number | null;
  packaged_toples_count: number;
  packaging_weight_gram?: string | null;
  seasoning_used_gram: number;
  is_packed: boolean;
  packed_at?: string | null;
  notes?: string | null;
  created_at: string;
  // Joined
  frying_batch?: Pick<DbFryingBatch, 'id' | 'wajan_number' | 'batch_weight_gram'> | null;
}

export interface DbTimeStudySample {
  id: string;
  production_order_id: string;
  stage: 'FRYING' | 'PACKING';
  sample_number: number;
  started_at: string;
  finished_at?: string | null;
  duration_seconds?: number | null;
  operator_id?: string | null;
  notes?: string | null;
  created_at: string;
  // Joined
  operator?: { id: string; name: string } | null;
}

export type FlavorVariant = 'Original' | 'Balado' | 'BBQ' | 'Pedas Manis' | 'Super Pedas';

export const FLAVOR_VARIANTS: FlavorVariant[] = ['Original', 'Balado', 'BBQ', 'Pedas Manis', 'Super Pedas'];

// ─────────────────────────────────────────────
// QC MODULE TYPES
// ─────────────────────────────────────────────

export interface DbQcInspection {
  id: string;
  batch_id?: string | null;
  reference_type: 'RECEIVING' | 'SORTING' | 'PRODUCTION';
  reference_id: string;
  inspector_id?: string | null;
  sample_size?: number | null;
  defect_burnt?: number | null;
  defect_salty?: number | null;
  defect_leaking_pack?: number | null;
  defect_crushed?: number | null;
  defect_soggy?: number | null;
  total_defects?: number | null;
  defect_rate?: number | null;
  decision?: 'RELEASED' | 'REWORK' | 'REJECTED' | null;
  is_passed: boolean;
  defect_type?: string | null;
  notes?: string | null;
  inspected_by?: string | null;
  image_url?: string | null;
  inspection_date: string;
  created_at: string;
  // Joined
  inspector?: { id: string; name: string } | null;
  production_order?: Pick<DbProductionOrder, 'id' | 'batch_number' | 'product_variant' | 'yield_percentage'> | null;
}

export interface QcParetoItem {
  category: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

// ─────────────────────────────────────────────
// STANDARDS & FORECAST TYPES
// ─────────────────────────────────────────────

export interface BomRecipe {
  product_name: string;
  raw_mushroom_ratio: number;
  premix_flour_ratio: number;
  cooking_oil_ratio: number;
  seasoning_ratio: number;
}

export interface ProductionStandardConfig {
  min_yield_percentage: number;
  warning_yield_percentage: number;
  oil_temp_min: number;
  oil_temp_max: number;
  frying_duration_minutes: number;
  spinning_duration_minutes: number;
  default_batch_weight_gram?: number;
  default_rating_factor?: number;
  default_allowance_factor?: number;
  bom_recipes: BomRecipe[];
  seasoning_per_variant?: SeasoningConfig[];
}

export interface SeasoningConfig {
  variant: FlavorVariant;
  seasoning_ratio_per_kg: number;
  seasoning_name: string;
}

export interface DefectCategoryConfig {
  id: string;
  name: string;
  weight: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface QcStandardConfig {
  max_defect_rate: number;
  max_moisture_percentage: number;
  min_sample_size: number;
  defect_categories: DefectCategoryConfig[];
}

export interface MaterialForecastItem {
  material_name: string;
  uom: string;
  historical_avg_weekly: number;
  projected_demand: number;
  safety_stock: number;
  total_procurement_needed: number;
  confidence: 'Tinggi' | 'Sedang' | 'Rendah';
  notes: string;
}

export interface ForecastWeekProjection {
  week: string;
  date_label: string;
  projected_kg: number;
  confidence: 'Tinggi' | 'Sedang' | 'Rendah';
  status_color: string;
}

export interface OperationalInsight {
  id: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  description: string;
  recommendation: string;
  metric?: string;
}

// ─────────────────────────────────────────────
// INVENTORY MODULE TYPES
// ─────────────────────────────────────────────

export interface DbInventory {
  id: string;
  warehouse_id: string;
  item_type: 'RAW_MATERIAL' | 'PRODUCT';
  item_id: string;
  batch_number?: string | null;
  quantity: number;
  reorder_point?: number | null;
  last_updated_at: string;
  warehouse?: Pick<DbWarehouse, 'id' | 'name'> | null;
  item_name?: string | null;
}

export interface DbStockMovement {
  id: string;
  inventory_id: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  reference_id?: string | null;
  reference_type?: string | null;
  notes?: string | null;
  movement_date: string;
  created_by?: string | null;
}

export interface DbStockOpname {
  id: string;
  inventory_id: string;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface DbStockOpnameItem {
  inventory_id: string;
  item_name: string;
  system_qty: number;
  physical_qty: number;
  difference: number;
}

// ─────────────────────────────────────────────
// SALES ORDER MODULE TYPES
// ─────────────────────────────────────────────

export interface DbSalesOrder {
  id: string;
  order_number?: string | null;       // SO-YYYYMMDD-XXX
  customer_id: string;
  order_date: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  total_amount?: number | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Pick<DbCustomer, 'id' | 'name' | 'contact'> | null;
  items?: DbSalesOrderItem[] | null;
}

export interface DbSalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  quantity: number;
  unit_price?: number | null;
  subtotal?: number | null;
  created_at: string;
  product?: Pick<DbProduct, 'id' | 'sku' | 'name'> | null;
}

// ─────────────────────────────────────────────
// MANAGEMENT / EXECUTIVE MODULE TYPES
// ─────────────────────────────────────────────

/** Aggregated KPI metrics for Executive Dashboard */
export interface DbKpiMetrics {
  total_supply_kg: number;
  avg_yield_percentage: number;
  overall_defect_rate: number;
  stock_accuracy_percentage: number;
  total_sales_revenue: number;
  total_production_batches: number;
  period_from: string;
  period_to: string;
}

/** One node in the traceability chain */
export interface TraceabilityNode {
  step: number;
  label: string;
  id: string;
  status: string;
  data: Record<string, string | number | boolean | null>;
}

/** Full traceability result */
export interface TraceabilityResult {
  search_type: 'FORWARD' | 'BACKWARD';
  search_keyword: string;
  chain: TraceabilityNode[];
  found: boolean;
}

/** Farmer performance ranking for management */
export interface FarmerRanking {
  rank: number;
  farmer_id: string;
  farmer_name: string;
  total_supply_kg: number;
  avg_leaf_percentage: number;
  delivery_count: number;
  grade_a_count: number;
}

// ─────────────────────────────────────────────
// AUDIT LOG & SETTINGS
// ─────────────────────────────────────────────

export interface DbAuditLog {
  id: string;
  user_id?: string | null;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'VOID';
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, any> | null;
  created_at: string;
  user?: {
    name: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface DbSetting {
  key: string;
  value: Record<string, any>;
  updated_by?: string | null;
  updated_at: string;
}
