/**
 * TermsPage.tsx — route "/terms": the terms of use, in plain words — a free service, your
 * account, fair use, your content, AI plans to check before you travel, Lekha as a record only,
 * moderation, and where content we show comes from.
 */
import { Link } from 'react-router';
import { InfoLayout, InfoSection } from '@/features/info/InfoLayout';
import { BRAND } from '@/lib/brand';

/** When these terms last changed. */
const TERMS_UPDATED = '25 November 2026';

/** Route "/terms". */
export default function TermsPage() {
  return (
    <InfoLayout eyebrow="Terms" title="Terms of use" tabTitle="Terms" updated={TERMS_UPDATED} lead={<p>By using TripWise you agree to these terms. They are short, and written to be read.</p>}>
      <InfoSection title="A free service">
        <p>
          TripWise is free. We work to keep it running well, but it comes “as is”: features can change, and it may sometimes be slow or unavailable. Daily limits (such
          as AI plans and questions) keep it free for everyone.
        </p>
      </InfoSection>

      <InfoSection title="Your account">
        <p>
          Give true details, keep your password to yourself, and tell us if someone else gets into your account. You are responsible for what happens under it. You can
          delete it at any time in Passport → Account.
        </p>
      </InfoSection>

      <InfoSection title="Using TripWise fairly">
        <ul>
          <li>No harassment, hate, threats, or sharing other people’s private details.</li>
          <li>Nothing illegal, sexual, violent or misleading, and no spam or advertising.</li>
          <li>Don’t try to break, overload or scrape the service, or get around its limits.</li>
        </ul>
        <p>We may hide content or block accounts that break these rules. If you think we got it wrong, write to us.</p>
      </InfoSection>

      <InfoSection title="Your content">
        <p>
          What you write and upload stays yours. You let TripWise store it and show it to the people you choose (your Toli, your friends, or anyone with a link you
          share). Only upload photos you took or may use.
        </p>
      </InfoSection>

      <InfoSection title="Plans, guides and advice">
        <p>
          Trip plans and answers are written by AI and TripWise’s planner from public facts. They can be wrong or out of date. <strong>Always check</strong> opening hours,
          prices, permits, road and weather conditions, and safety advice before you travel. TripWise isn’t a travel agent and doesn’t book anything.
        </p>
      </InfoSection>

      <InfoSection title="Money in a Toli (Lekha)">
        <p>Lekha is a shared record of who paid and who owes. TripWise doesn’t hold or move money; settling up happens between you, by UPI or cash.</p>
      </InfoSection>

      <InfoSection title="What we show from others">
        <p>
          Destination guides are adapted from Wikivoyage and Wikipedia under CC BY-SA 4.0, places come from Wikidata, and photos from Wikimedia Commons under their own
          licences — each is credited where it appears. TripWise’s name, logo and design are ours.
        </p>
      </InfoSection>

      <InfoSection title="Responsibility">
        <p>
          As far as the law allows, TripWise isn’t responsible for losses from using the service or relying on its plans. These terms follow the laws of India. If they
          change, we’ll update the date above. How we handle your data is in our <Link to="/privacy">Privacy policy</Link>.
        </p>
        <p>
          Questions: <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
        </p>
      </InfoSection>
    </InfoLayout>
  );
}
