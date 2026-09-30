#!/usr/bin/env node
// rechtstexte.mjs: erzeugt inhalt/impressum.md und inhalt/datenschutz.md aus
// seite.json und den Bausteinen der eingeschalteten Dienste in
// vorlagen/datenschutz/. Muster, keine Rechtsberatung.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WURZEL, leseSeiteJson, zeile } from './gemeinsam.mjs';

export const VORLAGEN_DIR = join(WURZEL, 'vorlagen', 'datenschutz');
export const INHALT_DIR = join(WURZEL, 'inhalt');

const KOPFHINWEIS = `<!--
  Muster, keine Rechtsberatung. Von deinem Claude aus seite.json erzeugt.
  Lass diesen Text gegenprüfen, zum Beispiel mit dem kostenlosen
  Impressum-Generator von eRecht24 oder einer Anwältin/einem Anwalt.
-->`;

function fuelleVorlage(text, werte) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (treffer, name) => {
    return Object.prototype.hasOwnProperty.call(werte, name) ? werte[name] : treffer;
  });
}

function leseBaustein(name, werte) {
  const pfad = join(VORLAGEN_DIR, `${name}.md`);
  const roh = readFileSync(pfad, 'utf8');
  return fuelleVorlage(roh, werte).trim();
}

function frontmatter(titel, beschreibung) {
  const kurzeBeschreibung = beschreibung.length > 155 ? beschreibung.slice(0, 155) : beschreibung;
  return `---\ntitel: "${titel}"\nbeschreibung: "${kurzeBeschreibung.replace(/"/g, '\\"')}"\n---\n`;
}

/** Baut das Impressum nach § 5 DDG. Gibt {text, fehler} zurück. */
export function baueImpressum(seite) {
  const fehler = [];
  const name = seite.inhaber || seite.name;
  if (!name) fehler.push('Name/Inhaber fehlt in seite.json (Feld "inhaber" oder "name").');
  const adresse = seite.adresse || {};
  if (!adresse.strasse) fehler.push('Straße fehlt in seite.json.adresse.strasse.');
  if (!adresse.plz) fehler.push('PLZ fehlt in seite.json.adresse.plz.');
  if (!adresse.ort) fehler.push('Ort fehlt in seite.json.adresse.ort.');
  if (!seite.email) fehler.push('E-Mail fehlt in seite.json.email.');

  const zeilen = [];
  zeilen.push(`## Angaben gemäß § 5 DDG`);
  zeilen.push('');
  zeilen.push(name || '[Name fehlt]');
  if (seite.rechtsform) zeilen.push(seite.rechtsform);
  zeilen.push(adresse.strasse || '[Straße fehlt]');
  zeilen.push(`${adresse.plz || '[PLZ fehlt]'} ${adresse.ort || '[Ort fehlt]'}`);
  if (adresse.land) zeilen.push(adresse.land);
  zeilen.push('');
  zeilen.push('## Kontakt');
  zeilen.push('');
  zeilen.push(`E-Mail: ${seite.email || '[E-Mail fehlt]'}`);
  if (seite.telefon) zeilen.push(`Telefon: ${seite.telefon}`);
  if (seite.ust_id) {
    zeilen.push('');
    zeilen.push('## Umsatzsteuer-Identifikationsnummer');
    zeilen.push('');
    zeilen.push(`Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: ${seite.ust_id}`);
  }

  const body = zeilen.join('\n');
  const text = `${frontmatter('Impressum', `Impressum von ${name || seite.name}.`)}\n${KOPFHINWEIS}\n\n${body}\n`;
  return { text, fehler };
}

/** Baut die Datenschutzerklärung aus den Bausteinen der eingeschalteten Dienste. */
export function baueDatenschutz(seite) {
  const werte = {
    inhaber: seite.inhaber || seite.name || '',
    name: seite.name || '',
    strasse: seite.adresse?.strasse || '',
    plz: seite.adresse?.plz || '',
    ort: seite.adresse?.ort || '',
    land: seite.adresse?.land || '',
    email: seite.email || '',
    telefon_zeile: seite.telefon ? `\nTelefon: ${seite.telefon}` : '',
    newsletter_titel: seite.newsletter?.titel || '',
  };

  const bausteine = ['verantwortlicher', 'grundsaetze-und-rechte', 'hosting-netlify'];
  if (seite.kontakt?.an) bausteine.push('kontaktformular-netlify');
  if (seite.newsletter?.an) {
    if (seite.newsletter.anbieter === 'brevo') bausteine.push('newsletter-brevo');
    else if (seite.newsletter.anbieter === 'mailerlite') bausteine.push('newsletter-mailerlite');
  }
  if (seite.termin?.an) {
    if (seite.termin.anbieter === 'google') bausteine.push('termin-google');
    else if (seite.termin.anbieter === 'calcom') bausteine.push('termin-calcom');
  }
  bausteine.push('schriften-lokal', 'keine-cookies', 'aenderungen');

  const teile = bausteine.map((name) => leseBaustein(name, werte));
  const body = teile.join('\n\n');
  const text = `${frontmatter('Datenschutzerklärung', `Datenschutzerklärung von ${seite.name || seite.inhaber}.`)}\n${KOPFHINWEIS}\n\n${body}\n`;
  return { text };
}

export function schreibeRechtstexte(seite, inhaltDir = INHALT_DIR) {
  mkdirSync(inhaltDir, { recursive: true });
  const impressum = baueImpressum(seite);
  const datenschutz = baueDatenschutz(seite);
  writeFileSync(join(inhaltDir, 'impressum.md'), impressum.text, 'utf8');
  writeFileSync(join(inhaltDir, 'datenschutz.md'), datenschutz.text, 'utf8');
  return { impressum, datenschutz };
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

  const { impressum, datenschutz } = schreibeRechtstexte(seite);

  if (impressum.fehler.length > 0) {
    for (const f of impressum.fehler) {
      zeile('fehler', f, 'Trag die fehlende Pflichtangabe in seite.json ein und führe npm run rechtstexte erneut aus.');
    }
    process.exitCode = 1;
    return;
  }

  zeile('ok', 'inhalt/impressum.md und inhalt/datenschutz.md erzeugt.');
}

const wirdDirektAusgefuehrt = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (wirdDirektAusgefuehrt) {
  hauptlauf();
}
