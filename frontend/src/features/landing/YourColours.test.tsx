/**
 * YourColours.test.tsx — photo previews don't leak memory: each photo's temporary
 * object URL is released when another photo replaces it, on "Reset colours", and when
 * the section goes away.
 */
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { YourColours } from './YourColours';

/** Pretend images load instantly and a canvas can be read (jsdom can do neither). */
class InstantImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe('YourColours', () => {
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

  it('releases a photo when it is replaced, reset, or the section closes', async () => {
    const { user, container, unmount } = renderWithProviders(<YourColours />);
    const input = container.querySelector<HTMLInputElement>('input[type=file]')!;

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
