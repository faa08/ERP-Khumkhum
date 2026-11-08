'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Printer,
  CheckCircle2,
  Clock,
  X,
  Receipt,
  ShieldCheck,
  Settings,
  Save,
  RotateCcw,
  Building2,
  Phone,
  CreditCard,
  Check,
} from 'lucide-react';
import type { DbSalesOrder } from '@/types/database';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface KhumKhumInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DbSalesOrder | null;
}

export interface InvoiceCompanyConfig {
  phone: string;
  bank1Name: string;
  bank1Account: string;
  bank1Holder: string;
  bank2Name: string;
  bank2Account: string;
  bank2Holder: string;
  notes: string;
}

const DEFAULT_INVOICE_CONFIG: InvoiceCompanyConfig = {
  phone: '+62 812-2580-9999',
  bank1Name: 'Bank BCA',
  bank1Account: '892-019-2811',
  bank1Holder: 'CV KHAIRA BUANA MANDIRI',
  bank2Name: 'Bank Mandiri',
  bank2Account: '137-00-1928-1122',
  bank2Holder: 'CV KHAIRA BUANA MANDIRI',
  notes: '*Harap mencantumkan nomor invoice pada berita transfer',
};

/**
 * Konversi angka ke kata dalam Bahasa Indonesia untuk nota resmi
 */
function angkaTerbilang(nilai: number): string {
  const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const n = Math.floor(Math.abs(nilai));
  if (n < 12) return huruf[n];
  if (n < 20) return angkaTerbilang(n - 10) + ' Belas';
  if (n < 100) return angkaTerbilang(Math.floor(n / 10)) + ' Puluh ' + angkaTerbilang(n % 10);
  if (n < 200) return 'Seratus ' + angkaTerbilang(n - 100);
  if (n < 1000) return angkaTerbilang(Math.floor(n / 100)) + ' Ratus ' + angkaTerbilang(n % 100);
  if (n < 2000) return 'Seribu ' + angkaTerbilang(n - 1000);
  if (n < 1000000) return angkaTerbilang(Math.floor(n / 1000)) + ' Ribu ' + angkaTerbilang(n % 1000);
  if (n < 1000000000) return angkaTerbilang(Math.floor(n / 1000000)) + ' Juta ' + angkaTerbilang(n % 1000000);
  if (n < 1000000000000) return angkaTerbilang(Math.floor(n / 1000000000)) + ' Miliar ' + angkaTerbilang(n % 1000000000);
  return `${nilai}`;
}

export function KhumKhumInvoiceModal({ isOpen, onClose, order }: KhumKhumInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [config, setConfig] = useState<InvoiceCompanyConfig>(DEFAULT_INVOICE_CONFIG);
  const [tempConfig, setTempConfig] = useState<InvoiceCompanyConfig>(DEFAULT_INVOICE_CONFIG);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Muat konfigurasi dari localStorage saat modal dibuka
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('khumkhum_invoice_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          setConfig(prev => ({ ...prev, ...parsed }));
          setTempConfig(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error('Gagal memuat konfigurasi invoice:', e);
      }
    }
  }, [isOpen]);

  const handleSaveConfig = () => {
    setConfig(tempConfig);
    try {
      localStorage.setItem('khumkhum_invoice_config', JSON.stringify(tempConfig));
      setSaveSuccessMsg('Pengaturan rekening & nomor kontak berhasil disimpan!');
      setTimeout(() => {
        setSaveSuccessMsg('');
        setIsEditingConfig(false);
      }, 1000);
    } catch (e) {
      console.error('Gagal menyimpan konfigurasi invoice:', e);
    }
  };

  const handleResetDefault = () => {
    setTempConfig(DEFAULT_INVOICE_CONFIG);
  };

  if (!order) return null;

  const orderNum = order.order_number || order.id.slice(0, 8).toUpperCase();
  const invoiceNum = `INV/KHK/${orderNum}`;
  const orderDate = new Date(order.order_date || Date.now());
  const formattedDate = format(orderDate, 'dd MMMM yyyy, HH:mm', { locale: idLocale });
  const items = order.items || [];
  const totalAmount = order.total_amount || items.reduce((acc, it) => acc + (Number(it.subtotal) || (Number(it.quantity) * Number(it.unit_price)) || 0), 0);
  const totalPcs = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const isPaid = order.status === 'SHIPPED' || order.status === 'COMPLETED';

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Faktur Penjualan Resmi (Official Invoice)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (isEditingConfig) {
                  setTempConfig(config);
                  setIsEditingConfig(false);
                } else {
                  setTempConfig(config);
                  setIsEditingConfig(true);
                }
              }}
              leftIcon={<Settings className="w-4 h-4 text-currentColor" aria-hidden="true" />}
            >
              {isEditingConfig ? 'Tampilkan Faktur' : 'Atur Rekening & Kontak'}
            </Button>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {isEditingConfig ? 'Sesuaikan nomor kontak dan bank pembayaran' : 'Format cetak resmi A4'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
            {!isEditingConfig && (
              <Button
                variant="primary"
                onClick={handlePrint}
                leftIcon={<Printer className="w-4 h-4 text-currentColor" aria-hidden="true" />}
                style={{ background: '#DC2626', borderColor: '#B91C1C', color: '#fff' }}
              >
                Cetak / Simpan PDF
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* ── CSS PRINT KHUSUS ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #khumkhum-invoice-printable, #khumkhum-invoice-printable * {
            visibility: visible !important;
          }
          #khumkhum-invoice-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: #ffffff !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* ── PANEL EDIT KONFIGURASI REKENING & KONTAK ── */}
      {isEditingConfig ? (
        <div
          style={{
            background: 'var(--bg-subtle, #F9FAFB)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-default, #E5E7EB)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} /> Pengaturan Rekening Bank & Kontak Faktur
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#4B5563' }}>
                Data yang Anda simpan di sini akan otomatis tampil pada seluruh cetakan faktur penjualan resmi KhumKhum.
              </p>
            </div>
            {saveSuccessMsg && (
              <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> {saveSuccessMsg}
              </span>
            )}
          </div>

          {/* Form Input Kontak */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Nomor WhatsApp / CS Resmi Pabrik
            </label>
            <input
              type="text"
              value={tempConfig.phone}
              onChange={e => setTempConfig(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Contoh: +62 812-3456-7890"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Form Rekening Bank Utama */}
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={15} /> Rekening Bank Utama (Wajib Tampil)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Nama Bank</label>
                <input
                  type="text"
                  value={tempConfig.bank1Name}
                  onChange={e => setTempConfig(prev => ({ ...prev, bank1Name: e.target.value }))}
                  placeholder="Misal: Bank BCA"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Nomor Rekening</label>
                <input
                  type="text"
                  value={tempConfig.bank1Account}
                  onChange={e => setTempConfig(prev => ({ ...prev, bank1Account: e.target.value }))}
                  placeholder="Misal: 892-019-2811"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Atas Nama Rekening</label>
                <input
                  type="text"
                  value={tempConfig.bank1Holder}
                  onChange={e => setTempConfig(prev => ({ ...prev, bank1Holder: e.target.value }))}
                  placeholder="Misal: CV KHAIRA BUANA MANDIRI"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Form Rekening Bank Kedua (Opsional) */}
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={15} /> Rekening Bank Kedua (Opsional / Cadangan)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Nama Bank</label>
                <input
                  type="text"
                  value={tempConfig.bank2Name}
                  onChange={e => setTempConfig(prev => ({ ...prev, bank2Name: e.target.value }))}
                  placeholder="Misal: Bank Mandiri / BRI / BSI"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Nomor Rekening</label>
                <input
                  type="text"
                  value={tempConfig.bank2Account}
                  onChange={e => setTempConfig(prev => ({ ...prev, bank2Account: e.target.value }))}
                  placeholder="Kosongkan jika hanya 1 rekening"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>Atas Nama Rekening</label>
                <input
                  type="text"
                  value={tempConfig.bank2Holder}
                  onChange={e => setTempConfig(prev => ({ ...prev, bank2Holder: e.target.value }))}
                  placeholder="Misal: CV KHAIRA BUANA MANDIRI"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Catatan Transfer */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Catatan Instruksi Pembayaran
            </label>
            <input
              type="text"
              value={tempConfig.notes}
              onChange={e => setTempConfig(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Contoh: *Harap mencantumkan nomor invoice pada berita transfer"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDefault}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset ke Contoh Awal
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsEditingConfig(false)}>
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                leftIcon={<Save className="w-4 h-4" />}
                style={{ background: '#DC2626', borderColor: '#B91C1C', color: '#fff' }}
              >
                Simpan & Terapkan ke Faktur
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── INVOICE CONTAINER DENGAN KHAS KHUMKHUM RED ── */
        <div
          id="khumkhum-invoice-printable"
          ref={invoiceRef}
          style={{
            background: '#ffffff',
            color: '#1F2937',
            padding: '24px 28px',
            borderRadius: '12px',
            border: '1px solid #FCA5A5',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.06)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: 1.45,
          }}
        >
          {/* ── HEADER INVOICE BERKARAKTER KHUMKHUM ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #DC2626', paddingBottom: '16px', marginBottom: '20px' }}>
            {/* Logo & Identitas Pabrik */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <img
                src="/Khumkhum-01-1536x486.webp"
                alt="Logo KhumKhum Jamur Crispy"
                style={{ height: '56px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/khumkhum-logo.jpg';
                }}
              />
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#991B1B', letterSpacing: '0.5px' }}>
                  CV KHAIRA BUANA MANDIRI
                </h2>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', marginTop: '2px' }}>
                  KhumKhum Snack Manufaktur — Olahan Jamur Crispy Premium
                </div>
                <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '4px', maxWidth: '340px' }}>
                  Kulon Progo, D.I. Yogyakarta — Indonesia | Telp/WA: {config.phone || '-'}<br />
                  Sertifikat Halal & P-IRT Terdaftar
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Judul Invoice & Status */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                color: '#ffffff',
                padding: '6px 16px',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '18px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                boxShadow: '0 2px 8px rgba(185, 28, 28, 0.25)'
              }}>
                INVOICE
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                {invoiceNum}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                Tgl: {formattedDate}
              </div>
              <div style={{ marginTop: '6px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: isPaid ? '#DCFCE7' : '#FEF3C7',
                  color: isPaid ? '#15803D' : '#B45309',
                  border: isPaid ? '1px solid #86EFAC' : '1px solid #FCD34D'
                }}>
                  {isPaid ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                  {isPaid ? 'LUNAS / TERKIRIM' : 'MENUNGGU PEMBAYARAN'}
                </span>
              </div>
            </div>
          </div>

          {/* ── DUA KOLOM: BILL TO & INFO PESANAN ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '20px' }}>
            {/* Kolom Kiri: Tagihan Kepada */}
            <div style={{
              background: '#FEF2F2',
              padding: '12px 16px',
              borderRadius: '8px',
              borderLeft: '4px solid #DC2626',
              border: '1px solid #FEE2E2',
              borderLeftWidth: '4px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Tagihan Kepada (Bill To):
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                {order.customer?.name || 'Distributor / Toko Pelanggan'}
              </div>
              <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '2px' }}>
                Kontak: {order.customer?.contact || '-'}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                Alamat / Lokasi: {order.location || 'Wilayah Distribusi Resmi KhumKhum'}
              </div>
            </div>

            {/* Kolom Kanan: Detail Pesanan */}
            <div style={{
              background: '#F9FAFB',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Rincian Pengiriman & Order:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                <span style={{ color: '#6B7280' }}>No. Sales Order:</span>
                <strong style={{ fontFamily: 'monospace', color: '#111827' }}>{orderNum}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                <span style={{ color: '#6B7280' }}>Status Transaksi:</span>
                <strong style={{ color: '#991B1B' }}>{order.status}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#6B7280' }}>Jatuh Tempo:</span>
                <span style={{ color: '#111827', fontWeight: 500 }}>14 Hari setelah terkirim</span>
              </div>
            </div>
          </div>

          {/* ── TABEL RINCIAN ITEM PRODUK JADI ── */}
          <div style={{ marginBottom: '18px', overflow: 'hidden', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#991B1B', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', width: '38px', textAlign: 'center' }}>No</th>
                  <th style={{ padding: '10px 12px' }}>Deskripsi Produk Jamur Crispy</th>
                  <th style={{ padding: '10px 12px', width: '110px' }}>SKU / Varian</th>
                  <th style={{ padding: '10px 12px', width: '80px', textAlign: 'right' }}>Jumlah</th>
                  <th style={{ padding: '10px 12px', width: '110px', textAlign: 'right' }}>Harga Satuan</th>
                  <th style={{ padding: '10px 12px', width: '120px', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
                      Tidak ada rincian item dalam pesanan ini
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const itSubtotal = Number(it.subtotal) || (Number(it.quantity) * Number(it.unit_price)) || 0;
                    return (
                      <tr
                        key={idx}
                        style={{
                          background: idx % 2 === 0 ? '#ffffff' : '#FFF5F5',
                          borderBottom: '1px solid #F3F4F6',
                        }}
                      >
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6B7280' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>
                          {it.product?.name || it.product_id}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#6B7280', fontFamily: 'monospace', fontSize: '11px' }}>
                          {it.product?.sku || 'KHK-CRISPY'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                          {it.quantity} pcs
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4B5563' }}>
                          Rp {(it.unit_price || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#991B1B' }}>
                          Rp {itSubtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── TOTAL & TERBILANG ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '20px' }}>
            {/* Terbilang */}
            <div style={{
              background: '#FFFBEB',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #FDE68A',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Jumlah Terbilang:
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', fontStyle: 'italic', marginTop: '3px' }}>
                &ldquo;{angkaTerbilang(totalAmount)} Rupiah&rdquo;
              </span>
              {order.notes && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#78350F' }}>
                  <strong>Catatan:</strong> {order.notes}
                </div>
              )}
            </div>

            {/* Ringkasan Subtotal & Total */}
            <div style={{
              background: '#FFF1F2',
              padding: '14px 18px',
              borderRadius: '8px',
              border: '1px solid #FCA5A5'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: '#4B5563' }}>Total Kuantitas:</span>
                <strong style={{ color: '#111827' }}>{totalPcs} pcs kemasan</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: '#4B5563' }}>Subtotal Barang:</span>
                <strong style={{ color: '#111827' }}>Rp {totalAmount.toLocaleString('id-ID')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px dashed #F87171' }}>
                <span style={{ color: '#4B5563' }}>Pajak (PPN):</span>
                <span style={{ color: '#15803D', fontWeight: 600 }}>Dikecualikan / Termasuk</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>TOTAL TAGIHAN:</span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#DC2626' }}>
                  Rp {totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* ── FOOTER REKENING & TANDA TANGAN (STEMPEL DIGITAL RESMI KHUMKHUM) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', borderTop: '2px solid #F3F4F6', paddingTop: '16px' }}>
            {/* Petunjuk Pembayaran Bank Transfer */}
            <div style={{ fontSize: '11px', color: '#4B5563' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>
                  Pembayaran Ditransfer Melalui Rekening Resmi:
                </span>
                <button
                  onClick={() => {
                    setTempConfig(config);
                    setIsEditingConfig(true);
                  }}
                  className="no-print"
                  style={{
                    fontSize: '10px',
                    color: '#DC2626',
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: 0,
                  }}
                >
                  [⚙️ Ubah Rekening]
                </button>
              </div>
              <div style={{ background: '#F9FAFB', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E5E7EB', lineHeight: 1.6 }}>
                {config.bank1Account ? (
                  <div>• <strong>{config.bank1Name || 'Bank'}:</strong> {config.bank1Account} a/n <strong>{config.bank1Holder}</strong></div>
                ) : (
                  <div style={{ color: '#DC2626', fontStyle: 'italic' }}>• Rekening bank belum diatur (klik [⚙️ Ubah Rekening] untuk isi)</div>
                )}
                {config.bank2Account && (
                  <div>• <strong>{config.bank2Name || 'Bank'}:</strong> {config.bank2Account} a/n <strong>{config.bank2Holder}</strong></div>
                )}
                <div style={{ color: '#6B7280', fontSize: '10px', marginTop: '4px' }}>{config.notes}</div>
              </div>
            </div>

            {/* Kolom Pengesahan & Cap Pabrik */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '11px', color: '#4B5563' }}>
                Kulon Progo, {format(orderDate, 'dd MMMM yyyy', { locale: idLocale })}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                CV KHAIRA BUANA MANDIRI
              </div>

              {/* Stempel Digital Bundar Merah KhumKhum */}
              <div style={{
                margin: '8px 0',
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                border: '2px dashed #DC2626',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
                transform: 'rotate(-8deg)',
                background: 'rgba(254, 242, 242, 0.6)',
                padding: '4px',
                boxShadow: 'inset 0 0 0 2px rgba(220, 38, 38, 0.2)'
              }}>
                <ShieldCheck size={18} color="#DC2626" />
                <span style={{ fontSize: '7.5px', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase', textAlign: 'center' }}>
                  CV KHAIRA BUANA
                </span>
                <span style={{ fontSize: '7px', fontWeight: 700, color: '#991B1B' }}>
                  ★ RESMI ★
                </span>
                <span style={{ fontSize: '6.5px', fontWeight: 800 }}>
                  SALES & FINANCE
                </span>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B', textDecoration: 'underline' }}>
                Divisi Keuangan & Distribusi
              </div>
            </div>
          </div>

          {/* Catatan Kaki Legal */}
          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #FEE2E2', fontSize: '10px', color: '#9CA3AF' }}>
            Faktur ini diterbitkan secara sah melalui sistem terpadu KhumKhum ERP dan diakui sebagai dokumen penagihan resmi CV Khaira Buana Mandiri.
          </div>
        </div>
      )}
    </Modal>
  );
}
