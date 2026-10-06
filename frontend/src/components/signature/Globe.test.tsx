/**
 * Globe.test.tsx — without WebGL (old devices, jsdom) the hero still shows a
 * globe: the lightweight CSS fallback, described for screen readers.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { Globe } from './Globe';

describe('Globe', () => {
  it('shows the static fallback globe when WebGL is unavailable', () => {
    render(
      <ThemeProvider>
        <Globe />
      </ThemeProvider>,
    );
    expect(screen.getByRole('img', { name: /globe with flight routes from india/i })).toBeInTheDocument();
    expect(document.querySelector('canvas')).toBeNull();
  });
});
