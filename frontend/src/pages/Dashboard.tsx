import React, { useState, useEffect, useCallback } from 'react';
import { SpatialEmbeddingVisualizer } from '@/components/3d/SpatialEmbeddingVisualizer';
import { SpatialResponsePanel } from '@/components/chat/SpatialResponsePanel';
import {
  FileText, Mic, Film, Terminal, ShieldCheck, Database,
  Cpu, Zap, Activity, ArrowUpRight, Layers, RefreshCw, Loader2,
  AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { statsApi, systemApi } from '@/services/api';
import type { DocumentStats } from '@/services/api';

// ── Tiny stat card ────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, iconColor, loading,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.FC<{ className?: string }>; iconColor: string; loading?: boolean;
}) {
  return (
    <div className="p-4 bg-studio-900 border border-white/8 rounded-sm tactile-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      {loading ? (
        <div className="flex items-center gap-1.5 text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs font-mono">—</span>
        </div>
      ) : (
        <div className="text-lg font-bold text-slate-100 font-mono">{value}</div>
      )}
      {sub && !loading && (
        <div className="text-[10px] text-slate-500 mt-1 font-mono">{sub}</div>
      )}
    </div>
  );
}

// ── Service status dot ────────────────────────────────────────────────────────
function ServiceRow({ label, status }: { label: string; status: string }) {
  const ok = status === 'operational';
  const deg = status === 'degraded';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-slate-400 font-mono">{label}</span>
      <span className={`flex items-center gap-1.5 text-[10px] font-bold font-mono ${ok ? 'text-emerald-400' : deg ? 'text-amber-400' : 'text-red-400'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : deg ? 'bg-amber-400' : 'bg-red-400'}`} />
        {status.toUpperCase()}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await statsApi.get();
      setStats(data);
      setStatsError(false);
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await systemApi.getHealth() as any;
      setHealth(data);
    } catch {
      // silently fail
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchHealth();
    const id = setInterval(() => { fetchStats(); fetchHealth(); }, 10_000);
    return () => clearInterval(id);
  }, [fetchStats, fetchHealth]);

  const totalVectors = stats?.total_chunks_chromadb ?? 0;
  const totalDocs    = stats?.total_documents ?? 0;
  const indexed      = stats?.indexed ?? 0;
  const processing   = stats?.processing ?? 0;

  return (
    <div className="space-y-5 font-mono text-xs">

      {/* ── Hero header ───────────────────────────────────────────────── */}
      <div className="p-5 bg-studio-900 border border-white/8 rounded-sm tactile-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 uppercase font-bold tracking-widest mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AIR-GAPPED // 100% OFFLINE // ZERO TELEMETRY
            </div>
            <h1 className="text-xl font-display font-extrabold text-slate-100 tracking-tight mb-2">
              Offline Multimodal AI Knowledge Hub
            </h1>
            <p className="text-slate-400 font-sans text-[12px] leading-relaxed">
              On-premise semantic retrieval across PDF documents, audio recordings, and video transcripts.
              All data stays local — no internet required.
            </p>
          </div>

          {/* Quick nav */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            {[
              { to: '/documents', icon: FileText, label: 'Document Workspace', color: 'text-blue-400', border: 'border-blue-500/30 hover:border-blue-500/60' },
              { to: '/audio',     icon: Mic,      label: 'Audio Workspace',    color: 'text-amber-400', border: 'border-amber-500/30 hover:border-amber-500/60' },
              { to: '/video',     icon: Film,      label: 'Video Workspace',    color: 'text-violet-400', border: 'border-violet-500/30 hover:border-violet-500/60' },
            ].map(({ to, icon: Icon, label, color, border }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center justify-between px-3 py-2 bg-studio-950 border rounded-sm transition-colors group ${border}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className="text-slate-300 text-[11px] font-bold">{label}</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Real metrics grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Documents"
          value={statsError ? 'Error' : `${totalDocs}`}
          sub={stats ? `${indexed} indexed · ${processing} processing` : undefined}
          icon={Database}
          iconColor="text-blue-400"
          loading={statsLoading}
        />
        <StatCard
          label="Vector Chunks"
          value={statsError ? 'Error' : totalVectors.toLocaleString()}
          sub={stats ? `${stats.embedding_dimensions}D · ${stats.vector_metric}` : undefined}
          icon={Layers}
          iconColor="text-amber-400"
          loading={statsLoading}
        />
        <StatCard
          label="PDF / Audio / Video"
          value={statsError ? 'Error' : stats ? `${stats.pdf_count} / ${stats.audio_count} / ${stats.video_count}` : '—'}
          sub="by file type"
          icon={FileText}
          iconColor="text-emerald-400"
          loading={statsLoading}
        />
        <StatCard
          label="System Status"
          value={healthLoading ? '…' : health?.status?.toUpperCase() ?? 'UNKNOWN'}
          sub={health ? `uptime ${Math.floor((health.uptime_seconds ?? 0) / 60)}m` : undefined}
          icon={Activity}
          iconColor={health?.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}
          loading={healthLoading}
        />
      </div>

      {/* ── Main 2-col layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 3D vector map (2 cols) */}
        <div className="lg:col-span-2">
          <SpatialEmbeddingVisualizer />
        </div>

        {/* Right panel: service health + stats breakdown */}
        <div className="space-y-4">

          {/* Service health */}
          <div className="p-4 bg-studio-900 border border-white/8 rounded-sm tactile-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Service Health
              </span>
              <button
                onClick={() => { fetchHealth(); fetchStats(); }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            {healthLoading ? (
              <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking…
              </div>
            ) : health ? (
              <div>
                <ServiceRow label="API Server"     status={health.services?.api ?? 'unknown'} />
                <ServiceRow label="SQLite DB"      status={health.services?.database ?? 'unknown'} />
                <ServiceRow label="ChromaDB"       status={health.services?.vector_store ?? 'unknown'} />
                <ServiceRow label="Ollama LLM"     status={health.services?.llm ?? 'unknown'} />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" /> Backend unreachable
              </div>
            )}
          </div>

          {/* Knowledge store stats */}
          <div className="p-4 bg-studio-900 border border-white/8 rounded-sm tactile-card">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-klein-bright" />
              Knowledge Store
            </div>
            {statsLoading ? (
              <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading…
              </div>
            ) : statsError ? (
              <div className="text-red-400 text-[11px]">Failed to load stats</div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Total Chunks (ChromaDB)', value: (stats?.total_chunks_chromadb ?? 0).toLocaleString() },
                  { label: 'Total Chunks (SQLite)',   value: (stats?.total_chunks_sqlite ?? 0).toLocaleString() },
                  { label: 'Embedding Dimensions',    value: `${stats?.embedding_dimensions ?? 384}-D` },
                  { label: 'Vector Metric',           value: stats?.vector_metric?.toUpperCase() ?? 'COSINE' },
                  { label: 'Failed Documents',        value: `${stats?.failed ?? 0}`, warn: (stats?.failed ?? 0) > 0 },
                ].map(({ label, value, warn }) => (
                  <div key={label} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                    <span className="text-slate-500">{label}</span>
                    <span className={`font-bold font-mono ${warn ? 'text-red-400' : 'text-slate-200'}`}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Stack info */}
          <div className="p-4 bg-studio-900 border border-white/8 rounded-sm tactile-card">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-bright" />
              AI Stack
            </div>
            <div className="space-y-2">
              {[
                { label: 'LLM Engine',    value: 'Ollama Llama 3.2 3B' },
                { label: 'LLM Temp',      value: 'T=0.0 (deterministic)' },
                { label: 'Embeddings',    value: 'all-MiniLM-L6-v2' },
                { label: 'Speech-to-Text',value: 'Whisper tiny (CPU)' },
                { label: 'Vector Store',  value: 'ChromaDB HNSW' },
                { label: 'PDF Parser',    value: 'PyMuPDF 1.24' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-mono text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Query panel ───────────────────────────────────────────────── */}
      <SpatialResponsePanel defaultSourceFilter="all" />
    </div>
  );
};

export default Dashboard;
