// gemeinsam.mjs
// Geteiltes Werkzeug für alle Skripte: seite.json lesen, Ausgabezeilen im
// festen Format, Monatszähler für Veröffentlichungen.
//
// Regel aus ARCHITEKTUR.md: „Nie still scheitern.“ Jedes Skript endet mit
// einer Zeile, die mit ok:, befund:, fehler: oder nichts: beginnt.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

/** Wurzel des Repos, unabhängig vom Aufrufort. */
export const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const SEITE_JSON_PFAD = resolve(WURZEL, 'seite.json');
export const ZAEHLER_PFAD = resolve(WURZEL, 'arbeit', 'veroeffentlichungen.json');
export const WAECHTER_ERGEBNIS_PFAD = resolve(WURZEL, 'arbeit', 'waechter.json');

const ARTEN = ['ok', 'befund', 'fehler', 'nichts'];

/**
 * Gibt eine Zeile im vereinbarten Format aus (ok:, befund:, fehler:, nichts:).
 * `text` ist die Meldung, `satz` (optional) ein zusätzlicher Satz fürs
 * Mitglied, beginnend mit „Sag deinem Claude: …“.
 */
export function zeile(art, text, satz) {
  if (!ARTEN.includes(art)) {
    throw new Error(`Unbekannte Zeilenart: ${art}`);
  }
  const ausgabe = satz ? `${art}: ${text} Sag deinem Claude: ${satz}` : `${art}: ${text}`;
  console.log(ausgabe);
  return ausgabe;
}

/** Liest und parst seite.json. Wirft eine lesbare Fehlermeldung, wenn ungültig. */
export function leseSeiteJson(pfad = SEITE_JSON_PFAD) {
  let roh;
  try {
    roh = readFileSync(pfad, 'utf8');
  } catch {
    throw new Error(`seite.json nicht gefunden unter ${pfad}`);
  }
  try {
    return JSON.parse(roh);
  } catch (fehler) {
    throw new Error(`seite.json ist kein gültiges JSON: ${fehler.message}`);
  }
}

/** Aktueller Monat als "YYYY-MM" in Europe/Berlin, oder für ein gegebenes Datum. */
export function aktuellerMonat(datum = new Date()) {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(datum);
  const jahr = teile.find((t) => t.type === 'year').value;
  const monat = teile.find((t) => t.type === 'month').value;
  return `${jahr}-${monat}`;
}

/** Aktuelle Zeit als ISO-String mit Europe/Berlin-Offset. */
export function jetztBerlin(datum = new Date()) {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(datum);
  const wert = (typ) => teile.find((t) => t.type === typ).value;
  // Offset ermitteln über die Differenz von UTC und Berliner Wanduhrzeit.
  const alsUtcGelesen = Date.UTC(
    Number(wert('year')),
    Number(wert('month')) - 1,
    Number(wert('day')),
    Number(wert('hour')),
    Number(wert('minute')),
    Number(wert('second')),
  );
  const offsetMinuten = Math.round((alsUtcGelesen - datum.getTime()) / 60000);
  const vorzeichen = offsetMinuten >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinuten);
  const offsetText = `${vorzeichen}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  return `${wert('year')}-${wert('month')}-${wert('day')}T${wert('hour')}:${wert('minute')}:${wert('second')}${offsetText}`;
}

/** Liest den Zähler, {} wenn Datei fehlt. */
export function leseZaehler(pfad = ZAEHLER_PFAD) {
  if (!existsSync(pfad)) return {};
  try {
    return JSON.parse(readFileSync(pfad, 'utf8'));
  } catch {
    return {};
  }
}

/** Schreibt den Zähler, legt arbeit/ bei Bedarf an. */
export function schreibeZaehler(zaehler, pfad = ZAEHLER_PFAD) {
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad, JSON.stringify(zaehler, null, 2) + '\n', 'utf8');
}

/** Anzahl Veröffentlichungen im gegebenen Monat (Standard: aktueller Monat). */
export function zaehleImMonat(zaehler, monat = aktuellerMonat()) {
  return Array.isArray(zaehler[monat]) ? zaehler[monat].length : 0;
}

/** Trägt eine Veröffentlichung zum gegebenen Zeitpunkt ein, gibt neuen Zähler zurück. */
export function trageVeroeffentlichungEin(zaehler, zeitpunkt = jetztBerlin(), monat = aktuellerMonat()) {
  const neu = { ...zaehler };
  const liste = Array.isArray(neu[monat]) ? [...neu[monat]] : [];
  liste.push(zeitpunkt);
  neu[monat] = liste;
  return neu;
}

/** Schreibt eine beliebige JSON-Datei nach arbeit/, legt den Ordner bei Bedarf an. */
export function schreibeArbeitsDatei(pfad, inhalt) {
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad, JSON.stringify(inhalt, null, 2) + '\n', 'utf8');
}

/**
 * Führt einen Befehl aus (Standard: echtes Kindprozess-execFile) und gibt
 * {code, stdout, stderr} zurück. Für Tests wird `ausfuehren` ersetzt, damit
 * kein echter Prozess startet (z. B. bei `veroeffentlichen --trocken`).
 */
export function lauf(befehl, args = [], optionen = {}, ausfuehren = echtAusfuehren) {
  return ausfuehren(befehl, args, optionen);
}

function echtAusfuehren(befehl, args, optionen) {
  return new Promise((eintragen) => {
    execFile(befehl, args, { cwd: WURZEL, ...optionen }, (fehler, stdout, stderr) => {
      eintragen({
        code: fehler ? (typeof fehler.code === 'number' ? fehler.code : 1) : 0,
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        fehler: fehler ?? null,
      });
    });
  });
}
