import { test } from 'node:test';
import assert from 'node:assert/strict';
import { behandleAnfrage } from '../netlify/functions/newsletter.mjs';

const BREVO_ENV = {
  NEWSLETTER_ANBIETER: 'brevo',
  NEWSLETTER_LISTE: '2',
  SEITE_DOMAIN: 'studio-beispiel.example',
  BREVO_API_KEY: 'geheim-brevo-schluessel',
  BREVO_DOI_TEMPLATE: '7',
};

const MAILERLITE_ENV = {
  NEWSLETTER_ANBIETER: 'mailerlite',
  NEWSLETTER_LISTE: 'gruppe-1',
  SEITE_DOMAIN: 'studio-beispiel.example',
  MAILERLITE_API_KEY: 'geheim-mailerlite-schluessel',
};

function formAnfrage(felder) {
  const koerper = new URLSearchParams(felder).toString();
  return new Request('https://studio-beispiel.example/.netlify/functions/newsletter', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: koerper,
  });
}

test('newsletter: GET wird mit 405 abgelehnt (das prüft auch der Wächter)', async () => {
  const req = new Request('https://studio-beispiel.example/.netlify/functions/newsletter', { method: 'GET' });
  const antwort = await behandleAnfrage(req, { env: BREVO_ENV, fetchFn: async () => new Response('') });
  assert.equal(antwort.status, 405);
});

test('newsletter: Brevo bekommt den richtigen Körper', async () => {
  let erhalteneAdresse, erhalteneOptionen;
  const fetchFn = async (adresse, optionen) => {
    erhalteneAdresse = adresse;
    erhalteneOptionen = optionen;
    return new Response('{}', { status: 201 });
  };
  const req = formAnfrage({ email: 'lea@example.com', vorname: 'Lea', einwilligung: 'true' });
  const antwort = await behandleAnfrage(req, { env: BREVO_ENV, fetchFn });

  assert.equal(antwort.status, 303);
  assert.equal(antwort.headers.get('location'), 'https://studio-beispiel.example/newsletter-danke');
  assert.equal(erhalteneAdresse, 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation');
  assert.equal(erhalteneOptionen.headers['api-key'], 'geheim-brevo-schluessel');
  const koerper = JSON.parse(erhalteneOptionen.body);
  assert.equal(koerper.email, 'lea@example.com');
  assert.equal(koerper.attributes.FIRSTNAME, 'Lea');
  assert.deepEqual(koerper.includeListIds, [2]);
  assert.equal(koerper.templateId, 7);
  assert.equal(koerper.redirectionUrl, 'https://studio-beispiel.example/newsletter-bestaetigt');
});

test('newsletter: MailerLite bekommt den richtigen Körper mit status unconfirmed', async () => {
  let erhalteneAdresse, erhalteneOptionen;
  const fetchFn = async (adresse, optionen) => {
    erhalteneAdresse = adresse;
    erhalteneOptionen = optionen;
    return new Response('{}', { status: 200 });
  };
  const req = formAnfrage({ email: 'lea@example.com', vorname: 'Lea', einwilligung: 'true' });
  const antwort = await behandleAnfrage(req, { env: MAILERLITE_ENV, fetchFn });

  assert.equal(antwort.status, 303);
  assert.equal(erhalteneAdresse, 'https://connect.mailerlite.com/api/subscribers');
  assert.equal(erhalteneOptionen.headers.authorization, 'Bearer geheim-mailerlite-schluessel');
  const koerper = JSON.parse(erhalteneOptionen.body);
  assert.equal(koerper.email, 'lea@example.com');
  assert.equal(koerper.status, 'unconfirmed');
  assert.deepEqual(koerper.groups, ['gruppe-1']);
});

test('newsletter: Honeypot gefüllt ruft den Anbieter nie auf', async () => {
  let aufgerufen = false;
  const fetchFn = async () => {
    aufgerufen = true;
    return new Response('{}', { status: 200 });
  };
  const req = formAnfrage({ email: 'bot@example.com', einwilligung: 'true', telefon2: '0123456' });
  const antwort = await behandleAnfrage(req, { env: BREVO_ENV, fetchFn });
  assert.equal(aufgerufen, false);
  assert.equal(antwort.status, 303);
  assert.equal(antwort.headers.get('location'), 'https://studio-beispiel.example/newsletter-danke');
});

test('newsletter: fehlende Einwilligung führt zu fehler=1, kein Anbieteraufruf', async () => {
  let aufgerufen = false;
  const fetchFn = async () => {
    aufgerufen = true;
    return new Response('{}', { status: 200 });
  };
  const req = formAnfrage({ email: 'lea@example.com' }); // kein einwilligung-Feld
  const antwort = await behandleAnfrage(req, { env: BREVO_ENV, fetchFn });
  assert.equal(aufgerufen, false);
  assert.equal(antwort.headers.get('location'), 'https://studio-beispiel.example/newsletter?fehler=1');
});

test('newsletter: ungültige E-Mail führt zu fehler=1', async () => {
  const req = formAnfrage({ email: 'keine-email', einwilligung: 'true' });
  const antwort = await behandleAnfrage(req, { env: BREVO_ENV, fetchFn: async () => new Response('{}') });
  assert.equal(antwort.headers.get('location'), 'https://studio-beispiel.example/newsletter?fehler=1');
});

test('newsletter: Anbieterfehler führt zu fehler=2', async () => {
  const fetchFn = async () => new Response('Fehler beim Anbieter', { status: 500 });
  const req = formAnfrage({ email: 'lea@example.com', einwilligung: 'true' });
  const antwort = await behandleAnfrage(req, { env: BREVO_ENV, fetchFn });
  assert.equal(antwort.headers.get('location'), 'https://studio-beispiel.example/newsletter?fehler=2');
});

test('newsletter: der Schlüssel taucht in keiner Logausgabe auf', async () => {
  const geloggt = [];
  const urspruenglichesLog = console.log;
  console.log = (...teile) => geloggt.push(teile.join(' '));
  try {
    const fetchFn = async () => new Response('Fehler beim Anbieter mit geheim-brevo-schluessel drin', { status: 500 });
    const req = formAnfrage({ email: 'lea@example.com', einwilligung: 'true' });
    await behandleAnfrage(req, { env: BREVO_ENV, fetchFn });
  } finally {
    console.log = urspruenglichesLog;
  }
  const gesamteAusgabe = geloggt.join('\n');
  assert.ok(!gesamteAusgabe.includes('geheim-brevo-schluessel'));
});

test('newsletter: JSON-Körper wird ebenso verarbeitet wie Formular-Körper', async () => {
  const fetchFn = async () => new Response('{}', { status: 201 });
  const req = new Request('https://studio-beispiel.example/.netlify/functions/newsletter', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'lea@example.com', einwilligung: true }),
  });
  const antwort = await behandleAnfrage(req, { env: BREVO_ENV, fetchFn });
  assert.equal(antwort.headers.get('location'), 'https://studio-beispiel.example/newsletter-danke');
});

test('newsletter: genau die Felder, die das gebaute Formular schickt, führen zur Anmeldung', async () => {
  // Felder und Werte aus dist/newsletter.html lesen, nicht von Hand annehmen.
  const { readFileSync, existsSync } = await import('node:fs');
  if (!existsSync('dist/newsletter.html')) {
    // Frische Kopie ohne Build: einmal bauen, statt still zu scheitern.
    const { execSync } = await import('node:child_process');
    execSync('npx astro build', { stdio: 'ignore' });
  }
  const html = readFileSync('dist/newsletter.html', 'utf8');
  const felder = {};
  for (const m of html.matchAll(/<input[^>]*name="([^"]+)"[^>]*>/g)) {
    const wert = (m[0].match(/value="([^"]*)"/) || [])[1];
    const typ = (m[0].match(/type="([^"]*)"/) || [])[1];
    if (m[1] === 'telefon2') continue; // Falle bleibt leer wie beim Menschen
    felder[m[1]] = typ === 'checkbox' ? (wert ?? 'on') : m[1] === 'email' ? 'kundin@example.org' : wert ?? '';
  }
  let aufgerufen = false;
  const antwort = await behandleAnfrage(formAnfrage(felder), {
    env: BREVO_ENV,
    fetchFn: async () => { aufgerufen = true; return new Response('', { status: 201 }); },
  });
  assert.equal(aufgerufen, true);
  assert.match(antwort.headers.get('location'), /\/newsletter-danke$/);
});

test('newsletter: fehlende Einstellung bei Netlify ruft keinen Anbieter und nennt nur Namen', async () => {
  const logs = [];
  const alt = console.log;
  console.log = (z) => logs.push(String(z));
  let aufgerufen = false;
  try {
    const antwort = await behandleAnfrage(formAnfrage({ email: 'a@example.org', einwilligung: 'ja' }), {
      env: { ...BREVO_ENV, BREVO_DOI_TEMPLATE: '' },
      fetchFn: async () => { aufgerufen = true; return new Response(''); },
    });
    assert.match(antwort.headers.get('location'), /fehler=2/);
  } finally {
    console.log = alt;
  }
  assert.equal(aufgerufen, false);
  assert.ok(logs.some((z) => z.includes('BREVO_DOI_TEMPLATE')));
  assert.ok(!logs.some((z) => z.includes('geheim')));
});

test('newsletter: unbekannter Anbieter fällt nicht still auf Brevo zurück', async () => {
  let aufgerufen = false;
  const antwort = await behandleAnfrage(formAnfrage({ email: 'a@example.org', einwilligung: 'ja' }), {
    env: { ...BREVO_ENV, NEWSLETTER_ANBIETER: 'brevoo' },
    fetchFn: async () => { aufgerufen = true; return new Response(''); },
  });
  assert.equal(aufgerufen, false);
  assert.match(antwort.headers.get('location'), /fehler=2/);
});
