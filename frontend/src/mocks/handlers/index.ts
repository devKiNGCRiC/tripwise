/**
 * index.ts — every mock API handler in one list.
 * Plan 3 appends the admin handlers here.
 */
import { authHandlers } from './auth';
import { destinationHandlers } from './destinations';
import { itineraryHandlers } from './itineraries';
import { lekhaHandlers } from './lekha';
import { socialHandlers } from './social';
import { toliHandlers } from './tolis';

export const handlers = [...authHandlers, ...destinationHandlers, ...itineraryHandlers, ...socialHandlers, ...toliHandlers, ...lekhaHandlers];
