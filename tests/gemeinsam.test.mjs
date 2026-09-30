import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  zeile,
  aktuellerMonat,
  jetztBerlin,
  leseZaehler,
  schreibeZaehler,
  zaehleImMonat,
  trageVeroeffentlichungEin,
} from '../werkzeuge/gemeinsam.mjs';

test('zeile gibt eine Zeile mit dem geforderten Anfang zurück', () => {
  for (const art of ['ok', 'befund', 'fehler', 'nichts']) {
    const text = zeile(art, 'Test');
    assert.ok(text.startsWith(`${art}: `));
  }
});

test('zeile hängt den Satz fürs Mitglied an, wenn angegeben', () => {
  const text = zeile('fehler', 'Etwas fehlt.', 'Trag es nach.');
  assert.ok(text.includes('Sag deinem Claude: Trag es nach.'));
});

test('zeile lehnt unbekannte Arten ab', () => {
  assert.throws(() => zeile('warnung', 'x'));
});

test('aktuellerMonat liefert YYYY-MM in Europe/Berlin', () => {
  const monat = aktuellerMonat(new Date('2026-01-15T23:30:00Z')); // 00:30 Berlin am 16.
  assert.equal(monat, '2026-01');
  const jahreswechsel = aktuellerMonat(new Date('2025-12-31T23:30:00Z')); // 00:30 Berlin, 01.01.2026
  assert.equal(jahreswechsel, '2026-01');
});

test('jetztBerlin liefert einen ISO-String mit Offset', () => {
  // 15.06.2026, 10:00 UTC ist in der Sommerzeit (MESZ, +02:00) 12:00 Uhr Ortszeit.
  const text = jetztBerlin(new Date('2026-06-15T10:00:00Z'));
  assert.equal(text, '2026-06-15T12:00:00+02:00');
});

test('jetztBerlin rechnet die Winterzeit korrekt um', () => {
  // 15.01.2026, 10:00 UTC ist in der Winterzeit (MEZ, +01:00) 11:00 Uhr Ortszeit.
  const text = jetztBerlin(new Date('2026-01-15T10:00:00Z'));
  assert.equal(text, '2026-01-15T11:00:00+01:00');
});

test('Zähler: leer wenn Datei fehlt, zählt korrekt, schreibt und liest zurück', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'zaehler-'));
  const pfad = join(ordner, 'unterordner', 'veroeffentlichungen.json');
  try {
    let zaehler = leseZaehler(pfad);
    assert.deepEqual(zaehler, {});
    assert.equal(zaehleImMonat(zaehler, '2026-10'), 0);

    zaehler = trageVeroeffentlichungEin(zaehler, '2026-10-01T10:00:00+02:00', '2026-10');
    zaehler = trageVeroeffentlichungEin(zaehler, '2026-10-02T10:00:00+02:00', '2026-10');
    assert.equal(zaehleImMonat(zaehler, '2026-10'), 2);

    schreibeZaehler(zaehler, pfad);
    const zurueckgelesen = leseZaehler(pfad);
    assert.equal(zaehleImMonat(zurueckgelesen, '2026-10'), 2);
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
});

test('Zähler: Monatswechsel beginnt wieder bei null', () => {
  let zaehler = {};
  zaehler = trageVeroeffentlichungEin(zaehler, '2026-09-30T10:00:00+02:00', '2026-09');
  zaehler = trageVeroeffentlichungEin(zaehler, '2026-09-30T11:00:00+02:00', '2026-09');
  assert.equal(zaehleImMonat(zaehler, '2026-09'), 2);
  assert.equal(zaehleImMonat(zaehler, '2026-10'), 0);
});
