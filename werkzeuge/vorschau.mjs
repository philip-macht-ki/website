#!/usr/bin/env node
// vorschau.mjs: pruefen, dann eine kostenlose Netlify-Entwurfsvorschau
// (`netlify deploy --dir dist`, ohne --prod, zählt nicht gegen die
// Monatsgrenze). Gibt die Vorschauadresse aus.

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { WURZEL, leseSeiteJson, zeile } from './gemeinsam.mjs';

export function echtAusfuehren(befehl, args) {
  const ergebnis = spawnSync(befehl, args, { cwd: WURZEL, encoding: 'utf8' });
  return { code: ergebnis.status ?? 1, stdout: ergebnis.stdout ?? '', stderr: ergebnis.stderr ?? '' };
}

export function echtPruefen() {
  const ergebnis = spawnSync('node', ['werkzeuge/pruefen.mjs'], { cwd: WURZEL, encoding: 'utf8', stdio: 'inherit' });
  return ergebnis.status === 0;
}

function findeVorschauAdresse(ausgabe) {
  const text = `${ausgabe.stdout || ''}\n${ausgabe.stderr || ''}`;
  const treffer = text.match(/https:\/\/[a-zA-Z0-9.\-]*\.netlify\.app\S*/);
  return treffer ? treffer[0] : null;
}

export function fuehreVorschauAus({ seite, ausfuehren = echtAusfuehren, pruefen = echtPruefen } = {}) {
  const gruen = pruefen();
  if (!gruen) {
    zeile('fehler', 'npm run pruefen hat Befunde gemeldet.', 'Behebe die Befunde oben, bevor du eine Vorschau baust.');
    return { erfolgreich: false };
  }
  if (!existsSync(`${WURZEL}/dist`)) {
    zeile('fehler', 'dist/ fehlt.', 'Führe npm run build aus.');
    return { erfolgreich: false };
  }
  const netlifySite = seite?.veroeffentlichen?.netlify_site;
  const args = ['netlify', 'deploy', '--dir', 'dist'];
  if (netlifySite) args.push('--site', netlifySite);
  const ausgabe = ausfuehren('npx', args);
  const text = `${ausgabe.stdout || ''}${ausgabe.stderr || ''}`.toLowerCase();
  if (text.includes('not linked') || text.includes('not logged in') || text.includes('please run `netlify link`')) {
    zeile('fehler', 'Diese Seite ist noch nicht mit Netlify verknüpft oder nicht eingeloggt.', 'Verbinde die Seite mit Netlify (Lektion web3-1).');
    return { erfolgreich: false };
  }
  if (ausgabe.code !== 0) {
    zeile('fehler', 'netlify deploy ist fehlgeschlagen.', 'Lies die Fehlermeldung von Netlify oben und behebe sie.');
    return { erfolgreich: false };
  }
  const adresse = findeVorschauAdresse(ausgabe);
  if (adresse) {
    zeile('ok', `Vorschau bereit: ${adresse}`);
  } else {
    zeile('ok', 'Vorschau erzeugt, siehe Ausgabe von netlify oben für die Adresse.');
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
  const ergebnis = fuehreVorschauAus({ seite });
  process.exitCode = ergebnis.erfolgreich ? 0 : 1;
}

const wirdDirektAusgefuehrt = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (wirdDirektAusgefuehrt) {
  hauptlauf();
}
