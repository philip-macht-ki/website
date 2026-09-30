#!/usr/bin/env node
// vorschau.mjs: pruefen, dann eine kostenlose Entwurfsvorschau. Standard ist
// Vercel (`vercel deploy`, ohne --prod), die günstigere Variante ist Netlify
// (`netlify deploy --dir dist`, ohne --prod, zählt nicht gegen die
// Monatsgrenze). Gibt die Vorschauadresse aus. Welcher Weg gilt, steht in
// seite.json.hosting.anbieter.

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { WURZEL, leseSeiteJson, zeile, hostingAnbieter } from './gemeinsam.mjs';

export function echtAusfuehren(befehl, args) {
  const ergebnis = spawnSync(befehl, args, { cwd: WURZEL, encoding: 'utf8' });
  return { code: ergebnis.status ?? 1, stdout: ergebnis.stdout ?? '', stderr: ergebnis.stderr ?? '' };
}

export function echtPruefen() {
  const ergebnis = spawnSync('node', ['werkzeuge/pruefen.mjs'], { cwd: WURZEL, encoding: 'utf8', stdio: 'inherit' });
  return ergebnis.status === 0;
}

function findeVorschauAdresse(ausgabe, anbieter) {
  const text = `${ausgabe.stdout || ''}\n${ausgabe.stderr || ''}`;
  const muster = anbieter === 'vercel' ? /https:\/\/[a-zA-Z0-9.\-]*\.vercel\.app\S*/ : /https:\/\/[a-zA-Z0-9.\-]*\.netlify\.app\S*/;
  const treffer = text.match(muster);
  return treffer ? treffer[0] : null;
}

function nichtVerknuepftVercel(text) {
  return text.includes('vercel login') || text.includes('no existing credentials') || text.includes('not authorized') || text.includes('please authenticate') || text.includes('not logged in');
}

export function fuehreVorschauAus({ seite, ausfuehren = echtAusfuehren, pruefen = echtPruefen, trocken = false } = {}) {
  const anbieter = hostingAnbieter(seite);
  if (trocken) {
    // Nie die Kommandozeile aufrufen: sie kann mit einem echten Konto verbunden sein.
    zeile('nichts', `Trockenlauf: würde jetzt eine Vorschau auf ${anbieter === 'vercel' ? 'Vercel' : 'Netlify'} anlegen, die Kommandozeile wird nicht aufgerufen.`);
    return { erfolgreich: false, grund: 'trocken' };
  }
  const gruen = pruefen();
  if (!gruen) {
    zeile('fehler', 'npm run pruefen hat Befunde gemeldet.', 'Behebe die Befunde oben, bevor du eine Vorschau baust.');
    return { erfolgreich: false };
  }
  if (!existsSync(`${WURZEL}/dist`)) {
    zeile('fehler', 'dist/ fehlt.', 'Führe npm run build aus.');
    return { erfolgreich: false };
  }

  let ausgabe;
  if (anbieter === 'vercel') {
    const projekt = seite?.veroeffentlichen?.vercel_projekt;
    const args = ['vercel', 'deploy', '--yes'];
    if (projekt) args.push('--name', projekt);
    ausgabe = ausfuehren('npx', args);
    const text = `${ausgabe.stdout || ''}${ausgabe.stderr || ''}`.toLowerCase();
    if (nichtVerknuepftVercel(text)) {
      zeile('fehler', 'Diese Seite ist noch nicht mit Vercel verknüpft oder nicht eingeloggt.', 'Führe npx vercel login und danach npx vercel link aus (Teil 5 in einrichten.md).');
      return { erfolgreich: false };
    }
    if (ausgabe.code !== 0) {
      zeile('fehler', 'vercel deploy ist fehlgeschlagen.', 'Lies die Fehlermeldung von Vercel oben und behebe sie.');
      return { erfolgreich: false };
    }
  } else {
    const netlifySite = seite?.veroeffentlichen?.netlify_site;
    const args = ['netlify', 'deploy', '--dir', 'dist'];
    if (netlifySite) args.push('--site', netlifySite);
    ausgabe = ausfuehren('npx', args);
    const text = `${ausgabe.stdout || ''}${ausgabe.stderr || ''}`.toLowerCase();
    if (text.includes('not linked') || text.includes('not logged in') || text.includes('please run `netlify link`')) {
      zeile('fehler', 'Diese Seite ist noch nicht mit Netlify verknüpft oder nicht eingeloggt.', 'Verbinde die Seite mit Netlify (Lektion web3-1).');
      return { erfolgreich: false };
    }
    if (ausgabe.code !== 0) {
      zeile('fehler', 'netlify deploy ist fehlgeschlagen.', 'Lies die Fehlermeldung von Netlify oben und behebe sie.');
      return { erfolgreich: false };
    }
  }

  const adresse = findeVorschauAdresse(ausgabe, anbieter);
  if (adresse) {
    zeile('ok', `Vorschau bereit: ${adresse}`);
  } else {
    zeile('ok', `Vorschau erzeugt, siehe Ausgabe von ${anbieter === 'vercel' ? 'vercel' : 'netlify'} oben für die Adresse.`);
  }
  return { erfolgreich: true, adresse };
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
  const ergebnis = fuehreVorschauAus({ seite, trocken: process.argv.includes('--trocken') });
  process.exitCode = ergebnis.erfolgreich || ergebnis.grund === 'trocken' ? 0 : 1;
}

const wirdDirektAusgefuehrt = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (wirdDirektAusgefuehrt) {
  hauptlauf();
}
