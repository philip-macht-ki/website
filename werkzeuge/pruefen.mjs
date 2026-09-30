#!/usr/bin/env node
// pruefen.mjs: die 12 Prüfungen aus ARCHITEKTUR.md.
//
// Aufruf: `npm run pruefen` (baut vorher mit `npm run build`) oder
// `node werkzeuge/pruefen.mjs --ohne-build` (überspringt den Build, für Tests
// und schnelle lokale Läufe gegen einen vorhandenen dist/-Stand).
//
// Jede Prüfregel ist als eigene, einzeln testbare Funktion exportiert. Sie
// bekommt Pfade (Datei oder Ordner) und gibt eine Liste von Befunden zurück:
// { datei, zeile (optional), meldung, satz }. `satz` beginnt mit dem Text,
// den man dem Menschen als „Sag deinem Claude: …“ zeigt.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { WURZEL, leseSeiteJson, zeile, SEITE_JSON_PFAD, hostingAnbieter } from './gemeinsam.mjs';

const INHALT_DIR = join(WURZEL, 'inhalt');
const DIST_DIR = join(WURZEL, 'dist');
const SRC_DIR = join(WURZEL, 'src');
const BILDER_DIR = join(WURZEL, 'public', 'bilder');
const GRUND_CSS = join(SRC_DIR, 'styles', 'grund.css');
const FLOSKELN_PFAD = join(WURZEL, 'werkzeuge', 'floskeln.json');
const MAX_BILDGROESSE = 400 * 1024; // 400 KB

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

/** Alle Dateien unter `ordner`, rekursiv, deren Endung in `endungen` steht. */
function dateienMit(ordner, endungen) {
  if (!existsSync(ordner)) return [];
  const treffer = [];
  const gehDurch = (pfad) => {
    for (const eintrag of readdirSync(pfad, { withFileTypes: true })) {
      const voll = join(pfad, eintrag.name);
      if (eintrag.isDirectory()) gehDurch(voll);
      else if (endungen.includes(extname(eintrag.name))) treffer.push(voll);
    }
  };
  gehDurch(ordner);
  return treffer;
}

function relPfad(pfad) {
  return relative(WURZEL, pfad);
}

function zeilenNummerVon(text, index) {
  return text.slice(0, index).split('\n').length;
}

function ladeFloskeln(pfad = FLOSKELN_PFAD) {
  try {
    return JSON.parse(readFileSync(pfad, 'utf8'));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 1. Gedankenstrich
// ---------------------------------------------------------------------------

export function pruefeGedankenstriche(ordner = [INHALT_DIR, DIST_DIR]) {
  const befunde = [];
  // Der lange Strich ist immer ein Gedankenstrich. Der kurze nur zwischen
  // Leerzeichen; ohne Leerzeichen ist er ein Bis-Strich (9–17 Uhr) und erlaubt.
  const muster = /—| – /g;
  for (const o of ordner) {
    for (const datei of dateienMit(o, ['.md', '.html'])) {
      const text = readFileSync(datei, 'utf8');
      for (const treffer of text.matchAll(muster)) {
        befunde.push({
          datei: relPfad(datei),
          zeile: zeilenNummerVon(text, treffer.index),
          meldung: 'Gedankenstrich gefunden.',
          satz: 'Ersetze den Gedankenstrich durch Komma, Punkt, Doppelpunkt oder einen neuen Satz.',
        });
      }
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 2. Abschnittsnummern als Kopf
// ---------------------------------------------------------------------------

const NUMMERN_MUSTER = /^\s{0,3}#{1,6}\s*(\d{1,2}\s*[·.\-—:]|\bSchritt\s+\d+\s*:)/i;
const NUMMERN_MUSTER_HTML = /<h[1-6][^>]*>\s*(\d{1,2}\s*[·.\-—:]|Schritt\s+\d+\s*:)/i;

export function pruefeAbschnittsnummern(ordner = [INHALT_DIR, DIST_DIR]) {
  const befunde = [];
  for (const o of ordner) {
    for (const datei of dateienMit(o, ['.md', '.html'])) {
      const text = readFileSync(datei, 'utf8');
      const zeilen = text.split('\n');
      zeilen.forEach((z, i) => {
        if (NUMMERN_MUSTER.test(z) || NUMMERN_MUSTER_HTML.test(z)) {
          befunde.push({
            datei: relPfad(datei),
            zeile: i + 1,
            meldung: `Nummerierter Abschnittskopf: „${z.trim()}“.`,
            satz: 'Nimm die Nummer aus der Überschrift, sie wirkt wie ein KI-Muster.',
          });
        }
      });
    }
  }
  return befunde;
}


/** CSS-Text einer Datei: bei .astro nur die <style>-Blöcke, sonst die ganze Datei. */
function cssText(datei) {
  const text = readFileSync(datei, 'utf8');
  if (!datei.endsWith('.astro')) return text;
  // Nicht-Stil-Teile durch Leerzeilen ersetzen, damit Zeilennummern stimmen.
  let aus = '';
  let rest = 0;
  for (const block of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const start = block.index + block[0].indexOf(block[1]);
    aus += text.slice(rest, start).replace(/[^\n]/g, ' ') + block[1];
    rest = start + block[1].length;
  }
  return aus + text.slice(rest).replace(/[^\n]/g, ' ');
}

// ---------------------------------------------------------------------------
// 3. Mehr als ein border-radius-Wert
// ---------------------------------------------------------------------------

// Kein Radius (0) und Kreise (50 %) zählen nicht als eigener Radius.
const NEUTRALE_RADIEN = new Set(['0', '0px', '50%']);

export function pruefeEckenradien(cssDateien = dateienMit(SRC_DIR, ['.css', '.astro'])) {
  const gefundeneWerte = new Map(); // wert -> [{datei, zeile}]
  for (const datei of cssDateien) {
    if (!existsSync(datei)) continue;
    const text = cssText(datei);
    for (const treffer of text.matchAll(/border-radius\s*:\s*([^;}\n]+)/g)) {
      const wert = treffer[1].trim();
      if (NEUTRALE_RADIEN.has(wert)) continue;
      const liste = gefundeneWerte.get(wert) ?? [];
      liste.push({ datei: relPfad(datei), zeile: zeilenNummerVon(text, treffer.index) });
      gefundeneWerte.set(wert, liste);
    }
  }
  if (gefundeneWerte.size <= 1) return [];
  const befunde = [];
  for (const [wert, stellen] of gefundeneWerte) {
    if (wert === 'var(--radius)') continue;
    for (const stelle of stellen) {
      befunde.push({
        datei: stelle.datei,
        zeile: stelle.zeile,
        meldung: `Eigener Eckenradius „${wert}“ neben anderen Radien im Einsatz.`,
        satz: 'Nutze überall var(--radius) statt eigener border-radius-Werte.',
      });
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 4. Mehr als eine Akzentfarbe
// ---------------------------------------------------------------------------

function leseTokenFarben(tokenDatei) {
  if (!existsSync(tokenDatei)) return new Set();
  const text = readFileSync(tokenDatei, 'utf8');
  const farben = new Set();
  const wurzelBlock = text.match(/:root\s*{([^}]*)}/);
  if (wurzelBlock) {
    for (const treffer of wurzelBlock[1].matchAll(/#[0-9a-fA-F]{3,8}/g)) {
      farben.add(treffer[0].toLowerCase());
    }
  }
  return farben;
}

export function pruefeAkzentfarben(cssDateien = dateienMit(SRC_DIR, ['.css', '.astro']), tokenDatei = GRUND_CSS) {
  const erlaubt = leseTokenFarben(tokenDatei);
  const befunde = [];
  for (const datei of cssDateien) {
    if (!existsSync(datei) || datei === tokenDatei) continue;
    const text = cssText(datei);
    for (const treffer of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const farbe = treffer[0].toLowerCase();
      if (erlaubt.has(farbe)) continue;
      befunde.push({
        datei: relPfad(datei),
        zeile: zeilenNummerVon(text, treffer.index),
        meldung: `Hex-Farbe „${treffer[0]}“ außerhalb der Design-Tokens in grund.css.`,
        satz: 'Leg die Farbe als Token in grund.css an und nutze sie über eine CSS-Variable.',
      });
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 5. Externe Ressourcen in dist/
// ---------------------------------------------------------------------------

const EXTERNE_MUSTER = [
  { name: 'fonts.googleapis', muster: /fonts\.googleapis/gi },
  { name: 'fonts.gstatic', muster: /fonts\.gstatic/gi },
  { name: 'cdn.', muster: /https?:\/\/cdn\./gi },
  { name: 'unpkg', muster: /unpkg\.com/gi },
  { name: 'jsdelivr', muster: /jsdelivr\.net/gi },
  { name: 'googletagmanager', muster: /googletagmanager\.com/gi },
  { name: '<iframe', muster: /<iframe/gi },
];

export function pruefeExterneRessourcen(distOrdner = DIST_DIR) {
  const befunde = [];
  for (const datei of dateienMit(distOrdner, ['.html', '.css', '.js'])) {
    const text = readFileSync(datei, 'utf8');
    for (const { name, muster } of EXTERNE_MUSTER) {
      for (const treffer of text.matchAll(muster)) {
        befunde.push({
          datei: relPfad(datei),
          zeile: zeilenNummerVon(text, treffer.index),
          meldung: `Externe Ressource gefunden: „${name}“.`,
          satz: 'Lade Schriften, Bilder und Skripte lokal statt von einem fremden Server.',
        });
      }
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 6. Bilder über 400 KB, <img> ohne alt
// ---------------------------------------------------------------------------

export function pruefeBilder(bilderOrdner = BILDER_DIR, distOrdner = DIST_DIR) {
  const befunde = [];
  for (const datei of dateienMit(bilderOrdner, ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'])) {
    const groesse = statSync(datei).size;
    if (groesse > MAX_BILDGROESSE) {
      befunde.push({
        datei: relPfad(datei),
        meldung: `Bild ist ${(groesse / 1024).toFixed(0)} KB groß, Grenze sind 400 KB.`,
        satz: 'Verkleinere oder komprimiere das Bild, bevor es online geht.',
      });
    }
  }
  for (const datei of dateienMit(distOrdner, ['.html'])) {
    const text = readFileSync(datei, 'utf8');
    for (const treffer of text.matchAll(/<img\b[^>]*>/gi)) {
      if (!/\salt\s*=/i.test(treffer[0])) {
        befunde.push({
          datei: relPfad(datei),
          zeile: zeilenNummerVon(text, treffer.index),
          meldung: `<img> ohne alt-Text: ${treffer[0].slice(0, 80)}`,
          satz: 'Ergänze bei jedem Bild einen kurzen alt-Text, der beschreibt, was zu sehen ist.',
        });
      }
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 7. Platzhalter
// ---------------------------------------------------------------------------

const PLATZHALTER_MUSTER = [
  { name: 'Lorem', muster: /lorem ipsum|lorem\b/i },
  { name: 'TODO', muster: /\bTODO\b/ },
  { name: '{{', muster: /\{\{/ },
  { name: '[Name]', muster: /\[Name\]/i },
  { name: 'Beispiel GmbH', muster: /Beispiel GmbH/i },
];

export function pruefePlatzhalter(seite, ordner = [INHALT_DIR, DIST_DIR]) {
  const istMusterbetrieb = seite?.name === 'Studio Beispiel';
  const befunde = [];
  for (const o of ordner) {
    for (const datei of dateienMit(o, ['.md', '.html'])) {
      const text = readFileSync(datei, 'utf8');
      for (const { name, muster } of PLATZHALTER_MUSTER) {
        if (name === 'Beispiel GmbH' && istMusterbetrieb) continue;
        const globalesMuster = new RegExp(muster.source, muster.flags.includes('g') ? muster.flags : muster.flags + 'g');
        for (const treffer of text.matchAll(globalesMuster)) {
          befunde.push({
            datei: relPfad(datei),
            zeile: zeilenNummerVon(text, treffer.index),
            meldung: `Platzhalter „${name}“ gefunden.`,
            satz: 'Ersetze den Platzhalter durch den echten Text.',
          });
        }
      }
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 8. Mehr als zwei gleiche Abschnittsarten hintereinander
// ---------------------------------------------------------------------------

export function pruefeAbschnittsarten(inhaltOrdner = INHALT_DIR) {
  const befunde = [];
  for (const datei of dateienMit(inhaltOrdner, ['.md'])) {
    const text = readFileSync(datei, 'utf8');
    const frontmatterEnde = text.indexOf('\n---', 3);
    const frontmatter = text.startsWith('---') && frontmatterEnde !== -1 ? text.slice(0, frontmatterEnde) : text;
    const arten = [...frontmatter.matchAll(/^\s*-?\s*art:\s*["']?([a-zA-Zäöüß_]+)["']?\s*$/gim)].map((m) => m[1]);
    let lauf = 1;
    for (let i = 1; i < arten.length; i++) {
      if (arten[i] === arten[i - 1]) {
        lauf++;
        if (lauf > 2) {
          befunde.push({
            datei: relPfad(datei),
            meldung: `Mehr als zwei „${arten[i]}“-Abschnitte direkt hintereinander.`,
            satz: 'Wechsle Aufbau, Breite oder Rhythmus, statt gleiche Abschnittsarten zu wiederholen.',
          });
        }
      } else {
        lauf = 1;
      }
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 9. KI-Floskeln
// ---------------------------------------------------------------------------

const NICHT_NUR_SONDERN_AUCH = /nicht nur[^.]{0,120}?sondern auch/gis;

export function pruefeFloskeln(inhaltOrdner = INHALT_DIR, floskeln = ladeFloskeln()) {
  const befunde = [];
  for (const datei of dateienMit(inhaltOrdner, ['.md'])) {
    const text = readFileSync(datei, 'utf8');
    const textKlein = text.toLowerCase();
    for (const floskel of floskeln) {
      let ab = 0;
      const gesucht = floskel.toLowerCase();
      while (true) {
        const index = textKlein.indexOf(gesucht, ab);
        if (index === -1) break;
        befunde.push({
          datei: relPfad(datei),
          zeile: zeilenNummerVon(text, index),
          meldung: `KI-Floskel gefunden: „${floskel}“.`,
          satz: 'Schreib den Satz so, wie du es einem Kunden am Telefon sagen würdest.',
        });
        ab = index + gesucht.length;
      }
    }
    for (const treffer of text.matchAll(NICHT_NUR_SONDERN_AUCH)) {
      befunde.push({
        datei: relPfad(datei),
        zeile: zeilenNummerVon(text, treffer.index),
        meldung: 'KI-Floskel gefunden: „nicht nur … sondern auch“.',
        satz: 'Schreib den Satz so, wie du es einem Kunden am Telefon sagen würdest.',
      });
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 10. Impressum und Datenschutz vorhanden
// ---------------------------------------------------------------------------

export function pruefeRechtstexte(inhaltOrdner = INHALT_DIR, seite) {
  const befunde = [];
  const dateien = {
    impressum: join(inhaltOrdner, 'impressum.md'),
    datenschutz: join(inhaltOrdner, 'datenschutz.md'),
  };
  for (const [art, pfad] of Object.entries(dateien)) {
    if (!existsSync(pfad)) {
      befunde.push({
        datei: relPfad(pfad),
        meldung: `${art === 'impressum' ? 'Impressum' : 'Datenschutzerklärung'} fehlt.`,
        satz: 'Führe npm run rechtstexte aus, um die Datei zu erzeugen.',
      });
      continue;
    }
    const text = readFileSync(pfad, 'utf8');
    const inhaltOhneFrontmatter = text.replace(/^---[\s\S]*?---/, '').trim();
    if (inhaltOhneFrontmatter.length === 0) {
      befunde.push({
        datei: relPfad(pfad),
        meldung: `${art === 'impressum' ? 'Impressum' : 'Datenschutzerklärung'} ist leer.`,
        satz: 'Führe npm run rechtstexte aus, um die Datei zu erzeugen.',
      });
    }
    if (/\bTMG\b/.test(text)) {
      befunde.push({
        datei: relPfad(pfad),
        meldung: 'Verweis auf das TMG gefunden, das Gesetz heißt inzwischen DDG.',
        satz: 'Führe npm run rechtstexte erneut aus, das erzeugt den aktuellen Rechtstext.',
      });
    }
    // Offene Prüfstellen aus den Bausteinen: erst klären, dann veröffentlichen.
    // Der Musterbetrieb behält sie, damit man sieht, wo sie stehen.
    if (seite?.name !== 'Studio Beispiel') {
      for (const treffer of text.matchAll(/<!--\s*prüfen:/g)) {
        befunde.push({
          datei: relPfad(pfad),
          zeile: zeilenNummerVon(text, treffer.index),
          meldung: 'Offene Prüfstelle im Rechtstext.',
          satz: 'Geh die Stelle mit mir durch, trag das Ergebnis ein und lösch den Kommentar (Lektion web5-1).',
        });
      }
    }
    if (art === 'impressum') {
      const name = seite?.inhaber || seite?.name;
      if (name && !text.includes(name)) {
        befunde.push({ datei: relPfad(pfad), meldung: 'Impressum enthält nicht den Namen aus seite.json.', satz: 'Führe npm run rechtstexte erneut aus.' });
      }
      if (seite?.adresse?.strasse && !text.includes(seite.adresse.strasse)) {
        befunde.push({ datei: relPfad(pfad), meldung: 'Impressum enthält keine Anschrift.', satz: 'Führe npm run rechtstexte erneut aus.' });
      }
      if (seite?.email && !text.includes(seite.email)) {
        befunde.push({ datei: relPfad(pfad), meldung: 'Impressum enthält keine E-Mail-Adresse.', satz: 'Führe npm run rechtstexte erneut aus.' });
      }
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 11. Interne Links zeigen auf vorhandene Seiten
// ---------------------------------------------------------------------------

export function pruefeInterneLinks(distOrdner = DIST_DIR) {
  const htmlDateien = dateienMit(distOrdner, ['.html']);
  const vorhandenePfade = new Set(
    htmlDateien.map((d) => {
      let pfad = '/' + relative(distOrdner, d).replace(/\\/g, '/');
      pfad = pfad.replace(/index\.html$/, '').replace(/\.html$/, '');
      if (pfad.length > 1 && pfad.endsWith('/')) pfad = pfad.slice(0, -1);
      return pfad === '' ? '/' : pfad;
    }),
  );
  const befunde = [];
  for (const datei of htmlDateien) {
    const text = readFileSync(datei, 'utf8');
    // Nur echte Sprungmarken (<a href="…">) zählen als interne Links, keine
    // <link>-Tags (Stylesheets, Favicon) und keine anderen Elemente mit href.
    for (const ankerTreffer of text.matchAll(/<a\b[^>]*\shref="(\/[^"#?]*)[^"]*"[^>]*>/gi)) {
      let ziel = ankerTreffer[1];
      if (ziel.length > 1 && ziel.endsWith('/')) ziel = ziel.slice(0, -1);
      ziel = ziel.replace(/\.html$/, '');
      if (ziel === '') ziel = '/';
      if (ziel.startsWith('/.netlify')) continue; // Funktionen sind keine Seiten
      if (!vorhandenePfade.has(ziel)) {
        befunde.push({
          datei: relPfad(datei),
          zeile: zeilenNummerVon(text, ankerTreffer.index),
          meldung: `Interner Link zeigt auf eine nicht vorhandene Seite: „${ankerTreffer[1]}“.`,
          satz: 'Prüfe die Adresse oder lege die Seite an.',
        });
      }
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// 12. Formulare: Kontakt data-netlify + Honeypot, Newsletter Einwilligung
// ---------------------------------------------------------------------------

export function pruefeFormulare(distOrdner = DIST_DIR, seite) {
  const anbieter = hostingAnbieter(seite);
  const befunde = [];
  const kontaktDatei = join(distOrdner, 'kontakt', 'index.html');
  const kontaktAlt = join(distOrdner, 'kontakt.html');
  const kontaktPfad = existsSync(kontaktDatei) ? kontaktDatei : kontaktAlt;
  if (!existsSync(kontaktPfad)) {
    befunde.push({ datei: relPfad(kontaktPfad), meldung: 'Kontaktseite fehlt in dist/.', satz: 'Baue die Seite neu mit npm run build.' });
  } else {
    const text = readFileSync(kontaktPfad, 'utf8');
    const formular = text.match(/<form[^>]*name="kontakt"[\s\S]*?<\/form>/i);
    if (!formular) {
      befunde.push({ datei: relPfad(kontaktPfad), meldung: 'Kontaktformular (name="kontakt") nicht gefunden.', satz: 'Prüfe das Kontaktformular in src/komponenten/KontaktFormular.astro.' });
    } else if (anbieter === 'vercel') {
      if (!/action\s*=\s*["']\/api\/kontakt["']/i.test(formular[0])) {
        befunde.push({ datei: relPfad(kontaktPfad), meldung: 'Kontaktformular zeigt nicht auf /api/kontakt.', satz: 'Setze action="/api/kontakt" am Kontaktformular (Vercel hat keine Netlify Forms).' });
      }
      if (!/<input[^>]*name="firma-website"/i.test(formular[0])) {
        befunde.push({ datei: relPfad(kontaktPfad), meldung: 'Kontaktformular hat kein Honeypot-Feld firma-website.', satz: 'Ergänze das versteckte Feld firma-website.' });
      }
      if (!/<input[^>]*name="formular_geladen"/i.test(formular[0])) {
        befunde.push({ datei: relPfad(kontaktPfad), meldung: 'Kontaktformular hat kein Zeitfeld formular_geladen.', satz: 'Ergänze das versteckte Feld formular_geladen und public/formular-zeit.js, sonst kommt jede Nachricht mit dem Zusatz ohne Zeitprüfung an.' });
      }
    } else {
      if (!/data-netlify\s*=\s*["']true["']/i.test(formular[0])) {
        befunde.push({ datei: relPfad(kontaktPfad), meldung: 'Kontaktformular hat kein data-netlify="true".', satz: 'Ergänze data-netlify="true" am Kontaktformular.' });
      }
      if (!/netlify-honeypot\s*=\s*["']firma-website["']/i.test(formular[0]) || !/<input[^>]*name="firma-website"/i.test(formular[0])) {
        befunde.push({ datei: relPfad(kontaktPfad), meldung: 'Kontaktformular hat kein Honeypot-Feld firma-website.', satz: 'Ergänze netlify-honeypot="firma-website" und das versteckte Feld.' });
      }
      if (!/<input[^>]*name="form-name"[^>]*value="kontakt"/i.test(formular[0])) {
        befunde.push({ datei: relPfad(kontaktPfad), meldung: 'Kontaktformular hat kein verstecktes Feld form-name mit dem Wert kontakt.', satz: 'Ergänze <input type="hidden" name="form-name" value="kontakt">, sonst kommen Einsendungen ohne JavaScript nicht an.' });
      }
    }
  }
  const newsletterDatei = join(distOrdner, 'newsletter', 'index.html');
  const newsletterAlt = join(distOrdner, 'newsletter.html');
  const newsletterPfad = existsSync(newsletterDatei) ? newsletterDatei : newsletterAlt;
  if (existsSync(newsletterPfad)) {
    const newsletterAktion = anbieter === 'vercel' ? '/api/newsletter' : '/.netlify/functions/newsletter';
    const text = readFileSync(newsletterPfad, 'utf8');
    const formularMuster = new RegExp(`<form[^>]*action="${newsletterAktion.replace(/\//g, '\\/')}"[\\s\\S]*?<\\/form>`, 'i');
    const formular = text.match(formularMuster);
    if (!formular) {
      befunde.push({ datei: relPfad(newsletterPfad), meldung: `Newsletter-Formular zeigt nicht auf ${newsletterAktion}.`, satz: 'Prüfe das Formular in src/komponenten/NewsletterFormular.astro und seite.json.hosting.anbieter.' });
    } else if (!/<input[^>]*name="einwilligung"[^>]*required/i.test(formular[0])) {
      befunde.push({ datei: relPfad(newsletterPfad), meldung: 'Newsletter-Formular hat kein Pflicht-Häkchen für die Einwilligung.', satz: 'Ergänze das Häkchen einwilligung mit required und Datenschutztext.' });
    }
  }
  return befunde;
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------

export const ALLE_PRUEFUNGEN = [
  { nummer: 1, name: 'Gedankenstrich', lauf: () => pruefeGedankenstriche() },
  { nummer: 2, name: 'Abschnittsnummern', lauf: () => pruefeAbschnittsnummern() },
  { nummer: 3, name: 'Eckenradien', lauf: () => pruefeEckenradien() },
  { nummer: 4, name: 'Akzentfarben', lauf: () => pruefeAkzentfarben() },
  { nummer: 5, name: 'Externe Ressourcen', lauf: () => pruefeExterneRessourcen() },
  { nummer: 6, name: 'Bilder', lauf: () => pruefeBilder() },
  { nummer: 7, name: 'Platzhalter', lauf: (seite) => pruefePlatzhalter(seite) },
  { nummer: 8, name: 'Abschnittsarten', lauf: () => pruefeAbschnittsarten() },
  { nummer: 9, name: 'Floskeln', lauf: () => pruefeFloskeln() },
  { nummer: 10, name: 'Rechtstexte', lauf: (seite) => pruefeRechtstexte(INHALT_DIR, seite) },
  { nummer: 11, name: 'Interne Links', lauf: () => pruefeInterneLinks() },
  { nummer: 12, name: 'Formulare', lauf: (seite) => pruefeFormulare(DIST_DIR, seite) },
];

async function hauptlauf() {
  const argumente = process.argv.slice(2);
  const ohneBuild = argumente.includes('--ohne-build');

  if (!existsSync(SEITE_JSON_PFAD)) {
    zeile('fehler', 'seite.json fehlt im Projekt.', 'Lege seite.json im Projektwurzelordner an.');
    process.exitCode = 1;
    return;
  }
  let seite;
  try {
    seite = leseSeiteJson();
  } catch (fehler) {
    zeile('fehler', fehler.message, 'Prüfe seite.json auf gültiges JSON.');
    process.exitCode = 1;
    return;
  }

  if (!ohneBuild) {
    const ergebnis = spawnSync('npm', ['run', 'build'], { cwd: WURZEL, stdio: 'inherit' });
    if (ergebnis.status !== 0) {
      zeile('fehler', 'npm run build ist fehlgeschlagen.', 'Lies die Fehlermeldung des Builds und behebe sie, bevor du prüfst.');
      process.exitCode = 1;
      return;
    }
  }

  if (!existsSync(DIST_DIR) && !ohneBuild) {
    zeile('fehler', 'dist/ wurde nach dem Build nicht gefunden.', 'Prüfe, ob npm run build eine dist/ erzeugt.');
    process.exitCode = 1;
    return;
  }

  const alleBefunde = [];
  for (const pruefung of ALLE_PRUEFUNGEN) {
    if (pruefung.nummer === 6 || pruefung.nummer === 5 || pruefung.nummer === 11 || pruefung.nummer === 12) {
      if (!existsSync(DIST_DIR)) {
        alleBefunde.push({ nummer: pruefung.nummer, befunde: [{ datei: 'dist/', meldung: 'dist/ existiert nicht, Prüfung übersprungen.', satz: 'Führe npm run build aus.' }] });
        continue;
      }
    }
    const befunde = pruefung.lauf(seite);
    alleBefunde.push({ nummer: pruefung.nummer, befunde });
  }

  let gesamtzahl = 0;
  for (const { nummer, befunde } of alleBefunde) {
    for (const befund of befunde) {
      gesamtzahl++;
      const ort = befund.zeile ? `${befund.datei}:${befund.zeile}` : befund.datei;
      zeile('befund', `[${nummer}] ${ort}: ${befund.meldung}`, befund.satz);
    }
  }

  if (gesamtzahl === 0) {
    zeile('ok', 'Alle 12 Prüfungen sind ohne Befund durchgelaufen.');
    process.exitCode = 0;
  } else {
    zeile('befund', `${gesamtzahl} Befund(e) insgesamt.`, 'Geh die Liste oben durch und behebe einen Punkt nach dem anderen.');
    process.exitCode = 1;
  }
}

const wirdDirektAusgefuehrt = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (wirdDirektAusgefuehrt) {
  hauptlauf();
}
