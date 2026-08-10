import React, { useState, useRef, useCallback } from 'react';
import {
  Send, Terminal, Sparkles, Zap, ShieldCheck, CheckCircle2,
  Clock, FileText, Mic, Film, Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { streamChat } from '@/services/api';
import type { SourceFilterType } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Source {
  filename: string;
  type: string;
  location?: string;
  confidence?: number;
}

interface RetrievedChunk {
  chunk_id: string;
  filename: string;
  type: string;
  location?: string;
  text: string;
  confidence: number;
  similarity: number;
}

interface Timings {
  embedding_ms: number;
  retrieval_ms: number;
  prompt_ms: number;
  ollama_ms: number;
  total_ms: number;
  chunks_retrieved: number;
}

type Stage =
  | 'idle'
  | 'embedding'
  | 'searching'
  | 'retrieving'
  | 'building'
  | 'generating'
  | 'streaming'
  | 'done'
  | 'error';

const STAGE_LABELS: Record<Stage, string> = {
  idle: '',
  embedding: 'GENERATING EMBEDDING',
  searching: 'SEARCHING CHROMADB',
  retrieving: 'RETRIEVING CHUNKS',
  building: 'BUILDING CONTEXT',
  generating: 'GENERATING RESPONSE',
  streaming: 'STREAMING TOKENS',
  done: 'COMPLETE',
  error: 'ERROR',
};

const STAGE_ORDER: Stage[] = ['embedding', 'searching', 'retrieving', 'building', 'generating', 'streaming', 'done'];

// ── Props ─────────────────────────────────────────────────────────────────────

interface SpatialResponsePanelProps {
  defaultSourceFilter?: SourceFilterType;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SpatialResponsePanel: React.FC<SpatialResponsePanelProps> = ({
  defaultSourceFilter = 'all',
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>(defaultSourceFilter);

  // Response state
  const [stage, setStage] = useState<Stage>('idle');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [responseText, setResponseText] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
  const [timings, setTimings] = useState<Timings | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [maxConfidence, setMaxConfidence] = useState<number>(0);

  const abortRef = useRef<boolean>(false);
  const responseRef = useRef<HTMLDivElement>(null);

  const isStreaming = stage === 'embedding' || stage === 'searching' || stage === 'retrieving' ||
    stage === 'building' || stage === 'generating' || stage === 'streaming';

  // ── Submit query ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = inputPrompt.trim();
    if (!q || isStreaming) return;

    // Reset
    abortRef.current = false;
    setCurrentQuestion(q);
    setResponseText('');
    setSources([]);
    setChunks([]);
    setTimings(null);
    setErrorMsg(null);
    setMaxConfidence(0);
    setInputPrompt('');
    setStage('embedding');

    await streamChat(q, sourceFilter, 5, {
      onMetadata: (meta) => {
        setStage('retrieving');
        setSources(meta.sources ?? []);
        setChunks(meta.retrieved_chunks ?? []);
        setMaxConfidence(meta.max_confidence ?? 0);
        // brief pause on each stage
        setTimeout(() => setStage('building'), 200);
        setTimeout(() => setStage('generating'), 400);
      },
      onChunk: (text) => {
        setStage('streaming');
        setResponseText((prev) => prev + text);
        // auto-scroll
        requestAnimationFrame(() => {
          responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      },
      onTimings: (t) => {
        setTimings(t);
        setStage('done');
      },
      onError: (err) => {
        setErrorMsg(err);
        setStage('error');
      },
      onDone: () => {
        if (stage !== 'error') setStage('done');
      },
    });
  }, [inputPrompt, sourceFilter, isStreaming, stage]);

  // ── Keyboard submit ──────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Stage indicator pills ────────────────────────────────────────────────
  const completedStages = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(stage));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-studio-900 border border-white/10 rounded-sm p-4 tactile-card font-mono text-xs">

      {/* Query Bar */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
          <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-slate-300">
            <Terminal className="w-3.5 h-3.5 text-klein-bright" />
            SPATIAL QUERY PROMPT INPUT // ZERO-TELEMETRY STREAMING RAG
          </span>
          <span className="text-amber-bright font-mono">MODEL: LLaMA 3.2 3B // TEMP: 0.0</span>
        </div>

        <div className="flex gap-2 mb-2">
          {/* Source filter tabs */}
          {(['all', 'pdf', 'audio', 'video'] as SourceFilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSourceFilter(f)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-sm border uppercase transition-colors ${
                sourceFilter === f
                  ? f === 'pdf' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : f === 'audio' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : f === 'video' ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                    : 'bg-klein/20 border-klein text-klein-bright'
                  : 'bg-studio-950 border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'all' ? 'ALL SOURCES' : `${f.toUpperCase()} ONLY`}
            </button>
          ))}
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question across indexed documents, audio notes, or video recordings..."
            disabled={isStreaming}
            className="w-full bg-studio-950 border border-white/15 focus:border-klein-bright text-slate-100 placeholder-slate-500 text-xs px-4 py-3 rounded-sm outline-none transition-colors pr-24 font-sans disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !inputPrompt.trim()}
            className="absolute right-2 px-3 py-1.5 bg-klein hover:bg-klein-bright text-white font-mono text-xs rounded-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {isStreaming ? 'QUERYING' : 'QUERY'}
          </button>
        </div>
      </form>

      {/* Live Processing Stage Pipeline */}
      {stage !== 'idle' && (
        <div className="mb-4 p-3 bg-studio-950 border border-white/10 rounded-sm">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
            LIVE QUERY PIPELINE
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STAGE_ORDER.filter((s) => s !== 'done').map((s, idx) => {
              const isDone = completedStages.includes(s);
              const isActive = stage === s;
              return (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border text-[10px] font-bold transition-all ${
                    isDone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : isActive ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 animate-pulse'
                    : 'bg-studio-800 border-white/5 text-slate-600'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3 h-3" /> : isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-slate-700" />}
                    {STAGE_LABELS[s]}
                  </div>
                  {idx < STAGE_ORDER.filter(s => s !== 'done').length - 1 && (
                    <span className="text-slate-700">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Timing chips (shown after done) */}
          {timings && (
            <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-white/10">
              <span className="text-[10px] text-slate-400">EMBED: <span className="text-emerald-400 font-bold">{timings.embedding_ms}ms</span></span>
              <span className="text-[10px] text-slate-400">VECTOR SEARCH: <span className="text-emerald-400 font-bold">{timings.retrieval_ms}ms</span></span>
              <span className="text-[10px] text-slate-400">LLM: <span className="text-emerald-400 font-bold">{timings.ollama_ms}ms</span></span>
              <span className="text-[10px] text-slate-400">TOTAL: <span className="text-amber-bright font-bold">{timings.total_ms}ms</span></span>
              <span className="text-[10px] text-slate-400">CHUNKS: <span className="text-blue-400 font-bold">{timings.chunks_retrieved}</span></span>
            </div>
          )}
        </div>
      )}

      {/* Output area */}
      {stage !== 'idle' && (
        <div className="space-y-4">
          {/* User question */}
          <div className="p-3 bg-studio-950 border-l-2 border-klein-bright rounded-sm">
            <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">USER QUERY INPUT:</div>
            <div className="text-slate-200 font-semibold font-sans">{currentQuestion}</div>
          </div>

          {/* Response */}
          {(responseText || isStreaming) && (
            <div className="p-4 bg-studio-950 border border-white/10 rounded-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 text-[10px]">
                <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  GROUNDED LLM RESPONSE // AIR-GAPPED VERIFIED
                  {maxConfidence > 0 && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
                      MAX CONFIDENCE: {(maxConfidence).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div
                className="text-slate-200 font-sans text-xs leading-relaxed whitespace-pre-line"
                ref={responseRef}
              >
                {responseText}
                {stage === 'streaming' && (
                  <span className="inline-block w-2 h-4 bg-klein-bright ml-1 animate-pulse" />
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/40 rounded-sm text-red-400 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
              <button
                onClick={() => setStage('idle')}
                className="ml-auto text-[10px] border border-red-500/30 px-2 py-0.5 rounded-sm hover:bg-red-500/10"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* Source attribution cards */}
          {sources.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-bright" />
                  DYNAMIC SOURCE ATTRIBUTION // RETRIEVED VECTOR CHUNKS ({sources.length})
                </span>
                <span className="text-slate-500 font-mono text-[9px]">COSINE PROXIMITY INDEX</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {sources.map((s, idx) => {
                  const matchedChunk = chunks.find((c) => c.filename === s.filename);
                  const typeIcon = s.type === 'pdf' || s.type === 'txt'
                    ? <FileText className="w-3 h-3" />
                    : s.type === 'audio' ? <Mic className="w-3 h-3" />
                    : <Film className="w-3 h-3" />;
                  const typeColor =
                    s.type === 'pdf' || s.type === 'txt' ? 'text-blue-400'
                    : s.type === 'audio' ? 'text-amber-400'
                    : 'text-violet-400';

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-studio-950 border border-white/10 hover:border-klein/50 rounded-sm font-mono transition-colors group"
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className={`font-bold uppercase truncate max-w-[140px] flex items-center gap-1 ${typeColor}`}>
                          {typeIcon}
                          {s.filename}
                        </span>
                        {s.confidence != null && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold rounded-sm">
                            {s.confidence.toFixed(1)}% MATCH
                          </span>
                        )}
                      </div>

                      {s.location && (
                        <div className="text-[10px] text-amber-bright mb-2 flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3" />
                          [{s.location}]
                        </div>
                      )}

                      {matchedChunk?.text && (
                        <div className="text-[11px] text-slate-300 font-sans line-clamp-3 mb-2">
                          "{matchedChunk.text.slice(0, 200)}"
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-white/5 pt-1.5">
                        <span>CHUNK #{idx + 1}</span>
                        <span className="text-klein-bright font-bold group-hover:underline cursor-pointer">
                          INSPECT SOURCE →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Idle placeholder */}
      {stage === 'idle' && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-600 gap-2">
          <Terminal className="w-8 h-8 opacity-20" />
          <span className="text-[11px] uppercase tracking-widest">AWAITING QUERY COMMAND…</span>
          <span className="text-[10px] text-slate-700">Type a question above and press QUERY</span>
        </div>
      )}
    </div>
  );
};
