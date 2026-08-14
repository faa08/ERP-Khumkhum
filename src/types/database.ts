/**
 * Supabase Database Types
 * Matched with database/schema.sql
 * 
 * 6 Core Roles sesuai PRD:
 * SUPER_ADMIN, QC, WAREHOUSE, PRODUCTION, MANAGEMENT, FARMER
 */

export type UserRole =
  | 'SUPER_ADMIN'
  | 'QC'
  | 'WAREHOUSE'
  | 'PRODUCTION'
  | 'MANAGEMENT'
  | 'FARMER';

export interface DbUser {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFarmer {
  id: string;
  name: string;
  contact?: string | null;
  address?: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface DbReceiving {
  id: string;
  batch_number: string;
  farmer_id?: string | null;
  raw_material_id: string;
  weight: number;
  notes?: string | null;
  received_by?: string | null;
  received_date: string;
  created_at: string;
  updated_at: string;
}

export interface DbSorting {
  id: string;
  receiving_id: string;
  grade?: string | null;
  accepted_quantity: number;
  rejected_quantity: number;
  waste: number;
  sorted_by?: string | null;
  sorting_date: string;
  created_at: string;
  updated_at: string;
}

export interface DbProductionOrder {
  id: string;
  batch_number: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'QC_PENDING' | 'COMPLETED' | 'CANCELLED';
  start_date?: string | null;
  end_date?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProductionMaterial {
  id: string;
  production_order_id: string;
  raw_material_id: string;
  consumption_quantity: number;
  created_at: string;
}

export interface DbProductionResult {
  id: string;
  production_order_id: string;
  product_id: string;
  finished_goods_quantity: number;
  wip_quantity: number;
  yield_percentage?: number | null;
  created_at: string;
}

export interface DbQcInspection {
  id: string;
  reference_type: 'RECEIVING' | 'SORTING' | 'PRODUCTION';
  reference_id: string;
  is_passed: boolean;
  defect_type?: string | null;
  notes?: string | null;
  inspected_by?: string | null;
  inspection_date: string;
  created_at: string;
}

export interface DbInventory {
  id: string;
  warehouse_id: string;
  item_type: 'RAW_MATERIAL' | 'PRODUCT';
  item_id: string;
  batch_number?: string | null;
  quantity: number;
  last_updated_at: string;
}

export interface DbStockMovement {
  id: string;
  inventory_id: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
  quantity: number;
  reference_id?: string | null;
  movement_date: string;
  created_by?: string | null;
}

export interface DbSalesOrder {
  id: string;
  customer_id: string;
  order_date: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  user_id?: string | null;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT';
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
