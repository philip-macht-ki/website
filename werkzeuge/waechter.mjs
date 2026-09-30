#!/usr/bin/env node
// waechter.mjs: prüft die Live-Seite (nicht den lokalen Stand). Repariert
// nie automatisch, meldet nur. Läuft wöchentlich über launchd, siehe
// zeitplan/de.eigene-website.waechter.plist.

import { execFile } from 'node:child_process';
import { connect as tlsConnect } from 'node:tls';
import { pathToFileURL } from 'node:url';
import {
  leseSeiteJson,
  zeile,
  leseZaehler,
  zaehleImMonat,
  aktuellerMonat,
  schreibeArbeitsDatei,
  WAECHTER_ERGEBNIS_PFAD,
  jetztBerlin,
} from './gemeinsam.mjs';

/** Übersetzt technische Netzwerkfehler in einen Satz, den man versteht. */
export function grundInWorten(fehler) {
  const text = `${fehler?.message ?? ''} ${fehler?.cause?.code ?? ''} ${fehler?.code ?? ''}`;
  if (/ENOTFOUND|EAI_AGAIN/.test(text)) return 'die Adresse ist im Internet nicht auffindbar (Domain noch nicht umgestellt oder vertippt)';
  if (/CERT|certificate|SSL|TLS/i.test(text)) return 'das Sicherheitszertifikat stimmt nicht';
  if (/ECONNREFUSED|ECONNRESET/.test(text)) return 'der Server lehnt die Verbindung ab';
  if (/abort|timeout|ETIMEDOUT/i.test(text)) return 'die Seite hat zu lange nicht geantwortet';
  return `technischer Fehler: ${fehler?.message ?? 'unbekannt'}`;
}

const ZEITLIMIT_MS = 8000;
const ZERTIFIKAT_WARNGRENZE_TAGE = 14;

/** fetch mit Zeitlimit. Für Tests ersetzbar durch einen Mock. */
export async function echtesFetch(adresse, optionen = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ZEITLIMIT_MS);
  try {
    return await fetch(adresse, { ...optionen, signal: controller.signal, redirect: 'follow' });
  } finally {
    clearTimeout(timer);
  }
}

/** Zertifikatsablauf per node:tls. Gibt {tageBisAblauf} oder wirft bei Verbindungsfehler. */
export function echteZertifikatsPruefung(host, port = 443) {
  return new Promise((eintragen, ablehnen) => {
    const socket = tlsConnect({ host, port, servername: host, timeout: ZEITLIMIT_MS }, () => {
      const zertifikat = socket.getPeerCertificate();
      socket.end();
      if (!zertifikat || !zertifikat.valid_to) {
        ablehnen(new Error('Kein Zertifikat erhalten.'));
        return;
      }
      const ablauf = new Date(zertifikat.valid_to);
      const tageBisAblauf = Math.floor((ablauf.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      eintragen({ tageBisAblauf, ablauf: ablauf.toISOString() });
    });
    socket.on('error', ablehnen);
    socket.on('timeout', () => {
      socket.destroy();
      ablehnen(new Error('Zeitlimit bei der Zertifikatsprüfung überschritten.'));
    });
  });
}

/** Echte macOS-Mitteilung. Für Tests ersetzbar. */
export function echteMitteilung(text) {
  return new Promise((eintragen) => {
    const skript = `display notification ${JSON.stringify(text)} with title "Wächter: eigene Website"`;
    execFile('osascript', ['-e', skript], () => eintragen());
  });
}

function adresseAus(domain, pfad = '/') {
  const basis = domain.startsWith('http') ? domain : `https://${domain}`;
  return new URL(pfad, basis).toString();
}

export async function pruefeStartseite(domain, fetchFn = echtesFetch) {
  try {
    const antwort = await fetchFn(adresseAus(domain, '/'));
    if (antwort.status !== 200) {
      return { ok: false, meldung: `Startseite antwortet mit Status ${antwort.status} statt 200.` };
    }
    return { ok: true };
  } catch (fehler) {
    return { ok: false, meldung: `Startseite nicht erreichbar: ${grundInWorten(fehler)}` };
  }
}

export async function pruefeZertifikat(domain, zertifikatsPruefung = echteZertifikatsPruefung) {
  try {
    const host = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const ergebnis = await zertifikatsPruefung(host);
    if (ergebnis.tageBisAblauf <= ZERTIFIKAT_WARNGRENZE_TAGE) {
      return { ok: false, meldung: `Zertifikat läuft in ${ergebnis.tageBisAblauf} Tagen ab (unter ${ZERTIFIKAT_WARNGRENZE_TAGE}).` };
    }
    return { ok: true, tageBisAblauf: ergebnis.tageBisAblauf };
  } catch (fehler) {
    return { ok: false, meldung: `Zertifikat konnte nicht geprüft werden: ${grundInWorten(fehler)}` };
  }
}

export async function pruefeSeiteMitFormular(domain, pfad, formularName, fetchFn = echtesFetch) {
  try {
    const antwort = await fetchFn(adresseAus(domain, pfad));
    if (antwort.status !== 200) {
      return { ok: false, meldung: `${pfad} antwortet mit Status ${antwort.status} statt 200.` };
    }
    const text = await antwort.text();
    if (!text.includes(formularName)) {
      return { ok: false, meldung: `${pfad} enthält nicht das erwartete Formular „${formularName}“.` };
    }
    return { ok: true };
  } catch (fehler) {
    return { ok: false, meldung: `${pfad} nicht erreichbar: ${grundInWorten(fehler)}` };
  }
}

export async function pruefeNewsletterFunktion(domain, fetchFn = echtesFetch) {
  try {
    const antwort = await fetchFn(adresseAus(domain, '/.netlify/functions/newsletter'));
    if (antwort.status !== 405) {
      return { ok: false, meldung: `Newsletter-Funktion antwortet auf GET mit Status ${antwort.status} statt 405.` };
    }
    return { ok: true };
  } catch (fehler) {
    return { ok: false, meldung: `Newsletter-Funktion nicht erreichbar: ${grundInWorten(fehler)}` };
  }
}

export function pruefeZaehlerGrenze(seite, zaehlerPfad) {
  const grenze = seite?.veroeffentlichen?.grenze_monat ?? Infinity;
  const zaehler = leseZaehler(zaehlerPfad);
  const monat = aktuellerMonat();
  const bisher = zaehleImMonat(zaehler, monat);
  if (bisher >= grenze) {
    return { ok: false, meldung: `Zähler der Veröffentlichungen ist bei ${bisher} von ${grenze} in ${monat}, also an oder über der Grenze.` };
  }
  return { ok: true };
}

export async function fuehreWaechterAus({
  seite,
  fetchFn = echtesFetch,
  zertifikatsPruefung = echteZertifikatsPruefung,
  mitteilung = echteMitteilung,
  zaehlerPfad,
  ergebnisPfad = WAECHTER_ERGEBNIS_PFAD,
} = {}) {
  const domain = seite.domain;
  const befunde = [];

  const startseite = await pruefeStartseite(domain, fetchFn);
  if (!startseite.ok) befunde.push(startseite.meldung);

  const zertifikat = await pruefeZertifikat(domain, zertifikatsPruefung);
  if (!zertifikat.ok) befunde.push(zertifikat.meldung);

  // Nur prüfen, was eingeschaltet ist: ausgeschaltete Seiten baut Astro gar nicht.
  if (seite?.kontakt?.an !== false) {
    const kontakt = await pruefeSeiteMitFormular(domain, '/kontakt', 'name="kontakt"', fetchFn);
    if (!kontakt.ok) befunde.push(kontakt.meldung);
  }

  if (seite?.newsletter?.an) {
    const newsletterSeite = await pruefeSeiteMitFormular(domain, '/newsletter', '/.netlify/functions/newsletter', fetchFn);
    if (!newsletterSeite.ok) befunde.push(newsletterSeite.meldung);

    const newsletterFunktion = await pruefeNewsletterFunktion(domain, fetchFn);
    if (!newsletterFunktion.ok) befunde.push(newsletterFunktion.meldung);
  }

  const zaehler = pruefeZaehlerGrenze(seite, zaehlerPfad);
  if (!zaehler.ok) befunde.push(zaehler.meldung);

  const ergebnis = {
    zeitpunkt: jetztBerlin(),
    domain,
    ok: befunde.length === 0,
    befunde,
  };
  schreibeArbeitsDatei(ergebnisPfad, ergebnis);

  if (befunde.length === 0) {
    zeile('ok', `Wächter: ${domain} ist unauffällig.`);
  } else {
    for (const b of befunde) {
      zeile('befund', b, 'Schau dir den Befund an, der Wächter repariert nichts von selbst.');
    }
    if (seite?.waechter?.mitteilung) {
      await mitteilung(`${befunde.length} Befund(e) bei ${domain}. Details in arbeit/waechter.json.`);
    }
  }

  return ergebnis;
}

async function hauptlauf() {
  let seite;
  try {
    seite = leseSeiteJson();
  } catch (fehler) {
    zeile('fehler', fehler.message, 'Prüfe seite.json auf gültiges JSON.');
    process.exitCode = 1;
    return;
  }
  if (!seite.domain) {
    zeile('fehler', 'seite.json.domain ist leer.', 'Trag die eigene Domain in seite.json ein.');
    process.exitCode = 1;
    return;
  }
  const ergebnis = await fuehreWaechterAus({ seite });
  process.exitCode = ergebnis.ok ? 0 : 1;
}

const wirdDirektAusgefuehrt = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (wirdDirektAusgefuehrt) {
  hauptlauf();
}
