/**
 * mailer.ts — sends the few emails TripWise needs (for now: password reset links).
 *
 * With a Brevo key in .env (free plan, 300 emails a day) the email really goes out. Without
 * one — local development, or before the account is set up — the message is printed in
 * the API log instead, so the link can still be clicked while testing.
 */

/** One email. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Something that delivers an email (tests swap in one that just collects them). */
export type Mailer = (message: MailMessage) => Promise<void>;

/** The real mailer, built from the settings. */
export function createMailer(settings: { brevoApiKey?: string; from?: string }): Mailer {
  // No key yet: write the message to the log.
  if (!settings.brevoApiKey || !settings.from) {
    return async (message) => {
      const link = /https?:\/\/\S+/.exec(message.text)?.[0] ?? '(no link)';
      console.log(`[mail] ${message.subject} for ${message.to}: ${link}`);
    };
  }

  // Brevo's transactional email API.
  const { brevoApiKey, from } = settings;
  return async (message) => {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'TripWise', email: from },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      }),
    });
    if (!res.ok) throw new Error(`Brevo answered ${res.status}`);
  };
}
