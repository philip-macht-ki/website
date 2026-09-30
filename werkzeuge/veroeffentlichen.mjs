#!/usr/bin/env node
// veroeffentlichen.mjs: prüft, zählt, veröffentlicht. Standard ist Vercel
// (`npx vercel deploy --prod`), die günstigere Variante ist Netlify
// (`netlify deploy --prod --dir dist`, kostet Credits). Welcher Weg gilt,
// steht in seite.json.hosting.anbieter.
//
// Ablauf: pruefen → bei Netlify Zähler gegen Grenze aus seite.json (Credits,
// bei Grenze Abbruch außer --trotzdem) → Veröffentlichen → bei Erfolg Zähler
// + 1. Bei Vercel zählt der Zähler mit (zur Übersicht), sperrt aber nicht,
// weil es dort kein Credit-System wie bei Netlify Free gibt. `--trocken`
// zeigt nur, was passieren würde, ruft nie die CLI auf.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  WURZEL,
  leseSeiteJson,
  zeile,
  leseZaehler,
  schreibeZaehler,
  zaehleImMonat,
  trageVeroeffentlichungEin,
  aktuellerMonat,
  jetztBerlin,
  ZAEHLER_PFAD,
  hostingAnbieter,
} from './gemeinsam.mjs';

/** Echtes Ausführen eines Befehls (Standard). Für Tests ersetzbar. */
export function echtAusfuehren(befehl, args) {
  const ergebnis = spawnSync(befehl, args, { cwd: WURZEL, encoding: 'utf8' });
  return {
    code: ergebnis.status ?? 1,
    stdout: ergebnis.stdout ?? '',
    stderr: ergebnis.stderr ?? '',
  };
}

/** Ruft node werkzeuge/pruefen.mjs auf. Standard: echter Aufruf, für Tests ersetzbar. */
export function echtPruefen() {
  const ergebnis = spawnSync('node', ['werkzeuge/pruefen.mjs'], { cwd: WURZEL, encoding: 'utf8', stdio: 'inherit' });
  return ergebnis.status === 0;
}

function erkenneNichtVerknuepft(ausgabe) {
  const text = `${ausgabe.stdout || ''}${ausgabe.stderr || ''}`.toLowerCase();
  return (
    text.includes('not linked') ||
    text.includes('please run `netlify link`') ||
    text.includes('not logged in') ||
    text.includes('you must be logged in')
  );
}

function erkenneNichtVerknuepftVercel(ausgabe) {
  const text = `${ausgabe.stdout || ''}${ausgabe.stderr || ''}`.toLowerCase();
  return (
    text.includes('vercel login') ||
    text.includes('no existing credentials') ||
    text.includes('not authorized') ||
    text.includes('please authenticate') ||
    text.includes('not logged in')
  );
}

/**
 * Führt die Veröffentlichungslogik aus. Alle externen Effekte (Prüfen,
 * Netlify-Aufruf, Zeit, Zähler-Pfad) sind austauschbar, damit Tests keinen
 * echten Netzwerk- oder Prozessaufruf machen.
 */
export function fuehreVeroeffentlichungAus({
  trotzdem = false,
  trocken = false,
  seite,
  ausfuehren = echtAusfuehren,
  pruefen = echtPruefen,
  zaehlerPfad = ZAEHLER_PFAD,
  jetzt = jetztBerlin(),
  monat = aktuellerMonat(),
} = {}) {
  const anbieter = hostingAnbieter(seite);
  // Die Monatsgrenze ist die Bremse gegen Netlifys Credit-System (Free: 300 im
  // Monat, eine Veröffentlichung 15). Vercel kennt dieses Limit nicht, der
  // Zähler läuft dort nur zur Übersicht mit, ohne zu sperren.
  const grenze = seite?.veroeffentlichen?.grenze_monat ?? Infinity;
  const zaehler = leseZaehler(zaehlerPfad);
  const bisher = zaehleImMonat(zaehler, monat);

  if (anbieter === 'netlify' && bisher >= grenze && !trotzdem) {
    zeile(
      'befund',
      `Monatsgrenze erreicht: ${bisher} von ${grenze} Veröffentlichungen in ${monat}.`,
      'Warte bis zum Monatswechsel oder geh bei Netlify auf einen bezahlten Tarif, und sag Bescheid, wenn du trotzdem veröffentlichen willst (--trotzdem).',
    );
    return { veroeffentlicht: false, grund: 'grenze' };
  }

  if (trocken) {
    const werkzeug = anbieter === 'vercel' ? 'vercel' : 'netlify';
    const zusatz = anbieter === 'vercel' ? '' : ` (Stand ${bisher} von ${grenze} in ${monat})`;
    zeile('nichts', `Trockenlauf: würde jetzt auf ${anbieter === 'vercel' ? 'Vercel' : 'Netlify'} veröffentlichen${zusatz}, ${werkzeug} wird nicht aufgerufen.`);
    return { veroeffentlicht: false, grund: 'trocken' };
  }

  const gruen = pruefen();
  if (!gruen) {
    zeile('fehler', 'npm run pruefen hat Befunde gemeldet.', 'Behebe die Befunde oben, bevor du veröffentlichst.');
    return { veroeffentlicht: false, grund: 'pruefen' };
  }

  if (!existsSync(`${WURZEL}/dist`)) {
    zeile('fehler', 'dist/ fehlt.', 'Führe npm run build aus.');
    return { veroeffentlicht: false, grund: 'kein-dist' };
  }

  let ausgabe;
  if (anbieter === 'vercel') {
    const projekt = seite?.veroeffentlichen?.vercel_projekt;
    const args = ['vercel', 'deploy', '--prod', '--yes'];
    if (projekt) args.push('--name', projekt);
    ausgabe = ausfuehren('npx', args);
    if (erkenneNichtVerknuepftVercel(ausgabe)) {
      zeile('fehler', 'Diese Seite ist noch nicht mit Vercel verknüpft oder nicht eingeloggt.', 'Führe npx vercel login und danach npx vercel link aus (Teil 5 in einrichten.md).');
      return { veroeffentlicht: false, grund: 'nicht-verknuepft' };
    }
    if (ausgabe.code !== 0) {
      zeile('fehler', 'vercel deploy ist fehlgeschlagen.', 'Lies die Fehlermeldung von Vercel oben und behebe sie.');
      return { veroeffentlicht: false, grund: 'deploy-fehler' };
    }
  } else {
    const netlifySite = seite?.veroeffentlichen?.netlify_site;
    const args = ['netlify', 'deploy', '--prod', '--dir', 'dist'];
    if (netlifySite) args.push('--site', netlifySite);
    ausgabe = ausfuehren('npx', args);
    if (erkenneNichtVerknuepft(ausgabe)) {
      zeile('fehler', 'Diese Seite ist noch nicht mit Netlify verknüpft oder nicht eingeloggt.', 'Verbinde die Seite mit Netlify (Lektion web3-1).');
      return { veroeffentlicht: false, grund: 'nicht-verknuepft' };
    }
    if (ausgabe.code !== 0) {
      zeile('fehler', 'netlify deploy ist fehlgeschlagen.', 'Lies die Fehlermeldung von Netlify oben und behebe sie.');
      return { veroeffentlicht: false, grund: 'deploy-fehler' };
    }
  }

  const neuerZaehler = trageVeroeffentlichungEin(zaehler, jetzt, monat);
  schreibeZaehler(neuerZaehler, zaehlerPfad);
  if (anbieter === 'vercel') {
    zeile('ok', `Veröffentlicht auf Vercel. Das ist Veröffentlichung ${bisher + 1} in ${monat} (Vercel kennt keine Monatsgrenze).`);
  } else {
    zeile('ok', `Veröffentlicht. Das ist Veröffentlichung ${bisher + 1} von ${grenze} in ${monat}.`);
  }
  return { veroeffentlicht: true };
}

async function hauptlauf() {
  const argumente = process.argv.slice(2);
  const trotzdem = argumente.includes('--trotzdem');
  const trocken = argumente.includes('--trocken');

  let seite;
  try {
    seite = leseSeiteJson();
  } catch (fehler) {
    zeile('fehler', fehler.message, 'Prüfe seite.json auf gültiges JSON.');
    process.exitCode = 1;
    return;
  }

  const ergebnis = fuehreVeroeffentlichungAus({ trotzdem, trocken, seite });
  process.exitCode = ergebnis.veroeffentlicht || ergebnis.grund === 'trocken' ? 0 : 1;
}

const wirdDirektAusgefuehrt = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (wirdDirektAusgefuehrt) {
  hauptlauf();
}
