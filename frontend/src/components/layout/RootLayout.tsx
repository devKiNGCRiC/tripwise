/**
 * RootLayout.tsx — the frame around every page: banner, floating navbar, page, footer,
 * and mobile tab bar, all floating over the living world (mounted in App.tsx).
 * <Outlet /> is where the current route's page renders.
 */
import { Outlet, ScrollRestoration } from 'react-router';
import { Footer } from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { Navbar } from './Navbar';
import { ServerWakingBanner } from './ServerWakingBanner';
import { AccountThemeSync } from '@/world/AccountThemeSync';

/** The frame around every page. */
export function RootLayout() {
  return (
    // overflow-x-clip: wide ornaments may poke past the screen edge; clip them so phones never
    // get a sideways scroll (clip, unlike hidden, keeps sticky sections working).
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      {/* Skip link: lets keyboard users jump past the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:font-semibold focus:text-on-ink"
      >
        Skip to content
      </a>
      <ServerWakingBanner />
      <Navbar />
      <main id="main" className="flex-1">
        <AccountThemeSync />
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      {/* Scroll to top on new pages, restore position on back/forward. */}
      <ScrollRestoration />
    </div>
  );
}
