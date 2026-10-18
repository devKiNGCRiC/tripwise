/**
 * index.ts — every database model in one import: `import { User, Itinerary } from '…/models/index.js'`.
 */
export { Avatar } from './avatar.js';
export { Destination } from './destination.js';
export { Itinerary, type ItineraryDoc, type ItineraryFields } from './itinerary.js';
export { PlanCache } from './planCache.js';
export { Session } from './session.js';
export { Usage } from './usage.js';
export { User, type UserDoc, type UserFields } from './user.js';
