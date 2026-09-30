// Tests für den Vercel-Weg: gemeinsame Newsletter-Logik (lib/newsletter.mjs),
// das Kontaktformular über api/kontakt.js und die Formularziele je Anbieter
// im gebauten dist/. Braucht --test-concurrency=1 (siehe package.json), weil
// der letzte Testblock seite.json und dist/ zweimal umbaut und danach exakt
// zurücksetzt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import * as libNewsletter from '../lib/newsletter.mjs';
import * as netlifyNewsletter from '../netlify/functions/newsletter.mjs';
import { GET as newsletterGetVercel, POST as newsletterPostVercel } from '../api/newsletter.js';
import {
  behandleAnfrage as behandleKontakt,
  GET as kontaktGet,
  zuSchnellAbgeschickt,
} from '../api/kontakt.js';

const WURZEL = fileURLToPath(new URL('..', import.meta.url));
const SEITE_PFAD = join(WURZEL, 'seite.json');

const BREVO_ENV = {
  NEWSLETTER_ANBIETER: 'brevo',
  NEWSLETTER_LISTE: '2',
  SEITE_DOMAIN: 'studio-beispiel.example',
  BREVO_API_KEY: 'geheim-brevo-schluessel',
  BREVO_DOI_TEMPLATE: '7',
};

const KONTAKT_ENV = {
  SEITE_DOMAIN: 'studio-beispiel.example',
  KONTAKT_SMTP_SERVER: 'smtp.example.com',
  KONTAKT_SMTP_BENUTZER: 'ich@example.com',
  KONTAKT_SMTP_PASSWORT: 'geheimes-passwort',
  KONTAKT_AN: 'ich@example.com',
};

function formAnfrage(pfad, felder) {
  const koerper = new URLSearchParams(felder).toString();
  return new Request(`https://studio-beispiel.example${pfad}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: koerper,
  });
}

function geladenVor(ms) {
  return String(Date.now() - ms);
}

// ---------------------------------------------------------------------------
// Newsletter: beide Einstiege nutzen dieselbe Logik
// ---------------------------------------------------------------------------

test('newsletter: der Netlify-Einstieg ist exakt lib/newsletter.mjs, keine eigene Kopie', () => {
  assert.equal(netlifyNewsletter.behandleAnfrage, libNewsletter.behandleAnfrage);
  assert.equal(netlifyNewsletter.fehlendeEinstellungen, libNewsletter.fehlendeEinstellungen);
});

test('newsletter: api/newsletter.js (Vercel) antwortet auf GET mit 405, wie die Netlify-Funktion', async () => {
  const antwort = await newsletterGetVercel();
  assert.equal(antwort.status, 405);
});

test('newsletter: api/newsletter.js (Vercel) meldet Brevo mit demselben Körper wie der Netlify-Einstieg', async () => {
  const alterFetch = global.fetch;
  const geloeschteUmgebung = { ...process.env };
  let erhaltenerKoerper;
  let erhalteneAdresse;
  global.fetch = async (adresse, optionen) => {
    erhalteneAdresse = adresse;
    erhaltenerKoerper = JSON.parse(optionen.body);
    return new Response('{}', { status: 201 });
  };
  Object.assign(process.env, BREVO_ENV);
  try {
    const req = formAnfrage('/api/newsletter', { email: 'lea@example.com', vorname: 'Lea', einwilligung: 'true' });
    const antwort = await newsletterPostVercel(req);
    assert.equal(antwort.status, 303);
    assert.match(antwort.headers.get('location'), /\/newsletter-danke$/);
    assert.equal(erhalteneAdresse, 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation');
    assert.equal(erhaltenerKoerper.email, 'lea@example.com');
    assert.deepEqual(erhaltenerKoerper.includeListIds, [2]);
  } finally {
    global.fetch = alterFetch;
    for (const schluessel of Object.keys(BREVO_ENV)) delete process.env[schluessel];
    Object.assign(process.env, geloeschteUmgebung);
  }
});

// ---------------------------------------------------------------------------
// Kontakt (nur Vercel): api/kontakt.js
// ---------------------------------------------------------------------------

test('kontakt: GET wird mit 405 abgelehnt', async () => {
  const antwort = await kontaktGet();
  assert.equal(antwort.status, 405);
});

test('kontakt: nur ein zu frisches Zeitfeld gilt als Bot, ein fehlendes nicht', () => {
  assert.equal(zuSchnellAbgeschickt(undefined), false);
  assert.equal(zuSchnellAbgeschickt(''), false);
  assert.equal(zuSchnellAbgeschickt('nicht-die-zeit'), false);
  assert.equal(zuSchnellAbgeschickt(String(Date.now() - 500)), true);
  assert.equal(zuSchnellAbgeschickt(String(Date.now() - 5000)), false);
});

test('kontakt: ohne Zeitfeld (kein JavaScript) geht die Nachricht trotzdem raus, markiert', async () => {
  let betreff = null;
  const transportErzeugen = () => ({ sendMail: async (m) => { betreff = m.subject; } });
  const req = formAnfrage('/api/kontakt', { name: 'Anna', email: 'anna@example.org', nachricht: 'Hallo' });
  const antwort = await behandleKontakt(req, { env: KONTAKT_ENV, transportErzeugen });
  assert.match(antwort.headers.get('location'), /\/kontakt-danke$/);
  assert.match(betreff, /ohne Zeitprüfung/);
});

test('kontakt: Honeypot gefüllt verschickt keine Mail, still zur Danke-Seite', async () => {
  let versendet = false;
  const transportErzeugen = () => ({ sendMail: async () => { versendet = true; } });
  const req = formAnfrage('/api/kontakt', {
    name: 'Bot',
    email: 'bot@example.com',
    nachricht: 'x',
    'firma-website': 'spam',
    formular_geladen: geladenVor(5000),
  });
  const antwort = await behandleKontakt(req, { env: KONTAKT_ENV, transportErzeugen });
  assert.equal(versendet, false);
  assert.match(antwort.headers.get('location'), /\/kontakt-danke$/);
});

test('kontakt: zu schnell abgeschickt verschickt keine Mail', async () => {
  let versendet = false;
  const transportErzeugen = () => ({ sendMail: async () => { versendet = true; } });
  const req = formAnfrage('/api/kontakt', {
    name: 'Bot',
    email: 'bot@example.com',
    nachricht: 'x',
    formular_geladen: geladenVor(500),
  });
  const antwort = await behandleKontakt(req, { env: KONTAKT_ENV, transportErzeugen });
  assert.equal(versendet, false);
  assert.match(antwort.headers.get('location'), /\/kontakt-danke$/);
});

test('kontakt: echte Anfrage verschickt eine Mail, Reply-To ist der Absender, kein Header-Injection', async () => {
  let uebergebeneNachricht;
  const transportErzeugen = () => ({
    sendMail: async (nachricht) => {
      uebergebeneNachricht = nachricht;
    },
  });
  const req = formAnfrage('/api/kontakt', {
    name: 'Anna Muster\r\nBcc: boese@example.com',
    email: 'anna@example.com',
    nachricht: 'Hallo, ich hätte gern ein Angebot.',
    formular_geladen: geladenVor(5000),
  });
  const antwort = await behandleKontakt(req, { env: KONTAKT_ENV, transportErzeugen });
  assert.equal(antwort.status, 303);
  assert.match(antwort.headers.get('location'), /\/kontakt-danke$/);
  assert.equal(uebergebeneNachricht.replyTo, 'anna@example.com');
  assert.equal(uebergebeneNachricht.to, KONTAKT_ENV.KONTAKT_AN);
  // Die Zeilenumbrüche sind weg, das macht aus dem Injektionsversuch harmlosen
  // Text in der einen Betreffzeile statt einer zusätzlichen Kopfzeile.
  assert.ok(!/[\r\n]/.test(uebergebeneNachricht.subject));
  assert.equal(uebergebeneNachricht.subject, 'Neue Nachricht über das Kontaktformular von Anna Muster Bcc: boese@example.com');
});

test('kontakt: fehlende Pflichtangabe führt zu fehler=1, keine Mail', async () => {
  let versendet = false;
  const transportErzeugen = () => ({ sendMail: async () => { versendet = true; } });
  const req = formAnfrage('/api/kontakt', {
    name: '',
    email: 'keine-email',
    nachricht: '',
    formular_geladen: geladenVor(5000),
  });
  const antwort = await behandleKontakt(req, { env: KONTAKT_ENV, transportErzeugen });
  assert.equal(versendet, false);
  assert.match(antwort.headers.get('location'), /\/kontakt\?fehler=1$/);
});

test('kontakt: fehlende Einstellung führt zu fehler=2, keine Mail, nur Namen im Log', async () => {
  const logs = [];
  const alt = console.log;
  console.log = (z) => logs.push(String(z));
  let versendet = false;
  const transportErzeugen = () => ({ sendMail: async () => { versendet = true; } });
  try {
    const req = formAnfrage('/api/kontakt', {
      name: 'Anna',
      email: 'anna@example.com',
      nachricht: 'Hallo',
      formular_geladen: geladenVor(5000),
    });
    const antwort = await behandleKontakt(req, { env: { ...KONTAKT_ENV, KONTAKT_SMTP_PASSWORT: '' }, transportErzeugen });
    assert.match(antwort.headers.get('location'), /\/kontakt\?fehler=2$/);
  } finally {
    console.log = alt;
  }
  assert.equal(versendet, false);
  assert.ok(logs.some((z) => z.includes('KONTAKT_SMTP_PASSWORT')));
  assert.ok(!logs.some((z) => z.includes('geheimes-passwort')));
});

test('kontakt: SMTP-Fehler führt zu fehler=2, das Passwort taucht in keiner Logausgabe auf', async () => {
  const logs = [];
  const alt = console.log;
  console.log = (z) => logs.push(String(z));
  const transportErzeugen = () => ({
    sendMail: async () => {
      throw new Error('Verbindung mit Passwort geheimes-passwort abgelehnt');
    },
  });
  try {
    const req = formAnfrage('/api/kontakt', {
      name: 'Anna',
      email: 'anna@example.com',
      nachricht: 'Hallo',
      formular_geladen: geladenVor(5000),
    });
    const antwort = await behandleKontakt(req, { env: KONTAKT_ENV, transportErzeugen });
    assert.match(antwort.headers.get('location'), /\/kontakt\?fehler=2$/);
  } finally {
    console.log = alt;
  }
  const gesamt = logs.join('\n');
  assert.ok(!gesamt.includes('geheimes-passwort'));
});

// ---------------------------------------------------------------------------
// Formularziele je Anbieter, aus dem tatsächlich gebauten dist/
// ---------------------------------------------------------------------------

test('Formulare: Ziel im gebauten dist/ wechselt exakt mit seite.json.hosting.anbieter', () => {
  const ursprung = readFileSync(SEITE_PFAD, 'utf8');
  try {
    const seite = JSON.parse(ursprung);

    seite.hosting = { anbieter: 'vercel' };
    writeFileSync(SEITE_PFAD, JSON.stringify(seite, null, 2) + '\n', 'utf8');
    execFileSync('npx', ['astro', 'build'], { cwd: WURZEL, stdio: 'ignore' });
    const kontaktVercel = readFileSync(join(WURZEL, 'dist', 'kontakt.html'), 'utf8');
    const newsletterVercel = readFileSync(join(WURZEL, 'dist', 'newsletter.html'), 'utf8');
    assert.match(kontaktVercel, /<form[^>]*action="\/api\/kontakt"/);
    assert.match(kontaktVercel, /name="formular_geladen"/);
    assert.match(newsletterVercel, /<form[^>]*action="\/api\/newsletter"/);

    seite.hosting = { anbieter: 'netlify' };
    writeFileSync(SEITE_PFAD, JSON.stringify(seite, null, 2) + '\n', 'utf8');
    execFileSync('npx', ['astro', 'build'], { cwd: WURZEL, stdio: 'ignore' });
    const kontaktNetlify = readFileSync(join(WURZEL, 'dist', 'kontakt.html'), 'utf8');
    const newsletterNetlify = readFileSync(join(WURZEL, 'dist', 'newsletter.html'), 'utf8');
    assert.match(kontaktNetlify, /data-netlify="true"/);
    assert.match(kontaktNetlify, /<form[^>]*action="\/kontakt-danke"/);
    assert.doesNotMatch(kontaktNetlify, /formular_geladen/);
    assert.match(newsletterNetlify, /<form[^>]*action="\/\.netlify\/functions\/newsletter"/);
  } finally {
    // seite.json exakt zurück, dann dist/ wieder auf den Standardzustand bauen.
    writeFileSync(SEITE_PFAD, ursprung, 'utf8');
    execFileSync('npx', ['astro', 'build'], { cwd: WURZEL, stdio: 'ignore' });
    const zurueckgelesen = readFileSync(SEITE_PFAD, 'utf8');
    assert.equal(zurueckgelesen, ursprung);
  }
});
