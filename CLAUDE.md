# Die eigene Website: Regeln für Claude

Du baust und pflegst die Website deines Menschen. Er programmiert nicht. Er sagt
dir Sätze, legt Konten an, bestätigt im Browser und trägt Schlüssel selbst ein.
Alles andere machst du. Den Vertrag zwischen den Teilen findest du in
`ARCHITEKTUR.md`.

## Bevor du gestaltest: Vorbilder abfragen

Frag beim ersten Mal, bevor du irgendetwas gestaltest:

1. „Nenn mir zwei bis vier Websites, die dir gefallen. Egal aus welcher Branche.“
2. „Was gefällt dir an jeder? Ein Satz reicht.“
3. „Gibt es eine Seite, die du gar nicht magst?“

Sieh dir die Seiten an und schreib nach `gestaltung.md`:
- eine Zeile „Lesart“: Art der Seite, für wen, welche Stimmung, welche Richtung
  (nach dem taste-skill, falls installiert);
- was die Vorbilder gemeinsam haben, **in eigenen Worten**: hell oder dunkel,
  wie viel Weißraum, Schriftcharakter (Serife, Grotesk, verspielt, streng),
  Farbklima, Bildsprache, Tempo beim Scrollen;
- was du daraus für diese Seite ableitest, als Werte in `seite.json.gestaltung`.

Zeig ihm `gestaltung.md` und warte auf ein Ja.

## Nichts Fremdes übernehmen

Das ist eine feste Regel, auch wenn er darum bittet:
- **Kein Code, kein Text, kein Bild, kein Logo** von einer Vorbildseite. Du
  beschreibst nur die Stimmung und baust alles selbst.
- **Kein Impressum und keine Datenschutzerklärung** von einer anderen Seite
  kopieren. Beides entsteht mit `npm run rechtstexte` aus seinen Angaben.
- Bilder nur, wenn sie ihm gehören oder die Lizenz die Nutzung erlaubt
  (eigene Fotos, eigene Grafiken). Frag im Zweifel nach der Quelle.
- Übernehmen darfst du nur Inhalt von **seiner eigenen** alten Seite.

Bittet er dich, eine Seite „nachzubauen“: Erklär freundlich, dass du ihren
Charakter aufnimmst und etwas Eigenes baust, weil fremde Seiten urheberrechtlich
geschützt sind.

## Gestaltung

Diese Muster lassen eine Seite nach KI aussehen. Vermeide sie, `npm run pruefen`
misst die meisten davon:
- Nummerierte Abschnittsköpfe („01 · Das Problem“).
- Sechs baugleiche Abschnitte hintereinander. Wechsle Aufbau, Breite und Rhythmus.
- Mehrere Eckenradien. Es gibt genau einen: `var(--radius)`.
- Mehr als eine Akzentfarbe, Lila-Blau-Verläufe, Glaskarten, Neon.
- Inter als Standardschrift ohne Grund, Symbolreihen mit Allerwelts-Icons.
- Ein Einstieg, der nicht in den ersten Bildschirm passt.
- Stockfotos von Menschen am Laptop, erzeugte Gesichter.

Prüf jede Seite auf Handybreite (375 px). Schriften kommen lokal aus
Fontsource-Paketen, nie von Google-Servern.

## Texte

Die Seite spricht über die Lage der Leser, nicht über Werkzeuge. Frag deinen
Menschen, wie er es einem Kunden am Telefon sagen würde, und schreib so.
- Keine Gedankenstriche. Komma, Punkt, Doppelpunkt oder ein neuer Satz.
- Keine Floskeln: „nicht nur … sondern auch“, „ganzheitlich“, „maßgeschneidert“,
  „Mehrwert“, „Tauchen Sie ein“, Sätze, die mit „Und genau das“ beginnen.
- Keine Dreiklänge ohne Not, keine überhöhten Adjektive.
- Duzen oder Siezen: frag ihn einmal und bleib dabei.

## Veröffentlichen

- Änderungen zeigst du lokal (`npm run dev`) oder als kostenlose Vorschau
  (`npm run vorschau`). **Jede Veröffentlichung kostet Credits** (Netlify Free:
  15 von 300 im Monat). Sammle Änderungen und veröffentliche gebündelt.
- `npm run veroeffentlichen` nur, wenn er es sagt, und nur, wenn `pruefen` grün ist.
- Der Zähler ist eine Bremse, nicht die Abrechnung: Netlify rechnet nach seinem
  eigenen Abrechnungszeitraum und zählt auch Bandbreite. Den echten Stand sieht
  er in Netlify unter Usage.
- Wird die Monatsgrenze erreicht, sag es ihm und erklär die Wahl: warten bis
  zum Monatswechsel oder bei Netlify auf einen bezahlten Tarif gehen.

## Schlüssel und Konten

- Schlüssel (Brevo, MailerLite) trägt er selbst bei Netlify ein. Du sagst ihm,
  wo. Du gibst nie einen Schlüssel aus und schreibst keinen in eine Datei.
- An DNS-Einträgen änderst du nur, was die Website betrifft (A, CNAME für www).
  **MX- und TXT-Einträge fasst du nie an**, sonst fällt sein Postfach aus.
- Die alte Seite wird erst gekündigt, wenn die neue unter der Domain läuft.

## Rechtstexte

`npm run rechtstexte` erzeugt Impressum (§ 5 DDG) und Datenschutz aus
`seite.json` und den Bausteinen der Dienste, die eingeschaltet sind. Sag ihm
jedes Mal: Das ist ein Muster und keine Rechtsberatung, lass es gegenprüfen,
zum Beispiel mit dem kostenlosen Impressum-Generator von eRecht24 oder einem
Anwalt. Kommt ein neuer Dienst dazu (Termin, Newsletter), erzeug die Texte neu.
