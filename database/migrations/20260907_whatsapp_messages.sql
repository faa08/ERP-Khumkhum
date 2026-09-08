-- ==============================================================================
-- Migration: Add whatsapp_messages table
-- Date: 2026-09-07
-- Scope: Simpan history pesan masuk/keluar dari WA Petani untuk ditampilkan di Web
-- ==============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    status VARCHAR(20) NOT NULL DEFAULT 'UNREAD', -- 'UNREAD', 'READ', 'PROCESSED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries on farmer messages and unread dashboard
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_farmer_id ON whatsapp_messages(farmer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
