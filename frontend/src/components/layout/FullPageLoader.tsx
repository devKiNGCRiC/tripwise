/**
 * FullPageLoader.tsx — centred loader used while auth restores or a page chunk downloads:
 * a small ring in the region colour tracing itself, with a screen-reader-only status message.
 */
export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[60vh] place-items-center">
      <span aria-hidden className="size-10 animate-spin rounded-full border-[1.5px] border-accent-2/25 border-t-accent-2" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
