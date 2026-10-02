/**
 * index.ts — every mock API handler in one list.
 * Plans 2 and 3 append itinerary, quota, share and admin handlers here.
 */
import { authHandlers } from './auth';
import { destinationHandlers } from './destinations';

export const handlers = [...authHandlers, ...destinationHandlers];
