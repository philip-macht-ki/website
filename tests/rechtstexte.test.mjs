import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baueImpressum, baueDatenschutz } from '../werkzeuge/rechtstexte.mjs';

const SEITE_VOLLSTAENDIG = {
  name: 'Studio Beispiel',
  inhaber: 'Mara Beispiel',
  beruf: 'Grafikdesign für kleine Betriebe',
  adresse: { strasse: 'Beispielweg 1', plz: '12345', ort: 'Musterstadt', land: 'Deutschland' },
  email: 'hallo@studio-beispiel.example',
  telefon: '',
  ust_id: '',
  rechtsform: 'Einzelunternehmen',
  domain: 'studio-beispiel.example',
  kontakt: { an: true },
  newsletter: { an: true, anbieter: 'brevo', liste: '2', titel: 'Post aus dem Studio' },
  termin: { an: false, anbieter: 'google' },
};

test('Impressum: vollständige Angaben ergeben keinen Fehler und enthalten alle Pflichtangaben', () => {
  const { text, fehler } = baueImpressum(SEITE_VOLLSTAENDIG);
  assert.deepEqual(fehler, []);
  assert.ok(text.includes('Mara Beispiel'));
  assert.ok(text.includes('Beispielweg 1'));
  assert.ok(text.includes('12345 Musterstadt'));
  assert.ok(text.includes('hallo@studio-beispiel.example'));
  assert.ok(!text.includes('TMG'));
});

test('Impressum: fehlende Pflichtangaben werden gemeldet', () => {
  const unvollstaendig = { ...SEITE_VOLLSTAENDIG, adresse: {}, email: '' };
  const { fehler } = baueImpressum(unvollstaendig);
  assert.ok(fehler.some((f) => f.includes('Straße')));
  assert.ok(fehler.some((f) => f.includes('PLZ')));
  assert.ok(fehler.some((f) => f.includes('Ort')));
  assert.ok(fehler.some((f) => f.includes('E-Mail')));
});

test('Impressum: USt-IdNr erscheint nur, wenn gesetzt', () => {
  const ohne = baueImpressum(SEITE_VOLLSTAENDIG).text;
  assert.ok(!ohne.includes('Umsatzsteuer-Identifikationsnummer gemäß'));
  const mit = baueImpressum({ ...SEITE_VOLLSTAENDIG, ust_id: 'DE123456789' }).text;
  assert.ok(mit.includes('DE123456789'));
});

test('Datenschutz: nur Bausteine eingeschalteter Dienste erscheinen', () => {
  const { text } = baueDatenschutz(SEITE_VOLLSTAENDIG);
  assert.ok(text.includes('Newsletter')); // newsletter.an = true, brevo
  assert.ok(text.includes('Brevo'));
  assert.ok(!text.includes('MailerLite'));
  assert.ok(!text.includes('Terminbuchung')); // termin.an = false
  assert.ok(text.includes('Kontaktformular')); // kontakt.an = true
});

test('Datenschutz: MailerLite statt Brevo, wenn so eingestellt', () => {
  const seite = { ...SEITE_VOLLSTAENDIG, newsletter: { ...SEITE_VOLLSTAENDIG.newsletter, anbieter: 'mailerlite' } };
  const { text } = baueDatenschutz(seite);
  assert.ok(text.includes('MailerLite'));
  assert.ok(!text.includes('Brevo'));
});

test('Datenschutz: Terminbaustein nur, wenn termin.an true ist', () => {
  const mitTermin = { ...SEITE_VOLLSTAENDIG, termin: { an: true, anbieter: 'calcom' } };
  const { text } = baueDatenschutz(mitTermin);
  assert.ok(text.includes('Terminbuchung'));
  assert.ok(text.includes('Cal.com'));
});

test('Datenschutz und Impressum enthalten kein "TMG"', () => {
  assert.ok(!baueImpressum(SEITE_VOLLSTAENDIG).text.includes('TMG'));
  assert.ok(!baueDatenschutz(SEITE_VOLLSTAENDIG).text.includes('TMG'));
});
