import React, { useState, useEffect, useCallback } from 'react';
import { VideoPlayerInspector } from '@/components/video/VideoPlayerInspector';
import { SpatialResponsePanel } from '@/components/chat/SpatialResponsePanel';
import { Film, Upload, Video as VideoIcon, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { documentsApi } from '@/services/api';
import type { Document } from '@/types';

const VIDEO_TYPES = ['mp4', 'mov', 'mkv'];

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const VideoWorkspace: React.FC = () => {
  const [videoFiles, setVideoFiles] = useState<Document[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const result = await documentsApi.list();
      const filtered = (result.items ?? []).filter((d) => VIDEO_TYPES.includes(d.type));
      setVideoFiles(filtered);
      if (!activeId && filtered.length > 0) setActiveId(filtered[0].id);
    } catch {
      // keep stale
    } finally {
      setIsLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, [fetchVideos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await documentsApi.upload(file);
      await fetchVideos();
    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const activeFile = videoFiles.find((d) => d.id === activeId);

  return (
    <div className="space-y-6 animate-fadeIn font-mono text-xs">
      {/* Header — Purple/Violet theme for Video */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-studio-900 border border-violet-500/30 rounded-sm tactile-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-100 tracking-wider flex items-center gap-2">
              VIDEO QUERY WORKSPACE // SCENE & TEMPORAL INTELLIGENCE MODULE
              <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-400 border border-violet-500/40 rounded-sm uppercase">
                VIDEO ONLY
              </span>
            </div>
            <div className="text-xs text-slate-400 font-sans">
              Stream video files, inspect scene keyframes & dialogue transcripts, jump to video timestamps, and execute vector queries.
            </div>
          </div>
        </div>

        <label className={`px-4 py-2 font-bold rounded-sm cursor-pointer transition-colors flex items-center gap-2 border ${
          isUploading
            ? 'bg-violet-800/30 border-violet-500/30 text-violet-400 pointer-events-none'
            : 'bg-violet-700 hover:bg-violet-600 text-white border-violet-500 shadow-[0_0_15px_-3px_rgba(139,92,246,0.4)]'
        }`}>
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{isUploading ? 'UPLOADING…' : 'UPLOAD VIDEO (MP4, MOV, MKV)'}</span>
          <input type="file" accept=".mp4,.mov,.mkv" className="hidden" onChange={handleUpload} disabled={isUploading} />
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
        {/* Video file list sidebar */}
        <div className="bg-studio-900 border border-white/10 p-3 rounded-sm tactile-card">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-1.5">
              <VideoIcon className="w-3.5 h-3.5 text-violet-400" />
              INDEXED VIDEOS ({videoFiles.length})
            </span>
            <button onClick={fetchVideos} className="text-slate-500 hover:text-slate-300">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 justify-center py-8 text-slate-600 text-[10px]">
              <Loader2 className="w-3 h-3 animate-spin" /> LOADING…
            </div>
          ) : videoFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-[10px] uppercase">No video files indexed</div>
          ) : (
            <div className="space-y-2">
              {videoFiles.map((file) => {
                const isSelected = activeId === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => setActiveId(file.id)}
                    className={`p-3 rounded-sm border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-studio-850 border-violet-500 text-slate-100 shadow-[0_0_10px_-3px_rgba(139,92,246,0.4)]'
                        : 'bg-studio-950 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-slate-200 text-[11px] truncate mb-1">{file.name}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{file.type.toUpperCase()}</span>
                      <span>{formatBytes(file.size_bytes)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-violet-400 mt-1 pt-1 border-t border-white/5">
                      <span>{file.chunk_count != null ? `${file.chunk_count} SCENES` : file.status.toUpperCase()}</span>
                      <span>FFMPEG DEMUX</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Video Player & Inspector */}
        <div className="lg:col-span-3">
          <VideoPlayerInspector document={activeFile} />
        </div>
      </div>

      {/* Query Panel — video only */}
      <div className="mt-6">
        <SpatialResponsePanel defaultSourceFilter="video" />
      </div>
    </div>
  );
};

export default VideoWorkspace;
