/**
 * App.test.tsx — smoke test proving the toolchain (Vite + TS + Vitest + jsdom) works.
 * Removed in Task 9 when App becomes the real router shell.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the brand name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'TripWise' })).toBeInTheDocument();
  });
});
