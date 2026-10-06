/**
 * LandingPage.tsx — route "/": "The Descent".
 *
 * The scenery (3D world or photos) stays fixed behind the page; scrolling
 * through the six stages flies the camera from the sky to the fields. A
 * ScrollTrigger over the stages writes overall progress (0–1) into the shared
 * descent store, which the scenery and the altitude meter read.
 */
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import { AiMoment } from '@/features/landing/AiMoment';
import { CallToAction } from '@/features/landing/CallToAction';
import { CrewTeaser } from '@/features/landing/CrewTeaser';
import { Hero } from '@/features/landing/Hero';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { PopularDestinations } from '@/features/landing/PopularDestinations';
import { AltitudeMeter } from '@/scene/AltitudeMeter';
import { descentProgress } from '@/scene/descent';
import { Scenery } from '@/scene/Scenery';

export default function LandingPage() {
  const trackRef = useRef<HTMLDivElement>(null);

  // Map scroll through the stages to descent progress; reset when leaving the page.
  useEffect(() => {
    if (!trackRef.current) return;
    const trigger = ScrollTrigger.create({
      trigger: trackRef.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => descentProgress.set(self.progress),
    });
    return () => {
      trigger.kill();
      descentProgress.set(0);
    };
  }, []);

  return (
    <>
      <title>TripWise — AI travel itineraries, free</title>
      <Scenery />
      <AltitudeMeter />
      <div ref={trackRef}>
        <Hero />
        <HowItWorks />
        <PopularDestinations />
        <AiMoment />
        <CrewTeaser />
        <CallToAction />
      </div>
    </>
  );
}
