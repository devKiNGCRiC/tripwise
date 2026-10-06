/**
 * FestivalSky.test.tsx — the living background must be pure decoration:
 * hidden from screen readers and never focusable or clickable.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bunting } from './Bunting';
import { FestivalSky } from './FestivalSky';

describe('FestivalSky', () => {
  it('draws kites and lanterns as hidden, non-interactive decoration', () => {
    const { container } = render(<FestivalSky />);
    const sky = container.firstElementChild as HTMLElement;
    expect(sky).toHaveAttribute('aria-hidden', 'true');
    expect(sky.className).toContain('pointer-events-none');
    expect(sky.querySelectorAll('[data-kite]').length).toBeGreaterThanOrEqual(4);
    expect(sky.querySelectorAll('[data-lantern]').length).toBeGreaterThanOrEqual(6);
    expect(sky.querySelector('a, button, input, [tabindex]')).toBeNull();
  });
});

describe('Bunting', () => {
  it('is decorative', () => {
    const { container } = render(<Bunting />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
