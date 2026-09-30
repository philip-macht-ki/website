import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  pruefeGedankenstriche,
  pruefeAbschnittsnummern,
  pruefeEckenradien,
  pruefeAkzentfarben,
  pruefeExterneRessourcen,
  pruefeBilder,
  pruefePlatzhalter,
  pruefeAbschnittsarten,
  pruefeFloskeln,
  pruefeRechtstexte,
  pruefeInterneLinks,
  pruefeFormulare,
} from '../werkzeuge/pruefen.mjs';

const HIER = fileURLToPath(new URL('.', import.meta.url));
const F = (...teile) => join(HIER, 'fixtures', 'pruefen', ...teile);

test('1. Gedankenstrich: gut ist sauber, schlecht wird gemeldet', () => {
  assert.equal(pruefeGedankenstriche([F('gedankenstriche', 'gut', 'inhalt')]).length, 0);
  assert.equal(pruefeGedankenstriche([F('gedankenstriche', 'schlecht', 'inhalt')]).length, 1);
});

test('2. Abschnittsnummern: gut ist sauber, schlecht wird gemeldet', () => {
  assert.equal(pruefeAbschnittsnummern([F('abschnittsnummern', 'gut', 'inhalt')]).length, 0);
  assert.equal(pruefeAbschnittsnummern([F('abschnittsnummern', 'schlecht', 'inhalt')]).length, 1);
});

test('3. Eckenradien: ein Wert ist ok, mehrere werden gemeldet', () => {
  assert.equal(pruefeEckenradien([F('eckenradien', 'gut', 'src', 'styles', 'a.css')]).length, 0);
  assert.ok(pruefeEckenradien([F('eckenradien', 'schlecht', 'src', 'styles', 'a.css')]).length > 0);
});

test('4. Akzentfarben: Token-Farbe ist ok, fremde Hex-Farbe wird gemeldet', () => {
  assert.equal(
    pruefeAkzentfarben(
      [F('akzentfarben', 'gut', 'src', 'styles', 'andere.css')],
      F('akzentfarben', 'gut', 'src', 'styles', 'grund.css'),
    ).length,
    0,
  );
  assert.ok(
    pruefeAkzentfarben(
      [F('akzentfarben', 'schlecht', 'src', 'styles', 'andere.css')],
      F('akzentfarben', 'schlecht', 'src', 'styles', 'grund.css'),
    ).length > 0,
  );
});

test('5. Externe Ressourcen: lokal ist ok, Google Fonts wird gemeldet', () => {
  assert.equal(pruefeExterneRessourcen(F('externe-ressourcen', 'gut', 'dist')).length, 0);
  assert.ok(pruefeExterneRessourcen(F('externe-ressourcen', 'schlecht', 'dist')).length > 0);
});

test('6. Bilder: kleines Bild mit alt ist ok, großes Bild ohne alt wird gemeldet', () => {
  assert.equal(
    pruefeBilder(F('bilder', 'gut', 'public', 'bilder'), F('bilder', 'gut', 'dist')).length,
    0,
  );
  const befunde = pruefeBilder(F('bilder', 'schlecht', 'public', 'bilder'), F('bilder', 'schlecht', 'dist'));
  assert.ok(befunde.some((b) => b.meldung.includes('KB groß')));
  assert.ok(befunde.some((b) => b.meldung.includes('ohne alt-Text')));
});

test('7. Platzhalter: echter Text ist ok, TODO wird gemeldet', () => {
  const seite = { name: 'Firma X' };
  assert.equal(pruefePlatzhalter(seite, [F('platzhalter', 'gut', 'inhalt')]).length, 0);
  assert.ok(pruefePlatzhalter(seite, [F('platzhalter', 'schlecht', 'inhalt')]).length > 0);
});

test('7b. Platzhalter: "Beispiel GmbH" ist beim Musterbetrieb erlaubt', () => {
  const musterbetrieb = { name: 'Studio Beispiel' };
  const befunde = pruefePlatzhalter(musterbetrieb, [F('rechtstexte', 'gut', 'inhalt')]);
  assert.ok(!befunde.some((b) => b.meldung.includes('Beispiel GmbH')));
});

test('8. Abschnittsarten: Wechsel ist ok, drei gleiche hintereinander werden gemeldet', () => {
  assert.equal(pruefeAbschnittsarten(F('abschnittsarten', 'gut', 'inhalt')).length, 0);
  assert.ok(pruefeAbschnittsarten(F('abschnittsarten', 'schlecht', 'inhalt')).length > 0);
});

test('9. Floskeln: klarer Text ist ok, Floskel wird gemeldet', () => {
  assert.equal(pruefeFloskeln(F('floskeln', 'gut', 'inhalt')).length, 0);
  assert.ok(pruefeFloskeln(F('floskeln', 'schlecht', 'inhalt')).length > 0);
});

test('9b. Floskeln: "nicht nur … sondern auch" wird über die ganze Wendung erkannt', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const ordner = mkdtempSync(join(tmpdir(), 'floskel-'));
  writeFileSync(join(ordner, 'a.md'), 'Wir gestalten nicht nur Logos, sondern auch Flyer.\n');
  writeFileSync(join(ordner, 'b.md'), 'Wir gestalten Logos und Flyer.\n');
  const befunde = pruefeFloskeln(ordner, []);
  assert.equal(befunde.length, 1);
  assert.match(befunde[0].datei, /a\.md$/);
});

test('10. Rechtstexte: vollständig ist ok, TMG und Leere werden gemeldet', () => {
  const seite = {
    inhaber: 'Mara Beispiel',
    name: 'Studio Beispiel',
    email: 'hallo@studio-beispiel.example',
    adresse: { strasse: 'Beispielweg 1', plz: '12345', ort: 'Musterstadt' },
  };
  assert.equal(pruefeRechtstexte(F('rechtstexte', 'gut', 'inhalt'), seite).length, 0);
  const befunde = pruefeRechtstexte(F('rechtstexte', 'schlecht', 'inhalt'), seite);
  assert.ok(befunde.some((b) => b.meldung.includes('TMG')));
  assert.ok(befunde.some((b) => b.meldung.includes('leer')));
});

test('11. Interne Links: vorhandene Seite ist ok, fehlende wird gemeldet', () => {
  assert.equal(pruefeInterneLinks(F('interne-links', 'gut', 'dist')).length, 0);
  assert.ok(pruefeInterneLinks(F('interne-links', 'schlecht', 'dist')).length > 0);
});

test('12. Formulare: vollständig ist ok, fehlendes data-netlify wird gemeldet', () => {
  assert.equal(pruefeFormulare(F('formulare', 'gut', 'dist')).length, 0);
  assert.ok(pruefeFormulare(F('formulare', 'schlecht', 'dist')).length > 0);
});

test('12. Formulare (Vercel): action /api/kontakt mit Honeypot und Zeitfeld ist ok, fehlendes Zeitfeld wird gemeldet', () => {
  const seite = { hosting: { anbieter: 'vercel' } };
  assert.equal(pruefeFormulare(F('formulare', 'vercel-gut', 'dist'), seite).length, 0);
  const befunde = pruefeFormulare(F('formulare', 'vercel-schlecht', 'dist'), seite);
  assert.ok(befunde.length > 0);
  assert.ok(befunde.some((b) => b.meldung.includes('/api/kontakt')));
  assert.ok(befunde.some((b) => b.meldung.includes('formular_geladen')));
});

test('12. Formulare: ohne seite (Standard) verhält sich wie Netlify', () => {
  assert.equal(pruefeFormulare(F('formulare', 'gut', 'dist'), undefined).length, 0);
  assert.equal(pruefeFormulare(F('formulare', 'vercel-gut', 'dist'), undefined).length > 0, true);
});

test('3. Eckenradien: auch <style> in .astro, ohne Semikolon, und calc() neben var(--radius)', () => {
  const D = (n) => F('eckenradien', 'astro', n);
  const befunde = pruefeEckenradien([D('grund.css'), D('Karte.astro')]);
  assert.equal(befunde.length, 1);
  assert.match(befunde[0].meldung, /14px/);
  assert.equal(befunde[0].zeile, 6);
});

test('4. Akzentfarben: fremde Farbe im <style> einer .astro-Datei, nicht im Skriptteil', () => {
  const D = (n) => F('eckenradien', 'astro', n);
  const befunde = pruefeAkzentfarben([D('Karte.astro')], D('grund.css'));
  assert.equal(befunde.length, 1);
  assert.match(befunde[0].meldung, /7c3aed/);
});


test('1. Gedankenstriche: langer Strich auch ohne Leerzeichen, Bis-Strich ohne Leerzeichen erlaubt', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const ordner = mkdtempSync(join(tmpdir(), 'strich-'));
  writeFileSync(join(ordner, 'a.md'), 'Logo—Flyer\nMo bis Fr 9–17 Uhr\nText – mehr\n');
  const befunde = pruefeGedankenstriche([ordner]);
  assert.deepEqual(befunde.map((b) => b.zeile), [1, 3]);
});

test('10. Rechtstexte: offene prüfen-Stelle ist ein Befund, beim Musterbetrieb nicht', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const ordner = mkdtempSync(join(tmpdir(), 'recht-'));
  writeFileSync(join(ordner, 'impressum.md'), '---\ntitel: x\n---\nAnna Muster\n');
  writeFileSync(join(ordner, 'datenschutz.md'), '---\ntitel: x\n---\nText\n<!-- prüfen: Anschrift -->\n');
  const eigen = pruefeRechtstexte(ordner, { name: 'Anna Muster' });
  assert.equal(eigen.filter((b) => /Prüfstelle/.test(b.meldung)).length, 1);
  const muster = pruefeRechtstexte(ordner, { name: 'Studio Beispiel' });
  assert.equal(muster.filter((b) => /Prüfstelle/.test(b.meldung)).length, 0);
});
