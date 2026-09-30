# Architektur

Diese Datei ist der Vertrag zwischen den Teilen. Wer ein Format ändert, ändert
es hier zuerst.

Zielgruppe: Selbstständige, die nicht programmieren. Ihr eigener Claude baut und
ändert die Seite; das Mitglied sagt nur Sätze, legt Konten an, bestätigt im
Browser und trägt Schlüssel selbst ein.

## Grundsätze

- **Nichts Fremdes übernehmen.** Vorbilder liefern Stimmung, nie Code, Text,
  Bilder oder Rechtstexte. Übernommen wird nur Inhalt von der eigenen alten
  Seite des Mitglieds.
- **Kein KI-Look.** Die Regeln stehen in `CLAUDE.md` unter „Gestaltung“ und
  „Texte“ und werden von `npm run pruefen` gemessen, nicht nur empfohlen.
- **Statisch und lokal.** Astro erzeugt reine HTML-Seiten. Schriften, Bilder und
  Skripte liegen auf der eigenen Seite; kein Aufruf zu Google Fonts, CDNs oder
  Trackern. Einzige Ausnahme sind Links (Termin-Knopf), die erst beim Klick
  zum Anbieter führen.
- **Vorschau ist kostenlos, Veröffentlichen zählt.** Netlify Free: 300 Credits
  im Monat, eine Veröffentlichung 15, Vorschau 0. `npm run veroeffentlichen`
  zählt je Monat und stoppt an der Grenze aus `seite.json`.
- **Nie still scheitern.** Jedes Skript endet mit einer Zeile, die mit `ok:`,
  `befund:`, `fehler:` oder `nichts:` beginnt, und sagt bei Fehlern, welchen
  Satz das Mitglied seinem Claude sagen kann.
- **Schlüssel nie im Repo.** Newsletter-Schlüssel liegen nur als
  Umgebungsvariable bei Netlify. Skripte geben Schlüssel nie aus.

## Ordner

```
seite.json                Alle Einstellungen (siehe unten). Einzige Datei, die Skripte und Seite teilen.
gestaltung.md             Design Read und Stilregeln aus den Vorbildern, schreibt der Claude des Mitglieds.
inhalt/                   Texte als Markdown mit Frontmatter
  startseite.md
  leistungen.md
  ueber-mich.md
  kontakt.md
  newsletter.md
  impressum.md            erzeugt von `npm run rechtstexte`, danach von Hand prüfbar
  datenschutz.md          erzeugt von `npm run rechtstexte`
vorlagen/datenschutz/     Bausteine je Dienst, selbst geschrieben, Platzhalter {{…}}
src/
  layouts/Grundlage.astro Kopf, Navigation, Fuß, <main>
  komponenten/            Abschnitte (siehe unten), Formulare, Knöpfe
  pages/                  index, leistungen, ueber-mich, kontakt, kontakt-danke,
                          impressum, datenschutz, 404
  optional/               newsletter, newsletter-danke, newsletter-bestaetigt; liegen
                          außerhalb von pages/ und werden in astro.config.mjs per
                          injectRoute nur eingehängt, wenn seite.json.newsletter.an
                          wahr ist, ohne Dateien verschieben zu müssen
  styles/grund.css        Design-Tokens als CSS-Variablen, sonst nichts Globales
public/bilder/            eigene Bilder, höchstens 400 KB je Datei
netlify/functions/newsletter.mjs   Anmeldung an Brevo oder MailerLite
netlify.toml              Build, Funktionen, Sicherheits-Header
werkzeuge/                Node-Skripte ohne Build, aufgerufen über npm run
  pruefen.mjs  veroeffentlichen.mjs  vorschau.mjs  waechter.mjs  rechtstexte.mjs
  gemeinsam.mjs           seite.json lesen, Ausgabezeilen, Monatszähler
zeitplan/                 launchd-Vorlage für den Wächter
arbeit/                   Laufzeit, nie im Git (.gitignore): veroeffentlichungen.json, waechter.json, logs/
tests/                    node:test
```

## seite.json

```json
{
  "name": "Studio Beispiel",
  "inhaber": "Mara Beispiel",
  "beruf": "Grafikdesign für kleine Betriebe",
  "ort": "Musterstadt",
  "adresse": { "strasse": "Beispielweg 1", "plz": "12345", "ort": "Musterstadt", "land": "Deutschland" },
  "email": "hallo@studio-beispiel.example",
  "telefon": "",
  "ust_id": "",
  "rechtsform": "Einzelunternehmen",
  "domain": "studio-beispiel.example",
  "sprache": "de",
  "gestaltung": {
    "akzent": "#b4532a",
    "grund": "#f6f3ee",
    "text": "#1d1b19",
    "radius": "6px",
    "schrift_titel": "fraunces",
    "schrift_text": "public-sans"
  },
  "navigation": ["leistungen", "ueber-mich", "kontakt"],
  "kontakt": { "an": true, "benachrichtigung": "hallo@studio-beispiel.example" },
  "newsletter": { "an": true, "anbieter": "brevo", "liste": "2", "titel": "Post aus dem Studio", "versprechen": "Einmal im Monat ein Gedanke zu Gestaltung für kleine Betriebe." },
  "termin": { "an": false, "anbieter": "google", "link": "", "text": "Kennenlernen buchen" },
  "veroeffentlichen": { "grenze_monat": 8, "netlify_site": "" },
  "waechter": { "mitteilung": true }
}
```

- `newsletter.anbieter` ∈ `brevo`, `mailerlite`. `liste` ist die Listen-ID
  (Brevo) oder Gruppen-ID (MailerLite).
- `termin.anbieter` ∈ `google`, `calcom`, `anderer`. `termin.an = false`
  blendet Knopf und Datenschutz-Baustein aus.
- `schrift_*` sind Fontsource-Paketnamen ohne `@fontsource/`; das Paket muss
  in `package.json` stehen. Leer heißt Systemschrift.

## Inhalte (Frontmatter)

Jede Datei in `inhalt/` hat `titel` und `beschreibung` (Meta-Description,
höchstens 155 Zeichen). Seiten aus Abschnitten (`startseite.md`,
`leistungen.md`, `ueber-mich.md`) tragen im Frontmatter eine Liste
`abschnitte`, jeder mit `art` und seinen Feldern:

| art | Felder |
|---|---|
| `einstieg` | `titel`, `text`, `knopf` {`text`, `ziel`}, `bild` (optional) |
| `text_bild` | `titel`, `text`, `bild`, `bild_alt`, `seite` (`links`/`rechts`) |
| `liste` | `titel`, `punkte` [{`titel`, `text`}] |
| `zitat` | `text`, `wer` |
| `band` | `titel`, `text`, `knopf` {`text`, `ziel`} (Aufruf, z. B. Kontakt) |
| `fragen` | `titel`, `fragen` [{`frage`, `antwort`}] |
| `newsletter` | nutzt `seite.json.newsletter`, optional `titel`, `text` |
| `termin` | nutzt `seite.json.termin`, optional `titel`, `text` |

`ziel` ist ein Seitenname (`kontakt`) oder eine volle Adresse. Die Reihenfolge
der Liste ist die Reihenfolge auf der Seite. Mehr als zwei gleiche `art`
hintereinander meldet `pruefen` als Befund.

## Formulare

- Kontakt: `<form name="kontakt" method="POST" data-netlify="true"
  netlify-honeypot="firma-website" action="/kontakt-danke">` mit Feldern
  `name`, `email`, `nachricht`, verstecktem Feld `firma-website` und
  Datenschutzhinweis mit Link. Netlify erkennt das Formular beim Veröffentlichen.
- Newsletter: `<form method="POST" action="/.netlify/functions/newsletter">`
  mit `email`, `vorname` (optional), Pflicht-Häkchen `einwilligung` mit Text
  aus `seite.json.newsletter.versprechen` plus Abmeldehinweis, verstecktem
  Feld `telefon2` als Falle. Ohne JavaScript nutzbar.

## Funktion `netlify/functions/newsletter.mjs`

- Nur POST, Formular- oder JSON-Körper. Falle gefüllt → 303 auf
  `/newsletter-danke` (still, kein Anbieteraufruf). E-Mail ungültig oder
  Einwilligung fehlt → 303 auf `/newsletter?fehler=1`.
- Brevo: `POST https://api.brevo.com/v3/contacts/doubleOptinConfirmation`,
  Header `api-key: $BREVO_API_KEY`, Körper `{email, attributes:{FIRSTNAME},
  includeListIds:[liste], templateId: $BREVO_DOI_TEMPLATE,
  redirectionUrl: https://<domain>/newsletter-bestaetigt}`.
- MailerLite: `POST https://connect.mailerlite.com/api/subscribers`,
  `Authorization: Bearer $MAILERLITE_API_KEY`, Körper `{email, fields:{name},
  groups:[liste], status:"unconfirmed"}`; Double-Opt-in muss im MailerLite-Konto
  für API eingeschaltet sein (Lektion web4-2).
- Einstellungen der Funktion aus Umgebungsvariablen: `NEWSLETTER_ANBIETER`,
  `NEWSLETTER_LISTE`, `SEITE_DOMAIN`, Schlüssel wie oben. Nie den Schlüssel
  oder die volle Anbieterantwort loggen; bei Anbieterfehler 303 auf
  `/newsletter?fehler=2` und eine Logzeile mit Status-Code.
- Erfolg → 303 auf `/newsletter-danke` („Schau in dein Postfach und bestätige“).
- Fehlt eine Einstellung oder ist der Anbieter unbekannt: kein Anbieteraufruf,
  303 auf `/newsletter?fehler=2`, Logzeile mit den **Namen** der fehlenden
  Variablen (nie Werte).
- Schutz gegen Massenanmeldungen fremder Adressen: `export const config =
  { rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] } }`
  (Netlify, in allen Tarifen, darüber Status 429).
- `einwilligung` gilt als gesetzt bei `ja` (so schickt es das Formular), `on`,
  `true`, `1`. Ein Test liest die Felder aus dem gebauten `dist/newsletter.html`.

## Skripte

| npm run | Datei | tut |
|---|---|---|
| `dev` | astro | lokale Vorschau auf http://localhost:4321 |
| `build` | astro | `dist/` |
| `pruefen` | werkzeuge/pruefen.mjs | baut, prüft Quelle und `dist/` (Liste unten), Ausgabe je Befund mit Datei und Satz für Claude; Rückgabe 1 bei Befund |
| `vorschau` | werkzeuge/vorschau.mjs | pruefen, dann `netlify deploy --dir dist` (Entwurf, kostenlos), gibt die Vorschauadresse aus |
| `veroeffentlichen` | werkzeuge/veroeffentlichen.mjs | pruefen, Zähler lesen, bei Grenze `befund:` und Abbruch (außer `-- --trotzdem`), sonst `netlify deploy --prod --dir dist`, Zähler +1 |
| `rechtstexte` | werkzeuge/rechtstexte.mjs | schreibt `inhalt/impressum.md` und `inhalt/datenschutz.md` aus `seite.json` und den Bausteinen der eingeschalteten Dienste; fehlende Pflichtangaben → `fehler:` |
| `waechter` | werkzeuge/waechter.mjs | prüft die Live-Seite (siehe unten), schreibt `arbeit/waechter.json`, macOS-Mitteilung bei Befund |

Zähler `arbeit/veroeffentlichungen.json`: `{"2026-10": ["2026-10-03T10:12:00+02:00", …]}`.

### Was `pruefen` misst

1. Gedankenstrich in `inhalt/` und `dist/`: — immer, – nur zwischen Leerzeichen (9–17 Uhr ist erlaubt).
2. Abschnittsnummern als Kopf („01 ·“, „02 —“, „Schritt 1:“ in Überschriften).
3. Mehr als ein `border-radius`-Wert in eigenem CSS (außer 0, 50 % und `var(--radius)`).
4. Mehr als eine Akzentfarbe: Hex-Farben im CSS außerhalb der Tokens in `grund.css`.
5. Externe Ressourcen in `dist/`: `fonts.googleapis`, `fonts.gstatic`, `cdn.`, `unpkg`,
   `jsdelivr`, `googletagmanager`, `<iframe`.
6. Bilder über 400 KB, `<img>` ohne `alt`.
7. Platzhalter: „Lorem“, „TODO“, „{{“, „[Name]“, „Beispiel GmbH“ außerhalb des Musterbetriebs erlaubt nur, wenn `seite.json.name` selbst „Studio Beispiel“ ist.
8. Mehr als zwei gleiche Abschnittsarten hintereinander.
9. KI-Floskeln in `inhalt/`: „In der heutigen schnelllebigen“, „nicht nur … sondern auch“,
   „Tauchen Sie ein“, „ganzheitlich“, „maßgeschneidert“, „Mehrwert“, „Das ist der Unterschied“,
   „Und genau das“ (Liste in `werkzeuge/floskeln.json`, erweiterbar).
10. Impressum und Datenschutz vorhanden, nicht leer, kein „TMG“, Impressum enthält Name,
    Anschrift, E-Mail; keine offene `<!-- prüfen: … -->`-Stelle (außer im Musterbetrieb).
11. Interne Links in `dist/` zeigen auf vorhandene Seiten.
12. Kontaktformular hat `data-netlify`, `form-name` und das Honeypot-Feld; Newsletter-Formular hat ein Pflicht-Häkchen `einwilligung`.

### Was der `waechter` prüft

Startseite antwortet mit 200 über HTTPS, Zertifikat noch mehr als 14 Tage
gültig, Seiten `/kontakt` und `/newsletter` antworten und enthalten ihr
Formular, Newsletter-Funktion antwortet auf GET mit 405 (lebt), Zähler der
Veröffentlichungen unter der Grenze. Ergebnis als Zeile und bei Befund als
Mitteilung (`osascript`), nie als automatische Reparatur.
