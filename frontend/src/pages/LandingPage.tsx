/**
 * LandingPage.tsx — route "/". Composes the landing sections top to bottom,
 * with festival bunting strung between the sky and the content.
 */
import { Bunting } from '@/components/signature/Bunting';
import { CallToAction } from '@/features/landing/CallToAction';
import { Hero } from '@/features/landing/Hero';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { PopularDestinations } from '@/features/landing/PopularDestinations';

export default function LandingPage() {
  return (
    <>
      <title>TripWise — AI travel itineraries, free</title>
      <Hero />
      <Bunting className="-mt-7" />
      <HowItWorks />
      <PopularDestinations />
      <CallToAction />
    </>
  );
}
