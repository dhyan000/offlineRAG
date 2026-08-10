import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UploadCloud, FileText, Mic, Film,
  Settings as SettingsIcon, Activity, Database
} from 'lucide-react';
import { statsApi } from '@/services/api';

export const Sidebar: React.FC = () => {
  const [counts, setCounts] = useState({ pdf: 0, audio: 0, video: 0 });

  const fetchCounts = useCallback(async () => {
    try {
      const s = await statsApi.get();
      setCounts({ pdf: s.pdf_count, audio: s.audio_count, video: s.video_count });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCounts();
    const id = setInterval(fetchCounts, 8000);
    return () => clearInterval(id);
  }, [fetchCounts]);

  const navItems = [
    { path: '/',          label: 'Command Center',        subtitle: 'Dashboard & overview',         icon: LayoutDashboard, badge: null },
    { path: '/studio',    label: 'Ingestion Studio',      subtitle: 'Upload & index files',          icon: UploadCloud,     badge: null },
    { path: '/documents', label: 'Document Workspace',    subtitle: 'PDF · TXT · DOCX',              icon: FileText,        badge: counts.pdf   || null, badgeColor: 'blue' },
    { path: '/audio',     label: 'Audio Workspace',       subtitle: 'MP3 · WAV · FLAC · M4A',        icon: Mic,             badge: counts.audio || null, badgeColor: 'amber' },
    { path: '/video',     label: 'Video Workspace',       subtitle: 'MP4 · MOV · MKV',               icon: Film,            badge: counts.video || null, badgeColor: 'violet' },
    { path: '/settings',  label: 'Settings',              subtitle: 'System configuration',          icon: SettingsIcon,    badge: null },
  ] as const;

  return (
    <aside className="w-56 bg-studio-900 border-r border-white/8 flex flex-col justify-between py-3 px-2 font-mono select-none z-40 shrink-0">
      <div>
        {/* Brand */}
        <div className="px-2 pb-4 mb-2 border-b border-white/8">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-bold text-slate-100 text-[11px] tracking-wider">OFFLINE AI HUB</span>
          </div>
          <div className="text-[10px] text-slate-600">Air-gapped · v2.4</div>
        </div>

        {/* Nav */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-2.5 py-2 rounded-sm transition-all text-[11px] group ${
                    isActive
                      ? 'bg-studio-800 text-slate-100 font-bold'
                      : 'text-slate-500 hover:bg-studio-800/50 hover:text-slate-300'
                  }`
                }
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <div className="truncate">
                    <div className="truncate">{item.label}</div>
                    <div className="text-[9px] font-sans text-slate-600 mt-0.5 font-normal truncate">{item.subtitle}</div>
                  </div>
                </div>
                {'badge' in item && item.badge ? (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold shrink-0 ${
                    (item as any).badgeColor === 'amber'  ? 'bg-amber-500/15 text-amber-400'
                    : (item as any).badgeColor === 'violet' ? 'bg-violet-500/15 text-violet-400'
                    : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer status */}
      <div className="px-2 pt-3 border-t border-white/8">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span>Ollama + ChromaDB</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-600">
          <Database className="w-3 h-3 text-blue-500" />
          <span>
            {counts.pdf + counts.audio + counts.video} files indexed
          </span>
        </div>
      </div>
    </aside>
  );
};
