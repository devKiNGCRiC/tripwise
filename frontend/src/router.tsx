/**
 * router.tsx — every URL in TripWise and what renders there (spec §4).
 *
 * Pages are lazy-loaded: each page's code downloads only when first visited,
 * keeping the initial load fast (< 3s target). Guards are "layout routes"
 * wrapping groups of pages. ComingSoon placeholders are swapped for real
 * pages in Plans 2 and 3.
 */
import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { RootLayout } from '@/components/layout/RootLayout';
import { RouteError } from '@/components/layout/RouteError';
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/layout/RouteGuards';
import ComingSoonPage from '@/pages/ComingSoonPage';
import NotFoundPage from '@/pages/NotFoundPage';

/** Turn `() => import('./Page')` into React Router's lazy route format. */
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default });
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    errorElement: <RouteError />,
    children: [
      // Public pages
      { index: true, lazy: lazyPage(() => import('@/pages/LandingPage')) },
      { path: 'explore', lazy: lazyPage(() => import('@/pages/ExplorePage')) },
      { path: 'destinations/:slug', lazy: lazyPage(() => import('@/pages/DestinationPage')) },
      { path: 't/:shareId', lazy: lazyPage(() => import('@/pages/SharedTripPage')) },
      { path: 'reset-password/:token', lazy: lazyPage(() => import('@/pages/ResetPasswordPage')) },
      { path: 'u/:username', lazy: lazyPage(() => import('@/pages/PublicPassportPage')) },

      // Only for logged-out visitors
      {
        Component: GuestRoute,
        children: [
          { path: 'login', lazy: lazyPage(() => import('@/pages/LoginPage')) },
          { path: 'signup', lazy: lazyPage(() => import('@/pages/SignupPage')) },
          { path: 'forgot-password', lazy: lazyPage(() => import('@/pages/ForgotPasswordPage')) },
        ],
      },

      // Only for logged-in users
      {
        Component: ProtectedRoute,
        children: [
          { path: 'plan', lazy: lazyPage(() => import('@/pages/PlanPage')) },
          { path: 'trips', lazy: lazyPage(() => import('@/pages/TripsPage')) },
          { path: 'trips/:id', lazy: lazyPage(() => import('@/pages/TripPage')) },
          { path: 'passport', lazy: lazyPage(() => import('@/pages/PassportPage')) },
          { path: 'passport/account', lazy: lazyPage(() => import('@/pages/AccountPage')) },
          { path: 'passport/friends', lazy: lazyPage(() => import('@/pages/FriendsPage')) },
          { path: 'join/:code', lazy: lazyPage(() => import('@/pages/JoinPage')) },
        ],
      },

      // Only for admins
      {
        path: 'admin',
        Component: AdminRoute,
        children: [
          { index: true, element: <ComingSoonPage title="Admin dashboard" /> },
          { path: '*', element: <ComingSoonPage title="Admin" /> },
        ],
      },

      // Anything else
      { path: '*', Component: NotFoundPage },
    ],
  },
];
