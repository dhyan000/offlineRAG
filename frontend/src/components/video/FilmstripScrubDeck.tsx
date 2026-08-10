import React, { useState } from 'react';
import { Film, Layers, Clock, Info } from 'lucide-react';

interface SceneMarker {
  timestamp: string;
  frameIndex: number;
  label: string;
  confidence: number;
  thumbnailColor: string;
}

interface FilmstripScrubDeckProps {
  videoName?: string;
  duration?: string;
  sceneMarkers?: SceneMarker[];
  onMarkerSelect?: (marker: SceneMarker) => void;
}

export const FilmstripScrubDeck: React.FC<FilmstripScrubDeckProps> = ({
  videoName = 'No video selected',
  duration = '—',
  sceneMarkers = [
    { timestamp: '01:12', frameIndex: 144, label: 'Scene 01: System Overview Diagram', confidence: 0.94, thumbnailColor: '#1d4ed8' },
    { timestamp: '03:45', frameIndex: 450, label: 'Scene 02: Pipeline Performance Metric', confidence: 0.89, thumbnailColor: '#d97706' },
    { timestamp: '07:20', frameIndex: 880, label: 'Scene 03: ChromaDB Vector Graph', confidence: 0.91, thumbnailColor: '#059669' },
    { timestamp: '09:15', frameIndex: 1110, label: 'Scene 04: Zero-Temp Response Test', confidence: 0.96, thumbnailColor: '#7c3aed' },
  ],
  onMarkerSelect,
}) => {
  const [activeMarker, setActiveMarker] = useState<SceneMarker>(sceneMarkers[0]);

  const handleSelect = (marker: SceneMarker) => {
    setActiveMarker(marker);
    if (onMarkerSelect) onMarkerSelect(marker);
  };

  const hasVideo = videoName !== 'No video selected' && videoName !== 'No video file selected';

  return (
    <div className="w-full bg-studio-900 border border-white/8 rounded-sm p-4 tactile-card font-mono text-xs">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-100 font-bold tracking-wide flex items-center gap-2 flex-wrap">
              <span className="truncate max-w-[260px]">{videoName}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/15 text-violet-400 border border-violet-500/30 uppercase rounded-sm">
                FFMPEG TEMPORAL
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {hasVideo ? `DURATION: ${duration} · FPS: 30 · ${sceneMarkers.length} SCENES` : 'Select a video file from the sidebar'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-1 bg-studio-950 border border-white/8 text-slate-400 rounded-sm">
            FRAME: #{activeMarker.frameIndex}
          </span>
          <span className="px-2 py-1 bg-studio-950 border border-white/8 text-slate-400 rounded-sm">
            [{activeMarker.timestamp}]
          </span>
        </div>
      </div>

      {/* Scene preview viewport */}
      <div className="relative w-full h-[220px] bg-studio-950 border border-white/8 rounded-sm mb-4 overflow-hidden flex items-center justify-center">
        {/* Colour backdrop (represents keyframe colour) */}
        <div
          className="w-full h-full opacity-20 transition-colors duration-500"
          style={{ backgroundColor: activeMarker.thumbnailColor }}
        />
        <div className="absolute inset-0 grid-pattern opacity-30" />

        {/* HUD overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] bg-black/70 px-2 py-1 border border-white/10 rounded-sm font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              TEMPORAL MATCH: {(activeMarker.confidence * 100).toFixed(1)}%
            </div>
            <span className="text-[10px] bg-red-950/80 border border-red-500/40 text-red-400 px-2 py-0.5 rounded-sm">
              AIR-GAPPED
            </span>
          </div>

          <div className="text-center">
            <div className="text-sm font-bold text-white tracking-widest uppercase bg-black/60 px-4 py-2 border border-white/10 rounded-sm inline-block backdrop-blur-md">
              {activeMarker.label}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>FFMPEG DEMUX → 16kHz PCM WAV</span>
            <span>KEYFRAME [{activeMarker.timestamp}]</span>
          </div>
        </div>

        {/* "No preview" notice instead of fake play button */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 border border-white/10 px-3 py-1 rounded-sm text-[10px] text-slate-500 font-mono backdrop-blur-sm">
          <Info className="w-3 h-3" />
          Video playback unavailable — content indexed for semantic search
        </div>
      </div>

      {/* Filmstrip thumbnails */}
      <div className="mb-4">
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-violet-400" />
          INDEXED KEYFRAMES
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-studio-950 p-2 border border-white/8 rounded-sm">
          {sceneMarkers.map((marker, idx) => {
            const isActive = activeMarker.timestamp === marker.timestamp;
            return (
              <div
                key={idx}
                onClick={() => handleSelect(marker)}
                className={`p-2.5 rounded-sm border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-studio-800 border-violet-500/60 text-white shadow-[0_0_10px_-4px_rgba(139,92,246,0.5)]'
                    : 'bg-studio-900 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                <div
                  className="w-full h-10 rounded-sm mb-2 flex items-center justify-center text-[10px] font-bold text-white/70 border border-white/10"
                  style={{ backgroundColor: marker.thumbnailColor + '40' }}
                >
                  #{marker.frameIndex}
                </div>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="font-bold text-slate-300">[{marker.timestamp}]</span>
                  <span className="text-emerald-400">{(marker.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1">{marker.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scene table */}
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-600" />
          SCENE SEGMENTATION MAP
        </div>
        <div className="space-y-1">
          {sceneMarkers.map((m, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(m)}
              className={`flex items-center justify-between p-2 border rounded-sm text-[11px] cursor-pointer transition-colors ${
                activeMarker.timestamp === m.timestamp
                  ? 'bg-studio-800 border-violet-500/30 text-slate-200'
                  : 'bg-studio-950 border-white/5 text-slate-400 hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-600 font-bold w-4">#{idx + 1}</span>
                <span className="px-1.5 py-0.5 bg-violet-500/15 text-violet-400 border border-violet-500/25 text-[10px] font-bold rounded-sm">
                  {m.timestamp}
                </span>
                <span className="text-slate-300 font-semibold">{m.label}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 font-mono text-[10px]">
                <span>FRAME {m.frameIndex}</span>
                <span className="text-emerald-400 font-bold">{(m.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
