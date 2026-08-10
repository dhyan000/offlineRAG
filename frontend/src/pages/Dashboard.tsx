import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Music,
  Video,
  Trash2,
  Zap,
  Clock,
  Database,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  PlusCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Document, SourceFilterType, Message, RetrievedChunk, RetrievalMetrics } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilterType>('all');
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [showChunks, setShowChunks] = useState(false);

  // Fetch uploaded documents
  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/documents/');
      const data = await res.json();
      setDocuments(data.items || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteDocument = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/v1/documents/${id}`, { method: 'DELETE' });
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Perform Perplexity-like RAG Query
  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isQuerying) return;

    setIsQuerying(true);
    setShowChunks(false);

    const initialMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString(),
      sources: [],
      retrieved_chunks: [],
      max_confidence: 0,
      is_streaming: true,
    };
    setActiveMessage(initialMsg);

    try {
      const response = await fetch('http://localhost:8000/api/v1/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: searchQuery,
          source_type: sourceFilter,
          top_k: 5,
        }),
      });

      if (!response.body) throw new Error('ReadableStream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answerText = '';
      let sourcesList: any[] = [];
      let chunksList: RetrievedChunk[] = [];
      let maxConf = 0;
      let metrics: RetrievalMetrics = { embedding_ms: 0, retrieval_ms: 0, total_ms: 0, chunks_retrieved: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.metadata) {
              sourcesList = data.metadata.sources || [];
              chunksList = data.metadata.retrieved_chunks || [];
              maxConf = data.metadata.max_confidence || 0;
              metrics.embedding_ms = data.metadata.embedding_ms || 0;
              metrics.retrieval_ms = data.metadata.retrieval_ms || 0;
            }
            if (data.chunk) {
              answerText += data.chunk;
              setActiveMessage((prev) =>
                prev
                  ? {
                      ...prev,
                      content: answerText,
                      sources: sourcesList,
                      retrieved_chunks: chunksList,
                      max_confidence: maxConf,
                    }
                  : null,
              );
            }
            if (data.timings) {
              metrics = { ...metrics, ...data.timings };
            }
          } catch (err) {
            console.error('JSON parse error:', err);
          }
        }
      }

      setActiveMessage((prev) =>
        prev
          ? {
              ...prev,
              content: answerText || 'No answer generated.',
              sources: sourcesList,
              retrieved_chunks: chunksList,
              max_confidence: maxConf,
              timings: metrics,
              is_streaming: false,
            }
          : null,
      );
    } catch (err: any) {
      console.error('Query execution error:', err);
      setActiveMessage((prev) =>
        prev
          ? {
              ...prev,
              content: `Error generating response: ${err.message}`,
              is_streaming: false,
            }
          : null,
      );
    } finally {
      setIsQuerying(false);
    }
  };

  // Filter sources for display grid
  const filteredDocs = documents.filter((doc) => {
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'pdf') return doc.type === 'pdf' || doc.type === 'txt';
    if (sourceFilter === 'audio') return ['mp3', 'wav', 'm4a', 'flac'].includes(doc.type);
    if (sourceFilter === 'video') return ['mp4', 'mov', 'mkv'].includes(doc.type);
    return true;
  });

  const getSourceIcon = (type: string) => {
    if (['mp3', 'wav', 'm4a', 'flac', 'audio'].includes(type)) return <Music size={18} className="text-purple-400" />;
    if (['mp4', 'mov', 'mkv', 'video'].includes(type)) return <Video size={18} className="text-cyan-400" />;
    return <FileText size={18} className="text-blue-400" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'indexed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={12} /> Indexed
        </span>
      );
    }
    if (status === 'processing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Loader2 size={12} className="animate-spin" /> Processing
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle size={12} /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        Uploaded
      </span>
    );
  };

  return (
    <div className="min-h-full bg-[#07090e] text-slate-100 p-6 md:p-10 space-y-10">
      {/* Knowledge Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Sparkles className="text-indigo-400" size={26} />
            Knowledge Workspace
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Query across indexed PDFs, audio transcripts, and video media offline.
          </p>
        </div>

        <button
          onClick={() => navigate('/studio')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all"
        >
          <PlusCircle size={18} />
          <span>Upload Media</span>
        </button>
      </div>

      {/* Perplexity Search Bar Section */}
      <div className="max-w-4xl mx-auto space-y-4">
        <form onSubmit={handleQuery} className="relative group">
          <div className="glass-panel rounded-2xl p-2 flex items-center gap-3 shadow-2xl border-indigo-500/30 focus-within:border-indigo-500 transition-all">
            <Search size={22} className="text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask anything about your uploaded knowledge..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-base outline-none border-none py-2"
            />
            <button
              type="submit"
              disabled={isQuerying || !searchQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md shrink-0"
            >
              {isQuerying ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              <span>Query</span>
            </button>
          </div>
        </form>

        {/* Source Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-2">
            <SlidersHorizontal size={14} /> Filter:
          </span>
          {(['all', 'pdf', 'audio', 'video'] as SourceFilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSourceFilter(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all capitalize border ${
                sourceFilter === type
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {type === 'all' ? 'All Sources' : `${type} Only`}
            </button>
          ))}
        </div>
      </div>

      {/* Perplexity Query Response Experience */}
      <AnimatePresence>
        {activeMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-4xl mx-auto glass-card rounded-2xl p-6 md:p-8 space-y-6 border-indigo-500/40 glow-border"
          >
            {/* Header Metrics Badge Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">AI Grounded Answer</h3>
              </div>

              {activeMessage.timings && (
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    <Clock size={12} /> Retrieval: {activeMessage.timings.retrieval_ms}ms
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    <Database size={12} /> Chunks: {activeMessage.timings.chunks_retrieved}
                  </span>
                  {activeMessage.max_confidence !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      <Zap size={12} /> Confidence: {activeMessage.max_confidence}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Answer Content */}
            <div className="text-slate-200 text-base leading-relaxed whitespace-pre-wrap font-normal">
              {activeMessage.content || (
                <span className="flex items-center gap-2 text-slate-400 italic">
                  <Loader2 size={16} className="animate-spin text-indigo-400" />
                  Generating grounded response from local Ollama model...
                </span>
              )}
            </div>

            {/* Source Citations */}
            {activeMessage.sources && activeMessage.sources.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Source Citations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeMessage.sources.map((src, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300"
                    >
                      {getSourceIcon(src.type)}
                      <span className="font-semibold text-white">{src.filename}</span>
                      {src.location && (
                        <span className="text-slate-400 text-[11px]">({src.location})</span>
                      )}
                      {src.confidence && (
                        <span className="text-emerald-400 font-mono text-[10px] ml-1">
                          {src.confidence}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Retrieved Chunks Drawer Toggle */}
            {activeMessage.retrieved_chunks && activeMessage.retrieved_chunks.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setShowChunks((v) => !v)}
                  className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors py-1"
                >
                  <span>Top 5 Retrieved Chunks ({activeMessage.retrieved_chunks.length})</span>
                  {showChunks ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showChunks && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 mt-3"
                  >
                    {activeMessage.retrieved_chunks.map((chunk, i) => (
                      <div
                        key={chunk.chunk_id || i}
                        className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                            {getSourceIcon(chunk.type)}
                            {chunk.filename} {chunk.location ? `• ${chunk.location}` : ''}
                          </span>
                          <span className="text-emerald-400 font-mono text-[11px]">
                            Similarity: {(chunk.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                          "{chunk.text}"
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Sources Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-wide">
            Uploaded Sources ({filteredDocs.length})
          </h2>
          <span className="text-xs text-slate-400">
            ChromaDB Persistent Collection: <span className="text-indigo-400 font-semibold">documents</span>
          </span>
        </div>

        {isLoadingDocs ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card p-6 rounded-2xl h-36 animate-pulse" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="glass-card p-10 rounded-2xl text-center space-y-3">
            <Database size={36} className="mx-auto text-slate-600" />
            <p className="text-slate-300 font-semibold">No sources uploaded for this category yet.</p>
            <button
              onClick={() => navigate('/studio')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              Upload media to start indexing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between space-y-4 relative group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                      {getSourceIcon(doc.type)}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {doc.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                  {getStatusBadge(doc.status)}

                  <div className="text-right text-[11px] text-slate-400 font-medium">
                    {doc.duration && (
                      <span className="block text-indigo-300 font-semibold">{doc.duration}</span>
                    )}
                    <span>{doc.chunk_count || 0} Chunks</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
