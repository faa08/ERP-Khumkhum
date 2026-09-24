'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { FileSpreadsheet, UploadCloud, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { importHistoricalData } from '@/actions/forecast-import';

export default function HistoricalImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successResult, setSuccessResult] = useState<{ count: number } | null>(null);
  const toast = useToast();

  const handleDownloadTemplate = () => {
    // API endpoint for template generation
    window.location.href = '/api/forecast-template';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
      } else {
        toast.error('Gunakan file .xlsx dari template yang disediakan');
        e.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await importHistoricalData(formData);
      if (res.success) {
        toast.success(`Berhasil mengimpor ${res.count} baris data historis!`);
        setSuccessResult({ count: res.count || 0 });
        setFile(null);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengimpor data');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Impor Data Historis"
        description="Migrasikan rekap data Produksi dan Penjualan masa lalu agar AI Forecasting Anda menjadi cerdas."
        breadcrumbs={[{ label: 'Data Induk' }, { label: 'Impor Data Historis' }]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
        
        {/* Step 1: Download */}
        <Card>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <div style={{ 
              background: 'var(--color-primary-50)', 
              color: 'var(--color-primary-600)', 
              padding: 'var(--space-3)', 
              borderRadius: 'var(--radius-full)' 
            }}>
              <FileSpreadsheet size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Langkah 1: Unduh Template Multi-Sheet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                Template Excel ini terdiri dari 3 lembar (Sheet): Panduan, Data Produksi, dan Data Penjualan. 
                Pisahkan rekap data Anda ke sheet yang sesuai agar sistem bisa memprosesnya dengan akurat.
              </p>
            </div>
            <div>
              <Button variant="secondary" onClick={handleDownloadTemplate}>
                Download Template (.xlsx)
              </Button>
            </div>
          </div>
        </Card>

        {/* Step 2: Upload */}
        <Card>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
            <div style={{ 
              background: 'var(--color-success-50)', 
              color: 'var(--color-success-600)', 
              padding: 'var(--space-3)', 
              borderRadius: 'var(--radius-full)' 
            }}>
              <UploadCloud size={32} />
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Langkah 2: Unggah Data Historis</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: '4px', marginBottom: 'var(--space-4)' }}>
                Pastikan Anda hanya mengisi kolom yang disediakan di dalam template. Sistem akan memproses baris demi baris secara otomatis.
              </p>

              {!successResult ? (
                <div style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: 'var(--space-6)', 
                  textAlign: 'center',
                  background: 'var(--bg-subtle)'
                }}>
                  <input 
                    type="file" 
                    id="excel-upload" 
                    accept=".xlsx" 
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="excel-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{ 
                      padding: 'var(--space-3)', 
                      background: file ? 'var(--color-success-100)' : 'var(--color-primary-50)', 
                      color: file ? 'var(--color-success-600)' : 'var(--color-primary-600)', 
                      borderRadius: '50%' 
                    }}>
                      {file ? <CheckCircle2 size={24} /> : <UploadCloud size={24} />}
                    </div>
                    {file ? (
                      <span style={{ fontWeight: 600, color: 'var(--color-success-700)' }}>{file.name}</span>
                    ) : (
                      <span>
                        <span style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}>Klik untuk memilih file</span> atau seret file ke sini
                      </span>
                    )}
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Hanya mendukung file .xlsx</span>
                  </label>

                  {file && (
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                      <Button variant="secondary" onClick={() => setFile(null)} disabled={isUploading} style={{ width: '100%', maxWidth: '140px' }}>
                        Batal
                      </Button>
                      <Button variant="primary" onClick={handleUpload} loading={isUploading} style={{ width: '100%', maxWidth: '200px' }}>
                        Mulai Proses Migrasi
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  padding: 'var(--space-4)', 
                  background: 'var(--color-success-50)', 
                  border: '1px solid var(--color-success-200)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)'
                }}>
                  <CheckCircle2 color="var(--color-success-600)" size={32} />
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--color-success-800)' }}>Migrasi Selesai!</h4>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success-700)' }}>
                      Berhasil menyuntikkan <strong>{successResult.count}</strong> baris data historis ke dalam sistem. AI Forecasting Anda kini sudah membaca data masa lalu.
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Button variant="secondary" onClick={() => setSuccessResult(null)}>Upload Lagi</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-3)', 
          padding: 'var(--space-4)', 
          background: 'var(--color-warning-50)', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid var(--color-warning-200)' 
        }}>
          <AlertCircle color="var(--color-warning-600)" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontWeight: 600, color: 'var(--color-warning-800)', fontSize: 'var(--text-sm)' }}>Catatan Penting</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-warning-700)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              <li>Tabel ini hanya untuk memasukkan data yang sudah lewat (tahun lalu atau bulan lalu).</li>
              <li>Jangan menggunakan fitur ini untuk memasukkan pesanan atau produksi yang sedang berjalan hari ini (gunakan menu operasional di samping).</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
