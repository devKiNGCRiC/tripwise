/**
 * LandingPage.tsx — route "/". Composes the landing sections top to bottom.
 */
import { CallToAction } from '@/features/landing/CallToAction';
import { Hero } from '@/features/landing/Hero';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { PopularDestinations } from '@/features/landing/PopularDestinations';

export default function LandingPage() {
  return (
    <>
      <title>TripWise — AI travel itineraries, free</title>
      <Hero />
      <HowItWorks />
      <PopularDestinations />
      <CallToAction />
    </>
  );
}
