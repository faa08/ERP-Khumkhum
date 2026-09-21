-- Migration: Tambah kolom timer_started_at ke production_frying_batches
-- Digunakan untuk persist waktu mulai stopwatch per batch goreng
-- sehingga reload halaman tidak kehilangan timer yang sedang berjalan.

ALTER TABLE production_frying_batches 
  ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ DEFAULT NULL;

-- Untuk batch yang sudah ada dan belum selesai, set timer_started_at = started_at
UPDATE production_frying_batches 
  SET timer_started_at = started_at 
  WHERE timer_started_at IS NULL AND started_at IS NOT NULL AND finished_at IS NULL;
