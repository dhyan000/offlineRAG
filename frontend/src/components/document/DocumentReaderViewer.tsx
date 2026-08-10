import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, Copy, Check, ExternalLink, Layers, Database, Eye, Info, Hash, Loader2 } from 'lucide-react';
import { documentsApi, type DocChunk } from '@/services/api';
import type { Document as DocModel } from '@/types';

interface DocumentReaderViewerProps {
  document?: DocModel | null;
}

export const DocumentReaderViewer: React.FC<DocumentReaderViewerProps> = ({ document }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'chunks' | 'metadata'>('chunks');
  const [chunks, setChunks] = useState<DocChunk[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!document?.id) {
      setChunks([]);
      return;
    }
    setIsLoadingChunks(true);
    documentsApi.getChunks(document.id)
      .then((res) => setChunks(res.chunks ?? []))
      .catch(() => setChunks([]))
      .finally(() => setIsLoadingChunks(false));
  }, [document?.id]);

  const filteredChunks = useMemo(() => {
    if (!searchQuery.trim()) return chunks;
    const q = searchQuery.toLowerCase();
    return chunks.filter(c => c.text.toLowerCase().includes(q) || (c.page && String(c.page).includes(q)));
  }, [chunks, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!document) {
    return (
      <div className="w-full h-[540px] bg-studio-900 border border-white/10 rounded-sm p-8 tactile-card font-mono text-xs flex flex-col items-center justify-center text-slate-500 gap-3">
        <FileText className="w-12 h-12 text-slate-600 animate-pulse" />
        <div className="text-sm font-bold uppercase tracking-wider text-slate-400">No Document Selected</div>
        <div className="text-xs text-slate-500 font-sans text-center max-w-sm">
          Select a document from the left sidebar or upload a new PDF/text file to inspect actual text chunks, view native preview, and run queries.
        </div>
      </div>
    );
  }

  const fileUrl = documentsApi.getFileUrl(document.id);

  return (
    <div className="w-full bg-studio-900 border border-white/10 rounded-sm p-4 tactile-card font-mono text-xs space-y-4">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-100 font-bold tracking-wider flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-100">{document.name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase rounded-sm font-bold">
                {document.type.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              STATUS: <span className="text-emerald-400 uppercase font-bold">{document.status}</span> · CHUNKS: {document.chunk_count ?? chunks.length} · PARSER: PYMUPDF / TEXT
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-studio-950 border border-white/10 p-1 rounded-sm">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 rounded-sm text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'preview' ? 'bg-blue-600 text-white shadow-klein' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            FILE PREVIEW
          </button>

          <button
            onClick={() => setActiveTab('chunks')}
            className={`px-3 py-1 rounded-sm text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'chunks' ? 'bg-blue-600 text-white shadow-klein' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            INDEXED CHUNKS ({chunks.length})
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-3 py-1 rounded-sm text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'metadata' ? 'bg-blue-600 text-white shadow-klein' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            METADATA
          </button>
        </div>
      </div>

      {/* TAB 1: FILE PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-studio-950 p-2 rounded-sm border border-white/5">
            <span>NATIVE READER VIEWPORT</span>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>OPEN FULLSCREEN / DOWNLOAD</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="w-full h-[580px] bg-studio-950 border border-white/10 rounded-sm overflow-hidden relative">
            {document.type === 'pdf' ? (
              <iframe
                key={document.id}
                src={`${fileUrl}#toolbar=1`}
                className="w-full h-full border-none bg-white"
                title={document.name}
              />
            ) : (
              <div className="p-4 h-full overflow-y-auto font-mono text-xs text-slate-200 bg-studio-950 whitespace-pre-wrap leading-relaxed">
                {chunks.length > 0
                  ? chunks.map(c => c.text).join('\n\n--- CHUNK BREAK ---\n\n')
                  : 'Document text content preview unavailable or loading...'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INDEXED CHUNKS */}
      {activeTab === 'chunks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter document chunks by keyword or page..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-studio-950 border border-white/10 rounded-sm pl-9 pr-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>
            <div className="text-[11px] text-slate-400">
              SHOWING <span className="text-blue-400 font-bold">{filteredChunks.length}</span> OF {chunks.length} CHUNKS
            </div>
          </div>

          {isLoadingChunks ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Fetching indexed chunks from ChromaDB...</span>
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-studio-950 border border-white/5 rounded-sm">
              {searchQuery ? 'No chunks match search criteria' : 'No indexed chunks found for this document'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {filteredChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-3 bg-studio-950 border border-white/10 hover:border-blue-500/50 rounded-sm transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-sm font-bold flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />
                        CHUNK #{chunk.chunk_index + 1}
                      </span>
                      {chunk.page && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-sm font-bold">
                          PAGE {chunk.page}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{chunk.text.length} CHARS</span>
                      <button
                        onClick={() => handleCopy(chunk.id, chunk.text)}
                        className="px-2 py-1 bg-studio-900 border border-white/10 hover:border-blue-400 text-slate-300 hover:text-white rounded-sm flex items-center gap-1 transition-colors text-[10px]"
                      >
                        {copiedId === chunk.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>COPY CHUNK</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-200 font-sans text-xs leading-relaxed whitespace-pre-wrap select-text">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: METADATA & ANALYTICS */}
      {activeTab === 'metadata' && (
        <div className="bg-studio-950 border border-white/10 p-4 rounded-sm space-y-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            TECHNICAL & VECTOR METADATA SPECIFICATION
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-studio-900 border border-white/5 rounded-sm space-y-2">
              <div className="text-slate-500 text-[10px]">FILE DETAILS</div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">File Name:</span>
                <span className="text-slate-100 font-bold truncate max-w-[200px]">{document.name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Document ID:</span>
                <span className="text-blue-400 font-bold text-[10px]">{document.id}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Format / Extension:</span>
                <span className="text-slate-200">{document.type.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">File Size:</span>
                <span className="text-slate-200">{(document.size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Uploaded Date:</span>
                <span className="text-slate-300">{new Date(document.uploaded_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-studio-900 border border-white/5 rounded-sm space-y-2">
              <div className="text-slate-500 text-[10px]">VECTOR DATABASE CONFIGURATION</div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Vector Store:</span>
                <span className="text-emerald-400 font-bold">ChromaDB Persistent (HNSW)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Embedding Model:</span>
                <span className="text-blue-400 font-bold">all-MiniLM-L6-v2</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Vector Dimension:</span>
                <span className="text-slate-200">384-D Dense Vectors</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-slate-400">Distance Metric:</span>
                <span className="text-slate-200">Cosine Distance</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Indexed Chunks Count:</span>
                <span className="text-emerald-400 font-bold">{document.chunk_count ?? chunks.length} Chunks</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
