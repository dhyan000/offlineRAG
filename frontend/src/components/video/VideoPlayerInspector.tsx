import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Film, Play, Search, Copy, Check, Clock, Download, Loader2, Info, Video as VideoIcon, RotateCcw, RotateCw } from 'lucide-react';
import { documentsApi, type DocChunk } from '@/services/api';
import type { Document as DocModel } from '@/types';

interface VideoPlayerInspectorProps {
  document?: DocModel | null;
}

/** Helper to parse timestamp strings like "01:15 - 01:42" or "01:15" into seconds */
function parseTimestampToSeconds(tsString?: string | null): number {
  if (!tsString) return 0;
  const startPart = tsString.split('-')[0].trim();
  const parts = startPart.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

export const VideoPlayerInspector: React.FC<VideoPlayerInspectorProps> = ({ document }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [chunks, setChunks] = useState<DocChunk[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<string | null>(null);

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
    return chunks.filter(c => c.text.toLowerCase().includes(q) || (c.timestamp && c.timestamp.toLowerCase().includes(q)));
  }, [chunks, searchQuery]);

  const handleSeek = (tsString?: string | null) => {
    if (!tsString || !videoRef.current) return;
    const seconds = parseTimestampToSeconds(tsString);
    videoRef.current.currentTime = seconds;
    videoRef.current.play();
    setActiveTimestamp(tsString);
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!document) {
    return (
      <div className="w-full h-[540px] bg-studio-900 border border-white/10 rounded-sm p-8 tactile-card font-mono text-xs flex flex-col items-center justify-center text-violet-400/70 gap-3">
        <Film className="w-12 h-12 text-slate-600 animate-pulse" />
        <div className="text-sm font-bold uppercase tracking-wider text-slate-400">No Video Selected</div>
        <div className="text-xs text-slate-500 font-sans text-center max-w-sm">
          Select a video from the sidebar or upload a new file (MP4, MOV, MKV) to play video content, inspect scenes, and jump to timestamps.
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
          <div className="w-9 h-9 rounded-sm bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-100 font-bold tracking-wider flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-100">{document.name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-400 border border-violet-500/30 uppercase rounded-sm font-bold">
                FFMPEG DEMUX // TEMPORAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              DURATION: {document.duration ?? '—'} · STATUS: <span className="text-emerald-400 uppercase font-bold">{document.status}</span> · SCENES / DIALOGUE CHUNKS: {chunks.length}
            </div>
          </div>
        </div>

        {/* Video Player Controls Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-studio-950 border border-white/10 p-1 rounded-sm">
            <button
              onClick={() => handleSkip(-10)}
              className="p-1 text-slate-400 hover:text-white rounded-sm"
              title="Rewind 10s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSkip(10)}
              className="p-1 text-slate-400 hover:text-white rounded-sm"
              title="Fast-forward 10s"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-studio-950 border border-white/10 p-1 rounded-sm">
            <span className="text-[10px] text-slate-500 font-bold px-1">SPEED:</span>
            {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border ${
                  playbackSpeed === speed
                    ? 'bg-violet-600 text-white font-bold border-violet-400 shadow-[0_0_10px_-2px_rgba(139,92,246,0.5)]'
                    : 'bg-studio-900 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* REAL HTML5 VIDEO PLAYER VIEWPORT */}
      <div className="bg-studio-950 border border-white/10 p-3 rounded-sm space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-violet-400 font-bold">
            <VideoIcon className="w-4 h-4" />
            HTML5 NATIVE VIDEO PLAYER VIEWPORT
          </span>
          <span className="text-[10px] text-slate-500 font-mono">AIR-GAPPED HIGH EFFICIENCY STREAMING</span>
        </div>

        <div className="w-full flex justify-center bg-black rounded-sm overflow-hidden border border-white/5">
          <video
            ref={videoRef}
            src={fileUrl}
            controls
            className="w-full max-h-[440px] rounded-sm focus:outline-none"
          />
        </div>
      </div>

      {/* SCENE & DIALOGUE SEGMENTS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search video dialogue or scene transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-studio-950 border border-white/10 rounded-sm pl-9 pr-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-violet-500 font-sans"
            />
          </div>
          <div className="text-[11px] text-slate-400">
            VIDEO CHUNKS: <span className="text-violet-400 font-bold">{filteredChunks.length}</span> / {chunks.length}
          </div>
        </div>

        {isLoadingChunks ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
            <span>Loading video scenes and dialogue transcripts...</span>
          </div>
        ) : filteredChunks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-studio-950 border border-white/5 rounded-sm">
            {searchQuery ? 'No video segments match your query' : 'No scenes or transcripts indexed for this video'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredChunks.map((chunk) => {
              const isSelected = activeTimestamp === chunk.timestamp;
              return (
                <div
                  key={chunk.id}
                  className={`p-3 border rounded-sm transition-all space-y-2 ${
                    isSelected
                      ? 'bg-studio-850 border-violet-500 text-slate-100 shadow-[0_0_12px_-3px_rgba(139,92,246,0.4)]'
                      : 'bg-studio-950 border-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px]">
                    <button
                      onClick={() => handleSeek(chunk.timestamp)}
                      className="px-2.5 py-0.5 bg-violet-600/20 hover:bg-violet-600 hover:text-white border border-violet-500/40 text-violet-400 rounded-sm font-bold flex items-center gap-1.5 transition-colors"
                      title="Click to jump video player directly to this scene timestamp"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>[{chunk.timestamp ?? '00:00'}]</span>
                      <span className="text-[9px] opacity-80 font-normal">JUMP TO SCENE</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">SCENE #{chunk.chunk_index + 1}</span>
                      <button
                        onClick={() => handleCopy(chunk.id, chunk.text)}
                        className="px-2 py-0.5 bg-studio-900 border border-white/10 hover:border-violet-400 text-slate-400 hover:text-white rounded-sm flex items-center gap-1 transition-colors text-[10px]"
                      >
                        {copiedId === chunk.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>COPY</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-200 font-sans text-xs leading-relaxed select-text">
                    "{chunk.text}"
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
