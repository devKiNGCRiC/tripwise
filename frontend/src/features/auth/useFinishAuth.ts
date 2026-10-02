/**
 * useFinishAuth.ts — what happens right after any successful login/signup:
 * a friendly toast, then go where the user was heading (safely) or to /passport.
 * Shared by the email forms and the Google button so they behave identically.
 */
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useToast } from '@/components/ui/Toast';
import type { User } from '@/lib/api/types';
import { safeNext } from './safeNext';

export function useFinishAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  return useCallback(
    (user: User, verb: 'login' | 'signup') => {
      const firstName = user.name.split(' ')[0];
      toast.show({
        tone: 'success',
        title: verb === 'signup' ? `Welcome aboard, ${firstName}!` : `Welcome back, ${firstName}!`,
      });
      navigate(safeNext(params.get('next')), { replace: true });
    },
    [navigate, params, toast],
  );
}
