-- Migration: Add SORTING role and Sales Order fields
-- Date: 2026-09-17

-- 1. Add location to sales_orders
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Note: User roles are handled by an ENUM in the database
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SORTING';

-- 2. Insert User Bu Sur untuk role Sortasi
-- Password default disamakan dengan mock data biasanya (misal: "password123" atau hash nya jika menggunakan auth provider)
-- Asumsi kolom password menggunakan string plain/hash standar aplikasi.
INSERT INTO users (id, email, password, name, role) 
VALUES (uuid_generate_v4(), 'sorting@khumkhum.com', 'password123', 'Bu Sur (Sortasi)', 'SORTING')
ON CONFLICT (email) DO NOTHING;
