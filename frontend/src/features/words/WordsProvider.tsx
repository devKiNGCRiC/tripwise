/**
 * WordsProvider.tsx — which names everyone sees (Indian or English), for the whole app.
 *   Starts from this device's last choice (instant, also for guests).
 *   Signed in: follows the account's choice, so it's the same on every device.
 *   Changing it saves on this device and, when signed in, on the account.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useProfile, useUpdateProfile } from '@/features/account/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { WORDS, type NameStyle, type Words } from './words';

/** Where this device remembers the choice. */
const STORAGE_KEY = 'tripwise:names';

/** What screens get from useWords(). */
interface WordsValue {
  /** The names to show. */
  w: Words;
  style: NameStyle;
  /** True in English mode (Hindi decorations are hidden). */
  english: boolean;
  setStyle: (style: NameStyle) => void;
}

/** Outside the provider (e.g. a component test): Indian names, no saving. */
const WordsContext = createContext<WordsValue>({ w: WORDS.indian, style: 'indian', english: false, setStyle: () => undefined });

/** This device's last choice. */
function deviceStyle(): NameStyle {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'english' ? 'english' : 'indian';
  } catch {
    return 'indian';
  }
}

/** Provides the chosen names to everything inside. */
export function WordsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const [style, setLocal] = useState<NameStyle>(deviceStyle);
  const saved = profile.data?.preferences.names;

  /** Remember a choice on this device. */
  const remember = useCallback((next: NameStyle) => {
    setLocal(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still holds for this visit.
    }
  }, []);

  // The account's choice wins once it's known.
  useEffect(() => {
    if (saved) remember(saved);
  }, [saved, remember]);

  /** Change the names (and save them on the account when signed in). */
  const setStyle = useCallback(
    (next: NameStyle) => {
      remember(next);
      if (status === 'authenticated') updateProfile.mutate({ preferences: { names: next } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the mutation object changes every render
    [status, remember],
  );

  const value = useMemo(() => ({ w: WORDS[style], style, english: style === 'english', setStyle }), [style, setStyle]);
  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

/** The names to show, and a way to change them. */
export function useWords() {
  return useContext(WordsContext);
}
