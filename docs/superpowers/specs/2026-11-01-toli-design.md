# Toli — planning and travelling together (design)

**Date:** 2026-11-01 · **Status:** approved by the owner · **Roadmap:** step 5 ("Crew mode")

## Why
Group trips break down in the same places, in the owner's words: planning, dates, budget, getting everyone
to agree on one idea, building the itinerary, choosing transport, and researching the destination across many
sources without ever feeling sure. One person usually leads; others bring their own suggestions, views and
needs; some only say yes or no. Money causes the most conflict: one person pays, the group "splits equally"
later, but people didn't eat or buy the same things. Big groups naturally break into smaller ones to explore
in their own way (the owner, a solo traveller at heart, always finds time to explore alone), which makes them
hard to manage. In weak-network places (the owner's own Valley of Flowers trip), family at home worries.

Toli turns TripWise into **the one place a group decides, plans, travels and settles up together** — with
TripWise's own knowledge (destinations, places, the month guide) on hand so nobody needs ten browser tabs.

## Names (Hindi / Sanskrit, by the owner's wish — see the owner's cultural-roots preference)
| Thing | Name | Meaning |
|---|---|---|
| The group | **Toli** (टोली) | a band of people going together |
| A member | **Sahyatri** (सहयात्री) | fellow traveller |
| The shared trip | **Sahyatra** (सहयात्रा) | a journey together |
| The leader | **Sutradhar** (सूत्रधार) | the one who holds the threads together |
| Co-leader | **Sah-Sutradhar** | helps approve |
| A suggestion | **Sujhav** (सुझाव) | suggestion |
| A split group on a day | **Dhara** (धारा) | a stream |
| Where splits meet again | **Sangam** (संगम) | confluence |
| Family check-in | **Kushal** (कुशल) | "सब कुशल मंगल?" — all well? |
| Shared packing list | **Potli** (पोटली) | a bundle |
| The Toli's chat | **Chaupal** (चौपाल) | the village square where people gather to talk |
| A request to speak | **Anurodh** (अनुरोध) | a request |
| Date poll | **Tithi** (तिथि) | a date |
Every name is shown with a plain-English line beside it ("Toli · plan trips together") so non-Hindi speakers
understand at once. ("Shakha" was rejected for its political association; "Kafila" for being Urdu.)

## Goals — everything discussed, in three parts (built and shipped in this order)

### Part 1 · Toli and deciding together
1. **Create a Toli** from a new or existing trip; the creator is the **Sutradhar**. The trip becomes the
   Toli's **Sahyatra** (one shared itinerary — the existing trip model, now owned by a Toli).
2. **Invite Sahyatris** by a link (share on WhatsApp) or by @username (friends list). Joining needs a TripWise
   account. The Sutradhar can remove members and name one or more **Sah-Sutradhars**; ownership can be passed on.
   Anyone can leave. **Trip type** is chosen at creation — *Friends*, *Family*, *College*, *Office* — and sets
   defaults (big-group tools below for College/Office). A technical safety limit of **500 Sahyatris** per Toli
   stops abuse; there is no small product limit. **School trips with under-18 students are not supported yet**:
   India's DPDP Act 2023 needs verifiable parental consent before handling a minor's data (location
   especially); they come later with a parental-consent flow built on Kushal.
3. **Who decides what** — *Sutradhar / Sah-Sutradhar*: approve suggestions, edit the plan directly, close polls,
   manage members. *Sahyatri*: view everything, add **Sujhav**s, vote, add expenses, join Dharas.
   **Nobody but the leaders edits the plan directly** (owner's rule).
4. **Sujhav (suggestions)**: add a stop, swap a stop, remove a stop, move a stop to another day/time, add or
   change a day, change transport — each with an optional note ("I need a rest day", "veg only"). Others vote
   👍 / 👎 in one tap; leaders see the votes and **approve** (the change is applied to the plan) or **decline**
   (with an optional reason). Every decision is recorded in the Toli's activity.
5. **Polls** for the big early decisions, each with an optional closing time and a nudge for who hasn't voted
   ("2 Sahyatris haven't voted"): **destination** (options are compared on TripWise's own facts — best months,
   cost per day, top places — so nobody hunts across websites), **Tithi** (date poll: each Sahyatri marks the
   dates they can make; the best overlap is highlighted), **transport** (train / bus / flight / road), and free
   questions ("Which homestay?"). A leader closes a poll and can apply the winner to the trip.
6. **Budget comfort (private)** — each Sahyatri privately sets the daily budget they're comfortable with; the
   Toli sees only the **range that works for everyone** ("₹2,000–2,500 a day suits all 5"), never anyone's
   number. Solves the awkward budget talk. The planner uses this range when the Toli plans with AI.
7. **Plan with TripWise inside the Toli** — the Sutradhar can generate the Sahyatra with the AI planner or the
   Quick plan, seeded with the Toli's interests (union of members' preferences) and budget comfort range.
8. **Chaupal (the Toli's chat)** — one chat per Toli, about that trip only (no extra WhatsApp group needed).
   Text, replies, @mentions, and **trip cards**: a Sujhav, poll, place, Dhara or expense posted in Chaupal is a
   live card you can vote on or open there. **Photos** (compressed on the phone, a few per message; they also
   feed the Toli album). Messages written offline send when signal returns. Refreshes every few seconds while
   open; an unread badge elsewhere; push notifications with the installable app (roadmap step 6).
   **No one-to-one chat** for now (spam/harassment risk via public passports; later, friends-only if at all).
   **No in-app calling** (reliable calls need paid relay servers): each Sahyatri who chooses to share a phone
   number gets a **Call** button (phone dialler or WhatsApp call). Videos and documents: not for now (storage).
   WhatsApp is used only to **share the invite link** (it opens with the message written).
   - **Announcement mode** (default for College/Office): only leaders post; everyone reads.
   - **Anurodh (raise hand)**: in announcement mode a Sahyatri raises a hand with what it's about; only leaders
     see it and can *allow one message*, *allow for 30 min / 1 h / the whole trip* (e.g. a teacher, the bus
     in-charge, whoever booked the hotels), *reply privately* (often enough on its own) or *decline*. Spam guard:
     one open request per person, a 10-minute wait after a decline, and leaders can turn requests off for a
     person who keeps spamming.
9. **Activity** — a feed of what happened (joined, suggested, voted, approved, paid) and a small badge for
   unread items. In-app only for now; push notifications come with the installable app (roadmap step 6).

### Part 2 · Money (fair, not "equal")
10. **Group expenses**: amount, what for, who paid, **who shared it** (only those people split it — 3 of 5
   ate the thali → 3 split), split **equally among sharers** or by **custom amounts / shares**, paid by
   **UPI or cash**, optional day link ("Day 2 lunch").
11. **Personal expenses**: private to the person; for their own tracking ("what did this trip cost *me*").
12. **Balances & settle up**: each person's net position, and the **fewest payments** to settle everyone
    ("Kabir pays Asha ₹640"). A **UPI pay link** (upi://pay with the payee's UPI ID, amount and note) when the
    payee has saved a UPI ID; anyone can **mark a payment settled** (cash). Settling is recorded, never deleted.
13. **Offline entry**: expenses added without signal are kept on the phone and synced when it returns, without
    duplicates (each expense carries an id made on the phone).
14. **Totals**: trip total, per person, by category (stay, food, transport, tickets, shopping, other), compared
    with the planned estimate.

### Part 3 · On the trip
15. **Dharas & Sangam**: on any day a leader *or any Sahyatri via Sujhav* splits part of the day into Dharas
    (each with a name, its own stops and who's in it — anyone can join a Dhara, a solo Dhara is fine) that end
    at a **Sangam**: a place and time to meet again. Reminders before the Sangam (in-app; push later).
    **Headcount at Sangam**: each Sahyatri taps "I'm here"; leaders see who's still missing. For College/Office
    trips Dharas can be **fixed** for the whole trip (Bus 1, Section A), each with its own Sah-Sutradhar.
16. **"Where are my Sahyatris?"** — strictly **opt-in, per person, per time**: share for 1 hour / until the
    Sangam / until the trip ends; visible only to the Toli; switches itself off. Shows last known position and
    time on a map. In the web app the position updates only while TripWise is open on that phone; continuous
    background tracking arrives with the Android app (roadmap step 8). Nobody can turn someone else's sharing on.
17. **Kushal (family check-in)** — for Toli trips *and* solo trips. Before the trip the traveller adds Kushal
    contacts (name only); each gets a private link (no account) showing the latest check-in. Check-ins are sent
    **automatically when the phone has signal and TripWise is open** (if the traveller enabled it) and by one
    tap; a **"Send Kushal on WhatsApp"** button prefills the message. Automatic SMS needs a paid gateway — not
    in scope (zero-cost rule); background sending comes with the Android app.
18. **Offline trip**: the Sahyatra (days, Dharas, Sangams), the Sahyatri list, the Kushal button and a simple
    map of the trip's catalogue places are saved on the phone for viewing without signal. (Full offline for
    the whole app is roadmap step 6; Toli builds on it.)
19. **Notes**: per trip and per day, visible to the Toli ("Homestay owner: Ramesh, 98xxxx"; "Carry permits").
20. **Potli (shared packing)**: group items ("first-aid kit", "speaker", "power bank") that someone claims
    ("Kabir brings it"), next to each person's own list.
21. **Photos**: a Toli album (everyone adds, up to a cap per person), using the existing photo storage
    (MongoDB now, Cloudinary later — see deferred accounts), compressed in the browser as journals are.
22. **Voice notes in Chaupal** (up to ~1 minute, compressed) — handy when typing is hard on a trek.

### Extra real problems this design solves (proposed by the builder, owner to confirm)
- **Different home cities**: each Sahyatri adds how and when they arrive/leave (train no., flight, time); the
  trip shows an **arrival board** so the Sutradhar plans day 1 around the last arrival.
- **Budget awkwardness**: the private budget-comfort range (item 6).
- **Dates**: the Tithi poll (item 5).
- **Research overload**: destination polls compare on TripWise's own facts (item 5).
- **Decisions that stall**: poll closing times and "hasn't voted yet" nudges (item 5).

## Non-goals (this step)
- Real-time co-editing of the plan (the plan changes only through approved Sujhavs or leader edits; screens
  refresh every few seconds while open — no live cursors).
- One-to-one chat, in-app voice/video calls, video and document sharing (cost, storage, moderation).
- Payments inside TripWise (UPI links open the person's own UPI app; TripWise never holds money).
- Automatic SMS, background location and push notifications (need paid services or the native app).

## Anti-goals (failure even if it "works")
- Anyone's location visible without their explicit, time-limited consent — or visible outside their Toli.
- Anyone's personal budget number or personal expenses visible to others.
- A Sahyatri silently changing the plan.
- Money maths that doesn't add up to the paisa, or an expense that disappears after an offline sync.
- Hidden costs: everything stays on the free tiers (no SMS, no paid maps, no paid realtime service).

## Constraints
- Zero running cost (Cloudflare Pages + Render + MongoDB Atlas M0 + Gemini/Groq free tiers).
- Same API contract in the real backend and the website's mock (as for every feature so far).
- Privacy and blocks: someone who blocked or was blocked by a member can't be invited; non-members get 404 for
  everything about a Toli (as with private passports).
- Money in whole paise (integers), INR only for now.
- Comment-everything code style; no AI credit in commits; push only on the owner's word.

## Left to the builder (marked as the builder's calls)
- Chaupal refresh: polling (~3 s while the chat is open, ~30 s for the unread badge elsewhere).
- Data model (a `Toli` with members and roles; the itinerary gains an optional `toliId`; separate collections
  for suggestions, polls, votes, expenses, settlements, notes, packing, check-ins, locations).
- Refresh by polling (TanStack Query, ~10 s while a Toli screen is open) instead of websockets — free and
  works on Render's free tier.
- Invite links: random token, revocable, optional expiry; joining via an existing `/join` style page.
- Settle-up algorithm: greedy largest-creditor / largest-debtor matching (fewest payments in practice).
- Location: stored as last-known point only (no history kept), deleted when sharing ends.
- Kushal links: random token per contact, revocable; show only the latest check-in (place name + time,
  rounded position), never a history.
- Screen layouts follow the Seven Worlds design; a visual mockup is shown to the owner before Part 1's UI.
