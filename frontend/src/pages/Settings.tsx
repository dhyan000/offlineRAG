/**
 * Settings Page
 * ==============
 * Tabbed settings interface: LLM, Embedding, Database, Theme, Application.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Cpu, Database, Layers, Palette, SlidersHorizontal, type LucideIcon } from 'lucide-react';

// ── Tab definitions ───────────────────────────────────────────────────────────

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'llm', label: 'LLM', icon: Cpu },
  { id: 'embedding', label: 'Embedding', icon: Layers },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'app', label: 'Application', icon: SlidersHorizontal },
];

// ── Reusable form field ───────────────────────────────────────────────────────

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.55)' }}>
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function TextInput({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }) {
  return (
    <input
      type="text"
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-52 px-3 py-1.5 rounded-lg text-sm text-white outline-none"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    />
  );
}

function NumberInput({ defaultValue, min, max, step }: { defaultValue?: number; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      defaultValue={defaultValue}
      min={min}
      max={max}
      step={step}
      className="w-28 px-3 py-1.5 rounded-lg text-sm text-white outline-none"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    />
  );
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked((v) => !v)}
      className="relative w-10 h-5 rounded-full transition-all"
      style={{ background: checked ? 'linear-gradient(135deg,#3b82f6,#22d3ee)' : 'rgba(255,255,255,0.1)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function LLMSettings() {
  return (
    <div>
      <Field label="Ollama Base URL" description="URL where Ollama is running locally">
        <TextInput defaultValue="http://localhost:11434" />
      </Field>
      <Field label="Default Model" description="LLM model to use for chat and RAG">
        <TextInput defaultValue="llama3.2:3b" />
      </Field>
      <Field label="Temperature" description="Higher values produce more creative outputs (0.0–1.0)">
        <NumberInput defaultValue={0.7} min={0} max={1} step={0.1} />
      </Field>
      <Field label="Max Output Tokens" description="Maximum tokens in LLM response">
        <NumberInput defaultValue={2048} min={128} max={8192} step={128} />
      </Field>
      <Field label="Streaming Responses" description="Stream tokens as they are generated">
        <Toggle defaultChecked />
      </Field>
    </div>
  );
}

function EmbeddingSettings() {
  return (
    <div>
      <Field label="Embedding Model" description="Model used to embed document chunks">
        <TextInput defaultValue="nomic-embed-text" />
      </Field>
      <Field label="Chunk Size" description="Number of characters per document chunk">
        <NumberInput defaultValue={512} min={128} max={4096} step={64} />
      </Field>
      <Field label="Chunk Overlap" description="Overlap between consecutive chunks">
        <NumberInput defaultValue={64} min={0} max={512} step={16} />
      </Field>
      <Field label="Batch Size" description="Number of chunks embedded per API call">
        <NumberInput defaultValue={32} min={1} max={256} step={8} />
      </Field>
    </div>
  );
}

function DatabaseSettings() {
  return (
    <div>
      <Field label="ChromaDB Persist Directory" description="Where ChromaDB stores its data on disk">
        <TextInput defaultValue="../storage/chroma" />
      </Field>
      <Field label="SQLite Path" description="Path to the application metadata database">
        <TextInput defaultValue="../storage/app.db" />
      </Field>
      <Field label="Collection Name" description="ChromaDB collection to use for this knowledge base">
        <TextInput defaultValue="knowledge_base" />
      </Field>
      <Field label="Auto-backup" description="Automatically backup the database daily">
        <Toggle defaultChecked={false} />
      </Field>
    </div>
  );
}

function ThemeSettings() {
  return (
    <div>
      <Field label="Colour Mode" description="Interface theme preference">
        <div className="flex gap-2">
          {['Dark', 'Light', 'System'].map((t) => (
            <button
              key={t}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                t === 'Dark'
                  ? { background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.7)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Accent Colour" description="Primary accent colour for highlights">
        <div className="flex gap-2">
          {['#3b82f6', '#22d3ee', '#8b5cf6', '#f59e0b', '#22c55e'].map((c) => (
            <button key={c} className="w-6 h-6 rounded-full transition-transform hover:scale-110" style={{ background: c }} />
          ))}
        </div>
      </Field>
      <Field label="Compact Mode" description="Reduce padding and spacing for denser UI">
        <Toggle />
      </Field>
      <Field label="Animations" description="Enable smooth transitions and animations">
        <Toggle defaultChecked />
      </Field>
    </div>
  );
}

function AppSettings() {
  return (
    <div>
      <Field label="Application Name" description="Display name shown in the header">
        <TextInput defaultValue="Offline AI Knowledge Hub" />
      </Field>
      <Field label="API Base URL" description="Backend API endpoint for the frontend">
        <TextInput defaultValue="http://localhost:8000" />
      </Field>
      <Field label="Auto-index on Upload" description="Automatically index documents after upload">
        <Toggle defaultChecked />
      </Field>
      <Field label="Debug Mode" description="Enable verbose logging and debug overlays">
        <Toggle />
      </Field>
      <Field label="Telemetry" description="Anonymous usage analytics (always offline)">
        <Toggle defaultChecked={false} />
      </Field>
    </div>
  );
}

const TAB_CONTENT: Record<string, React.ReactNode> = {
  llm: <LLMSettings />,
  embedding: <EmbeddingSettings />,
  database: <DatabaseSettings />,
  theme: <ThemeSettings />,
  app: <AppSettings />,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState('llm');

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
          <SettingsIcon size={20} className="text-slate-400" />
          <h2 className="text-2xl font-bold text-white">Settings</h2>
        </div>
        <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
          Configure your AI models, storage, and application preferences
        </p>
      </div>

      <div className="flex gap-4">
        {/* Tab list */}
        <div
          className="flex flex-col gap-1 p-2 rounded-xl shrink-0 self-start"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 160 }}
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
              style={
                activeTab === id
                  ? {
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(34,211,238,0.1))',
                      border: '1px solid rgba(59,130,246,0.3)',
                      color: '#93c5fd',
                    }
                  : { color: 'rgba(148,163,184,0.7)' }
              }
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="glass-card p-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {TAB_CONTENT[activeTab]}
            </motion.div>
          </AnimatePresence>

          {/* Save bar */}
          <div className="flex justify-end gap-3 pt-5 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            >
              Reset to Defaults
            </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
                boxShadow: '0 0 14px rgba(59,130,246,0.3)',
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
