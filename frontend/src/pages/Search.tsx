/**
 * Semantic Search Page
 * =====================
 * Full-text + semantic search interface with filter chips and result cards.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Sliders, ScanSearch, FileText, Clock } from 'lucide-react';

const FILTER_CHIPS = ['All Types', 'PDF', 'DOCX', 'Images', 'Audio', 'Video'];

export default function Search() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Types');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ScanSearch size={20} className="text-cyan-400" />
          <h2 className="text-2xl font-bold text-white">Semantic Search</h2>
        </div>
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
          Search across all your indexed documents using natural language
        </p>
      </div>

      {/* Search box */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: query ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
        }}
      >
        <SearchIcon size={18} style={{ color: 'rgba(148,163,184,0.5)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Try: "What are the key findings about..." or "Show me contracts related to..."'
          className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
        />
        <button
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Sliders size={15} />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveFilter(chip)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={
              activeFilter === chip
                ? {
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.25),rgba(34,211,238,0.15))',
                    border: '1px solid rgba(59,130,246,0.4)',
                    color: '#93c5fd',
                  }
                : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: 'rgba(148,163,184,0.7)',
                  }
            }
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Results area */}
      <div className="glass-card p-6">
        {query ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <SearchIcon size={36} style={{ color: 'rgba(148,163,184,0.15)' }} />
            <p className="text-sm" style={{ color: 'rgba(148,163,184,0.4)' }}>
              Index documents to enable semantic search
            </p>
          </div>
        ) : (
          <>
            {/* Recent searches placeholder */}
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} style={{ color: 'rgba(148,163,184,0.5)' }} />
              <h3 className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.6)' }}>
                Recent Searches
              </h3>
            </div>
            <div className="space-y-2">
              {['machine learning techniques', 'Q3 financial report', 'product roadmap 2026'].map(
                (term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <FileText size={14} style={{ color: 'rgba(148,163,184,0.4)' }} />
                    <span className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
                      {term}
                    </span>
                  </button>
                ),
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
