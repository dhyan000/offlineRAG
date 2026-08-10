import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Play, Pause, Volume2, Search, Copy, Check, Clock, Download, Loader2, Info, Disc } from 'lucide-react';
import { documentsApi, type DocChunk } from '@/services/api';
import type { Document as DocModel } from '@/types';

interface AudioPlayerInspectorProps {
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

export const AudioPlayerInspector: React.FC<AudioPlayerInspectorProps> = ({ document: audioDoc }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [chunks, setChunks] = useState<DocChunk[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (!audioDoc?.id) {
      setChunks([]);
      return;
    }
    setIsLoadingChunks(true);
    documentsApi.getChunks(audioDoc.id)
      .then((res) => setChunks(res.chunks ?? []))
      .catch(() => setChunks([]))
      .finally(() => setIsLoadingChunks(false));
  }, [audioDoc?.id]);

  const filteredChunks = useMemo(() => {
    if (!searchQuery.trim()) return chunks;
    const q = searchQuery.toLowerCase();
    return chunks.filter(c => c.text.toLowerCase().includes(q) || (c.timestamp && c.timestamp.toLowerCase().includes(q)));
  }, [chunks, searchQuery]);

  const handleSeek = (tsString?: string | null) => {
    if (!tsString || !audioRef.current) return;
    const seconds = parseTimestampToSeconds(tsString);
    audioRef.current.currentTime = seconds;
    audioRef.current.play();
    setIsPlaying(true);
    setActiveTimestamp(tsString);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportFullTranscript = () => {
    if (!audioDoc || chunks.length === 0) return;
    const fullText = chunks
      .map(c => `[${c.timestamp ?? '00:00'}] ${c.text}`)
      .join('\n\n');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${audioDoc.name}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!audioDoc) {
    return (
      <div className="w-full h-[540px] bg-studio-900 border border-white/10 rounded-sm p-8 tactile-card font-mono text-xs flex flex-col items-center justify-center text-amber-tactile/70 gap-3">
        <Mic className="w-12 h-12 text-slate-600 animate-pulse" />
        <div className="text-sm font-bold uppercase tracking-wider text-slate-400">No Audio Selected</div>
        <div className="text-xs text-slate-500 font-sans text-center max-w-sm">
          Select an audio file from the sidebar or upload a new recording (MP3, WAV, FLAC, M4A) to play audio and view Whisper speech transcriptions.
        </div>
      </div>
    );
  }

  const fileUrl = documentsApi.getFileUrl(audioDoc.id);

  return (
    <div className="w-full bg-studio-900 border border-white/10 rounded-sm p-4 tactile-card font-mono text-xs space-y-4">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-amber-tactile/20 border border-amber-tactile/40 flex items-center justify-center text-amber-bright">
            <Disc className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <div className="text-slate-100 font-bold tracking-wider flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-100">{audioDoc.name}</span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-tactile/20 text-amber-bright border border-amber-tactile/30 uppercase rounded-sm font-bold">
                PURE AUDIO // WHISPER
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              DURATION: {audioDoc.duration ?? '—'} · STATUS: <span className="text-emerald-400 uppercase font-bold">{audioDoc.status}</span> · SEGMENTS: {chunks.length}
            </div>
          </div>
        </div>

        {/* Speed Controls & Full Transcript Export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-studio-950 border border-white/10 p-1 rounded-sm">
            <span className="text-[10px] text-slate-500 font-bold px-1">SPEED:</span>
            {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border ${
                  playbackSpeed === speed
                    ? 'bg-amber-tactile text-black font-bold border-amber-bright'
                    : 'bg-studio-900 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            onClick={handleExportFullTranscript}
            disabled={chunks.length === 0}
            className="px-3 py-1.5 bg-amber-tactile hover:bg-amber-bright text-black font-bold rounded-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 text-[11px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT TRANSCRIPT</span>
          </button>
        </div>
      </div>

      {/* REAL HTML5 AUDIO PLAYER VIEWPORT */}
      <div className="bg-studio-950 border border-white/10 p-4 rounded-sm space-y-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-amber-bright font-bold">
            <Volume2 className="w-4 h-4" />
            HTML5 NATIVE AUDIO STREAMING PLAYER
          </span>
          <span className="text-[10px] text-slate-500 font-mono">16kHz PCM MONO · WHISPER TINY PIPELINE</span>
        </div>

        <audio
          ref={audioRef}
          src={fileUrl}
          controls
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full accent-amber-500 rounded-sm focus:outline-none"
        />
      </div>

      {/* TRANSCRIPT & SEGMENTS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search transcript speech by keyword or timestamp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-studio-950 border border-white/10 rounded-sm pl-9 pr-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-tactile font-sans"
            />
          </div>
          <div className="text-[11px] text-slate-400">
            TRANSCRIPT SEGMENTS: <span className="text-amber-bright font-bold">{filteredChunks.length}</span> / {chunks.length}
          </div>
        </div>

        {isLoadingChunks ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-amber-bright" />
            <span>Loading Whisper audio transcription...</span>
          </div>
        ) : filteredChunks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-studio-950 border border-white/5 rounded-sm">
            {searchQuery ? 'No transcript segments match your search query' : 'No transcript segments indexed for this audio file'}
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
                      ? 'bg-studio-850 border-amber-tactile text-slate-100 shadow-amber'
                      : 'bg-studio-950 border-white/10 hover:border-white/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px]">
                    <button
                      onClick={() => handleSeek(chunk.timestamp)}
                      className="px-2 py-0.5 bg-amber-tactile/20 hover:bg-amber-tactile hover:text-black border border-amber-tactile/40 text-amber-bright rounded-sm font-bold flex items-center gap-1.5 transition-colors"
                      title="Click to jump audio player to this timestamp"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>[{chunk.timestamp ?? '00:00'}]</span>
                      <span className="text-[9px] opacity-80 font-normal">SEEK</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">SEGMENT #{chunk.chunk_index + 1}</span>
                      <button
                        onClick={() => handleCopy(chunk.id, chunk.text)}
                        className="px-2 py-0.5 bg-studio-900 border border-white/10 hover:border-amber-tactile text-slate-400 hover:text-white rounded-sm flex items-center gap-1 transition-colors text-[10px]"
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
