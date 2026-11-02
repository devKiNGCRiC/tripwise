/**
 * yatra.ts (service) — what the on-the-trip routes need from the database:
 *   nearbyPlace   the closest catalogue place to a position (searching only the area around it)
 *   tripEndOf     when a Toli's Sahyatra ends (the end of its last day, India time)
 *   nextSangamOf  the time of the Toli's next Sangam, if any
 */
import { Itinerary, Place, ToliSplit, type ToliDoc } from '../db/models/index.js';
import { nearestPlace } from './yatraRules.js';

/** How far around a position to look for places (degrees; about 55 km). */
const SEARCH_DEG = 0.5;
/** India is 5 h 30 min ahead of UTC: a day "ends" at 23:59:59.999 IST. */
const IST_OFFSET_MS = 330 * 60 * 1000;

/** The nearest catalogue place within `maxKm` (null when none is close). */
export async function nearbyPlace(lat: number, lon: number, maxKm = 60): Promise<{ name: string; km: number } | null> {
  const places = await Place.find({ lat: { $gte: lat - SEARCH_DEG, $lte: lat + SEARCH_DEG }, lon: { $gte: lon - SEARCH_DEG, $lte: lon + SEARCH_DEG } }, { _id: 0, name: 1, lat: 1, lon: 1 }).lean();
  const near = nearestPlace(lat, lon, places);
  return near && near.km <= maxKm ? near : null;
}

/** The end of the Sahyatra's last day (ISO), or null without one. */
export async function tripEndOf(toli: ToliDoc): Promise<string | null> {
  if (!toli.tripId) return null;
  const trip = await Itinerary.findById(toli.tripId, { 'request.endDate': 1 }).lean();
  const end = trip?.request?.endDate;
  return end ? new Date(Date.parse(`${end}T23:59:59.999Z`) - IST_OFFSET_MS).toISOString() : null;
}

/** When the Toli's next Sangam is (ISO), or null. */
export async function nextSangamOf(toliId: string, now: Date): Promise<string | null> {
  const split = await ToliSplit.findOne({ toliId, status: 'active', 'sangam.at': { $gt: now } }, { 'sangam.at': 1 }).sort({ 'sangam.at': 1 }).lean();
  return split?.sangam?.at ? split.sangam.at.toISOString() : null;
}
