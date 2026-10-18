/**
 * endpoints.ts — typed, named functions for each API endpoint.
 * Components and hooks call `authApi.login(...)` instead of hand-writing URLs,
 * so a URL change happens in exactly one place.
 */
import { api } from './client';
import { ApiError, friendlyMessage } from './errors';
import type { AuthResponse, Card, Destination, DestinationFilters, FriendsList, GenerateEvent, GenerateResponse, Journal, Passport, Profile, ProfilePatch, Relation, Itinerary, LoginInput, Quota, SignupInput, TripRequest, User } from './types';

/** Turn a filters object into "?a=1&b=2", skipping empty values. */
function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Authentication. Login-type calls skip auto-refresh: a 401 there just means "wrong password". */
export const authApi = {
  login: (input: LoginInput) => api.request<AuthResponse>('/auth/login', { method: 'POST', body: input, skipRefresh: true }),
  signup: (input: SignupInput) => api.request<AuthResponse>('/auth/signup', { method: 'POST', body: input, skipRefresh: true }),
  google: (credential: string) =>
    api.request<AuthResponse>('/auth/google', { method: 'POST', body: { credential }, skipRefresh: true }),
  logout: () => api.request<void>('/auth/logout', { method: 'POST', skipRefresh: true }),
  me: () => api.request<{ user: User }>('/auth/me'),
};

/** Public destination catalogue. */
export const destinationsApi = {
  list: (filters: DestinationFilters = {}) =>
    api.request<{ destinations: Destination[] }>(`/destinations${toQuery({ ...filters })}`),
  get: (slug: string) => api.request<{ destination: Destination }>(`/destinations/${encodeURIComponent(slug)}`),
};

/** Itineraries: AI generation, the traveller's own trips, one-day regeneration and sharing. */
export const itinerariesApi = {
  generate: (request: TripRequest) => api.request<GenerateResponse>('/itineraries/generate', { method: 'POST', body: request }),
  /**
   * Generate, watching the trip arrive: `onEvent` gets each event (meta, day, reset …) as it
   * comes. Resolves with the saved trip on `done`; rejects with an ApiError on `error`.
   */
  generateStream: async (request: TripRequest, onEvent: (event: GenerateEvent) => void): Promise<GenerateResponse> => {
    let result: GenerateResponse | null = null;
    let failure: ApiError | null = null;
    await api.stream('/itineraries/generate/stream', { method: 'POST', body: request }, (line) => {
      const event = line as GenerateEvent;
      onEvent(event);
      if (event.type === 'done') result = { itinerary: event.itinerary, quota: event.quota };
      if (event.type === 'error') failure = new ApiError(event.error.code, event.error.message, 200);
    });
    if (failure) throw failure;
    if (!result) throw new ApiError('SERVER', friendlyMessage('SERVER'), 200);
    return result;
  },
  list: () => api.request<{ itineraries: Itinerary[] }>('/itineraries'),
  get: (id: string) => api.request<{ itinerary: Itinerary }>(`/itineraries/${encodeURIComponent(id)}`),
  remove: (id: string) => api.request<void>(`/itineraries/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  regenerateDay: (id: string, day: number) =>
    api.request<{ itinerary: Itinerary }>(`/itineraries/${encodeURIComponent(id)}/days/${day}/regenerate`, { method: 'POST' }),
  share: (id: string) => api.request<{ shareId: string }>(`/itineraries/${encodeURIComponent(id)}/share`, { method: 'POST' }),
};

/** Public, read-only shared trips (no login needed). */
export const shareApi = {
  get: (shareId: string) => api.request<{ itinerary: Itinerary }>(`/share/${encodeURIComponent(shareId)}`),
};

/** The signed-in traveller's own account data. */
export const meApi = {
  quota: () => api.request<{ quota: Quota }>('/me/quota'),
};

/** The signed-in traveller's profile, photo and settings. */
export const profileApi = {
  get: () => api.request<{ profile: Profile }>('/me/profile'),
  update: (patch: ProfilePatch) => api.request<{ profile: Profile }>('/me/profile', { method: 'PATCH', body: patch }),
  /** A square photo, already cropped and shrunk in the browser. */
  uploadAvatar: (photo: Blob) => api.request<{ profile: Profile }>('/me/avatar', { method: 'PUT', body: photo }),
  removeAvatar: () => api.request<{ profile: Profile }>('/me/avatar', { method: 'DELETE' }),
};

/** Password, sessions and deleting the account. */
export const accountApi = {
  changePassword: (currentPassword: string, newPassword: string) => api.request<void>('/me/password', { method: 'POST', body: { currentPassword, newPassword } }),
  logoutAll: () => api.request<void>('/auth/logout-all', { method: 'POST' }),
  deleteAccount: (password: string) => api.request<void>('/me', { method: 'DELETE', body: { password } }),
  /** Always succeeds (it never says whether the email has an account). */
  forgot: (email: string) => api.request<{ ok: true }>('/auth/forgot', { method: 'POST', body: { email }, skipRefresh: true }),
  reset: (token: string, password: string) => api.request<{ ok: true }>('/auth/reset', { method: 'POST', body: { token, password }, skipRefresh: true }),
};

/** Passports: mine, or someone else's by @username. */
export const passportApi = {
  mine: () => api.request<{ passport: Passport }>('/me/passport'),
  of: (username: string) => api.request<{ passport: Passport; relation: Relation }>(`/users/${encodeURIComponent(username)}/passport`),
};

/** Journals of finished trips. */
export const journalApi = {
  get: (tripId: string) => api.request<{ journal: Journal }>(`/itineraries/${encodeURIComponent(tripId)}/journal`),
  save: (tripId: string, entry: { rating: number | null; memory: string }) =>
    api.request<{ journal: Journal }>(`/itineraries/${encodeURIComponent(tripId)}/journal`, { method: 'PUT', body: entry }),
  addPhoto: (tripId: string, photo: Blob, info: { width: number; height: number; alt: string }) =>
    api.request<{ journal: Journal }>(`/itineraries/${encodeURIComponent(tripId)}/journal/photos${toQuery({ width: info.width, height: info.height, alt: info.alt })}`, {
      method: 'POST',
      body: photo,
    }),
  removePhoto: (tripId: string, photoId: string) =>
    api.request<{ journal: Journal }>(`/itineraries/${encodeURIComponent(tripId)}/journal/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' }),
};

/** Friends, requests, blocks and invite links. */
export const friendsApi = {
  list: () => api.request<FriendsList>('/friends'),
  request: (username: string) => api.request<{ relation: Relation }>('/friends/requests', { method: 'POST', body: { username } }),
  accept: (requestId: string) => api.request<{ friend: Card }>(`/friends/requests/${encodeURIComponent(requestId)}/accept`, { method: 'POST' }),
  decline: (requestId: string) => api.request<void>(`/friends/requests/${encodeURIComponent(requestId)}/decline`, { method: 'POST' }),
  cancel: (requestId: string) => api.request<void>(`/friends/requests/${encodeURIComponent(requestId)}`, { method: 'DELETE' }),
  remove: (userId: string) => api.request<void>(`/friends/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  block: (userId: string) => api.request<void>('/blocks', { method: 'POST', body: { userId } }),
  unblock: (userId: string) => api.request<void>(`/blocks/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  newInviteCode: () => api.request<{ inviteCode: string }>('/me/invite-code', { method: 'POST' }),
};

/** Finding people (exact @username or invite link only). */
export const usersApi = {
  card: (username: string) => api.request<{ card: Card; relation: Relation }>(`/users/${encodeURIComponent(username)}/card`),
  invite: (code: string) => api.request<{ card: Card }>(`/invites/${encodeURIComponent(code)}`),
  acceptInvite: (code: string) => api.request<{ friend: Card }>(`/invites/${encodeURIComponent(code)}/accept`, { method: 'POST' }),
};
