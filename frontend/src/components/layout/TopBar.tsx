/**
 * TopBar Component
 * =================
 * Application header with logo, title, AI model badge,
 * system status indicator, and theme toggle placeholder.
 */

import { Brain, Cpu, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { cn } from '@/utils';

interface TopBarProps {
  onThemeToggle?: () => void;
  isDark?: boolean;
}

export function TopBar({ onThemeToggle, isDark = true }: TopBarProps) {
  const { isOnline, isLoading } = useSystemStatus();

  return (
    <header
      className="flex items-center justify-between px-6 shrink-0"
      style={{
        height: 60,
        background: 'rgba(16, 16, 24, 0.9)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        zIndex: 40,
      }}
    >
      {/* Left: Logo + Name */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 34,
            height: 34,
            background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
            boxShadow: '0 0 14px rgba(59,130,246,0.35)',
          }}
        >
          <Brain size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">
            Offline AI Knowledge Hub
          </h1>
          <p className="text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Multimodal RAG Platform
          </p>
        </div>
      </div>

      {/* Right: Model + Status + Theme toggle */}
      <div className="flex items-center gap-3">
        {/* AI Model badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.25)',
          }}
        >
          <Cpu size={13} className="text-blue-400" />
          <span className="text-xs font-medium text-blue-300">llama3.2:3b</span>
        </div>

        {/* System status */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: isLoading
              ? 'rgba(234,179,8,0.1)'
              : isOnline
              ? 'rgba(34,197,94,0.1)'
              : 'rgba(239,68,68,0.1)',
            border: `1px solid ${
              isLoading
                ? 'rgba(234,179,8,0.25)'
                : isOnline
                ? 'rgba(34,197,94,0.25)'
                : 'rgba(239,68,68,0.25)'
            }`,
          }}
        >
          {isOnline ? (
            <Wifi size={13} className="text-green-400" />
          ) : (
            <WifiOff size={13} className={isLoading ? 'text-yellow-400' : 'text-red-400'} />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              isLoading
                ? 'text-yellow-300'
                : isOnline
                ? 'text-green-300'
                : 'text-red-300',
            )}
          >
            {isLoading ? 'Connecting...' : isOnline ? 'System Online' : 'Offline'}
          </span>
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full animate-pulse-dot',
              isLoading
                ? 'bg-yellow-400'
                : isOnline
                ? 'bg-green-400'
                : 'bg-red-400',
            )}
          />
        </div>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
