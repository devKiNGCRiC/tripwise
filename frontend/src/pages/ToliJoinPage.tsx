/**
 * ToliJoinPage.tsx — route /toli/join/:token: where a Toli invite link lands. Shows what
 * you'd join (name, kind, how many Sahyatris, who leads) and joins in one tap — or opens it
 * if you're already in. An old or unavailable link says so.
 */
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { WorldStage } from '@/components/layout/WorldStage';
import { Avatar } from '@/components/ui/Avatar';
import { Button, buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useToliAction } from '@/features/toli/hooks';
import { TYPE_LABEL } from '@/features/toli/labels';
import { useWords } from '@/features/words/WordsProvider';
import { article } from '@/features/words/words';
import { toliApi } from '@/lib/api/endpoints';

/** Route "/toli/join/:token". */
export default function ToliJoinPage() {
  const { w, english } = useWords();
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const invite = useQuery({ queryKey: ['toli-invite', token], queryFn: () => toliApi.invite(token), select: (d) => d.invite, retry: false });
  const join = useToliAction('', () => toliApi.join(token));

  return (
    <WorldStage>
      <title>{`Join ${article(w.toli)} · TripWise`}</title>
      <GlassPanel className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
        {invite.isPending && <p className="text-soft">Opening the invite…</p>}
        {invite.isError && (
          <>
            <h1 className="text-[clamp(28px,4vw,44px)]">This invite isn't available</h1>
            <p className="text-soft">The link may be old — ask for a fresh one.</p>
            <Link to="/tolis" className={buttonClasses()}>
              Your {w.tolis}
            </Link>
          </>
        )}
        {invite.data && (
          <>
            <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">{english ? 'Plan trips together' : 'Toli · plan trips together'}</p>
            <h1 className="text-[clamp(30px,4.5vw,52px)]">Join {invite.data.name}</h1>
            <p className="text-soft">
              {TYPE_LABEL[invite.data.type]} · {invite.data.memberCount} {w.sahyatris}
            </p>
            {invite.data.sutradhar && (
              <p className="flex items-center gap-2">
                <Avatar name={invite.data.sutradhar.name} url={invite.data.sutradhar.avatarUrl} className="size-8 text-sm" /> Led by {invite.data.sutradhar.name}
              </p>
            )}
            {invite.data.alreadyMember ? (
              <Link to={`/tolis/${invite.data.toliId}`} className={buttonClasses({ size: 'lg' })}>
                Open this {w.toli}
              </Link>
            ) : (
              <Button size="lg" loading={join.isPending} onClick={() => join.mutate(undefined, { onSuccess: ({ toli }) => navigate(`/tolis/${toli.id}`) })}>
                Join this {w.toli}
              </Button>
            )}
            {join.isError && (
              <p role="alert" className="text-sm text-danger">
                {join.error.message}
              </p>
            )}
          </>
        )}
      </GlassPanel>
    </WorldStage>
  );
}
