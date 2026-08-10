import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import MultimodalStudio from '@/pages/MultimodalStudio';
import DocumentWorkspace from '@/pages/DocumentWorkspace';
import AudioWorkspace from '@/pages/AudioWorkspace';
import VideoWorkspace from '@/pages/VideoWorkspace';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/studio" element={<MultimodalStudio />} />
            <Route path="/documents" element={<DocumentWorkspace />} />
            <Route path="/audio" element={<AudioWorkspace />} />
            <Route path="/video" element={<VideoWorkspace />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route
            path="*"
            element={
              <div style={{ backgroundColor: '#07080b', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NotFound />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
