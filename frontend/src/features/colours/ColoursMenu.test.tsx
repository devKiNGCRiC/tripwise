/**
 * ColoursMenu.test.tsx — the navbar's "Colours" menu: it opens and closes like a menu
 * (button, Escape, a click outside), tints the world from the current region's photo in
 * one click, and photo previews don't leak memory (each photo's temporary object URL is
 * released when replaced, reset, or the menu goes away).
 */
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ColoursMenu } from './ColoursMenu';

/** Pretend images load instantly and a canvas can be read (jsdom can do neither). */
class InstantImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe('ColoursMenu', () => {
  let created = 0;
  const revoke = vi.fn();

  beforeEach(() => {
    created = 0;
    revoke.mockClear();
    vi.stubGlobal('Image', InstantImage);
    URL.createObjectURL = () => `blob:photo-${++created}`;
    URL.revokeObjectURL = revoke;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage() {},
      getImageData: () => ({ data: new Uint8ClampedArray(48 * 48 * 4).fill(200) }),
    } as unknown as CanvasRenderingContext2D);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Choose a photo through the hidden file input. */
  const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

  it('opens from its button and closes with Escape or a click outside', async () => {
    const { user } = renderWithProviders(
      <>
        <ColoursMenu />
        <p>Elsewhere</p>
      </>,
    );
    const button = screen.getByRole('button', { name: 'Colours' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(screen.getByRole('dialog', { name: 'Colours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Colours' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    await user.click(button);
    await user.click(screen.getByText('Elsewhere'));
    expect(screen.queryByRole('dialog', { name: 'Colours' })).not.toBeInTheDocument();
  });

  it("tints the world from this world's photo in one click", async () => {
    const { user } = renderWithProviders(<ColoursMenu />);
    await user.click(screen.getByRole('button', { name: 'Colours' }));
    await user.click(screen.getByRole('button', { name: "Use this world's photo" }));
    expect(await screen.findByText('Your photo’s colours now tint the whole world.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset colours' })).toBeInTheDocument();
    expect(revoke).not.toHaveBeenCalled(); // the region photo is a real file, not a temporary URL
  });

  it('releases a photo when it is replaced, reset, or the menu goes away', async () => {
    const { user, unmount } = renderWithProviders(<ColoursMenu />);
    await user.click(screen.getByRole('button', { name: 'Colours' }));
    const input = screen.getByLabelText('Match a photo');

    await user.upload(input, photo('a.jpg'));
    expect(await screen.findByRole('img', { name: 'Your trip photo' })).toHaveAttribute('src', 'blob:photo-1');

    await user.upload(input, photo('b.jpg'));
    await screen.findByText('Your photo’s colours now tint the whole world.');
    expect(revoke).toHaveBeenCalledWith('blob:photo-1');

    await user.click(screen.getByRole('button', { name: 'Reset colours' }));
    expect(revoke).toHaveBeenCalledWith('blob:photo-2');

    await user.upload(input, photo('c.jpg'));
    await screen.findByRole('img', { name: 'Your trip photo' });
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:photo-3');
  });
});
