import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fuehreWaechterAus } from '../werkzeuge/waechter.mjs';

function seite(zusatz = {}) {
  return {
    domain: 'studio-beispiel.example',
    veroeffentlichen: { grenze_monat: 8 },
    waechter: { mitteilung: true },
    ...zusatz,
  };
}

function alleGut() {
  return {
    fetchFn: async (adresse) => {
      const url = adresse.toString();
      if (url.includes('/.netlify/functions/newsletter')) {
        return new Response('Method Not Allowed', { status: 405 });
      }
      if (url.endsWith('/kontakt') || url.endsWith('/kontakt/')) {
        return new Response('<form name="kontakt"></form>', { status: 200 });
      }
      if (url.endsWith('/newsletter') || url.endsWith('/newsletter/')) {
        return new Response('<form action="/.netlify/functions/newsletter"></form>', { status: 200 });
      }
      return new Response('<html>Start</html>', { status: 200 });
    },
    zertifikatsPruefung: async () => ({ tageBisAblauf: 60, ablauf: '2027-01-01T00:00:00Z' }),
    mitteilung: async () => {},
  };
}

function tempZaehlerPfad() {
  const ordner = mkdtempSync(join(tmpdir(), 'waechter-'));
  return { ordner, pfad: join(ordner, 'veroeffentlichungen.json') };
}

test('waechter: alles unauffällig ergibt ok ohne Mitteilung', async () => {
  const { ordner, pfad } = tempZaehlerPfad();
  const { ordner: erg, pfad: ergebnisPfad } = { ordner: mkdtempSync(join(tmpdir(), 'waechter-ergebnis-')), pfad: '' };
  const ergebnisDatei = join(erg, 'waechter.json');
  let mitteilungGerufen = false;
  try {
    const werkzeuge = alleGut();
    const ergebnis = await fuehreWaechterAus({
      seite: seite(),
      ...werkzeuge,
      mitteilung: async () => {
        mitteilungGerufen = true;
      },
      zaehlerPfad: pfad,
      ergebnisPfad: ergebnisDatei,
    });
    assert.equal(ergebnis.ok, true);
    assert.deepEqual(ergebnis.befunde, []);
    assert.equal(mitteilungGerufen, false);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
    rmSync(erg, { recursive: true, force: true });
  }
});

test('waechter: Startseite mit Fehlerstatus wird als Befund gemeldet und löst eine Mitteilung aus', async () => {
  const { ordner, pfad } = tempZaehlerPfad();
  const erg = mkdtempSync(join(tmpdir(), 'waechter-ergebnis-'));
  const ergebnisDatei = join(erg, 'waechter.json');
  let mitteilungGerufen = false;
  try {
    const werkzeuge = alleGut();
    const fetchFn = async (adresse) => {
      const url = adresse.toString();
      if (url === 'https://studio-beispiel.example/') {
        return new Response('Fehler', { status: 500 });
      }
      return werkzeuge.fetchFn(adresse);
    };
    const ergebnis = await fuehreWaechterAus({
      seite: seite(),
      fetchFn,
      zertifikatsPruefung: werkzeuge.zertifikatsPruefung,
      mitteilung: async () => {
        mitteilungGerufen = true;
      },
      zaehlerPfad: pfad,
      ergebnisPfad: ergebnisDatei,
    });
    assert.equal(ergebnis.ok, false);
    assert.ok(ergebnis.befunde.some((b) => b.includes('Startseite')));
    assert.equal(mitteilungGerufen, true);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
    rmSync(erg, { recursive: true, force: true });
  }
});

test('waechter: bald ablaufendes Zertifikat wird gemeldet', async () => {
  const { ordner, pfad } = tempZaehlerPfad();
  const erg = mkdtempSync(join(tmpdir(), 'waechter-ergebnis-'));
  const ergebnisDatei = join(erg, 'waechter.json');
  try {
    const werkzeuge = alleGut();
    const ergebnis = await fuehreWaechterAus({
      seite: seite(),
      fetchFn: werkzeuge.fetchFn,
      zertifikatsPruefung: async () => ({ tageBisAblauf: 5, ablauf: '2026-10-05T00:00:00Z' }),
      mitteilung: async () => {},
      zaehlerPfad: pfad,
      ergebnisPfad: ergebnisDatei,
    });
    assert.equal(ergebnis.ok, false);
    assert.ok(ergebnis.befunde.some((b) => b.includes('Zertifikat')));
  } finally {
    rmSync(ordner, { recursive: true, force: true });
    rmSync(erg, { recursive: true, force: true });
  }
});

test('waechter: Zähler an der Grenze wird gemeldet', async () => {
  const { ordner, pfad } = tempZaehlerPfad();
  writeFileSync(pfad, JSON.stringify({ [aktuellerMonatFuerTest()]: Array(8).fill('x') }), 'utf8');
  const erg = mkdtempSync(join(tmpdir(), 'waechter-ergebnis-'));
  const ergebnisDatei = join(erg, 'waechter.json');
  try {
    const werkzeuge = alleGut();
    const ergebnis = await fuehreWaechterAus({
      seite: seite(),
      ...werkzeuge,
      mitteilung: async () => {},
      zaehlerPfad: pfad,
      ergebnisPfad: ergebnisDatei,
    });
    assert.equal(ergebnis.ok, false);
    assert.ok(ergebnis.befunde.some((b) => b.includes('Zähler')));
  } finally {
    rmSync(ordner, { recursive: true, force: true });
    rmSync(erg, { recursive: true, force: true });
  }
});

function aktuellerMonatFuerTest() {
  const teile = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${teile.find((t) => t.type === 'year').value}-${teile.find((t) => t.type === 'month').value}`;
}
