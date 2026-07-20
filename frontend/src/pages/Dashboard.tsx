/**
 * Dashboard Page
 * ===============
 * System overview with stat cards, recent activity, and health panel.
 */

import { motion } from 'framer-motion';
import {
  FileText,
  HardDrive,
  Layers,
  Cpu,
  Activity,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

// ── Stat card data ────────────────────────────────────────────────────────────

const STAT_CARDS = [
  {
    label: 'Total Documents',
    value: '0',
    sub: 'No documents indexed yet',
    icon: FileText,
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.2)',
  },
  {
    label: 'Storage Used',
    value: '0 MB',
    sub: 'of available storage',
    icon: HardDrive,
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.2)',
  },
  {
    label: 'Indexed Chunks',
    value: '0',
    sub: 'Vector embeddings stored',
    icon: Layers,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.2)',
  },
  {
    label: 'Active AI Model',
    value: 'llama3.2:3b',
    sub: 'via Ollama — offline',
    icon: Cpu,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.2)',
  },
];

const RECENT_ACTIVITY = [
  { icon: UploadCloud, text: 'System initialised', time: 'just now', color: '#3b82f6' },
  { icon: CheckCircle2, text: 'API server is online', time: '1m ago', color: '#22c55e' },
  { icon: Clock, text: 'Waiting for first document upload', time: '', color: '#94a3b8' },
];

const HEALTH_ITEMS = [
  { label: 'API Server', status: 'online', ok: true },
  { label: 'ChromaDB', status: 'not configured', ok: false },
  { label: 'SQLite', status: 'not configured', ok: false },
  { label: 'Ollama / LLM', status: 'not configured', ok: false },
];

// ── Container animation ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Page header */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p style={{ color: 'rgba(148,163,184,0.8)' }} className="text-sm mt-1">
          System overview and real-time status
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {STAT_CARDS.map(({ label, value, sub, icon: Icon, color, glow }) => (
          <motion.div key={label} variants={itemVariants}>
            <div
              className="glass-card p-5 hover:scale-[1.02] transition-transform cursor-default"
              style={{ height: '100%' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="flex items-center justify-center rounded-xl p-2.5"
                  style={{ background: glow, border: `1px solid ${color}33` }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
                <TrendingUp size={14} style={{ color: 'rgba(148,163,184,0.4)' }} />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{value}</p>
              <p className="text-sm font-medium text-white/80 mb-1">{label}</p>
              <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="glass-card p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {RECENT_ACTIVITY.map(({ icon: Icon, text, time, color }, i) => (
                <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: i < RECENT_ACTIVITY.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${color}18` }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <p className="text-sm text-slate-300 flex-1">{text}</p>
                  {time && <span className="text-xs text-slate-500 shrink-0">{time}</span>}
                </div>
              ))}
            </div>

            {/* Recent Uploads section */}
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <UploadCloud size={15} className="text-cyan-400" />
                <h4 className="text-sm font-semibold text-white">Recent Uploads</h4>
              </div>
              <div
                className="flex items-center justify-center py-8 rounded-xl text-sm"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  color: 'rgba(148,163,184,0.5)',
                }}
              >
                No documents uploaded yet
              </div>
            </div>
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-green-400" />
              <h3 className="text-sm font-semibold text-white">System Health</h3>
            </div>
            <div className="space-y-3">
              {HEALTH_ITEMS.map(({ label, status, ok }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{label}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: ok ? '#22c55e' : '#ef4444' }}
                    />
                    <span className="text-xs" style={{ color: ok ? '#86efac' : '#fca5a5' }}>
                      {status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Storage bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Storage</span>
                <span>0%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: '0%', background: 'linear-gradient(to right, #3b82f6, #22d3ee)' }}
                />
              </div>
              <p className="text-xs text-slate-600 mt-1">0 MB used of unlimited</p>
            </div>

            {/* Alert placeholder */}
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertCircle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-300">Configure Ollama and ChromaDB to enable AI features.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
