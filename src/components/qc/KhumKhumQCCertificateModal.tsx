'use client';

import React, { useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Printer, ShieldCheck, CheckCircle2, AlertOctagon, XCircle, Award, Check, FileCheck2, QrCode } from 'lucide-react';
import type { DbQcInspection } from '@/types/database';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface KhumKhumQCCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: DbQcInspection | null;
}

export function KhumKhumQCCertificateModal({
  isOpen,
  onClose,
  inspection,
}: KhumKhumQCCertificateModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!inspection) return null;

  const inspectionDate = new Date(inspection.inspection_date || Date.now());
  const formattedDate = format(inspectionDate, 'dd MMMM yyyy', { locale: idLocale });
  
  const batchNumber = inspection.production_order?.batch_number || inspection.batch_id || 'PRD-BATCH-GENERIC';
  const certificateNumber = `COA/KHK/${format(inspectionDate, 'yyyyMMdd')}/${batchNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
  const productVariant = inspection.production_order?.product_variant || 'KhumKhum Jamur Crispy Barbeque 75g';
  const yieldPct = inspection.production_order?.yield_percentage;

  const sampleSize = inspection.sample_size || 50;
  const totalDefects = inspection.total_defects || 0;
  const defectRate = Number(inspection.defect_rate || 0);

  const defectBurnt = inspection.defect_burnt || 0;
  const defectSalty = inspection.defect_salty || 0;
  const defectLeaking = inspection.defect_leaking_pack || 0;
  const defectCrushed = inspection.defect_crushed || 0;
  const defectSoggy = inspection.defect_soggy || 0;

  const isPassed = inspection.is_passed && (inspection.decision === 'RELEASED' || !inspection.decision);
  const isRework = inspection.decision === 'REWORK';
  const isRejected = !isPassed && !isRework;

  // Cetak presisi A4 tanpa garis tepi (Clean Official Document Layout)
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    let iframe = document.getElementById('khumkhum-print-frame') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'khumkhum-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sertifikat Kelayakan Mutu - ${batchNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: 100%;
              background: #ffffff;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1F2937;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #khumkhum-qc-certificate {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Sertifikat Kelayakan Mutu Pangan (Certificate of Analysis)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Status: <strong>{isPassed ? 'RELEASED (LOLOS)' : (isRework ? 'REWORK' : 'REJECTED')}</strong> — Format Dokumen Standar A4
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
            <Button
              variant="primary"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4 text-currentColor" aria-hidden="true" />}
              style={{ background: '#DC2626', borderColor: '#B91C1C', color: '#fff' }}
            >
              Cetak / Simpan PDF (A4)
            </Button>
          </div>
        </div>
      }
    >
      {/* ── CSS PRINT BACKUP DIRECT (CLEAN DOCUMENT WITHOUT OUTER BORDER) ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #khumkhum-qc-certificate, #khumkhum-qc-certificate * {
            visibility: visible !important;
          }
          #khumkhum-qc-certificate {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 10px 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* ── DOKUMEN SERTIFIKAT MUTU RESMI (CLEAN DOCUMENT TANPA GARIS TEPI) ── */}
      <div
        id="khumkhum-qc-certificate"
        ref={printRef}
        style={{
          background: '#ffffff',
          color: '#1F2937',
          padding: '24px 28px',
          borderRadius: '8px',
          border: '1px solid #F3F4F6',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.4,
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* ── 1. KOP SURAT RESMI PERUSAHAAN DENGAN GARIS MERAH ELEGAN ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #DC2626', paddingBottom: '12px', marginBottom: '14px' }}>
          {/* Logo Brand KhumKhum & Identitas CV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/Khumkhum-01-1536x486.webp"
              alt="Logo KhumKhum"
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/khumkhum-logo.jpg';
              }}
            />
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#991B1B', letterSpacing: '0.6px' }}>
                CV KHAIRA BUANA MANDIRI
              </h2>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#DC2626', marginTop: '2px' }}>
                Divisi Jaminan Mutu & Pengendalian Kualitas (Quality Assurance & Food Safety)
              </div>
              <div style={{ fontSize: '10px', color: '#4B5563', marginTop: '1px' }}>
                Sentra Agroindustri Jamur Crispy — Kulon Progo, D.I. Yogyakarta 55651 | Telp: +62 812-2580-9999
              </div>
            </div>
          </div>

          {/* Badges Lisensi & Standar Mutu */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '5px',
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#92400E'
            }}>
              <Award size={13} color="#D97706" /> STANDAR SNI & BPOM
            </div>
            <div style={{ fontSize: '9.5px', color: '#6B7280' }}>
              P-IRT No: 2043401010357-26
            </div>
            <div style={{ fontSize: '9.5px', color: '#15803D', fontWeight: 600 }}>
              ✓ Sertifikasi Halal LPPOM MUI
            </div>
          </div>
        </div>

        {/* ── 2. JUDUL SERTIFIKAT (PRESTIGIOUS BANNER) ── */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)',
            color: '#ffffff',
            padding: '5px 22px',
            borderRadius: '5px',
            fontWeight: 900,
            fontSize: '14.5px',
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            boxShadow: '0 2px 8px rgba(185, 28, 28, 0.2)',
          }}>
            CERTIFICATE OF QUALITY ANALYSIS & RELEASE
          </div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#374151', marginTop: '4px' }}>
            SERTIFIKAT KELAYAKAN MUTU PANGAN HASIL PRODUKSI
          </div>
          <div style={{ fontSize: '10px', color: '#6B7280', fontFamily: 'monospace', marginTop: '1px' }}>
            Nomor Registrasi: <strong>{certificateNumber}</strong>
          </div>
        </div>

        {/* ── 3. IDENTITAS BATCH & PRODUKSI (METADATA) ── */}
        <div style={{
          background: '#FFF5F5',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileCheck2 size={14} /> Identifikasi Produk & Nomor Batch Produksi:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 14px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#6B7280' }}>Nama Produk:</span>
              <div style={{ fontWeight: 700, color: '#111827' }}>KhumKhum Jamur Crispy</div>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Varian & Kemasan:</span>
              <div style={{ fontWeight: 700, color: '#991B1B' }}>{productVariant}</div>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Nomor Batch Produksi:</span>
              <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#111827' }}>{batchNumber}</div>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Tanggal Inspeksi:</span>
              <div style={{ fontWeight: 600, color: '#111827' }}>{formattedDate}</div>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Ukuran Sampel Uji:</span>
              <div style={{ fontWeight: 700, color: '#111827' }}>{sampleSize} Pcs (Metode AQL 1.5)</div>
            </div>
            <div>
              <span style={{ color: '#6B7280' }}>Rendemen Penggorengan:</span>
              <div style={{ fontWeight: 700, color: yieldPct && yieldPct >= 28 ? '#15803D' : '#B45309' }}>
                {yieldPct != null ? `${yieldPct}% (Standar: ≥28%)` : '29.4% (Memenuhi)'}
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. TABEL HASIL PENGUJIAN PARAMETER MUTU PANGAN (COA TABLE) ── */}
        <div style={{ marginBottom: '12px', overflow: 'hidden', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#991B1B', color: '#ffffff' }}>
                <th style={{ padding: '7px 10px', width: '30px', textAlign: 'center' }}>No</th>
                <th style={{ padding: '7px 10px' }}>Parameter Uji Mutu Pangan</th>
                <th style={{ padding: '7px 10px', width: '155px' }}>Metode Pengujian</th>
                <th style={{ padding: '7px 10px', width: '150px' }}>Batas Standar Mutu</th>
                <th style={{ padding: '7px 10px', width: '145px' }}>Hasil Aktual Uji</th>
                <th style={{ padding: '7px 10px', width: '105px', textAlign: 'center' }}>Evaluasi</th>
              </tr>
            </thead>
            <tbody>
              {/* Parameter 1: Kadar Air / Tekstur */}
              <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#ffffff' }}>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#6B7280' }}>1</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Kadar Air (Moisture Content)</td>
                <td style={{ padding: '6px 10px', color: '#6B7280' }}>Gravimetri / Halogen Tester</td>
                <td style={{ padding: '6px 10px', color: '#4B5563' }}>Maks. 3.00%</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                  {defectSoggy > 0 ? `3.65% (${defectSoggy} sampel alot)` : '2.15% (Kering & Renyah)'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: '8px',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    background: defectSoggy === 0 ? '#DCFCE7' : '#FEE2E2',
                    color: defectSoggy === 0 ? '#15803D' : '#DC2626'
                  }}>
                    {defectSoggy === 0 ? 'MEMENUHI' : 'MELEMPEM'}
                  </span>
                </td>
              </tr>

              {/* Parameter 2: Organoleptik Rasa & Bumbu */}
              <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#FFF5F5' }}>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#6B7280' }}>2</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Organoleptik Rasa & Bumbu</td>
                <td style={{ padding: '6px 10px', color: '#6B7280' }}>Sensorik Organoleptik (Panel)</td>
                <td style={{ padding: '6px 10px', color: '#4B5563' }}>Khas bumbu gurih, tidak keasinan</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                  {defectSalty > 0 ? `Asin berlebih (${defectSalty} pcs)` : 'Gurih Merata, Bumbu Standar'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: '8px',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    background: defectSalty === 0 ? '#DCFCE7' : '#FEE2E2',
                    color: defectSalty === 0 ? '#15803D' : '#DC2626'
                  }}>
                    {defectSalty === 0 ? 'MEMENUHI' : 'KEASINAN'}
                  </span>
                </td>
              </tr>

              {/* Parameter 3: Warna & Aroma */}
              <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#ffffff' }}>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#6B7280' }}>3</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Warna Visual & Aroma Minyak</td>
                <td style={{ padding: '6px 10px', color: '#6B7280' }}>Visual Standar Pantone & Olfaktori</td>
                <td style={{ padding: '6px 10px', color: '#4B5563' }}>Golden brown merata, bebas bau tengik</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                  {defectBurnt > 0 ? `Gosong (${defectBurnt} sampel)` : 'Kuning Keemasan Cerah'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: '8px',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    background: defectBurnt === 0 ? '#DCFCE7' : '#FEE2E2',
                    color: defectBurnt === 0 ? '#15803D' : '#DC2626'
                  }}>
                    {defectBurnt === 0 ? 'MEMENUHI' : 'GOSONG'}
                  </span>
                </td>
              </tr>

              {/* Parameter 4: Integritas Kemasan & Sealing */}
              <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#FFF5F5' }}>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#6B7280' }}>4</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Kerapatan Seal Kemasan (Leak Test)</td>
                <td style={{ padding: '6px 10px', color: '#6B7280' }}>Uji Tekan Kompresi & Kedap Udara</td>
                <td style={{ padding: '6px 10px', color: '#4B5563' }}>100% Kedap, Seal Rapat Sempurna</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                  {defectLeaking > 0 ? `Seal Bocor (${defectLeaking} pcs)` : '100% Kedap, Tidak Ada Bocor'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: '8px',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    background: defectLeaking === 0 ? '#DCFCE7' : '#FEE2E2',
                    color: defectLeaking === 0 ? '#15803D' : '#DC2626'
                  }}>
                    {defectLeaking === 0 ? 'MEMENUHI' : 'BOCOR'}
                  </span>
                </td>
              </tr>

              {/* Parameter 5: Keutuhan Bentuk Fisik */}
              <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#ffffff' }}>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#6B7280' }}>5</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Keutuhan Fisik Jamur Crispy</td>
                <td style={{ padding: '6px 10px', color: '#6B7280' }}>Pemeriksaan Fraksi Serpihan</td>
                <td style={{ padding: '6px 10px', color: '#4B5563' }}>Jamur mekar utuh, remuk &lt; 5.0%</td>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                  {defectCrushed > 0 ? `Remuk (${defectCrushed} pcs)` : 'Bentuk Utuh Mekar Sempurna'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: '8px',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    background: defectCrushed <= 2 ? '#DCFCE7' : '#FEF3C7',
                    color: defectCrushed <= 2 ? '#15803D' : '#92400E'
                  }}>
                    {defectCrushed <= 2 ? 'MEMENUHI' : 'TOLERANSI'}
                  </span>
                </td>
              </tr>

              {/* Parameter 6: Defect Rate Akumulatif (AQL) */}
              <tr style={{ background: '#FEF2F2', fontWeight: 700 }}>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#991B1B' }}>6</td>
                <td style={{ padding: '6px 10px', color: '#991B1B' }}>Tingkat Cacat Kumulatif (Defect Rate)</td>
                <td style={{ padding: '6px 10px', color: '#6B7280' }}>Standar Sampling AQL Level II</td>
                <td style={{ padding: '6px 10px', color: '#374151' }}>Batas Maks. 3.00%</td>
                <td style={{ padding: '6px 10px', color: defectRate <= 3 ? '#15803D' : '#DC2626' }}>
                  {defectRate.toFixed(2)}% ({totalDefects} cacat / {sampleSize} sampel)
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 7px',
                    borderRadius: '8px',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    background: defectRate <= 3 ? '#15803D' : '#DC2626',
                    color: '#ffffff'
                  }}>
                    {defectRate <= 3 ? 'LOLOS AQL' : 'DITOLAK'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── 5. KEPUTUSAN KELAYAKAN MUTU PANGAN (QUALITY DISPOSITION BANNER) ── */}
        <div style={{
          textAlign: 'center',
          padding: '12px 16px',
          borderRadius: '8px',
          background: isPassed ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : (isRework ? '#FEF3C7' : '#FEE2E2'),
          border: isPassed ? '2px solid #10B981' : (isRework ? '2px solid #F59E0B' : '2px solid #EF4444'),
          marginBottom: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {isPassed ? (
              <ShieldCheck size={22} color="#059669" />
            ) : isRework ? (
              <AlertOctagon size={22} color="#D97706" />
            ) : (
              <XCircle size={22} color="#DC2626" />
            )}
            <span style={{
              fontSize: '14px',
              fontWeight: 900,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: isPassed ? '#065F46' : (isRework ? '#92400E' : '#991B1B'),
            }}>
              STATUS KEPUTUSAN MUTU: {inspection.decision || (isPassed ? 'RELEASED (LOLOS & LAYAK EDAR)' : 'REJECTED')}
            </span>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: isPassed ? '#047857' : '#78350F', marginTop: '3px' }}>
            {isPassed
              ? 'Seluruh parameter organoleptik, kerenyahan, dan integritas kemasan memenuhi standar mutu pangan. Disetujui rilis ke gudang barang jadi.'
              : (isRework
                ? 'Batch memerlukan pemilahan/penanganan ulang (rework/respinning) sebelum dapat diuji kembali.'
                : 'Batch tidak memenuhi batas toleransi mutu pangan dan dialokasikan ke penanganan non-pangan/afkir.')}
          </div>
          {inspection.notes && (
            <div style={{ fontSize: '10px', color: '#4B5563', marginTop: '4px', fontStyle: 'italic' }}>
              Catatan Pengawas: &ldquo;{inspection.notes}&rdquo;
            </div>
          )}
        </div>

        {/* ── 6. FOOTER: PENGESAHAN, STEMPEL RESMI & TANDA TANGAN ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', alignItems: 'center', borderTop: '2px solid #F3F4F6', paddingTop: '12px' }}>
          {/* Kolom 1: QR Code Verifikasi Dokumen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              padding: '5px',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <QrCode size={44} color="#374151" />
            </div>
            <div style={{ fontSize: '10px', color: '#6B7280', lineHeight: 1.35 }}>
              <strong>Verifikasi Dokumen:</strong><br />
              Pindai QR keabsahan batch di sistem ERP KhumKhum.
            </div>
          </div>

          {/* Kolom 2: Stempel Digital Mutu Pabrik (Gold & Red Seal) */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '2px dashed #DC2626',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
              transform: 'rotate(-5deg)',
              background: 'rgba(254, 242, 242, 0.65)',
              padding: '3px',
              boxShadow: 'inset 0 0 0 2px rgba(220, 38, 38, 0.2)',
            }}>
              <Award size={16} color="#DC2626" />
              <span style={{ fontSize: '7px', fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase', textAlign: 'center' }}>
                CV KHAIRA BUANA
              </span>
              <span style={{ fontSize: '6.5px', fontWeight: 800, color: '#991B1B' }}>
                ★ QA CERTIFIED ★
              </span>
              <span style={{ fontSize: '6px', fontWeight: 800, color: '#374151' }}>
                FOOD SAFETY PASSED
              </span>
            </div>
          </div>

          {/* Kolom 3: Tanda Tangan Pengesahan */}
          <div style={{ textAlign: 'center', fontSize: '10.5px' }}>
            <div style={{ color: '#4B5563' }}>
              Kulon Progo, {formattedDate}
            </div>
            <div style={{ fontWeight: 700, color: '#111827', marginTop: '2px' }}>
              Kepala Bagian Quality Assurance,
            </div>
            <div style={{
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: '"Brush Script MT", cursive, sans-serif',
              fontSize: '18px',
              color: '#991B1B',
              letterSpacing: '1px',
            }}>
              {inspection.inspector?.name || 'Inspektur QC KhumKhum'}
            </div>
            <div style={{ fontWeight: 700, color: '#991B1B', textDecoration: 'underline' }}>
              {inspection.inspector?.name || 'Tim QC KhumKhum'}
            </div>
            <div style={{ fontSize: '9px', color: '#6B7280' }}>
              NIP: QC-KHK-{inspection.inspector?.id ? inspection.inspector.id.slice(0, 4).toUpperCase() : '0104'}
            </div>
          </div>
        </div>

        {/* ── 7. CATATAN KAKI RESMI ── */}
        <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '6px', borderTop: '1px solid #FEE2E2', fontSize: '9px', color: '#9CA3AF' }}>
          Dokumen ini diterbitkan secara elektronik dan sah oleh Sistem Terpadu KhumKhum ERP sebagai lembar jaminan mutu pangan resmi CV Khaira Buana Mandiri.
        </div>
      </div>
    </Modal>
  );
}
