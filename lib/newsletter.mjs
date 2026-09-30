// lib/newsletter.mjs: die eigentliche Newsletter-Logik, geteilt zwischen den
// beiden dünnen Einstiegen `netlify/functions/newsletter.mjs` (Netlify
// Functions) und `api/newsletter.js` (Vercel Functions). Beide Plattformen
// sprechen die Web-Standard-Signatur (Request/Response), deshalb reicht eine
// gemeinsame Datei für Brevo, MailerLite, Honeypot, Einwilligung und fehlende
// Einstellungen. Siehe ARCHITEKTUR.md für den genauen Vertrag.
//
// Wichtig: Der API-Schlüssel wird nie geloggt, auch nicht die volle
// Anbieterantwort. Bei einem Anbieterfehler wird nur der Status-Code geloggt.

const ZEITLIMIT_MS = 8000;

export function umleitung(pfad, herkunft) {
  const ziel = herkunft ? new URL(pfad, herkunft).toString() : pfad;
  return new Response(null, { status: 303, headers: { Location: ziel } });
}

export function gueltigeEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function istWahr(wert) {
  // Das Formular schickt "ja" (NewsletterFormular.astro), Browser ohne value "on".
  return wert === true || ['ja', 'true', 'on', '1'].includes(String(wert ?? '').toLowerCase());
}

/** Welche Einstellungen fehlen für diesen Anbieter? Leere Liste heißt: alles da. */
export function fehlendeEinstellungen(env) {
  const anbieter = env.NEWSLETTER_ANBIETER;
  if (anbieter !== 'brevo' && anbieter !== 'mailerlite') return ['NEWSLETTER_ANBIETER (brevo oder mailerlite)'];
  const noetig =
    anbieter === 'brevo'
      ? ['BREVO_API_KEY', 'BREVO_DOI_TEMPLATE', 'NEWSLETTER_LISTE', 'SEITE_DOMAIN']
      : ['MAILERLITE_API_KEY', 'NEWSLETTER_LISTE', 'SEITE_DOMAIN'];
  const fehlend = noetig.filter((name) => !String(env[name] ?? '').trim());
  if (anbieter === 'brevo') {
    for (const name of ['BREVO_DOI_TEMPLATE', 'NEWSLETTER_LISTE']) {
      if (env[name] && !Number.isInteger(Number(env[name]))) fehlend.push(`${name} (muss eine Zahl sein)`);
    }
  }
  return fehlend;
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

async function fetchMitZeitlimit(fetchFn, adresse, optionen) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ZEITLIMIT_MS);
  try {
    return await fetchFn(adresse, { ...optionen, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function meldeBeiBrevo({ email, vorname, env, fetchFn }) {
  const antwort = await fetchMitZeitlimit(fetchFn, 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'api-key': env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: vorname || '' },
      includeListIds: [Number(env.NEWSLETTER_LISTE)],
      templateId: Number(env.BREVO_DOI_TEMPLATE),
      redirectionUrl: `https://${env.SEITE_DOMAIN}/newsletter-bestaetigt`,
    }),
  });
  return antwort;
}

async function meldeBeiMailerlite({ email, vorname, env, fetchFn }) {
  const antwort = await fetchMitZeitlimit(fetchFn, 'https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
    },
    body: JSON.stringify({
      email,
      fields: { name: vorname || '' },
      groups: [env.NEWSLETTER_LISTE],
      status: 'unconfirmed',
    }),
  });
  return antwort;
}

/**
 * Reine Anfragen-Logik, ohne globale Abhängigkeiten. `env` und `fetchFn` sind
 * austauschbar, damit Tests keinen echten Netzwerkaufruf machen und nie einen
 * echten Schlüssel brauchen. Von beiden Einstiegen (Netlify, Vercel) genutzt.
 */
export async function behandleAnfrage(req, { env = process.env, fetchFn = fetch } = {}) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
  }

  const herkunft = env.SEITE_DOMAIN ? `https://${env.SEITE_DOMAIN}` : undefined;
  const koerper = await leseKoerper(req);

  // Falle: Bots füllen versteckte Felder aus. Still weiterleiten, kein
  // Anbieteraufruf, kein Hinweis, dass es eine Falle war.
  if (koerper.telefon2) {
    return umleitung('/newsletter-danke', herkunft);
  }

  const email = typeof koerper.email === 'string' ? koerper.email.trim() : '';
  const einwilligung = istWahr(koerper.einwilligung);

  if (!gueltigeEmail(email) || !einwilligung) {
    return umleitung('/newsletter?fehler=1', herkunft);
  }

  const fehlend = fehlendeEinstellungen(env);
  if (fehlend.length) {
    // Nur die Namen, nie Werte.
    console.log(`newsletter: Einstellung fehlt: ${fehlend.join(', ')}`);
    return umleitung('/newsletter?fehler=2', herkunft);
  }

  const anbieter = env.NEWSLETTER_ANBIETER;
  try {
    const antwort =
      anbieter === 'mailerlite'
        ? await meldeBeiMailerlite({ email, vorname: koerper.vorname, env, fetchFn })
        : await meldeBeiBrevo({ email, vorname: koerper.vorname, env, fetchFn });

    if (!antwort.ok) {
      console.log(`newsletter: Anbieterfehler, Status ${antwort.status}`);
      return umleitung('/newsletter?fehler=2', herkunft);
    }
  } catch (fehler) {
    console.log(`newsletter: Anbieteraufruf fehlgeschlagen (${fehler.name || 'Fehler'})`);
    return umleitung('/newsletter?fehler=2', herkunft);
  }

  return umleitung('/newsletter-danke', herkunft);
}
