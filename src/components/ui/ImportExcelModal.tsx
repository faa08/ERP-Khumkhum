'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Download, Upload, FileSpreadsheet, Sparkles, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  expectedColumns: string[];
  onDownloadTemplate: () => Promise<void>;
  onImportData: (data: any[]) => Promise<{ success: boolean; error?: string }>;
}

function getSimilarity(s1: string, s2: string) {
  const a = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  
  // Simple substring check
  let matchCount = 0;
  for(let i=0; i<a.length-2; i++) {
      if(b.includes(a.substring(i, i+3))) matchCount++;
  }
  return matchCount / Math.max(a.length, b.length);
}

export function ImportExcelModal({
  isOpen,
  onClose,
  title,
  expectedColumns,
  onDownloadTemplate,
  onImportData,
}: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawData, setRawData] = useState<any[] | null>(null);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setRawData(null);
      setFileColumns([]);
      setShowMapping(false);
      setColumnMapping({});
      setParsedData(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setRawData(null);
      setParsedData(null);
      setShowMapping(false);
    }
  };

  const handleParse = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const XLSX = require('xlsx');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json = XLSX.utils.sheet_to_json(worksheet);
        if (json.length === 0) {
          toast.error('File Excel/CSV kosong.');
          return;
        }

        const keys = Object.keys(json[0] as any);
        setFileColumns(keys);
        setRawData(json);

        // Check if perfect match
        const isPerfectMatch = expectedColumns.every(col => keys.includes(col));
        
        if (isPerfectMatch) {
          setParsedData(json);
        } else {
          // AI Mapping Mode
          const initialMapping: Record<string, string> = {};
          expectedColumns.forEach(expectedCol => {
            let bestMatch = '';
            let highestScore = 0;
            
            keys.forEach(fileCol => {
              const score = getSimilarity(expectedCol, fileCol);
              if (score > highestScore) {
                highestScore = score;
                bestMatch = fileCol;
              }
            });
            
            initialMapping[expectedCol] = highestScore > 0.3 ? bestMatch : '';
          });
          
          setColumnMapping(initialMapping);
          setShowMapping(true);
        }

      } catch (err) {
        console.error(err);
        toast.error('Gagal membaca file. Pastikan formatnya .xlsx atau .csv');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const applyMapping = () => {
    if (!rawData) return;
    
    // Transform data
    const transformed = rawData.map(row => {
      const newRow: any = {};
      expectedColumns.forEach(expCol => {
        const mappedKey = columnMapping[expCol];
        newRow[expCol] = mappedKey ? row[mappedKey] : undefined;
      });
      // also keep original columns just in case
      return { ...row, ...newRow };
    });
    
    setParsedData(transformed);
    setShowMapping(false);
    toast.success('Mapping berhasil diaplikasikan!');
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setIsProcessing(true);
    const res = await onImportData(parsedData);
    setIsProcessing(false);
    
    if (res.success) {
      toast.success('Data berhasil di-import!');
      setFile(null);
      setParsedData(null);
      onClose();
    } else {
      toast.error(res.error || 'Gagal melakukan import.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>Batal</Button>
          <Button 
            variant="primary" 
            onClick={handleImport} 
            disabled={!parsedData || showMapping}
            loading={isProcessing}
          >
            Import Data
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ 
          background: 'var(--color-primary-50)', 
          padding: 'var(--space-4)', 
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--color-primary-300)'
        }}>
          <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-sm)', color: 'var(--color-primary-900)' }}>
            Langkah 1: Gunakan Template
          </h4>
          <p style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Gunakan template Excel standar, ATAU upload Excel format Anda sendiri. Sistem AI kami akan mencocokkan kolom secara otomatis!
          </p>
          <Button 
            variant="secondary" 
            size="sm" 
            leftIcon={<Download size={14} />}
            onClick={onDownloadTemplate}
          >
            Download Template Excel
          </Button>
        </div>

        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: 'var(--space-4)', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)'
        }}>
          <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
            Langkah 2: Upload File
          </h4>
          <p style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Upload file Excel (.xlsx) atau CSV.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button 
              variant="secondary" 
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<FileSpreadsheet size={16} />}
            >
              Pilih File
            </Button>
            {file && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                {file.name}
              </span>
            )}
          </div>
          
          {file && !rawData && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Button 
                variant="primary" 
                onClick={handleParse} 
                leftIcon={<Upload size={16} />}
                fullWidth
              >
                Baca File
              </Button>
            </div>
          )}
        </div>

        {showMapping && (
          <div style={{ 
            background: 'var(--color-warning-50)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-warning-300)'
          }}>
            <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-sm)', color: 'var(--color-warning-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} /> AI Column Mapping
            </h4>
            <p style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--text-xs)', color: 'var(--color-warning-800)' }}>
              Format kolom file Anda berbeda dengan standar. AI kami telah mencoba mencocokkan kolom Anda dengan kebutuhan sistem. Mohon periksa kembali:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {expectedColumns.map(expCol => (
                <div key={expCol} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 600 }}>{expCol}</div>
                  <div style={{ flex: 1 }}>
                    <select
                      value={columnMapping[expCol] || ''}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, [expCol]: e.target.value }))}
                      style={{ 
                        width: '100%', padding: '6px 12px', borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--border-default)', fontSize: 'var(--text-sm)'
                      }}
                    >
                      <option value="">-- Jangan diisi --</option>
                      {fileColumns.map(fc => (
                        <option key={fc} value={fc}>{fc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={applyMapping} leftIcon={<CheckCircle2 size={16} />}>
                Konfirmasi Mapping
              </Button>
            </div>
          </div>
        )}

        {parsedData && !showMapping && (
          <div style={{ 
            background: 'var(--color-success-50)', 
            padding: 'var(--space-4)', 
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-success-200)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)'
          }}>
            <div style={{ background: 'var(--color-success-200)', padding: '6px', borderRadius: '50%' }}>
              <Upload size={18} className="text-[var(--color-success-700)]" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 'var(--text-sm)', color: 'var(--color-success-900)' }}>
                File Siap Di-import
              </h4>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-success-800)' }}>
                Ditemukan <strong>{parsedData.length} baris data</strong> yang valid. Klik tombol "Import Data" di bawah untuk menyimpan ke database.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
