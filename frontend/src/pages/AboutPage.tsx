/**
 * AboutPage.tsx — route "/about": what TripWise is, what it does, where its facts come from,
 * what the logo and slogan mean, and how to reach us.
 */
import { Link } from 'react-router';
import { BrandMark } from '@/components/layout/BrandMark';
import { InfoLayout, InfoSection } from '@/features/info/InfoLayout';
import { BRAND } from '@/lib/brand';

/** Route "/about". */
export default function AboutPage() {
  return (
    <InfoLayout
      eyebrow="About"
      title="About TripWise"
      tabTitle="About"
      lead={
        <p>
          TripWise is a free travel planner for India’s seven worlds — the Himalaya, the Thar, the Gangetic Plains, the Deccan, the Western Ghats, the Konkan coast and the
          Seven Sisters — and for trips beyond. It turns a few choices into a day-by-day plan built on real places, and helps friends and family plan and travel together.
        </p>
      }
    >
      <InfoSection title="What you can do">
        <ul>
          <li>
            <Link to="/explore">Explore</Link> 88 Indian destinations, each with a written guide — its story, why it matters, things to do and food to try — and its best places.
          </li>
          <li>
            <Link to="/plan">Plan a trip</Link> with AI, or with TripWise’s own planner (free and unlimited), fitted to your budget, pace and interests.
          </li>
          <li>Plan with friends in a Toli: suggestions, polls, a shared plan, group chat, and expenses that settle up fairly.</li>
          <li>Ask questions about your trip, keep a journal, share your plan, and let family check in on you.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Where our facts come from">
        <p>
          Places come from Wikidata, photos from Wikimedia Commons (each credited), destination guides are adapted from Wikivoyage and Wikipedia (CC BY-SA 4.0), and
          forecasts from MET Norway. AI writes plans and answers from these facts, and TripWise checks what it writes — but always confirm opening hours, permits and
          weather before you go.
        </p>
      </InfoSection>

      <InfoSection title="Our mark and our words">
        <div className="flex items-start gap-4">
          <BrandMark size={56} className="shrink-0 text-ink" />
          <p>
            The mark is a <em>dwar</em> — a gateway — with the sun on the horizon and a winding footpath, a <em>pagdandi</em>, leading in: every trip starts at a doorway.
            Our slogan is <strong>{BRAND.slogan}</strong> —{' '}
            <span lang="hi" className="font-hindi text-ink">
              {BRAND.sloganHi}
            </span>
            , travel with <em>vivek</em>, wisdom: the “Wise” in TripWise.
          </p>
        </div>
      </InfoSection>

      <InfoSection title="Free, and built in the open">
        <p>
          TripWise is free to use. It is built and run independently, and its code is on <a href="https://github.com/devKiNGCRiC/tripwise">GitHub</a>. Ideas and
          problems are always welcome on the <Link to="/contact">Contact</Link> page.
        </p>
        <p lang="hi" className="font-hindi text-lg text-accent">
          {BRAND.signOff}
        </p>
      </InfoSection>
    </InfoLayout>
  );
}
