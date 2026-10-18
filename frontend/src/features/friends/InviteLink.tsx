/**
 * InviteLink.tsx — your personal invite link. Anyone signed in who opens it can become your
 * friend in one click. "New link" makes a fresh one and the old link stops working.
 */
import { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { AccountSection } from '@/features/account/AccountSection';
import { useProfile } from '@/features/account/hooks';
import { friendsApi } from '@/lib/api/endpoints';
import { useQueryClient } from '@tanstack/react-query';

/** The invite link section. */
export function InviteLink() {
  const profile = useProfile();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const link = profile.data ? `${window.location.origin}/join/${profile.data.inviteCode}` : '';

  /** Copy the link (or share it, where the device can). */
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.show({ title: 'Invite link copied', tone: 'success' });
    } catch {
      toast.show({ title: 'Copy failed — select the link and copy it', tone: 'error' });
    }
  }

  /** Make a new link; the old one stops working. */
  async function renew() {
    setBusy(true);
    try {
      const { inviteCode } = await friendsApi.newInviteCode();
      queryClient.setQueryData(['profile'], profile.data ? { profile: { ...profile.data, inviteCode } } : undefined);
      toast.show({ title: 'New invite link ready — the old one no longer works', tone: 'info' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountSection title="Invite link" lede="Send it to friends: one click and you're connected.">
      <p className="rounded-2xl border border-line bg-glass px-4 py-3 font-mono text-sm break-all">{link || '…'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button icon={<Copy aria-hidden className="size-4" />} onClick={copy} disabled={!link}>
          Copy link
        </Button>
        <Button variant="ghost" icon={<RefreshCw aria-hidden className="size-4" />} onClick={renew} loading={busy}>
          New link
        </Button>
      </div>
    </AccountSection>
  );
}
