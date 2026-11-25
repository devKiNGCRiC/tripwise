/**
 * PrivacyPage.tsx — route "/privacy": the privacy policy, in plain words. It describes what the
 * app really does (checked against the backend models and services on 2026-11-25): what is
 * stored, who sees it, which outside services are used, location sharing, browser storage,
 * and deleting your account. Update it whenever any of those change.
 */
import { Link } from 'react-router';
import { InfoLayout, InfoSection } from '@/features/info/InfoLayout';
import { BRAND } from '@/lib/brand';

/** When this policy last changed. */
const PRIVACY_UPDATED = '25 November 2026';

/** Route "/privacy". */
export default function PrivacyPage() {
  return (
    <InfoLayout
      eyebrow="Privacy"
      title="Privacy policy"
      tabTitle="Privacy"
      updated={PRIVACY_UPDATED}
      lead={<p>TripWise keeps only what it needs to plan and run your trips. We don’t sell your data, show you tracking ads, or use analytics trackers.</p>}
    >
      <InfoSection title="What we keep">
        <ul>
          <li>
            <strong>Your account:</strong> name, email, username, profile photo or chosen avatar, and your settings. Your password is stored only as a secure hash — nobody
            can read it.
          </li>
          <li>
            <strong>Your trips:</strong> plans, journal entries and photos, notes, packing lists, and links you choose to share.
          </li>
          <li>
            <strong>Group trips (Tolis):</strong> who is in each Toli, its chat, suggestions, polls, plan, notes and expenses.
          </li>
          <li>
            <strong>Questions you ask TripWise</strong> about a trip, and its answers.
          </li>
          <li>
            <strong>Running the service:</strong> your sign-in sessions (they expire on their own), how many AI plans you made today (kept for 3 days), and reports you
            send about content.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Your location">
        <p>TripWise never tracks you in the background. Location is used only when you turn it on:</p>
        <ul>
          <li>
            <strong>Sharing in a Toli:</strong> your Toli sees roughly where you are (“near” a known place) until the time you choose. When you stop sharing, leave the
            Toli or the time runs out, your location is deleted at once.
          </li>
          <li>
            <strong>Family check-in:</strong> only your latest check-in is kept — the nearest place’s name and a position rounded to about 1 km — and only people you
            gave a private link to can see it. You can turn any link off.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Who can see what">
        <ul>
          <li>Your passport is seen by Friends, Everyone or Only you — you choose in Passport → Account.</li>
          <li>A trip you share by link can be opened by anyone with that link, until you stop sharing it.</li>
          <li>What you post in a Toli is seen by its members.</li>
          <li>TripWise’s admins can see reports and hide content or block accounts that break our <Link to="/terms">Terms</Link>.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Services we use">
        <ul>
          <li>
            <strong>AI planners</strong> (Google Gemini, and Groq as a back-up) receive your trip details and questions to write plans and answers — never your
            password, and we don’t send your email.
          </li>
          <li>
            <strong>Weather</strong> from MET Norway, asked about the destination’s location, not yours.
          </li>
          <li>
            <strong>Place photos</strong> load from Wikimedia’s servers, which see your device’s address like any website.
          </li>
          <li>
            <strong>Hosting:</strong> the website on Cloudflare, the server on Render, the database on MongoDB Atlas. When switched on, photos are stored privately on
            Cloudinary and emails (like password resets) are sent through Brevo.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Cookies and browser storage">
        <p>
          We use one cookie, to keep you signed in (it only works for TripWise and scripts can’t read it). Your browser also remembers your theme, colours, calm-motion
          setting and the last world you viewed. No advertising or tracking cookies.
        </p>
      </InfoSection>

      <InfoSection title="Deleting your account">
        <p>
          In Passport → Account you can delete your account and everything that is yours: trips, journals, photos, friends, family links, location, questions and
          personal expenses. If you are in a Toli with others, settle up and hand over the Sutradhar role first. Messages and shared expenses in Tolis that others are
          still in stay with that Toli, so the group’s records still add up.
        </p>
      </InfoSection>

      <InfoSection title="Age">
        <p>TripWise is meant for people aged 18 and over. If you are younger, use it with a parent’s or guardian’s permission.</p>
      </InfoSection>

      <InfoSection title="Questions and changes">
        <p>
          Write to <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> to ask what we hold about you or to have something corrected or removed. If this policy changes,
          we’ll update the date above, and tell you in the app if the change matters.
        </p>
      </InfoSection>
    </InfoLayout>
  );
}
