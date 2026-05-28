import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App';
import { queryClient } from '@/shared/lib/queryClient';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'Cairo, sans-serif',
              fontSize: '14px',
              direction: 'rtl',
              textAlign: 'right',
              borderRadius: '12px',
            },
            success: { style: { background: '#1A6B47', color: '#fff' } },
            error: { style: { background: '#DC2626', color: '#fff' } },
          }}
        />
        {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
