import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import MultimodalStudio from '@/pages/MultimodalStudio';
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
            <Route path="/home" element={<Home />} />
            <Route path="/studio" element={<MultimodalStudio />} />
            <Route path="/documents" element={<Dashboard />} />
            <Route path="/audio" element={<Dashboard />} />
            <Route path="/video" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route
            path="*"
            element={
              <div style={{ backgroundColor: '#07090e', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NotFound />
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
