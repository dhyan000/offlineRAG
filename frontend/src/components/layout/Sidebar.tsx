import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Music,
  Video,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home Overview', href: '/home', icon: Home },
  { label: 'Workspace', href: '/', icon: LayoutDashboard },
  { label: 'Multimodal Studio', href: '/studio', icon: FolderKanban, badge: 'Pro' },
  { label: 'PDF Intelligence', href: '/documents', icon: FileText },
  { label: 'Audio Intelligence', href: '/audio', icon: Music },
  { label: 'Video Intelligence', href: '/video', icon: Video },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full overflow-hidden shrink-0 z-30"
      style={{
        background: 'rgba(11, 15, 25, 0.95)',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
      }}
    >
      {/* Brand header */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', minHeight: 64 }}
      >
        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #6366f1, #a855f7, #06b6d4)',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Sparkles size={20} className="text-white animate-pulse" />
        </div>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <p className="text-sm font-bold text-white leading-tight tracking-wide">
                Multimodal AI Hub
              </p>
              <p className="text-[11px] font-medium text-indigo-400">
                100% Offline RAG
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon, badge }) => {
          const isActive =
            href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(href);

          return (
            <div key={href} className="relative group">
              <NavLink
                to={href}
                className={cn(
                  'flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 relative',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40',
                )}
                style={
                  isActive
                    ? {
                        background:
                          'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.15))',
                        boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.3)',
                      }
                    : {}
                }
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                    style={{ background: 'linear-gradient(to bottom, #6366f1, #a855f7)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <Icon
                  size={19}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300',
                  )}
                />

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between flex-1 overflow-hidden whitespace-nowrap"
                    >
                      <span className="truncate">{label}</span>
                      {badge && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                          {badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </NavLink>

              {isCollapsed && (
                <div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl"
                  style={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed((v) => !v)}
        className="flex items-center justify-center m-3 p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all border border-slate-800"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="ml-2 text-xs font-medium overflow-hidden whitespace-nowrap"
            >
              Minimize Sidebar
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.aside>
  );
}
