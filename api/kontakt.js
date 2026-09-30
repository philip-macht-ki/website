// api/kontakt.js: Vercel-Funktion für das Kontaktformular. Es gibt keine
// Vercel-Forms wie bei Netlify, deshalb schickt diese Funktion die Nachricht
// per SMTP aus dem eigenen Postfach des Mitglieds an sich selbst (wie im
// Buchhaltungskurs): App-Passwort und Adresse trägt das Mitglied selbst bei
// Vercel unter Environment variables ein, nie im Repo.
//
// Umgebungsvariablen: KONTAKT_SMTP_SERVER, KONTAKT_SMTP_BENUTZER,
// KONTAKT_SMTP_PASSWORT, KONTAKT_AN, optional KONTAKT_SMTP_PORT (Standard 465).
//
// Schutz gegen Bots:
// - Honeypot-Feld "firma-website" (Menschen sehen und füllen es nicht aus).
// - Verstecktes Zeitfeld "formular_geladen": public/formular-zeit.js trägt
//   beim Laden der Seite die Uhrzeit ein. Kommt die Nachricht weniger als
//   drei Sekunden später an, gilt das als Bot. Fehlt das Feld (kein
//   JavaScript), geht die Nachricht trotzdem raus, mit dem Betreffzusatz
//   "ohne Zeitprüfung": lieber eine Spam-Mail mehr als eine verlorene Anfrage.
// - Zeilenumbrüche werden aus Name und E-Mail entfernt, damit niemand über
//   das Formular zusätzliche Kopfzeilen in die Mail schmuggelt
//   (Header-Injection).
//
// Nie das Passwort oder den vollen Fehlertext loggen, nur die Fehlerart.

import nodemailer from 'nodemailer';

export const config = { runtime: 'nodejs' };

const MINDESTZEIT_MS = 3000;

function ohneZeilenumbrueche(text) {
  return String(text ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function gueltigeEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function umleitung(pfad, herkunft) {
  const ziel = herkunft ? new URL(pfad, herkunft).toString() : pfad;
  return new Response(null, { status: 303, headers: { Location: ziel } });
}

/** Welche Einstellungen fehlen? Leere Liste heißt: alles da. */
export function fehlendeEinstellungen(env) {
  const noetig = ['KONTAKT_SMTP_SERVER', 'KONTAKT_SMTP_BENUTZER', 'KONTAKT_SMTP_PASSWORT', 'KONTAKT_AN'];
  return noetig.filter((name) => !String(env[name] ?? '').trim());
}

/** Liest den Formular- oder JSON-Körper der Anfrage in ein einfaches Objekt. */
export async function leseKoerper(req) {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }
  const text = await req.text();
  const daten = new URLSearchParams(text);
  const objekt = {};
  for (const [schluessel, wert] of daten.entries()) objekt[schluessel] = wert;
  return objekt;
}

/** true nur, wenn das Zeitfeld da ist und die Nachricht zu schnell nach dem Laden kam. */
export function zuSchnellAbgeschickt(geladenUmRoh, jetzt = Date.now()) {
  const geladenUm = Number(geladenUmRoh);
  if (!geladenUm || Number.isNaN(geladenUm)) return false;
  return jetzt - geladenUm < MINDESTZEIT_MS;
}

/** true, wenn das Zeitfeld fehlt oder unbrauchbar ist (kein JavaScript beim Besucher). */
export function ohneZeitfeld(geladenUmRoh) {
  const geladenUm = Number(geladenUmRoh);
  return !geladenUm || Number.isNaN(geladenUm);
}

/**
 * Reine Anfragen-Logik, ohne globale Abhängigkeiten. `env` und
 * `transportErzeugen` sind austauschbar, damit Tests keinen echten
 * SMTP-Versand auslösen und nie ein echtes Passwort brauchen.
 */
export async function behandleAnfrage(req, { env = process.env, transportErzeugen = nodemailer.createTransport } = {}) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
  }

  const herkunft = env.SEITE_DOMAIN ? `https://${env.SEITE_DOMAIN}` : undefined;
  const koerper = await leseKoerper(req);

  // Falle: Bots füllen versteckte Felder aus. Still weiterleiten, keine Mail.
  if (koerper['firma-website']) {
    return umleitung('/kontakt-danke', herkunft);
  }

  if (zuSchnellAbgeschickt(koerper.formular_geladen)) {
    return umleitung('/kontakt-danke', herkunft);
  }

  const name = ohneZeilenumbrueche(koerper.name);
  const email = ohneZeilenumbrueche(koerper.email);
  const nachricht = String(koerper.nachricht ?? '').trim();

  if (!name || !gueltigeEmail(email) || !nachricht) {
    return umleitung('/kontakt?fehler=1', herkunft);
  }

  const fehlend = fehlendeEinstellungen(env);
  if (fehlend.length) {
    // Nur die Namen, nie Werte.
    console.log(`kontakt: Einstellung fehlt: ${fehlend.join(', ')}`);
    return umleitung('/kontakt?fehler=2', herkunft);
  }

  try {
    const port = Number(env.KONTAKT_SMTP_PORT || 465);
    const transport = transportErzeugen({
      host: env.KONTAKT_SMTP_SERVER,
      port,
      secure: port !== 587,
      auth: { user: env.KONTAKT_SMTP_BENUTZER, pass: env.KONTAKT_SMTP_PASSWORT },
    });
    await transport.sendMail({
      from: env.KONTAKT_SMTP_BENUTZER,
      to: env.KONTAKT_AN,
      replyTo: email,
      subject: `Neue Nachricht über das Kontaktformular von ${name}${
        ohneZeitfeld(koerper.formular_geladen) ? ' (ohne Zeitprüfung)' : ''
      }`,
      text: `${nachricht}\n\n${name} (${email})`,
    });
  } catch (fehler) {
    console.log(`kontakt: Versand fehlgeschlagen (${fehler?.name || 'Fehler'})`);
    return umleitung('/kontakt?fehler=2', herkunft);
  }

  return umleitung('/kontakt-danke', herkunft);
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
}

export async function POST(request) {
  return behandleAnfrage(request);
}
