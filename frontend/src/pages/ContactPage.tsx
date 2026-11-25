/**
 * ContactPage.tsx — route "/contact": how to reach TripWise (email for now), and what to write
 * about — problems, ideas, privacy requests and reports.
 */
import { Mail } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { InfoLayout, InfoSection } from '@/features/info/InfoLayout';
import { BRAND } from '@/lib/brand';

/** Route "/contact". */
export default function ContactPage() {
  return (
    <InfoLayout eyebrow="Contact" title="Contact us" tabTitle="Contact" lead={<p>Found a problem, have an idea, or need help with your account? Write to us — a person reads every message.</p>}>
      <InfoSection title="Email">
        <p>
          <a href={`mailto:${BRAND.email}`} className="text-lg">
            {BRAND.email}
          </a>
        </p>
        <a href={`mailto:${BRAND.email}?subject=${encodeURIComponent('TripWise')}`} className={buttonClasses({ variant: 'secondary', className: 'w-fit' })}>
          <Mail aria-hidden className="size-4" /> Write an email
        </a>
        <p>We usually reply within a few days.</p>
      </InfoSection>

      <InfoSection title="What to include">
        <ul>
          <li>
            <strong>A problem:</strong> what you were doing, what happened, and the page’s address.
          </li>
          <li>
            <strong>Your account or data:</strong> write from the email you signed up with, so we know it’s you. You can also delete your account yourself under Passport →
            Account.
          </li>
          <li>
            <strong>Something that shouldn’t be on TripWise:</strong> use “Report” on a public passport, or email us with the link.
          </li>
        </ul>
        <p>
          How we handle what you send is in our <Link to="/privacy">Privacy policy</Link>.
        </p>
      </InfoSection>
    </InfoLayout>
  );
}
