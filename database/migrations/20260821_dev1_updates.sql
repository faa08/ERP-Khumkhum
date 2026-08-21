-- Migration: Dev 1 Tasks (WhatsApp Reminder & Users)
-- Date: 2026-08-21

-- Add whatsapp_number to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

-- Insert default schedule into settings if it doesn't exist
INSERT INTO settings (key, value)
VALUES ('stock_opname_schedule', '{"reminder_date": 25}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Drop previous pic_name and pic_phone if exists
ALTER TABLE warehouses
DROP COLUMN IF EXISTS pic_name,
DROP COLUMN IF EXISTS pic_phone;

-- Create warehouse_pics table
CREATE TABLE IF NOT EXISTS warehouse_pics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  next_reminder_datetime TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add pic_id to warehouses
ALTER TABLE warehouses
ADD COLUMN IF NOT EXISTS pic_id UUID REFERENCES warehouse_pics(id);

