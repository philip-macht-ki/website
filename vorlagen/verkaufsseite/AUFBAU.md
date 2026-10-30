# Aufbau einer Verkaufsseite

Diese Datei beschreibt den Aufbau der Verkaufsseite. Die Seite führt auf eine Kasse. Sie verkauft nicht selbst.

## So kommt die Seite in deine Website

Die Seite liegt, wie die Newsletter-Seiten, in `src/optional/` bereit und ist erst da, wenn du sie einschaltest:

1. `vorlagen/verkaufsseite/angebot.md` nach `inhalt/angebot.md` kopieren und mit deinem Angebot füllen. Der Muster-Inhalt (Studio Beispiel, Logo-Paket) wird vollständig ersetzt.
2. In `seite.json` den Eintrag `"angebot": { "an": true }` setzen (fehlt er, ergänzen).
3. Bei Bedarf unter `navigation` den Eintrag `angebot` ergänzen.

## Reihenfolge der Abschnitte

1. **Einstieg:** ein Satz, was der Käufer bekommt, ein Satz zu Preis oder Zeit. Ein Knopf zur Kasse.
2. **Liste:** was drin ist. Drei bis fünf Punkte, jeder mit einem Satz.
3. **Ablauf (Text mit Bild):** was nach dem Kauf passiert, in kurzen Schritten.
4. **Band:** der Preis, netto oder brutto, wie er in der Kasse steht. Der Knopf zur Kasse noch einmal.
5. **Fragen:** drei bis fünf Fragen, die vor dem Kauf auftauchen. Dazu gehören Widerruf (oder der Hinweis, dass keiner besteht), Rechnung und Ablauf.

Zitate nur, wenn es echte Stimmen von Käufern gibt, mit deren Erlaubnis. Erfundene Zitate gibt es nicht. Garantien nur, wenn du sie wirklich trägst.

## Regeln

- Der Preis auf der Seite ist der Preis in der Kasse, einschließlich „netto“ oder „brutto“.
- Keine Zahlen ohne Beleg.
- Der Knopf führt auf die Kasse (`?produkt=<slug>`). Die Adresse trägst du aus `kasse.config.ts` deiner Kasse ein.
- Impressum und Datenschutz sind verlinkt (das Grundgerüst der Vorlage tut das schon).
- Nicht mehr als zwei gleiche Abschnittsarten hintereinander (`npm run pruefen` meldet es).
