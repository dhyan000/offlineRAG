import React, { useState, useEffect, useCallback } from 'react';
import { DocumentReaderViewer } from '@/components/document/DocumentReaderViewer';
import { SpatialResponsePanel } from '@/components/chat/SpatialResponsePanel';
import { FileText, Upload, BookOpen, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { documentsApi } from '@/services/api';
import type { Document } from '@/types';

const DOC_TYPES = ['pdf', 'txt', 'docx', 'doc'];

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DocumentWorkspace: React.FC = () => {
  const [docFiles, setDocFiles] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const result = await documentsApi.list();
      const filtered = (result.items ?? []).filter((d) => DOC_TYPES.includes(d.type));
      setDocFiles(filtered);
      if (!activeDocId && filtered.length > 0) setActiveDocId(filtered[0].id);
    } catch {
      // keep stale
    } finally {
      setIsLoading(false);
    }
  }, [activeDocId]);

  useEffect(() => {
    fetchDocs();
    const interval = setInterval(fetchDocs, 5000);
    return () => clearInterval(interval);
  }, [fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await documentsApi.upload(file);
      await fetchDocs();
    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const activeDoc = docFiles.find((d) => d.id === activeDocId);

  return (
    <div className="space-y-6 animate-fadeIn font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-studio-900 border border-blue-500/30 rounded-sm tactile-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-100 tracking-wider flex items-center gap-2">
              DOCUMENT QUERY WORKSPACE // TEXTUAL INTELLIGENCE MODULE
              <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-sm uppercase">
                PDF / TEXT ONLY
              </span>
            </div>
            <div className="text-xs text-slate-400 font-sans">
              Read real PDF & text documents, search extracted vector chunks, inspect embeddings metadata, and execute targeted queries.
            </div>
          </div>
        </div>

        <label className={`px-4 py-2 font-bold rounded-sm cursor-pointer transition-colors flex items-center gap-2 border ${
          isUploading
            ? 'bg-blue-800/40 border-blue-500/30 text-blue-400 pointer-events-none'
            : 'bg-blue-700 hover:bg-blue-600 text-white border-blue-400 shadow-klein'
        }`}>
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{isUploading ? 'UPLOADING…' : 'UPLOAD DOCUMENT (PDF, TXT, DOCX)'}</span>
          <input type="file" accept=".pdf,.txt,.docx,.doc" className="hidden" onChange={handleUpload} disabled={isUploading} />
        </label>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 p-2 bg-red-950/40 border border-red-500/40 rounded-sm text-red-400 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: document list */}
        <div className="bg-studio-900 border border-white/10 p-3 rounded-sm tactile-card">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              INDEXED DOCS ({docFiles.length})
            </span>
            <button onClick={fetchDocs} className="text-slate-500 hover:text-slate-300">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 justify-center py-8 text-slate-600 text-[10px]">
              <Loader2 className="w-3 h-3 animate-spin" /> LOADING…
            </div>
          ) : docFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-[10px] uppercase">No documents indexed</div>
          ) : (
            <div className="space-y-2">
              {docFiles.map((file) => {
                const isSelected = activeDocId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => setActiveDocId(file.id)}
                    className={`p-3 rounded-sm border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-studio-850 border-blue-500 text-slate-100 shadow-klein'
                        : 'bg-studio-950 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-slate-200 text-[11px] truncate mb-1">{file.name}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{file.type.toUpperCase()}</span>
                      <span>{formatBytes(file.size_bytes)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-blue-400 mt-1 pt-1 border-t border-white/5">
                      <span>{file.chunk_count != null ? `${file.chunk_count} CHUNKS` : file.status.toUpperCase()}</span>
                      <span>PYMUPDF / TEXT</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reader & Inspector Viewport */}
        <div className="lg:col-span-3">
          <DocumentReaderViewer document={activeDoc} />
        </div>
      </div>

      {/* Spatial Query Panel — pre-filtered to PDF only */}
      <div className="mt-6">
        <SpatialResponsePanel defaultSourceFilter="pdf" />
      </div>
    </div>
  );
};

export default DocumentWorkspace;
