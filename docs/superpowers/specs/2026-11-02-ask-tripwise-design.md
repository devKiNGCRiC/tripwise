# Ask TripWise — a question box on every trip (design)

**Date:** 2026-11-02 · **Status:** built (2026-11-02) · decided by the builder at the owner's request ("do the best and what you
recommended") · **Roadmap:** step 4

## Why
Travellers still open ten tabs to answer small questions about a trip they already planned: "Is it too
hot for the fort at 2 pm?", "What else is near the day-2 stops?", "How far is the houseboat from the
beach?", "Will it rain on Saturday?". TripWise already knows the trip, the destination and 1,028 real
places with coordinates. Ask TripWise answers from that — grounded, short, and linked to real places —
instead of a general chatbot guessing.

## What it is
- A **question box on each trip page** (and on a Toli's Sahyatra for every Sahyatri). Type a question or
  tap a suggested one; the answer appears below with **chips for the real places it mentions** (each
  opening the place on the destination page) and up to three follow-up questions to tap.
- Each person's conversation with a trip is **their own** (private, even on a shared Toli trip). The last
  30 messages are kept per person per trip; "Start over" clears it.
- **Free allowance:** 20 questions a day on the free plan (premium 200), counted per India-time day like
  plans, and refunded if every AI model fails.

## How it answers (grounding, not tool-calling)
The server builds a short **trip brief** and sends it with the question; the model answers only from the
brief and general travel knowledge, and says so when it isn't sure:
- the trip: destination, dates, who's travelling, pace, interests, each day's theme and stops (times,
  costs, the catalogue place each stop is at);
- the destination's facts from the catalogue: best months, typical daily cost, region;
- **nearby places**: catalogue places within 5 km of each day's stops (name, kind, distance) and the
  straight-line distance between consecutive stops;
- **the weather forecast** for trip days within the next 9 days, from **MET Norway** (free, commercial
  use allowed with credit "Weather: MET Norway", no key; we send a TripWise User-Agent with the repo URL,
  never the user's email), cached per destination for an hour. Further out, the brief says "no forecast
  yet — use typical weather for the month".
Why not tool-calling: our chain is Gemini → Groq with JSON-schema answers; one grounded call per question
is cheaper (one AI call, not several), works identically on both providers, and is easy to test.

The answer is JSON `{ answer, placeIds, followUps }`. `placeIds` must be ids from the brief (others are
dropped); `answer` is plain text, at most ~120 words. The question is cut to 300 characters, wrapped in
tags and treated as data (same prompt-injection guard as planning).

## Goals / non-goals
- Goals: grounded short answers about *this* trip; real-place links; works on every trip and Toli trip;
  zero cost (free AI tiers, MET Norway, our catalogue).
- Non-goals (now): booking, live train/flight status, route planning with roads (no paid routing API —
  distances are straight-line and labelled so), voice input, answering questions unrelated to travel.
- Anti-goals: inventing places (only catalogue ids become chips), sharing one person's questions with the
  Toli, sending personal data to the weather service.

## Builder's calls
- Questions per day: free 20, premium 200 (`PLANS.*.asksPerDay`).
- Demo mode answers from a small rule-based helper (nearby catalogue places, forecast-free) so the demo
  works without AI keys, like the Quick plan.
