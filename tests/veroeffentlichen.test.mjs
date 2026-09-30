import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fuehreVeroeffentlichungAus } from '../werkzeuge/veroeffentlichen.mjs';
import { WURZEL, leseZaehler } from '../werkzeuge/gemeinsam.mjs';

function tempZaehlerPfad() {
  const ordner = mkdtempSync(join(tmpdir(), 'veroeffentlichen-'));
  return { ordner, pfad: join(ordner, 'veroeffentlichungen.json') };
}

// dist/ muss existieren, damit die Prüfung vor dem Netlify-Aufruf nicht
// vorher schon abbricht. Wir nutzen das echte dist/ des Projekts, falls
// vorhanden, sonst legen wir eins zum Testen selbst an und räumen es auf.
function mitDistOrdner(fn) {
  const distPfad = join(WURZEL, 'dist');
  const bestandVorher = existsSync(distPfad);
  if (!bestandVorher) mkdirSync(distPfad, { recursive: true });
  try {
    fn();
  } finally {
    if (!bestandVorher) rmSync(distPfad, { recursive: true, force: true });
  }
}

test('veroeffentlichen: bei erreichter Grenze wird abgebrochen, netlify nicht aufgerufen', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  let aufgerufen = false;
  try {
    const seite = { veroeffentlichen: { grenze_monat: 2 } };
    writeFileSync(pfad, JSON.stringify({ '2026-10': ['a', 'b'] }), 'utf8');
    const ergebnis = fuehreVeroeffentlichungAus({
      seite,
      zaehlerPfad: pfad,
      monat: '2026-10',
      ausfuehren: () => {
        aufgerufen = true;
        return { code: 0, stdout: '', stderr: '' };
      },
      pruefen: () => true,
    });
    assert.equal(ergebnis.veroeffentlicht, false);
    assert.equal(ergebnis.grund, 'grenze');
    assert.equal(aufgerufen, false);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('veroeffentlichen: --trotzdem überschreibt die Grenze', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  writeFileSync(pfad, JSON.stringify({ '2026-10': ['a', 'b'] }), 'utf8');
  try {
    mitDistOrdner(() => {
      let aufgerufen = false;
      const seite = { veroeffentlichen: { grenze_monat: 2 } };
      const ergebnis = fuehreVeroeffentlichungAus({
        trotzdem: true,
        seite,
        zaehlerPfad: pfad,
        monat: '2026-10',
        jetzt: '2026-10-05T10:00:00+02:00',
        ausfuehren: () => {
          aufgerufen = true;
          return { code: 0, stdout: 'Deploy is live', stderr: '' };
        },
        pruefen: () => true,
      });
      assert.equal(ergebnis.veroeffentlicht, true);
      assert.equal(aufgerufen, true);
    });
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('veroeffentlichen: --trocken ruft netlify nie auf', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  let aufgerufen = false;
  try {
    const seite = { veroeffentlichen: { grenze_monat: 8 } };
    const ergebnis = fuehreVeroeffentlichungAus({
      trocken: true,
      seite,
      zaehlerPfad: pfad,
      monat: '2026-10',
      ausfuehren: () => {
        aufgerufen = true;
        return { code: 0, stdout: '', stderr: '' };
      },
      pruefen: () => {
        throw new Error('pruefen hätte bei --trocken nicht aufgerufen werden dürfen');
      },
    });
    assert.equal(ergebnis.veroeffentlicht, false);
    assert.equal(ergebnis.grund, 'trocken');
    assert.equal(aufgerufen, false);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('veroeffentlichen: erfolgreicher Lauf erhöht den Zähler um eins', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  try {
    mitDistOrdner(() => {
      const seite = { veroeffentlichen: { grenze_monat: 8 } };
      const ergebnis = fuehreVeroeffentlichungAus({
        seite,
        zaehlerPfad: pfad,
        monat: '2026-10',
        jetzt: '2026-10-05T10:00:00+02:00',
        ausfuehren: () => ({ code: 0, stdout: 'Deploy is live', stderr: '' }),
        pruefen: () => true,
      });
      assert.equal(ergebnis.veroeffentlicht, true);
      const zaehler = leseZaehler(pfad);
      assert.equal(zaehler['2026-10'].length, 1);
    });
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('veroeffentlichen: nicht verknüpfte Seite meldet den passenden Satz', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  try {
    mitDistOrdner(() => {
      const seite = { veroeffentlichen: { grenze_monat: 8 } };
      const ergebnis = fuehreVeroeffentlichungAus({
        seite,
        zaehlerPfad: pfad,
        monat: '2026-10',
        ausfuehren: () => ({ code: 1, stdout: '', stderr: 'Error: Not Linked. Run `netlify link`' }),
        pruefen: () => true,
      });
      assert.equal(ergebnis.veroeffentlicht, false);
      assert.equal(ergebnis.grund, 'nicht-verknuepft');
    });
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('veroeffentlichen (Vercel): --trocken ruft vercel nie auf, auch über einer Netlify-typischen Grenze', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  let aufgerufen = false;
  try {
    const seite = { hosting: { anbieter: 'vercel' }, veroeffentlichen: { grenze_monat: 2 } };
    writeFileSync(pfad, JSON.stringify({ '2026-10': ['a', 'b', 'c'] }), 'utf8');
    const ergebnis = fuehreVeroeffentlichungAus({
      trocken: true,
      seite,
      zaehlerPfad: pfad,
      monat: '2026-10',
      ausfuehren: () => {
        aufgerufen = true;
        return { code: 0, stdout: '', stderr: '' };
      },
      pruefen: () => {
        throw new Error('pruefen hätte bei --trocken nicht aufgerufen werden dürfen');
      },
    });
    assert.equal(ergebnis.veroeffentlicht, false);
    assert.equal(ergebnis.grund, 'trocken');
    assert.equal(aufgerufen, false);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('veroeffentlichen (Vercel): die Monatsgrenze sperrt nicht, es wird vercel deploy --prod aufgerufen', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  writeFileSync(pfad, JSON.stringify({ '2026-10': Array(20).fill('x') }), 'utf8');
  try {
    mitDistOrdner(() => {
      let erhalteneArgs;
      const seite = { hosting: { anbieter: 'vercel' }, veroeffentlichen: { grenze_monat: 2 } };
      const ergebnis = fuehreVeroeffentlichungAus({
        seite,
        zaehlerPfad: pfad,
        monat: '2026-10',
        jetzt: '2026-10-05T10:00:00+02:00',
        ausfuehren: (befehl, args) => {
          erhalteneArgs = args;
          return { code: 0, stdout: 'Production: https://studio-beispiel.vercel.app', stderr: '' };
        },
        pruefen: () => true,
      });
      assert.equal(ergebnis.veroeffentlicht, true);
      assert.ok(erhalteneArgs.includes('vercel'));
      assert.ok(erhalteneArgs.includes('--prod'));
      const zaehler = leseZaehler(pfad);
      assert.equal(zaehler['2026-10'].length, 21);
    });
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('veroeffentlichen (Vercel): nicht eingeloggt meldet den passenden Satz', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  try {
    mitDistOrdner(() => {
      const seite = { hosting: { anbieter: 'vercel' }, veroeffentlichen: { grenze_monat: 8 } };
      const ergebnis = fuehreVeroeffentlichungAus({
        seite,
        zaehlerPfad: pfad,
        monat: '2026-10',
        ausfuehren: () => ({ code: 1, stdout: '', stderr: 'Error: No existing credentials found. Please run `vercel login`' }),
        pruefen: () => true,
      });
      assert.equal(ergebnis.veroeffentlicht, false);
      assert.equal(ergebnis.grund, 'nicht-verknuepft');
    });
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('veroeffentlichen: rotes pruefen bricht ohne Netlify-Aufruf ab', () => {
  const { ordner, pfad } = tempZaehlerPfad();
  let aufgerufen = false;
  try {
    const seite = { veroeffentlichen: { grenze_monat: 8 } };
    const ergebnis = fuehreVeroeffentlichungAus({
      seite,
      zaehlerPfad: pfad,
      monat: '2026-10',
      ausfuehren: () => {
        aufgerufen = true;
        return { code: 0, stdout: '', stderr: '' };
      },
      pruefen: () => false,
    });
    assert.equal(ergebnis.veroeffentlicht, false);
    assert.equal(ergebnis.grund, 'pruefen');
    assert.equal(aufgerufen, false);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('vorschau: --trocken ruft weder Prüfung noch Kommandozeile auf (Vercel und Netlify)', async () => {
  const { fuehreVorschauAus } = await import('../werkzeuge/vorschau.mjs');
  for (const anbieter of ['vercel', 'netlify']) {
    let aufgerufen = false;
    const ergebnis = fuehreVorschauAus({
      seite: { hosting: { anbieter }, veroeffentlichen: {} },
      trocken: true,
      ausfuehren: () => { aufgerufen = true; return { code: 0, stdout: '', stderr: '' }; },
      pruefen: () => { aufgerufen = true; return true; },
    });
    assert.equal(aufgerufen, false);
    assert.equal(ergebnis.grund, 'trocken');
  }
});
