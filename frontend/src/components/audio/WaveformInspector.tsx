import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Activity, Sliders, Disc, Shield, Clock } from 'lucide-react';

interface WaveformInspectorProps {
  audioUrl?: string;
  audioName?: string;
  duration?: string;
  timestamps?: Array<{ time: string; text: string }>;
  onTimestampSelect?: (timestamp: string) => void;
}

export const WaveformInspector: React.FC<WaveformInspectorProps> = ({
  audioName = 'Executive_Briefing_Audio_Track.mp3',
  duration = '04:15',
  timestamps = [
    { time: '00:15 - 00:42', text: 'Opening remarks on air-gapped system architecture' },
    { time: '01:10 - 01:35', text: 'Vector search benchmark analysis and Cosine metrics' },
    { time: '02:45 - 03:20', text: 'LLM streaming zero-temperature prompt constraints' },
  ],
  onTimestampSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [pitchShift, setPitchShift] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'waveform' | 'spectrogram'>('waveform');
  const [scrubPosition, setScrubPosition] = useState(35); // percentage

  // Draw WebAudio style waveform or spectrogram on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (viewMode === 'waveform') {
      // Draw Tactile High-Density Sound Waveform
      const bars = 80;
      const barWidth = (width / bars) - 2;

      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + 2);
        // Deterministic pseudo-wave for demonstration
        const heightFactor = Math.abs(Math.sin(i * 0.15) * 0.7 + Math.cos(i * 0.3) * 0.3);
        const barHeight = Math.max(6, heightFactor * (height - 20));
        const y = (height - barHeight) / 2;

        const isScrubbed = (i / bars) * 100 <= scrubPosition;

        ctx.fillStyle = isScrubbed
          ? '#f59e0b' // Safety Amber for scrubbed audio
          : '#202433'; // Studio slate for unplayed

        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Draw Playhead line
      const playheadX = (scrubPosition / 100) * width;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(playheadX - 1, 0, 3, height);
    } else {
      // Draw Spectrogram Frequency Grid
      const columns = 60;
      const colWidth = width / columns;
      const rows = 24;
      const rowHeight = height / rows;

      for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows; r++) {
          const intensity = Math.sin(c * 0.2 + r * 0.4) * 0.5 + 0.5;
          const isScrubbed = (c / columns) * 100 <= scrubPosition;

          if (isScrubbed) {
            ctx.fillStyle = `rgba(217, 119, 6, ${intensity})`;
          } else {
            ctx.fillStyle = `rgba(37, 99, 235, ${intensity * 0.5})`;
          }

          ctx.fillRect(c * colWidth, r * rowHeight, colWidth - 1, rowHeight - 1);
        }
      }
    }
  }, [viewMode, scrubPosition]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setScrubPosition(percentage);
  };

  return (
    <div className="w-full bg-studio-900 border border-white/10 rounded-sm p-4 tactile-card font-mono text-xs">
      {/* Track Info Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-amber-tactile/20 border border-amber-tactile/40 flex items-center justify-center text-amber-bright">
            <Disc className="w-4 h-4 animate-spin" style={{ animationDuration: isPlaying ? '3s' : '0s' }} />
          </div>
          <div>
            <div className="text-slate-100 font-bold tracking-wider flex items-center gap-2">
              {audioName}
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-tactile/20 border border-amber-tactile/30 text-amber-bright uppercase">
                PURE AUDIO // WEBAUDIO
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              DURATION: {duration} // SAMPLING: 16kHz MONO // WHISPER SEGMENTATION
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-studio-950 border border-white/10 p-1 rounded-sm">
          <button
            onClick={() => setViewMode('waveform')}
            className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold transition-colors ${
              viewMode === 'waveform' ? 'bg-amber-tactile text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            WAVEFORM
          </button>
          <button
            onClick={() => setViewMode('spectrogram')}
            className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold transition-colors ${
              viewMode === 'spectrogram' ? 'bg-amber-tactile text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            SPECTROGRAM
          </button>
        </div>
      </div>

      {/* Interactive Waveform / Spectrogram Canvas */}
      <div className="relative mb-4 bg-studio-950 border border-white/10 p-2 rounded-sm">
        <canvas
          ref={canvasRef}
          width={800}
          height={120}
          onClick={handleCanvasClick}
          className="w-full h-[120px] cursor-pointer"
        />
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
          <span>00:00</span>
          <span>POSITION: {((scrubPosition / 100) * 4.25).toFixed(2)} MIN</span>
          <span>{duration}</span>
        </div>
      </div>

      {/* Playback Controls & Pitch / Speed Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-studio-950 border border-white/10 p-3 rounded-sm items-center">
        {/* Play/Pause & Volume */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 bg-amber-tactile text-black font-bold flex items-center justify-center rounded-sm hover:bg-amber-bright transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="flex items-center gap-2 text-slate-400">
            <Volume2 className="w-4 h-4 text-amber-bright" />
            <span className="text-[11px]">GAIN: 0.0 dB</span>
          </div>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase">SPEED:</span>
          {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-0.5 text-[10px] rounded-sm border ${
                playbackSpeed === speed
                  ? 'bg-amber-tactile/20 border-amber-tactile text-amber-bright font-bold'
                  : 'bg-studio-900 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Pitch Shift Slider */}
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-amber-bright" />
          <span className="text-[10px] text-slate-400 uppercase">PITCH:</span>
          <input
            type="range"
            min="-12"
            max="12"
            value={pitchShift}
            onChange={(e) => setPitchShift(Number(e.target.value))}
            className="w-full h-1 bg-studio-800 accent-amber-tactile cursor-pointer"
          />
          <span className="text-[10px] text-amber-bright font-mono w-8 text-right">
            {pitchShift > 0 ? `+${pitchShift}` : pitchShift} st
          </span>
        </div>
      </div>

      {/* Timestamp Hit Markers Bar */}
      <div className="mt-4">
        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-bright" />
          DETECTED ACOUSTIC TIMESTAMPS // WHISPER SEGMENTATION
        </div>
        <div className="space-y-1.5">
          {timestamps.map((ts, idx) => (
            <div
              key={idx}
              onClick={() => {
                setScrubPosition((idx + 1) * 25);
                if (onTimestampSelect) onTimestampSelect(ts.time);
              }}
              className="flex items-center justify-between p-2 bg-studio-950 border border-white/5 hover:border-amber-tactile/40 rounded-sm cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-tactile/15 text-amber-bright border border-amber-tactile/30 text-[10px] font-bold rounded-sm group-hover:bg-amber-tactile group-hover:text-black">
                  [{ts.time}]
                </span>
                <span className="text-slate-300 text-[11px] line-clamp-1">{ts.text}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">SCORED CHUNK #{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
