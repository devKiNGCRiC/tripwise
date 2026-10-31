# Places database & grounded planning — design (roadmap step 3)

**Date:** 2026-11-01 · **Status:** approved by the owner ("start implementing and testing the next features")

## Why
TripWise has 12 destinations, and three of the seven worlds (Deccan, Western Ghats, Seven Sisters) have
none, so their world cards fall back to "Plan with AI". Every plan comes only from the AI, which can
invent places, costs free-tier calls, and fails outright when every provider is down or the day's
allowance is used up. Step 3 gives TripWise its own knowledge of places and uses it three ways.

## Goals
1. **A real places catalogue** — about 40 Indian destinations covering all seven worlds, each with up to
   40 notable places (sights, temples, forts, museums, nature, beaches, markets) with coordinates, a
   type, the interests they suit, a Wikipedia link and, where available, a credited photo.
2. **Grounded AI plans (retrieval-augmented generation)** — when the destination is in the catalogue, the
   planner hands the AI a short list of real places that suit the traveller's interests and asks it to
   prefer them. Activities that match a catalogue place carry its id and coordinates.
3. **TripWise's own planner** — a deterministic planner that builds a complete trip from the catalogue
   without any AI: places chosen by interest and fame, grouped by day so each day stays in one area,
   timed by pace, with transfers estimated from distance. It is used:
   - automatically when every AI provider fails (instead of an error), and
   - on request as a free, unlimited **Quick plan** when the day's AI allowance is used up.
4. **Destination pages show their places** ("Top places", filterable by interest).

## Non-goals (this step)
- Embedding / vector search. Retrieval here is exact (destination + interest tags), which is accurate and
  free; semantic search arrives with the "Ask TripWise" chat in step 4, where free text needs it.
- Maps, opening hours, live prices, restaurants. (Food stops stay the AI's job; the own planner adds
  meal breaks without naming restaurants.)
- Places outside India.

## Anti-goals
- Never present an invented place as real; the own planner only uses catalogue places.
- No new paid service, no API key, no runtime dependency on Wikidata (data is imported once, committed).

## Data source & licences (owner's call: free only)
- **Wikidata** via its public SPARQL endpoint, run by an import script on a developer machine, never by
  the app. Wikidata data is **CC0** (no attribution required; we credit it anyway).
- **Photos** are Wikimedia Commons files referenced by Wikidata; each keeps its author and licence and is
  credited wherever shown (same rule as the region photos).
- OpenStreetMap's public Overpass server refused automated use (busy, asks bulk users to self-host), so it
  is not used.
- Summaries, vibes, budget tier and daily cost of each destination are written by us (estimates, marked
  as such in the data file); best months come from `frontend/src/world/regionMonths.ts` research where the
  place is listed there.

## Decisions (builder's calls, recorded)
- Place types are mapped from Wikidata "instance of" labels with an allow-list (temple, fort, palace,
  museum, lake, waterfall, beach, hill, park, monument, cave, church, mosque, gurudwara, market, …);
  administrative items (towns, villages, districts, universities, countries) are dropped.
- Fame = number of Wikipedia/Wikimedia sitelinks; places are ranked by it.
- Day grouping: greedy nearest-neighbour chains seeded from the most famous unused place.
- Transfers: < 1.2 km walk (5 km/h); < 15 km auto/cab (city speed 18 km/h); otherwise cab (35 km/h);
  minutes rounded up to 5, at least 5.
- Own-planner costs are split from the destination's average daily cost × days × people:
  stay 40 %, food 25 %, transport 15 %, activities 20 %.
- Provider of own-planner trips is `tripwise`; the UI says "Planned by TripWise from our places
  catalogue".

## Success
- Every world has destinations in Explore; the Deccan/Ghats/Sisters cards show "N places".
- A plan for a catalogue destination mostly uses catalogue places, and its matched activities carry
  coordinates.
- With all AI providers failing, `POST /itineraries/generate` still returns a valid trip (provider
  `tripwise`), and the quota is not spent.
- With the allowance used up, the traveller can still make a Quick plan.
