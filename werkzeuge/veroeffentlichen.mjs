#!/usr/bin/env node
// veroeffentlichen.mjs: prüft, zählt, veröffentlicht auf Netlify (kostet Credits).
//
// Ablauf: pruefen → Zähler gegen Grenze aus seite.json → bei Grenze Abbruch
// (außer --trotzdem) → `netlify deploy --prod --dir dist` → bei Erfolg
// Zähler + 1. `--trocken` zeigt nur, was passieren würde, ruft nie netlify auf.

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
  const grenze = seite?.veroeffentlichen?.grenze_monat ?? Infinity;
  const zaehler = leseZaehler(zaehlerPfad);
  const bisher = zaehleImMonat(zaehler, monat);

  if (bisher >= grenze && !trotzdem) {
    zeile(
      'befund',
      `Monatsgrenze erreicht: ${bisher} von ${grenze} Veröffentlichungen in ${monat}.`,
      'Warte bis zum Monatswechsel oder geh bei Netlify auf einen bezahlten Tarif, und sag Bescheid, wenn du trotzdem veröffentlichen willst (--trotzdem).',
    );
    return { veroeffentlicht: false, grund: 'grenze' };
  }

  if (trocken) {
    zeile(
      'nichts',
      `Trockenlauf: würde jetzt veröffentlichen (Stand ${bisher} von ${grenze} in ${monat}), Netlify wird nicht aufgerufen.`,
    );
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

  const netlifySite = seite?.veroeffentlichen?.netlify_site;
  const args = ['netlify', 'deploy', '--prod', '--dir', 'dist'];
  if (netlifySite) args.push('--site', netlifySite);

  const ausgabe = ausfuehren('npx', args);

  if (erkenneNichtVerknuepft(ausgabe)) {
    zeile('fehler', 'Diese Seite ist noch nicht mit Netlify verknüpft oder nicht eingeloggt.', 'Verbinde die Seite mit Netlify (Lektion web3-1).');
    return { veroeffentlicht: false, grund: 'nicht-verknuepft' };
  }

  if (ausgabe.code !== 0) {
    zeile('fehler', 'netlify deploy ist fehlgeschlagen.', 'Lies die Fehlermeldung von Netlify oben und behebe sie.');
    return { veroeffentlicht: false, grund: 'deploy-fehler' };
  }

  const neuerZaehler = trageVeroeffentlichungEin(zaehler, jetzt, monat);
  schreibeZaehler(neuerZaehler, zaehlerPfad);
  zeile('ok', `Veröffentlicht. Das ist Veröffentlichung ${bisher + 1} von ${grenze} in ${monat}.`);
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
