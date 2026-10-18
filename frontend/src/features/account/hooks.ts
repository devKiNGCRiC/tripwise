/**
 * hooks.ts (account) — reading and changing the signed-in traveller's profile.
 * Every change refreshes the cached profile, the signed-in user (navbar name and photo) and
 * the passport, so the whole app shows the new details straight away.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi } from '@/lib/api/endpoints';
import type { Profile, ProfilePatch, User } from '@/lib/api/types';

/** The public part of a profile (what the navbar knows about you). */
function userOf(profile: Profile): User {
  const { id, name, username, avatarUrl, email, role, plan, createdAt, blocked } = profile;
  return { id, name, username, ...(avatarUrl ? { avatarUrl } : {}), email, role, plan, createdAt, blocked };
}

/** My profile and settings. */
export function useProfile() {
  const { status } = useAuth();
  return useQuery({ queryKey: ['profile'], queryFn: () => profileApi.get(), select: (d) => d.profile, enabled: status === 'authenticated' });
}

/** After any profile change: update the caches everyone reads. */
function useApplyProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  return (profile: Profile) => {
    queryClient.setQueryData(['profile'], { profile });
    updateUser(userOf(profile));
    void queryClient.invalidateQueries({ queryKey: ['passport'] });
  };
}

/** Change some of my profile. */
export function useUpdateProfile() {
  const apply = useApplyProfile();
  return useMutation({ mutationFn: (patch: ProfilePatch) => profileApi.update(patch), onSuccess: ({ profile }) => apply(profile) });
}

/** Upload a new profile photo (already cropped). */
export function useUploadAvatar() {
  const apply = useApplyProfile();
  return useMutation({ mutationFn: (photo: Blob) => profileApi.uploadAvatar(photo), onSuccess: ({ profile }) => apply(profile) });
}

/** Remove the profile photo. */
export function useRemoveAvatar() {
  const apply = useApplyProfile();
  return useMutation({ mutationFn: () => profileApi.removeAvatar(), onSuccess: ({ profile }) => apply(profile) });
}
