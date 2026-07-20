/**
 * Analytics Page
 * ===============
 * Usage statistics and system metrics overview.
 */

import { motion } from 'framer-motion';
import { BarChart3, FileText, Layers, MessageSquare, HardDrive, TrendingUp } from 'lucide-react';

const METRIC_CARDS = [
  { label: 'Documents Ingested', value: '0', change: '—', icon: FileText, color: '#3b82f6' },
  { label: 'Vector Chunks', value: '0', change: '—', icon: Layers, color: '#22d3ee' },
  { label: 'AI Queries Made', value: '0', change: '—', icon: MessageSquare, color: '#8b5cf6' },
  { label: 'Storage Used', value: '0 MB', change: '—', icon: HardDrive, color: '#f59e0b' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Analytics() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={20} className="text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Analytics</h2>
        </div>
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
          Usage statistics and system performance insights
        </p>
      </motion.div>

      {/* Metric cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRIC_CARDS.map(({ label, value, change, icon: Icon, color }) => (
          <motion.div key={label} variants={itemVariants}>
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-xl"
                  style={{ background: `${color}18`, border: `1px solid ${color}33` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <div
                  className="flex items-center gap-1 text-xs"
                  style={{ color: 'rgba(148,163,184,0.5)' }}
                >
                  <TrendingUp size={12} />
                  {change}
                </div>
              </div>
              <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
              <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {['Query Volume Over Time', 'Document Types Distribution'].map((title) => (
          <motion.div key={title} variants={itemVariants}>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  height: 180,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.06)',
                }}
              >
                <div className="text-center">
                  <BarChart3 size={28} style={{ color: 'rgba(148,163,184,0.15)', margin: '0 auto 8px' }} />
                  <p className="text-xs" style={{ color: 'rgba(148,163,184,0.35)' }}>
                    Chart available after data ingestion
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top documents placeholder */}
      <motion.div variants={itemVariants}>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Most Queried Documents</h3>
          <div
            className="flex items-center justify-center py-10 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.35)' }}>
              No queries recorded yet
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
