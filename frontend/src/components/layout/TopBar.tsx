import React from 'react';
import { HardwareStatusMonitor } from '@/components/common/HardwareStatusMonitor';
import { ShieldCheck, Terminal, Cpu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const TopBar: React.FC = () => {
  const location = useLocation();

  const getWorkspaceTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'OPERATIONAL COMMAND CENTER';
      case '/studio':
        return 'MULTIMODAL INGESTION STUDIO';
      case '/documents':
        return 'DOCUMENT QUERY WORKSPACE';
      case '/audio':
        return 'AUDIO QUERY WORKSPACE';
      case '/video':
        return 'VIDEO QUERY WORKSPACE';
      case '/settings':
        return 'SYSTEM SETTINGS';
      default:
        return 'WORKSTATION ENGINE';
    }
  };

  return (
    <header className="h-14 bg-studio-900 border-b border-white/10 px-4 flex items-center justify-between font-mono select-none z-30">
      {/* Active Workspace Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100 tracking-wider uppercase">
          <Terminal className="w-4 h-4 text-klein-bright" />
          <span>{getWorkspaceTitle()}</span>
        </div>

        <span className="text-slate-600">//</span>

        <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-sm">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>AIR-GAPPED 100% OFFLINE</span>
        </div>
      </div>

      {/* Right Hardware Status Monitor */}
      <HardwareStatusMonitor />
    </header>
  );
};
