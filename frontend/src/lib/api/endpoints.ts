/**
 * endpoints.ts — typed, named functions for each API endpoint.
 * Components and hooks call `authApi.login(...)` instead of hand-writing URLs,
 * so a URL change happens in exactly one place.
 */
import { api } from './client';
import type { AuthResponse, Destination, DestinationFilters, GenerateResponse, Itinerary, LoginInput, Quota, SignupInput, TripRequest, User } from './types';

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
