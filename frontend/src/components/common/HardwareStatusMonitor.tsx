import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Cpu, Activity, CheckCircle2, XCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { systemApi } from '@/services/api';

type ServiceStatus = 'operational' | 'degraded' | 'error' | 'unknown';

interface HealthData {
  status: string;
  uptime_seconds: number;
  version: string;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    vector_store: ServiceStatus;
    llm: ServiceStatus;
  };
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  if (status === 'operational') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'degraded')    return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  return <XCircle className="w-3.5 h-3.5 text-red-400" />;
}

export const HardwareStatusMonitor: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await systemApi.getHealth() as HealthData;
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 15_000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  const overallOk  = health?.status === 'healthy';
  const overallDeg = health?.status === 'degraded';
  const llmOk      = health?.services?.llm === 'operational';

  const uptime = health?.uptime_seconds
    ? health.uptime_seconds < 3600
      ? `${Math.floor(health.uptime_seconds / 60)}m`
      : `${Math.floor(health.uptime_seconds / 3600)}h`
    : null;

  return (
    <div className="flex items-center gap-2">

      {/* Compact status pill */}
      <button
        onClick={() => setShowDrawer(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border font-mono text-xs transition-colors cursor-pointer ${
          loading
            ? 'bg-studio-900 border-white/10 text-slate-500'
            : overallOk
            ? 'bg-studio-900 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/60'
            : overallDeg
            ? 'bg-studio-900 border-amber-500/30 text-amber-400 hover:border-amber-500/60'
            : 'bg-studio-900 border-red-500/30 text-red-400 hover:border-red-500/60'
        }`}
        title="Click to view service status"
      >
        <span className={`w-2 h-2 rounded-full ${
          loading       ? 'bg-slate-600'
          : overallOk   ? 'bg-emerald-400 animate-pulse'
          : overallDeg  ? 'bg-amber-400'
          : 'bg-red-400'
        }`} />
        <ShieldCheck className="w-3 h-3" />
        <span className="text-[10px] font-bold tracking-wide">
          {loading
            ? 'CHECKING…'
            : overallOk ? 'ALL SYSTEMS OK'
            : overallDeg ? 'DEGRADED'
            : 'OFFLINE'}
        </span>
        {uptime && <span className="text-[9px] text-slate-500">{uptime}</span>}
      </button>

      {/* LLM indicator */}
      <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-studio-900 border rounded-sm font-mono text-[10px] ${
        llmOk ? 'border-white/10 text-slate-400' : 'border-amber-500/30 text-amber-400'
      }`}>
        <Cpu className="w-3 h-3" />
        <span>OLLAMA</span>
        <span className={`font-bold ${llmOk ? 'text-emerald-400' : 'text-amber-400'}`}>
          {loading ? '…' : llmOk ? 'READY' : 'OFFLINE'}
        </span>
      </div>

      {/* Detail drawer modal */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-studio-900 border border-white/15 rounded-sm p-5 shadow-2xl font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2 text-slate-100 font-bold tracking-wider text-sm">
                <Activity className="w-4 h-4 text-blue-400" />
                SERVICE HEALTH MONITOR
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchHealth}
                  className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Overall status */}
            <div className={`flex items-center justify-between p-3 rounded-sm border mb-4 ${
              overallOk  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
              : overallDeg ? 'bg-amber-950/30 border-amber-500/30 text-amber-400'
              : 'bg-red-950/30 border-red-500/30 text-red-400'
            }`}>
              <span className="text-xs font-bold tracking-wider">
                SYSTEM STATUS: {health?.status?.toUpperCase() ?? 'UNKNOWN'}
              </span>
              {uptime && (
                <span className="text-[10px] opacity-70">UPTIME: {uptime}</span>
              )}
            </div>

            {/* Per-service rows */}
            <div className="space-y-2 mb-4">
              {([
                { key: 'api',          label: 'API Server (FastAPI)' },
                { key: 'database',     label: 'Database (SQLite)' },
                { key: 'vector_store', label: 'Vector Store (ChromaDB)' },
                { key: 'llm',          label: 'LLM Engine (Ollama)' },
              ] as const).map(({ key, label }) => {
                const s = health?.services?.[key] ?? 'unknown';
                return (
                  <div key={key} className="flex items-center justify-between p-2.5 bg-studio-950 border border-white/8 rounded-sm">
                    <span className="text-[11px] text-slate-300">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={s as ServiceStatus} />
                      <span className={`text-[10px] font-bold uppercase ${
                        s === 'operational' ? 'text-emerald-400'
                        : s === 'degraded'  ? 'text-amber-400'
                        : 'text-red-400'
                      }`}>{s}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI stack reference */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {[
                { label: 'LLM',        value: 'Llama 3.2 3B · T=0.0' },
                { label: 'Embeddings', value: 'all-MiniLM-L6-v2 · 384D' },
                { label: 'Speech',     value: 'Whisper tiny · 32× CPU' },
                { label: 'Metric',     value: 'ChromaDB HNSW Cosine' },
              ].map(({ label, value }) => (
                <div key={label} className="p-2 bg-studio-950 border border-white/8 rounded-sm">
                  <div className="text-slate-600 mb-0.5">{label}</div>
                  <div className="text-slate-300 font-mono">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-600">
              <span>v{health?.version ?? '—'}</span>
              <span>Auto-refresh every 15s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
