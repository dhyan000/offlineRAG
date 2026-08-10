import React, { useState, useEffect, useCallback } from 'react';
import { AudioPlayerInspector } from '@/components/audio/AudioPlayerInspector';
import { SpatialResponsePanel } from '@/components/chat/SpatialResponsePanel';
import { Mic, Upload, FileAudio, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { documentsApi } from '@/services/api';
import type { Document } from '@/types';

const AUDIO_TYPES = ['mp3', 'wav', 'm4a', 'flac'];

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AudioWorkspace: React.FC = () => {
  const [audioFiles, setAudioFiles] = useState<Document[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchAudio = useCallback(async () => {
    try {
      const result = await documentsApi.list();
      const filtered = (result.items ?? []).filter((d) => AUDIO_TYPES.includes(d.type));
      setAudioFiles(filtered);
      if (!activeId && filtered.length > 0) setActiveId(filtered[0].id);
    } catch {
      // keep stale
    } finally {
      setIsLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchAudio();
    const interval = setInterval(fetchAudio, 5000);
    return () => clearInterval(interval);
  }, [fetchAudio]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await documentsApi.upload(file);
      await fetchAudio();
    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const activeFile = audioFiles.find((d) => d.id === activeId);

  return (
    <div className="space-y-6 animate-fadeIn font-mono text-xs">
      {/* Header — Amber/Green theme for Audio */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-studio-900 border border-amber-tactile/30 rounded-sm tactile-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-amber-tactile/20 border border-amber-tactile/40 flex items-center justify-center text-amber-bright">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-100 tracking-wider flex items-center gap-2">
              AUDIO QUERY WORKSPACE // VOICE INTELLIGENCE MODULE
              <span className="text-[10px] px-2 py-0.5 bg-amber-tactile/20 text-amber-bright border border-amber-tactile/40 rounded-sm uppercase">
                AUDIO ONLY
              </span>
            </div>
            <div className="text-xs text-slate-400 font-sans">
              Stream audio recordings, inspect Whisper speech transcriptions, click timestamps to seek audio, and execute vector queries.
            </div>
          </div>
        </div>

        <label className={`px-4 py-2 font-bold rounded-sm cursor-pointer transition-colors flex items-center gap-2 ${
          isUploading
            ? 'bg-amber-800/30 text-amber-400 pointer-events-none'
            : 'bg-amber-tactile hover:bg-amber-bright text-black shadow-amber'
        }`}>
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{isUploading ? 'UPLOADING…' : 'UPLOAD AUDIO (MP3, WAV, FLAC, M4A)'}</span>
          <input type="file" accept=".mp3,.wav,.flac,.m4a" className="hidden" onChange={handleUpload} disabled={isUploading} />
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
        {/* Audio file list sidebar */}
        <div className="bg-studio-900 border border-white/10 p-3 rounded-sm tactile-card">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5 text-amber-bright" />
              INDEXED AUDIO ({audioFiles.length})
            </span>
            <button onClick={fetchAudio} className="text-slate-500 hover:text-slate-300">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 justify-center py-8 text-slate-600 text-[10px]">
              <Loader2 className="w-3 h-3 animate-spin" /> LOADING…
            </div>
          ) : audioFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-[10px] uppercase">No audio files indexed</div>
          ) : (
            <div className="space-y-2">
              {audioFiles.map((file) => {
                const isSelected = activeId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => setActiveId(file.id)}
                    className={`p-3 rounded-sm border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-studio-850 border-amber-tactile text-slate-100 shadow-amber'
                        : 'bg-studio-950 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-slate-200 text-[11px] truncate mb-1">{file.name}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{file.type.toUpperCase()}</span>
                      <span>{formatBytes(file.size_bytes)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-amber-bright mt-1 pt-1 border-t border-white/5">
                      <span>{file.chunk_count != null ? `${file.chunk_count} SEGMENTS` : file.status.toUpperCase()}</span>
                      <span>WHISPER TINY</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audio Player & Inspector */}
        <div className="lg:col-span-3">
          <AudioPlayerInspector document={activeFile} />
        </div>
      </div>

      {/* Query Panel — audio only */}
      <div className="mt-6">
        <SpatialResponsePanel defaultSourceFilter="audio" />
      </div>
    </div>
  );
};

export default AudioWorkspace;
