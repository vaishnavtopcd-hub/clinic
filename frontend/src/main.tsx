import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ClinicScopeProvider } from './auth/ClinicScopeContext';
import { ThemeProvider } from './theme/ThemeContext';
import { initBrandColor } from './theme/brand';
import './index.css';

// Re-apply the last clinic brand colour before first paint to avoid a flash of
// the default violet while auth/clinic data loads.
initBrandColor();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ClinicScopeProvider>
              <App />
            </ClinicScopeProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
