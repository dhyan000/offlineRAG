/**
 * Knowledge Base Page
 * ====================
 * Document management: upload area, file table, search, and status indicators.
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  UploadCloud,
  Search,
  Trash2,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  File,
  Filter,
} from 'lucide-react';
import type { Document, DocumentType } from '@/types';
import apiClient, { get, del } from '@/services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDocIcon(type: DocumentType) {
  switch (type) {
    case 'pdf':
    case 'docx':
    case 'txt':
    case 'xlsx':
    case 'csv':
      return FileText;
    case 'png':
    case 'jpg':
      return FileImage;
    case 'mp3':
      return FileAudio;
    case 'mp4':
      return FileVideo;
    default:
      return File;
  }
}

const STATUS_STYLES: Record<Document['status'], { bg: string; text: string; label: string }> = {
  uploaded: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd', label: 'Uploaded' },
  queued: { bg: 'rgba(148,163,184,0.15)', text: '#cbd5e1', label: 'Queued' },
  processing: { bg: 'rgba(245,158,11,0.15)', text: '#fcd34d', label: 'Processing' },
  transcribing: { bg: 'rgba(168,85,247,0.15)', text: '#d8b4fe', label: 'Transcribing' },
  embedding: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd', label: 'Embedding' },
  indexed: { bg: 'rgba(34,197,94,0.15)', text: '#86efac', label: 'Indexed' },
  failed: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', label: 'Failed' },
};

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const response = await get<{ items: Document[] }>('/api/v1/documents');
      setDocuments(response.items || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    
    // Poll index status if any document is processing
    const interval = setInterval(() => {
      setDocuments((prevDocs) => {
        const hasTransient = prevDocs.some(
          (d) => d.status === 'uploaded' || d.status === 'processing'
        );
        if (hasTransient) {
          fetchDocuments();
        }
        return prevDocs;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filtered = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Phase 1 only supports PDF and TXT
    const allowedExts = ['pdf', 'txt'];
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const ext = files[i].name.split('.').pop()?.toLowerCase();
      if (ext && allowedExts.includes(ext)) {
        validFiles.push(files[i]);
      } else {
        alert(`Unsupported file format: ${files[i].name}. Only PDF and TXT documents are supported.`);
      }
    }

    if (validFiles.length === 0) return;

    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        await apiClient.post('/api/v1/documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        fetchDocuments();
      } catch (err: any) {
        console.error("Upload failed", err);
        alert(`Failed to upload ${file.name}: ${err.message || err}`);
        fetchDocuments();
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await del(`/api/v1/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (err: any) {
      console.error("Failed to delete document:", err);
      alert(`Failed to delete document: ${err.message || err}`);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected document(s)?`)) return;

    for (const id of selectedIds) {
      try {
        await del(`/api/v1/documents/${id}`);
      } catch (err) {
        console.error(`Failed to delete document ${id}:`, err);
      }
    }
    setSelectedIds([]);
    fetchDocuments();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={20} className="text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Knowledge Base</h2>
          </div>
          <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Upload and manage your documents for AI indexing
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
            boxShadow: '0 0 16px rgba(59,130,246,0.3)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={16} />
          Upload Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.txt"
          onChange={handleFileChange}
        />
      </div>

      {/* Upload dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 p-12 rounded-2xl cursor-pointer transition-all"
        style={{
          background: isDragging ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
          border: `2px dashed ${isDragging ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.08)'}`,
          transition: 'all 0.2s ease',
        }}
      >
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}
        >
          <UploadCloud size={28} className="text-blue-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white">
            {isDragging ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.5)' }}>
            Supports PDF, TXT
          </p>
        </div>
      </div>

      {/* Table toolbar */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          {/* Search */}
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Search size={15} style={{ color: 'rgba(148,163,184,0.5)' }} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          {/* Filter (placeholder) */}
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Filter size={14} />
            Filter
          </button>

          {/* Delete Selected */}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
              selectedIds.length > 0
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed opacity-50'
            }`}
            style={{ border: `1px solid ${selectedIds.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)'}` }}
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded</th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={32} style={{ color: 'rgba(148,163,184,0.2)' }} />
                      <p style={{ color: 'rgba(148,163,184,0.4)' }}>
                        {searchQuery ? 'No documents match your search' : 'No documents uploaded yet'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => {
                  const DocIcon = getDocIcon(doc.type);
                  const statusStyle = STATUS_STYLES[doc.status] || STATUS_STYLES.failed;
                  const isChecked = selectedIds.includes(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(doc.id, e.target.checked)}
                        />
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <DocIcon size={16} className="text-blue-400 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{doc.name}</span>
                            {doc.error_message && (
                              <span className="text-[10px] text-red-400 mt-0.5 line-clamp-1">{doc.error_message}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-400 uppercase text-xs">{doc.type}</td>
                      <td className="py-3 px-2 text-slate-400">{formatBytes(doc.size_bytes)}</td>
                      <td className="py-3 px-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: statusStyle.bg, color: statusStyle.text }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-xs">
                        {new Date(doc.uploaded_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
