/**
 * index.ts — every mock API handler in one list.
 * Plan 3 appends the admin handlers here.
 */
import { askHandlers } from './ask';
import { authHandlers } from './auth';
import { destinationHandlers } from './destinations';
import { itineraryHandlers } from './itineraries';
import { kushalHandlers } from './kushal';
import { lekhaHandlers } from './lekha';
import { socialHandlers } from './social';
import { toliHandlers } from './tolis';
import { yatraHandlers } from './yatra';

export const handlers = [...authHandlers, ...destinationHandlers, ...itineraryHandlers, ...socialHandlers, ...toliHandlers, ...lekhaHandlers, ...yatraHandlers, ...kushalHandlers, ...askHandlers];
