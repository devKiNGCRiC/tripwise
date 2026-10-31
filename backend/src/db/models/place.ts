/**
 * place.ts — a place to visit at a destination (from the catalogue in src/data/places.json,
 * built by scripts/import-catalogue.ts from Wikidata). `id` is our stable id ("p_Q1234",
 * from the Wikidata item), so seeds, the mock and trips that point at a place stay in step.
 */
import { model, Schema, type InferSchemaType } from 'mongoose';

/** What a place looks like in the database. */
const placeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    /** The destination's slug ("hampi") */
    destination: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    kind: { type: String, required: true },
    interests: { type: [String], default: [] },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    /** How many Wikipedias cover it — our measure of fame (higher first). */
    fame: { type: Number, default: 0 },
    wikidata: { type: String, required: true },
    wikipedia: { type: String },
    /** A Commons photo, always with its author and licence. */
    image: { type: { url: String, credit: String, creditUrl: String }, default: undefined },
  },
  { versionKey: false },
);

/** Plain fields of a place. */
export type PlaceFields = InferSchemaType<typeof placeSchema>;
/** The places collection. */
export const Place = model('Place', placeSchema);
