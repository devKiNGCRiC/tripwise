/**
 * Hero.tsx — Stage 1, the Sky: the railway departure board cycling through
 * destinations, the headline, and the quick "where to?" box that hands off to
 * the planner. Floats over the scenery; no panel, so the sky stays open.
 */
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import {
  DepartureBoard,
  type BoardStop,
} from "@/components/signature/DepartureBoard";
import { DescentStage, GlassPanel } from "./DescentStage";

/** Destinations on the board (fixed, so it never waits for the API). */
const BOARD_STOPS: BoardStop[] = [
  { name: "Goa", localName: "गोवा" },
  { name: "Manali", localName: "मनाली" },
  { name: "Jaipur", localName: "जयपुर" },
  { name: "Ladakh", localName: "लद्दाख" },
  { name: "Varanasi", localName: "वाराणसी" },
  { name: "Bali", localName: "बाली" },
];

export function Hero() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");

  /** Go to the planner, pre-filling the destination if one was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = destination.trim();
    navigate(
      trimmed ? `/plan?destination=${encodeURIComponent(trimmed)}` : "/plan",
    );
  }

  return (
    <DescentStage name="Sky" className="pt-28">
      <DepartureBoard stops={BOARD_STOPS} className="mt-6" />

      {/* Headline + form on glass: readable over a bright day sky AND a dark night sky */}
      <GlassPanel className="mt-10 max-w-2xl">
        <h1 className="max-w-[17ch] text-[clamp(32px,3.8vw,54px)] leading-[1.02] font-extrabold font-stretch-112%">
          Your whole trip, planned day by day in seconds.
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-7 flex max-w-xl flex-wrap gap-3"
        >
          <label htmlFor="hero-destination" className="sr-only">
            Where do you want to go?
          </label>
          <input
            id="hero-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Goa, Ladakh, Bali…"
            className="h-14.5 min-w-56 flex-1 rounded-[14px] border-[2.5px] border-black bg-white px-5 text-lg text-black shadow-[5px_5px_0_#000] outline-none placeholder:text-neutral-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-deep"
          />
          <Button
            type="submit"
            size="lg"
            className="border-black shadow-[5px_5px_0_#000]"
          >
            Plan my trip
          </Button>
        </form>
        <p className="mt-4 max-w-xl text-ink-soft">
          Free forever. Five AI-planned trips a day, a PDF to download, and a
          link to share with your gang.
        </p>
      </GlassPanel>
      <p
        aria-hidden
        className="mt-16 font-semibold text-white/90 [text-shadow:0_2px_10px_rgb(0_0_0/.6)]"
      >
        Scroll down — we're going all the way to the ground ↓
      </p>
    </DescentStage>
  );
}
