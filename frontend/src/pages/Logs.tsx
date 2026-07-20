/**
 * Logs Page
 * ==========
 * Real-time application log viewer with level filtering.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollText, RefreshCw, Download, AlertCircle, Info, AlertTriangle, Bug, Zap, type LucideIcon } from 'lucide-react';
import type { LogLevel, LogEntry } from '@/types';

// ── Log level styles ──────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<LogLevel, { bg: string; text: string; icon: LucideIcon }> = {
  DEBUG: { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', icon: Bug },
  INFO: { bg: 'rgba(59,130,246,0.1)', text: '#93c5fd', icon: Info },
  WARNING: { bg: 'rgba(245,158,11,0.1)', text: '#fcd34d', icon: AlertTriangle },
  ERROR: { bg: 'rgba(239,68,68,0.1)', text: '#fca5a5', icon: AlertCircle },
  CRITICAL: { bg: 'rgba(239,68,68,0.2)', text: '#f87171', icon: Zap },
};

const LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

// ── Sample startup logs ───────────────────────────────────────────────────────

const SAMPLE_LOGS: LogEntry[] = [
  { id: '1', timestamp: new Date().toISOString(), level: 'INFO', message: 'Application started successfully', module: 'main', function: 'lifespan', line: 36 },
  { id: '2', timestamp: new Date().toISOString(), level: 'INFO', message: 'CORS middleware configured for localhost:5173', module: 'main', function: 'create_application', line: 65 },
  { id: '3', timestamp: new Date().toISOString(), level: 'INFO', message: 'API router registered at /', module: 'api.v1', function: '__init__', line: 12 },
  { id: '4', timestamp: new Date().toISOString(), level: 'WARNING', message: 'ChromaDB not configured — vector search unavailable', module: 'core.config', function: 'get_settings', line: 52 },
  { id: '5', timestamp: new Date().toISOString(), level: 'WARNING', message: 'Ollama not configured — LLM features unavailable', module: 'core.config', function: 'get_settings', line: 58 },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Logs() {
  const [activeLevel, setActiveLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [logs] = useState<LogEntry[]>(SAMPLE_LOGS);

  const filtered =
    activeLevel === 'ALL' ? logs : logs.filter((l) => l.level === activeLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText size={20} className="text-slate-400" />
            <h2 className="text-2xl font-bold text-white">System Logs</h2>
          </div>
          <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Real-time application event log
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Download size={14} />
            Export
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Level filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveLevel('ALL')}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={
            activeLevel === 'ALL'
              ? { background: 'rgba(255,255,255,0.12)', color: 'white' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)' }
          }
        >
          All ({logs.length})
        </button>
        {LEVELS.map((level) => {
          const style = LEVEL_STYLES[level];
          const count = logs.filter((l) => l.level === level).length;
          return (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={
                activeLevel === level
                  ? { background: style.bg, color: style.text, border: `1px solid ${style.text}44` }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {level} ({count})
            </button>
          );
        })}
      </div>

      {/* Log list */}
      <div
        className="glass-card overflow-hidden font-mono text-xs"
        style={{ minHeight: 400 }}
      >
        {/* Table header */}
        <div
          className="grid px-4 py-2 text-slate-600 uppercase tracking-wider"
          style={{
            gridTemplateColumns: '180px 90px 1fr 160px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontSize: 10,
          }}
        >
          <span>Timestamp</span>
          <span>Level</span>
          <span>Message</span>
          <span>Source</span>
        </div>

        {/* Log entries */}
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
          {filtered.map((entry) => {
            const style = LEVEL_STYLES[entry.level];
            const Icon = style.icon;
            return (
              <div
                key={entry.id}
                className="grid items-start px-4 py-2.5 hover:bg-white/[0.015] transition-colors"
                style={{ gridTemplateColumns: '180px 90px 1fr 160px' }}
              >
                <span style={{ color: 'rgba(148,163,184,0.4)' }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className="flex items-center gap-1"
                  style={{ color: style.text }}
                >
                  <Icon size={10} />
                  {entry.level}
                </span>
                <span style={{ color: '#cbd5e1' }}>{entry.message}</span>
                <span style={{ color: 'rgba(148,163,184,0.35)' }}>
                  {entry.module}.{entry.function}:{entry.line}
                </span>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <p style={{ color: 'rgba(148,163,184,0.3)' }}>No log entries for this level</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
