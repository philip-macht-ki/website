// api/newsletter.js: dünner Vercel-Einstieg für die Newsletter-Anmeldung.
// Vercel Functions außerhalb von Next.js nutzen die Web-Standard-Signatur
// (benannte Exporte je HTTP-Methode, Request/Response), siehe
// https://vercel.com/docs/functions/functions-api-reference, Abschnitt
// "Function signature" für "Other Frameworks". Die eigentliche Logik (Brevo,
// MailerLite, Honeypot, Einwilligung, fehlende Einstellungen) steht in
// ../lib/newsletter.mjs und wird von der Netlify-Funktion
// netlify/functions/newsletter.mjs genauso genutzt.
//
// Anders als Netlify hat Vercel keine eingebaute Ratenbegrenzung je Pfad in
// allen Tarifen; die Falle (verstecktes Feld telefon2) und die
// Einwilligungsprüfung in lib/newsletter.mjs bleiben der Schutz gegen
// Missbrauch.

import { behandleAnfrage } from '../lib/newsletter.mjs';

export const config = { runtime: 'nodejs' };

export async function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
}

export async function POST(request) {
  return behandleAnfrage(request);
}
