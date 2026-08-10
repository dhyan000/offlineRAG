import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ProcessingOrb } from '@/components/3d/ProcessingOrb';
import {
  Upload, CheckCircle2, ShieldCheck, RefreshCw,
  Database, Trash2, ExternalLink, AlertCircle, Loader2
} from 'lucide-react';
import { documentsApi } from '@/services/api';
import type { Document } from '@/types';

// ── Processing stage labels ────────────────────────────────────────────────────
const PIPELINE_STAGES = ['Upload', 'Extraction', 'Chunking', 'Embedding', 'Indexing'] as const;

function getDocTypeCategory(type: string): 'pdf' | 'audio' | 'video' | 'txt' {
  if (['mp3', 'wav', 'm4a', 'flac'].includes(type)) return 'audio';
  if (['mp4', 'mov', 'mkv'].includes(type)) return 'video';
  if (type === 'txt' || type === 'docx' || type === 'doc') return 'txt';
  return 'pdf';
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusColor(status: string) {
  switch (status) {
    case 'indexed': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    case 'processing':
    case 'transcribing':
    case 'embedding': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    case 'uploaded':
    case 'queued': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    case 'failed': return 'text-red-400 border-red-500/30 bg-red-500/10';
    default: return 'text-slate-400 border-white/10 bg-studio-800/50';
  }
}

function typeColor(cat: 'pdf' | 'audio' | 'video' | 'txt') {
  switch (cat) {
    case 'pdf': return 'text-blue-400 border-blue-500/30 bg-blue-500/15';
    case 'audio': return 'text-amber-400 border-amber-500/30 bg-amber-500/15';
    case 'video': return 'text-violet-400 border-violet-500/30 bg-violet-500/15';
    default: return 'text-slate-300 border-slate-500/30 bg-slate-800/30';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const MultimodalStudio: React.FC = () => {
  const [processingState, setProcessingState] = useState<'idle' | 'scanning' | 'embedding' | 'indexing' | 'completed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch documents from real API ──────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const result = await documentsApi.list();
      setDocuments(result.items ?? []);
    } catch {
      // silently keep stale list
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    // Poll every 4 s while a doc is processing
    pollRef.current = setInterval(() => {
      fetchDocuments();
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchDocuments]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setProcessingState('scanning');
    setUploadProgress(0);
    setPipelineProgress(10);

    try {
      await documentsApi.upload(file, (pct) => {
        setUploadProgress(pct);
        setPipelineProgress(Math.min(30, 10 + pct * 0.2));
      });

      // Simulate pipeline stages visually while backend indexes
      setProcessingState('embedding');
      setPipelineProgress(55);

      setTimeout(() => {
        setProcessingState('indexing');
        setPipelineProgress(85);
      }, 2500);

      setTimeout(() => {
        setProcessingState('completed');
        setPipelineProgress(100);
        fetchDocuments();
        setTimeout(() => {
          setProcessingState('idle');
          setPipelineProgress(0);
          setUploadProgress(0);
        }, 2500);
      }, 5000);

    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload failed');
      setProcessingState('idle');
      setPipelineProgress(0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    // reset so same file can be re-uploaded
    e.target.value = '';
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await documentsApi.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err?.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Document counts ────────────────────────────────────────────────────────
  const counts = {
    pdf: documents.filter((d) => ['pdf', 'txt', 'docx', 'doc'].includes(d.type)).length,
    audio: documents.filter((d) => ['mp3', 'wav', 'm4a', 'flac'].includes(d.type)).length,
    video: documents.filter((d) => ['mp4', 'mov', 'mkv'].includes(d.type)).length,
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono text-xs">

      {/* ── Upload Command Terminal Header ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-studio-900 border border-white/10 rounded-sm tactile-card">
        {/* Left: Info & Drop Zone */}
        <div className="lg:col-span-2 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-bright text-[10px] uppercase font-bold tracking-widest mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              MULTIMODAL AI INGESTION CENTER // AIR-GAPPED VERIFIED
            </div>
            <h2 className="text-xl font-display font-bold text-slate-100 mb-2">
              KNOWLEDGE REPOSITORY INGESTION & PIPELINE TERMINAL
            </h2>
            <p className="text-slate-400 font-sans text-xs">
              Drop PDF documents, audio recordings, or video files to execute offline extraction,
              MD5 deduplication, SentenceTransformers embedding, and ChromaDB vector indexing.
            </p>
          </div>

          {/* Drop Zone */}
          <label
            className={`border-2 border-dashed bg-studio-950 p-6 rounded-sm cursor-pointer transition-all flex flex-col items-center justify-center text-center group ${
              processingState !== 'idle'
                ? 'border-amber-tactile/50 pointer-events-none'
                : 'border-white/20 hover:border-klein-bright'
            }`}
          >
            {processingState !== 'idle' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-amber-bright animate-spin" />
                <span className="font-bold text-amber-bright text-sm uppercase tracking-widest">
                  {processingState.toUpperCase()}… {uploadProgress > 0 ? `(${uploadProgress}%)` : ''}
                </span>
                <span className="text-[10px] text-slate-400">Backend pipeline running...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-klein-bright mb-2 transition-colors" />
                <span className="font-bold text-slate-200 text-sm mb-1">
                  DROP HETEROGENEOUS FILES HERE OR CLICK TO BROWSE
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  SUPPORTED: PDF, TXT, DOCX, MP3, WAV, FLAC, M4A, MP4, MOV, MKV
                </span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.docx,.doc,.mp3,.wav,.flac,.m4a,.mp4,.mov,.mkv"
              onChange={handleInputChange}
              className="hidden"
              disabled={processingState !== 'idle'}
            />
          </label>

          {uploadError && (
            <div className="flex items-center gap-2 p-2 bg-red-950/40 border border-red-500/40 rounded-sm text-red-400 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {uploadError}
            </div>
          )}
        </div>

        {/* Right: 3D Orb & Pipeline Timeline */}
        <div className="bg-studio-950 border border-white/10 p-4 rounded-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 text-center tracking-wider">
              3D AI PROCESSING ORB STATE
            </div>
            <ProcessingOrb status={processingState} progress={pipelineProgress} />
          </div>

          {/* Pipeline Stage Tracker */}
          <div className="space-y-1.5 mt-3 pt-3 border-t border-white/10 text-[10px]">
            {PIPELINE_STAGES.map((stage, idx) => {
              const stageProgress = (idx + 1) * 20;
              const isDone = pipelineProgress >= stageProgress;
              const isActive = pipelineProgress >= stageProgress - 20 && pipelineProgress < stageProgress;
              return (
                <div key={idx} className="flex items-center justify-between">
                  <span className={isDone ? 'text-emerald-400 font-bold' : isActive ? 'text-amber-bright animate-pulse' : 'text-slate-500'}>
                    STAGE {idx + 1}: {stage.toUpperCase()}
                  </span>
                  {isDone ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="w-3 h-3 text-amber-bright animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Knowledge Repository Cards ── */}
      <div>
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-3 font-bold text-slate-200 text-sm">
            <Database className="w-4 h-4 text-klein-bright" />
            INDEXED KNOWLEDGE REPOSITORY
            <span className="text-[10px] px-2 py-0.5 bg-studio-800 border border-white/10 text-slate-400 rounded-sm font-mono">
              {documents.length} FILES
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-sm">
              PDF: {counts.pdf}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-sm">
              AUDIO: {counts.audio}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-sm">
              VIDEO: {counts.video}
            </span>
          </div>
          <button
            onClick={fetchDocuments}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 transition-colors border border-white/10 px-2 py-1 rounded-sm"
          >
            <RefreshCw className="w-3 h-3" />
            REFRESH
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-[11px] gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            LOADING DOCUMENTS FROM BACKEND…
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600 text-[11px] gap-3">
            <Database className="w-10 h-10 opacity-20" />
            <span className="font-mono uppercase tracking-wider">NO DOCUMENTS INDEXED YET</span>
            <span className="text-[10px] text-slate-700">Upload a file above to begin indexing.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => {
              const cat = getDocTypeCategory(doc.type);
              const isDeleting = deletingId === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`p-4 bg-studio-900 border border-white/10 hover:border-klein/50 rounded-sm tactile-card hover:translate-y-[-2px] transition-all group flex flex-col justify-between ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  <div>
                    {/* Type & Status badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border uppercase ${typeColor(cat)}`}>
                        [{doc.type.toUpperCase()}]
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border uppercase ${statusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>

                    {/* Filename */}
                    <div className="font-bold text-slate-100 text-[11px] truncate mb-2 group-hover:text-klein-bright transition-colors" title={doc.name}>
                      {doc.name}
                    </div>

                    {/* Size */}
                    <div className="text-[10px] text-slate-500 mb-3">
                      SIZE: {formatBytes(doc.size_bytes)}
                    </div>
                  </div>

                  <div>
                    {/* Metadata rows */}
                    <div className="space-y-1 text-[10px] text-slate-500 border-t border-white/10 pt-2 mb-3">
                      {doc.chunk_count != null && (
                        <div className="flex items-center justify-between">
                          <span>CHUNKS:</span>
                          <span className="text-slate-300 font-bold">{doc.chunk_count} VECTORS</span>
                        </div>
                      )}
                      {doc.file_hash && (
                        <div className="flex items-center justify-between">
                          <span>MD5:</span>
                          <span className="text-slate-400 font-mono truncate max-w-[90px]">{doc.file_hash.slice(0, 12)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>INDEXED:</span>
                        <span className="text-slate-400">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      {doc.status === 'indexed' ? (
                        <Link
                          to={
                            ['mp3','wav','m4a','flac'].includes(doc.type) ? '/audio'
                            : ['mp4','mov','mkv'].includes(doc.type) ? '/video'
                            : '/documents'
                          }
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                          title="Open in workspace"
                        >
                          <ExternalLink className="w-3 h-3" />
                          OPEN WORKSPACE
                        </Link>
                      ) : (
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {doc.status.toUpperCase()}
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDeleting}
                        className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-40"
                      >
                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        DELETE
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultimodalStudio;
