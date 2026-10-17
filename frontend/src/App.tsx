/**
 * App.tsx — root component: wires the app-wide providers around the router.
 *
 * Order matters: the query cache is outermost (auth uses it), then theme,
 * toasts, auth, smooth scrolling, and finally the router that renders pages.
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ToastProvider } from '@/components/ui/Toast';
import { SmoothScroll } from '@/components/signature/SmoothScroll';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createQueryClient } from '@/lib/queryClient';
import { routes } from '@/router';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Created once, outside React, so they survive re-renders.
const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            {/* Buttery inertial scrolling (Lenis) */}
            <SmoothScroll>
              <RouterProvider router={router} />
            </SmoothScroll>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
