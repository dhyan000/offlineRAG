/**
 * Settings / System Configuration Page
 * ======================================
 * Read-only display of the fixed system configuration.
 * All values are set in backend .env / config.py and are informational.
 * Settings that do nothing are not shown — only real config is displayed.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon, Cpu, Database, Layers, FileText,
  Mic, Film, ShieldCheck, Activity, CheckCircle2, AlertTriangle,
  XCircle, RefreshCw, Loader2, Info
} from 'lucide-react';
import { systemApi, statsApi } from '@/services/api';
import type { DocumentStats } from '@/services/api';

// ── small helpers ──────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = true, accent }: {
  label: string; value: string | number; mono?: boolean; accent?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className={`text-[12px] font-medium ${accent ?? 'text-slate-300'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor, children }: {
  title: string;
  icon: React.FC<{ className?: string }>;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-studio-900 border border-white/8 rounded-sm tactile-card">
      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-3 pb-2 border-b border-white/8 ${iconColor}`}>
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok  = status === 'operational';
  const deg = status === 'degraded';
  return (
    <span className={`flex items-center gap-1 text-[11px] font-bold font-mono ${ok ? 'text-emerald-400' : deg ? 'text-amber-400' : 'text-red-400'}`}>
      {ok  ? <CheckCircle2 className="w-3.5 h-3.5" />
      : deg ? <AlertTriangle className="w-3.5 h-3.5" />
      :       <XCircle className="w-3.5 h-3.5" />}
      {status.toUpperCase()}
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Settings() {
  const [health, setHealth]       = useState<any>(null);
  const [version, setVersion]     = useState<any>(null);
  const [stats, setStats]         = useState<DocumentStats | null>(null);
  const [loading, setLoading]     = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [h, v, s] = await Promise.allSettled([
        systemApi.getHealth(),
        systemApi.getVersion(),
        statsApi.get(),
      ]);
      if (h.status === 'fulfilled') setHealth(h.value);
      if (v.status === 'fulfilled') setVersion(v.value);
      if (s.status === 'fulfilled') setStats(s.value as DocumentStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uptime = health?.uptime_seconds
    ? health.uptime_seconds < 3600
      ? `${Math.floor(health.uptime_seconds / 60)}m ${Math.floor(health.uptime_seconds % 60)}s`
      : `${Math.floor(health.uptime_seconds / 3600)}h ${Math.floor((health.uptime_seconds % 3600) / 60)}m`
    : '—';

  return (
    <div className="space-y-5 animate-fadeIn max-w-4xl mx-auto font-mono text-xs">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-100 font-bold text-base">
            <SettingsIcon className="w-4 h-4 text-slate-400" />
            System Configuration
          </div>
          <p className="text-slate-500 text-[12px] mt-1 font-sans">
            Live read-out of the running configuration. Settings are configured in <code className="text-blue-400">backend/.env</code> and restart-required.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] border border-white/10 px-3 py-1.5 rounded-sm text-slate-400 hover:text-slate-200 hover:border-white/20 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading system configuration…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Service Health */}
          <SectionCard title="Service Health" icon={Activity} iconColor="text-emerald-400">
            <div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-[12px] text-slate-500">Overall Status</span>
                <span className={`text-[12px] font-bold font-mono ${
                  health?.status === 'healthy' ? 'text-emerald-400'
                  : health?.status === 'degraded' ? 'text-amber-400'
                  : 'text-red-400'
                }`}>
                  {health?.status?.toUpperCase() ?? 'UNKNOWN'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-[12px] text-slate-500">API Server</span>
                <StatusBadge status={health?.services?.api ?? 'unknown'} />
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-[12px] text-slate-500">SQLite Database</span>
                <StatusBadge status={health?.services?.database ?? 'unknown'} />
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-[12px] text-slate-500">ChromaDB</span>
                <StatusBadge status={health?.services?.vector_store ?? 'unknown'} />
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-[12px] text-slate-500">Ollama LLM</span>
                <StatusBadge status={health?.services?.llm ?? 'unknown'} />
              </div>
              <InfoRow label="Uptime" value={uptime} />
            </div>
          </SectionCard>

          {/* Application version */}
          <SectionCard title="Application" icon={SettingsIcon} iconColor="text-slate-400">
            <InfoRow label="App Name"    value={version?.app_name ?? '—'} mono={false} />
            <InfoRow label="Version"     value={version?.version ?? '—'} />
            <InfoRow label="Environment" value={version?.environment ?? '—'} />
            <InfoRow label="Framework"   value={version?.framework ?? 'FastAPI'} />
            <InfoRow label="Python"      value={version?.python_version ?? '3.11+'} />
            <InfoRow label="Build Date"  value={version?.build_date ?? '—'} />
            <InfoRow label="API Base"    value="http://localhost:8000" />
          </SectionCard>

          {/* LLM / AI stack */}
          <SectionCard title="AI Engine Stack" icon={Cpu} iconColor="text-amber-400">
            <InfoRow label="LLM Runtime"      value="Ollama" />
            <InfoRow label="LLM Model"        value="llama3.2:3b" />
            <InfoRow label="Temperature"      value="0.0 (deterministic)" />
            <InfoRow label="Embedding Model"  value="all-MiniLM-L6-v2" accent="text-blue-400" />
            <InfoRow label="Embed Dimensions" value="384-D" />
            <InfoRow label="Speech Model"     value="Whisper tiny (CPU)" />
            <InfoRow label="PDF Parser"       value="PyMuPDF 1.24" />
            <InfoRow label="Chunking"         value="Fixed-size + overlap" />
          </SectionCard>

          {/* Vector store */}
          <SectionCard title="Vector Store" icon={Database} iconColor="text-blue-400">
            <InfoRow label="Engine"      value="ChromaDB (HNSW)" />
            <InfoRow label="Distance"    value="Cosine" />
            <InfoRow label="Persistence" value="Disk (storage/chromadb)" />
            <InfoRow label="Collection"  value="documents" />
            <InfoRow label="Total Chunks (live)" value={(stats?.total_chunks_chromadb ?? 0).toLocaleString()} accent="text-emerald-400" />
            <InfoRow label="Embed Dims"  value={`${stats?.embedding_dimensions ?? 384}-D`} />
            <InfoRow label="Metric"      value={stats?.vector_metric?.toUpperCase() ?? 'COSINE'} />
          </SectionCard>

          {/* Document store */}
          <SectionCard title="Document Store" icon={Layers} iconColor="text-violet-400">
            <InfoRow label="Database"          value="SQLite" />
            <InfoRow label="Path"              value="storage/app.db" />
            <InfoRow label="Total Documents"   value={stats?.total_documents ?? '—'} accent="text-slate-200" />
            <InfoRow label="Indexed"           value={stats?.indexed ?? '—'} accent="text-emerald-400" />
            <InfoRow label="Processing"        value={stats?.processing ?? '—'} accent="text-amber-400" />
            <InfoRow label="Failed"            value={stats?.failed ?? '—'} accent={(stats?.failed ?? 0) > 0 ? 'text-red-400' : 'text-slate-300'} />
            <InfoRow label="PDF / TXT"         value={stats?.pdf_count ?? '—'} accent="text-blue-400" />
            <InfoRow label="Audio"             value={stats?.audio_count ?? '—'} accent="text-amber-400" />
            <InfoRow label="Video"             value={stats?.video_count ?? '—'} accent="text-violet-400" />
          </SectionCard>

          {/* Security */}
          <SectionCard title="Security & Privacy" icon={ShieldCheck} iconColor="text-emerald-400">
            <InfoRow label="Mode"             value="Air-gapped (100% offline)" accent="text-emerald-400" mono={false} />
            <InfoRow label="External Calls"   value="0 (zero telemetry)" accent="text-emerald-400" />
            <InfoRow label="Data Residency"   value="Local disk only" />
            <InfoRow label="API Auth"         value="None (local network)" />
            <InfoRow label="File Dedup"       value="MD5 hash check" />
            <div className="mt-3 p-2.5 bg-emerald-950/30 border border-emerald-500/20 rounded-sm text-[11px] text-emerald-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              All AI inference, vector search, speech recognition, and data storage runs entirely on this machine. No data ever leaves the local network.
            </div>
          </SectionCard>

        </div>
      )}
    </div>
  );
}
