import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Music,
  Video,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FolderKanban,
  Sparkles,
  Trash2,
  Database,
  Cpu,
  Clock,
  ListChecks,
} from 'lucide-react';
import type { Document, DocumentType } from '@/types';

// Active processing statuses — polling runs only when any document has one of these
const ACTIVE_STATUSES = new Set(['uploaded', 'queued', 'processing', 'transcribing', 'embedding']);

function getStatusBadge(status: string) {
  switch (status) {
    case 'indexed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={12} /> Indexed
        </span>
      );
    case 'uploaded':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <UploadCloud size={12} /> Uploaded
        </span>
      );
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <ListChecks size={12} /> Queued
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Loader2 size={12} className="animate-spin" /> Processing
        </span>
      );
    case 'transcribing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <Loader2 size={12} className="animate-spin" /> Transcribing
        </span>
      );
    case 'embedding':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Loader2 size={12} className="animate-spin" /> Embedding
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle size={12} /> Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-600/20 text-slate-500 border border-slate-700">
          {status}
        </span>
      );
  }
}

export default function MultimodalStudio() {
  const [activeTab, setActiveTab] = useState<'all' | 'pdf' | 'audio' | 'video'>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressStep, setUploadProgressStep] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/documents/');
      const data = await res.json();
      const items: Document[] = data.items || [];
      setDocuments(items);
      return items;
    } catch (err) {
      console.error('Error fetching documents:', err);
      return [];
    }
  };

  const stopPolling = () => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling(); // prevent duplicate intervals
    pollingRef.current = setInterval(async () => {
      const items = await fetchDocuments();
      const hasActiveJobs = items.some((d) => ACTIVE_STATUSES.has(d.status));
      if (!hasActiveJobs) {
        stopPolling();
        console.info('[MultimodalStudio] All documents stable — polling stopped.');
      }
    }, 2500);
  };

  // Initial fetch + conditional polling
  useEffect(() => {
    fetchDocuments().then((items) => {
      const hasActiveJobs = items.some((d) => ACTIVE_STATUSES.has(d.status));
      if (hasActiveJobs) startPolling();
    });
    return () => stopPolling();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (['mp4', 'mov', 'mkv'].includes(ext)) {
      setUploadProgressStep('Uploading Video → Extracting Audio with FFmpeg...');
      await new Promise((r) => setTimeout(r, 900));
      setUploadProgressStep('Transcribing Audio with Whisper AI...');
    } else if (['mp3', 'wav', 'm4a', 'flac'].includes(ext)) {
      setUploadProgressStep('Uploading Audio → Transcribing with Whisper AI...');
    } else {
      setUploadProgressStep('Uploading PDF → Extracting Pages with PyMuPDF...');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:8000/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      setUploadProgressStep('Chunking → Generating Embeddings → ChromaDB Indexing...');
      // Immediately fetch docs and start polling to track real backend status
      await fetchDocuments();
      startPolling();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgressStep('');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/v1/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pdf') return ['pdf', 'txt'].includes(doc.type);
    if (activeTab === 'audio') return ['mp3', 'wav', 'm4a', 'flac'].includes(doc.type);
    if (activeTab === 'video') return ['mp4', 'mov', 'mkv'].includes(doc.type);
    return true;
  });

  const getFormatIcon = (type: DocumentType | string) => {
    if (['mp3', 'wav', 'm4a', 'flac', 'audio'].includes(type)) return <Music size={20} className="text-purple-400" />;
    if (['mp4', 'mov', 'mkv', 'video'].includes(type)) return <Video size={20} className="text-cyan-400" />;
    return <FileText size={20} className="text-blue-400" />;
  };

  const activeJobs = documents.filter((d) => ACTIVE_STATUSES.has(d.status)).length;

  return (
    <div className="min-h-full bg-[#07090e] text-slate-100 p-6 md:p-10 space-y-8">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <FolderKanban className="text-indigo-400" size={28} />
            Multimodal Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Drag &amp; drop PDFs, Audio tracks, or Videos to extract, chunk, and index locally.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeJobs > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
            >
              <Loader2 size={13} className="animate-spin" />
              <span>{activeJobs} job{activeJobs > 1 ? 's' : ''} processing…</span>
            </motion.div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Cpu size={14} />
            <span>Local Pipelines Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        {[
          { id: 'all', label: 'All Media Files', icon: Database },
          { id: 'pdf', label: 'PDF Documents', icon: FileText },
          { id: 'audio', label: 'Audio Files', icon: Music },
          { id: 'video', label: 'Video Files', icon: Video },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`glass-card p-8 md:p-12 rounded-3xl text-center space-y-5 transition-all border-2 border-dashed ${
          dragActive
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-700/80 hover:border-slate-500'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
          <UploadCloud size={32} />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-white">
            Drag &amp; drop files here, or browse
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Supported formats: <br />
            <strong className="text-slate-200">PDF</strong> (.pdf, .txt) •{' '}
            <strong className="text-purple-300">Audio</strong> (.mp3, .wav, .m4a, .flac) •{' '}
            <strong className="text-cyan-300">Video</strong> (.mp4, .mov, .mkv)
          </p>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-all shadow-lg">
            <span>Select File</span>
            <input
              type="file"
              accept=".pdf,.txt,.mp3,.wav,.m4a,.flac,.mp4,.mov,.mkv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </label>
        </div>

        {/* Animated Processing State */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 text-xs font-semibold text-indigo-200 flex items-center justify-center gap-3 max-w-lg mx-auto"
            >
              <Loader2 size={18} className="animate-spin text-indigo-400 shrink-0" />
              <span>{uploadProgressStep || 'Processing multimodal pipeline locally...'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Files List Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white tracking-wide">
          Studio Sources Overview ({filteredDocs.length})
        </h3>

        <div className="glass-card rounded-2xl overflow-hidden border-slate-800">
          <div className="divide-y divide-slate-800/80">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No items found for this tab. Upload a file above.
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <motion.div
                  key={doc.id}
                  layout
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 shrink-0">
                      {getFormatIcon(doc.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{doc.name}</p>
                      <p className="text-[11px] text-slate-400">
                        Uploaded {new Date(doc.uploaded_at).toLocaleString()} •{' '}
                        {(doc.size_bytes / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      {doc.error_message && (
                        <p className="text-[11px] text-rose-400 mt-0.5 truncate" title={doc.error_message}>
                          ✕ {doc.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    {doc.duration && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-indigo-300">
                        <Clock size={12} />
                        {doc.duration}
                      </span>
                    )}

                    <div className="text-right text-xs">
                      <span className="block font-bold text-slate-200">
                        {doc.chunk_count || 0} Chunks
                      </span>
                    </div>

                    <div>{getStatusBadge(doc.status)}</div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
