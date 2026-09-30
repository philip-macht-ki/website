// netlify/functions/newsletter.mjs: dünner Netlify-Einstieg. Die eigentliche
// Logik (Brevo, MailerLite, Honeypot, Einwilligung, fehlende Einstellungen)
// steht in ../../lib/newsletter.mjs und wird von der Vercel-Funktion
// api/newsletter.js genauso genutzt. Siehe ARCHITEKTUR.md.

import { behandleAnfrage, fehlendeEinstellungen, leseKoerper } from '../../lib/newsletter.mjs';

export { behandleAnfrage, fehlendeEinstellungen, leseKoerper };

export default async (req) => behandleAnfrage(req);

// Schutz gegen Massenanmeldungen fremder Adressen: höchstens fünf Anfragen je
// Minute und Besucher. Netlify prüft das, bevor die Funktion läuft. Das gibt
// es bei Vercel Functions in dieser Form nicht, api/newsletter.js braucht das
// deshalb nicht.
export const config = {
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
