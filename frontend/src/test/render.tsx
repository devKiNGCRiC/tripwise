/**
 * render.tsx — test helpers that wrap a component in the same providers the
 * real app uses (query cache, theme, toasts, auth, router), so tests look
 * like real usage without repeating setup everywhere.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { routes } from '@/router';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { WorldProvider } from '@/world/WorldProvider';

/** A fresh cache per test, with retries off so failures show up immediately. */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

/** Every app-level provider except the router (callers choose MemoryRouter or a data router). */
export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WorldProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </WorldProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Render `ui` inside all providers + a MemoryRouter starting at `route`. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  const result = render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
  return { user, queryClient, ...result };
}

/** Render the WHOLE app (real routes, guards, layout) starting at `route`. */
export function renderApp(route = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  const result = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, user, queryClient, ...result };
}
