'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable } from '@/components/data-table/DataTable';
import { useToast } from '@/hooks/useToast';
import { Search, ArrowRight, ArrowLeft, CheckCircle, Clock, AlertTriangle, Trophy } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { searchTraceability, getFarmerRanking } from '@/actions/traceability';
import type { TraceabilityResult, TraceabilityNode, FarmerRanking } from '@/types/database';

/** DataTable requires { id?: string | number } — extend FarmerRanking with id */
type FarmerRankingRow = FarmerRanking & { id: string };

const NODE_STATUS_COLOR: Record<string, string> = {
  completed: 'var(--color-success-600)',
  released: 'var(--color-success-600)',
  in_progress: 'var(--color-primary-600)',
  planned: 'var(--color-warning-600)',
  pending: 'var(--color-warning-600)',
  qc_pending: 'var(--color-warning-600)',
  received: 'var(--color-info-600)',
  sorted: 'var(--color-info-600)',
  failed: 'var(--color-danger-600)',
  rejected: 'var(--color-danger-600)',
  cancelled: 'var(--color-danger-600)',
};

const NODE_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle size={16} />,
  released: <CheckCircle size={16} />,
  in_progress: <Clock size={16} />,
  pending: <Clock size={16} />,
  failed: <AlertTriangle size={16} />,
  rejected: <AlertTriangle size={16} />,
};

export default function TraceabilityPage() {
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState<TraceabilityResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [farmerRanking, setFarmerRanking] = useState<FarmerRanking[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const toast = useToast();

  const loadRanking = useCallback(async () => {
    setLoadingRanking(true);
    const res = await getFarmerRanking();
    if (res.success && res.data) setFarmerRanking(res.data);
    setLoadingRanking(false);
  }, []);

  useEffect(() => { loadRanking(); }, [loadRanking]);

  const handleSearch = async () => {
    const kw = searchInput.trim();
    if (!kw) { toast.error('Masukkan nomor batch untuk dicari'); return; }
    setIsSearching(true);
    const res = await searchTraceability(kw);
    if (res.success && res.data) {
      setResult(res.data);
      if (!res.data.found) toast.warning(`Tidak ditemukan data untuk "${kw}"`);
    } else {
      toast.error(res.error || 'Gagal mencari data');
    }
    setIsSearching(false);
  };

  // ── Farmer Ranking columns ─────────────────────────────────────
  const rankingColumns: ColumnDef<FarmerRankingRow>[] = [
    {
      accessorKey: 'rank',
      header: 'Rank',
      cell: ({ row }) => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: '50%',
          background: row.original.rank === 1 ? '#FFD700' : row.original.rank === 2 ? '#C0C0C0' : row.original.rank === 3 ? '#CD7F32' : 'var(--bg-subtle)',
          fontWeight: 700, fontSize: 'var(--text-sm)',
        }}>
          {row.original.rank}
        </span>
      ),
    },
    { accessorKey: 'farmer_name', header: 'Nama Petani' },
    {
      accessorKey: 'total_supply_kg',
      header: 'Total Pasokan',
      cell: ({ row }) => <strong>{row.original.total_supply_kg.toLocaleString('id-ID')} kg</strong>,
    },
    {
      accessorKey: 'avg_leaf_percentage',
      header: '% Daun Rata-rata',
      cell: ({ row }) => {
        const pct = row.original.avg_leaf_percentage;
        const color = pct >= 80 ? 'var(--color-success-600)' : pct >= 75 ? 'var(--color-warning-600)' : 'var(--color-danger-600)';
        return <strong style={{ color }}>{pct.toFixed(1)}%</strong>;
      },
    },
    { accessorKey: 'delivery_count', header: 'Jml. Setoran', cell: ({ row }) => `${row.original.delivery_count}x` },
    {
      accessorKey: 'grade_a_count',
      header: 'Grade A',
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-success-600)', fontWeight: 600 }}>
          {row.original.grade_a_count}× ({row.original.delivery_count > 0 ? ((row.original.grade_a_count / row.original.delivery_count) * 100).toFixed(0) : 0}%)
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Traceability Engine"
        description="Lacak perjalanan produk 2 arah: Forward (RM → SO) atau Backward (PRD → Petani). Ranking kualitas petani mitra."
        breadcrumbs={[{ label: 'Manajemen' }, { label: 'Traceability' }]}
      />

      {/* ── Search Panel ── */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Search size={20} /> Cari Batch</h3>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                Nomor Batch (RM-xxx untuk Forward, PRD-xxx untuk Backward)
              </label>
              <Input
                placeholder="Contoh: RM-20260812-001 atau PRD-20260812-001"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button variant="primary" onClick={handleSearch} loading={isSearching} leftIcon={<Search size={16} />}>
              Lacak
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {['RM-20260812-001', 'PRD-20260812-001'].map(ex => (
              <button
                key={ex}
                onClick={() => setSearchInput(ex)}
                style={{
                  padding: '2px 10px', borderRadius: '999px', border: '1px solid var(--border-default)',
                  background: 'transparent', cursor: 'pointer', fontSize: 'var(--text-xs)',
                  color: 'var(--color-primary-600)',
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
        </Card>
      </div>

      {/* ── Traceability Chain ── */}
      {result && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {result.search_type === 'FORWARD'
                ? <ArrowRight size={20} color="var(--color-success-600)" />
                : <ArrowLeft size={20} color="var(--color-primary-600)" />
              }
              <strong>
                {result.search_type === 'FORWARD' ? 'Forward Traceability' : 'Backward Traceability'} — {result.search_keyword}
              </strong>
            </div>
            {result.found && (
              <span style={{ padding: '2px 10px', borderRadius: '999px', background: 'var(--color-success-100)', color: 'var(--color-success-700)', fontSize: 'var(--text-xs)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} /> {result.chain.length} tahap ditemukan
              </span>
            )}
            {!result.found && (
              <span style={{ padding: '2px 10px', borderRadius: '999px', background: 'var(--color-danger-100)', color: 'var(--color-danger-700)', fontSize: 'var(--text-xs)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} /> Data tidak ditemukan
              </span>
            )}
          </div>

          {result.found && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {result.chain.map((node, idx) => {
                const statusColor = NODE_STATUS_COLOR[node.status.toLowerCase()] || 'var(--text-secondary)';
                return (
                  <div key={node.id} style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    {/* Timeline spine */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: statusColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 'var(--text-sm)',
                        flexShrink: 0,
                      }}>
                        {node.step}
                      </div>
                      {idx < result.chain.length - 1 && (
                        <div style={{ width: 2, flex: 1, minHeight: 24, background: 'var(--border-default)', margin: '4px 0' }} />
                      )}
                    </div>

                    {/* Node content */}
                    <div style={{
                      flex: 1, padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
                      marginBottom: idx < result.chain.length - 1 ? 0 : 'var(--space-2)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <h4 style={{ margin: 0, fontSize: 'var(--text-base)' }}>{node.label}</h4>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          color: statusColor, fontWeight: 500, fontSize: 'var(--text-sm)',
                        }}>
                          {NODE_STATUS_ICON[node.status.toLowerCase()] || null}
                          {node.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-2)' }}>
                        {Object.entries(node.data).map(([k, v]) => (
                          <div key={k}>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{k}</div>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{v ?? '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </Card>
        </div>
      )}

      {/* ── Farmer Ranking ── */}
      <Card header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Trophy size={20} color="var(--color-warning-500)" />
          <strong>Ranking Kualitas Petani Mitra</strong>
        </div>
      }>
        <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Diurutkan berdasarkan total pasokan dan rata-rata % daun (kualitas). Diperbarui otomatis.
        </p>
        <DataTable columns={rankingColumns} data={farmerRanking.map(r => ({ ...r, id: r.farmer_id } as FarmerRankingRow))} />
      </Card>
    </div>
  );
}
