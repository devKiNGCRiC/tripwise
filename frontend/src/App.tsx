/**
 * App.tsx — root component: wires the app-wide providers around the router.
 *
 * Order matters: the query cache is outermost (auth uses it), then theme, the living
 * world (it follows the theme), toasts, auth, smooth scrolling, and finally the router.
 * The world's canvas is mounted here — once, behind every page, including error pages.
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
import { LivingWorld } from '@/world/LivingWorld';
import { WorldDefs } from '@/world/WorldDefs';
import { WorldProvider } from '@/world/WorldProvider';

// Created once, outside React, so they survive re-renders.
const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WorldProvider>
          <WorldDefs />
          <LivingWorld />
          <ToastProvider>
            <AuthProvider>
              {/* Buttery inertial scrolling (Lenis) */}
              <SmoothScroll>
                <RouterProvider router={router} />
              </SmoothScroll>
            </AuthProvider>
          </ToastProvider>
        </WorldProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
