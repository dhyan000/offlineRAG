/**
 * App.tsx — Root Application Component
 * ======================================
 * Sets up:
 *   - TanStack Query client
 *   - React Router v7 routes
 *   - AppLayout shell
 *   - All 8 page routes
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import KnowledgeBase from '@/pages/KnowledgeBase';
import Chat from '@/pages/Chat';
import Search from '@/pages/Search';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Logs from '@/pages/Logs';
import NotFound from '@/pages/NotFound';

// ── Query client configuration ────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1_000, // 5 minutes
    },
  },
});

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Main layout wraps all pages */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/search" element={<Search />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/logs" element={<Logs />} />
          </Route>

          {/* 404 — outside layout so it fills the whole screen */}
          <Route
            path="*"
            element={
              <div style={{ backgroundColor: 'rgb(10,10,15)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NotFound />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
