/**
 * LandingPage.tsx — route "/": the Monsoon Editorial homepage.
 *
 * Hero over living liquid colour → cinematic journeys gallery → three steps on a
 * gold thread → a sample itinerary over a liquid band → crew preview → closing
 * invitation. Each section reveals itself as it scrolls into view, and the journey
 * rail (large screens) marks every section as a stop on the route.
 */
import { CallToAction } from '@/features/landing/CallToAction';
import { CrewTeaser } from '@/features/landing/CrewTeaser';
import { Hero } from '@/features/landing/Hero';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { JourneyRail } from '@/features/landing/JourneyRail';
import { Journeys } from '@/features/landing/Journeys';
import { SampleTrip } from '@/features/landing/SampleTrip';

export default function LandingPage() {
  return (
    <>
      <title>TripWise — unhurried, day-by-day trip plans</title>
      <JourneyRail />
      <Hero />
      <Journeys />
      <HowItWorks />
      <SampleTrip />
      <CrewTeaser />
      <CallToAction />
    </>
  );
}
