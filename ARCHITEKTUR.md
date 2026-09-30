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
- **Zwei Wege, ein Standard.** Philip nutzt selbst Vercel für das Hosting und
  MailerLite für den Newsletter, das ist der Standardweg
  (`seite.json.hosting.anbieter = "vercel"`, `newsletter.anbieter =
  "mailerlite"`). Vercel erlaubt gewerbliche Seiten erst im Pro-Tarif
  (kostenpflichtig je Person und Monat), MailerLite ist frei bis 250
  Abonnenten. Günstiger geht es mit Netlify (Free-Tarif) und Brevo (300 Mails
  am Tag frei): dann `hosting.anbieter = "netlify"` und `newsletter.anbieter =
  "brevo"`. Beide Wege sind vollständig funktionsfähig und werden von
  `pruefen`, `waechter`, `vorschau` und `veroeffentlichen` gleichermaßen
  unterstützt.
- **Vorschau ist kostenlos, Veröffentlichen kann zählen.** Bei Netlify Free:
  300 Credits im Monat, eine Veröffentlichung 15, Vorschau 0. `npm run
  veroeffentlichen` zählt je Monat und stoppt bei Netlify an der Grenze aus
  `seite.json`. Bei Vercel gibt es dieses Credit-System nicht; der Zähler
  läuft nur zur Übersicht mit, ohne zu sperren.
- **Nie still scheitern.** Jedes Skript endet mit einer Zeile, die mit `ok:`,
  `befund:`, `fehler:` oder `nichts:` beginnt, und sagt bei Fehlern, welchen
  Satz das Mitglied seinem Claude sagen kann.
- **Schlüssel nie im Repo.** Newsletter-Schlüssel und das SMTP-App-Passwort
  fürs Kontaktformular liegen nur als Umgebungsvariable beim Hosting-Anbieter
  (Vercel: Environment variables, Netlify: Environment variables). Skripte
  geben Schlüssel nie aus.

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
                          (hosting-vercel/hosting-netlify, kontaktformular-eigenes-postfach/
                          kontaktformular-netlify, newsletter-mailerlite/newsletter-brevo, …)
src/
  layouts/Grundlage.astro Kopf, Navigation, Fuß, <main>
  komponenten/            Abschnitte (siehe unten), Formulare, Knöpfe; KontaktFormular.astro
                          und NewsletterFormular.astro wählen Ziel und Schutz nach
                          seite.json.hosting.anbieter
  pages/                  index, leistungen, ueber-mich, kontakt, kontakt-danke,
                          impressum, datenschutz, 404
  optional/               newsletter, newsletter-danke, newsletter-bestaetigt; liegen
                          außerhalb von pages/ und werden in astro.config.mjs per
                          injectRoute nur eingehängt, wenn seite.json.newsletter.an
                          wahr ist, ohne Dateien verschieben zu müssen
  styles/grund.css        Design-Tokens als CSS-Variablen, sonst nichts Globales
public/bilder/            eigene Bilder, höchstens 400 KB je Datei
public/fehler.js          blendet den Fehlerhinweis über einem Formular ein (?fehler=1|2)
public/formular-zeit.js   nur bei Vercel eingebunden: trägt beim Laden die Uhrzeit ins
                          Zeitfeld formular_geladen ein (Bot-Schutz für api/kontakt.js)
lib/newsletter.mjs         die eigentliche Newsletter-Logik (Brevo, MailerLite, Honeypot,
                          Einwilligung, fehlende Einstellungen), geteilt von beiden Einstiegen
netlify/functions/newsletter.mjs   dünner Netlify-Einstieg, nutzt lib/newsletter.mjs
api/newsletter.js         dünner Vercel-Einstieg, nutzt lib/newsletter.mjs
api/kontakt.js            Vercel-Einstieg fürs Kontaktformular: SMTP aus dem eigenen
                          Postfach, es gibt keine Vercel-Forms wie bei Netlify
netlify.toml              Build, Funktionen, Sicherheits-Header (Netlify)
vercel.json                Build, Ausgabeordner, Sicherheits-Header, cleanUrls (Vercel)
werkzeuge/                Node-Skripte ohne Build, aufgerufen über npm run
  pruefen.mjs  veroeffentlichen.mjs  vorschau.mjs  waechter.mjs  rechtstexte.mjs
  gemeinsam.mjs           seite.json lesen, Ausgabezeilen, Monatszähler, hostingAnbieter()
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
  "hosting": { "anbieter": "vercel" },
  "kontakt": { "an": true, "benachrichtigung": "hallo@studio-beispiel.example" },
  "newsletter": { "an": true, "anbieter": "mailerlite", "liste": "2", "titel": "Post aus dem Studio", "versprechen": "Einmal im Monat ein Gedanke zu Gestaltung für kleine Betriebe." },
  "termin": { "an": false, "anbieter": "google", "link": "", "text": "Kennenlernen buchen" },
  "veroeffentlichen": { "grenze_monat": 8, "netlify_site": "", "vercel_projekt": "" },
  "waechter": { "mitteilung": true }
}
```

- `hosting.anbieter` ∈ `vercel` (Standard), `netlify` (günstigere Variante).
  Steuert, wohin die Formulare zeigen (`werkzeuge/gemeinsam.mjs`,
  `hostingAnbieter()`), welchen Rechtstext-Baustein `npm run rechtstexte`
  einsetzt, was `pruefen` und `waechter` erwarten, und welches Kommando
  `vorschau`/`veroeffentlichen` aufrufen.
- `newsletter.anbieter` ∈ `mailerlite` (Standard), `brevo` (günstigere
  Variante darüber hinaus, wenn 250 Abonnenten bei MailerLite nicht reichen).
  `liste` ist die Gruppen-ID (MailerLite) oder Listen-ID (Brevo).
- `termin.anbieter` ∈ `google`, `calcom`, `anderer`. `termin.an = false`
  blendet Knopf und Datenschutz-Baustein aus.
- `veroeffentlichen.netlify_site` (Netlify-Seiten-ID) und
  `veroeffentlichen.vercel_projekt` (Vercel-Projektname) stehen beide immer in
  der Datei; nur der zu `hosting.anbieter` passende Wert wird benutzt.
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

Ziel und Schutz hängen von `seite.json.hosting.anbieter` ab
(`src/komponenten/KontaktFormular.astro`, `NewsletterFormular.astro`):

- **Kontakt, Netlify:** `<form name="kontakt" method="POST" data-netlify="true"
  netlify-honeypot="firma-website" action="/kontakt-danke">` mit Feldern
  `name`, `email`, `nachricht`, verstecktem Feld `firma-website` und
  Datenschutzhinweis mit Link. Netlify erkennt das Formular beim Veröffentlichen.
- **Kontakt, Vercel:** `<form name="kontakt" method="POST"
  action="/api/kontakt">`, gleiche sichtbaren Felder, dazu das versteckte
  Zeitfeld `formular_geladen` (siehe `public/formular-zeit.js`). Es gibt keine
  Vercel-Forms; die Funktion `api/kontakt.js` verschickt die Nachricht per
  SMTP.
- **Newsletter:** `<form method="POST" action="…">` mit `email`, `vorname`
  (optional), Pflicht-Häkchen `einwilligung` mit Text aus
  `seite.json.newsletter.versprechen` plus Abmeldehinweis, verstecktem Feld
  `telefon2` als Falle. `action` ist `/.netlify/functions/newsletter`
  (Netlify) oder `/api/newsletter` (Vercel). Ohne JavaScript nutzbar.

## Newsletter: `lib/newsletter.mjs` (Brevo, MailerLite)

Die eigentliche Logik steht in `lib/newsletter.mjs` und wird von zwei dünnen
Einstiegen genutzt: `netlify/functions/newsletter.mjs` (Netlify Functions,
Standardexport `(req) => Response`, dazu die Ratenbegrenzung) und
`api/newsletter.js` (Vercel Function, benannte Exporte `GET`/`POST` nach der
Web-Handler-Signatur für Nicht-Next-Projekte, siehe
https://vercel.com/docs/functions/functions-api-reference, Abschnitt
„Function signature“ → „Other Frameworks“). Beide sprechen Web-Standard
Request/Response, deshalb ist die Logik zu hundert Prozent identisch:

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
- Einstellungen aus Umgebungsvariablen: `NEWSLETTER_ANBIETER`,
  `NEWSLETTER_LISTE`, `SEITE_DOMAIN`, Schlüssel wie oben. Nie den Schlüssel
  oder die volle Anbieterantwort loggen; bei Anbieterfehler 303 auf
  `/newsletter?fehler=2` und eine Logzeile mit Status-Code.
- Erfolg → 303 auf `/newsletter-danke` („Schau in dein Postfach und bestätige“).
- Fehlt eine Einstellung oder ist der Anbieter unbekannt: kein Anbieteraufruf,
  303 auf `/newsletter?fehler=2`, Logzeile mit den **Namen** der fehlenden
  Variablen (nie Werte).
- `einwilligung` gilt als gesetzt bei `ja` (so schickt es das Formular), `on`,
  `true`, `1`. Ein Test liest die Felder aus dem gebauten `dist/newsletter.html`.
- Ratenbegrenzung gegen Massenanmeldungen fremder Adressen: `export const
  config = { rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip",
  "domain"] } }`, nur in `netlify/functions/newsletter.mjs` (Netlify prüft das
  in allen Tarifen, darüber Status 429). Vercel Functions haben dieses
  eingebaute Merkmal nicht; dort bleiben Falle und Einwilligungsprüfung der
  Schutz.

## Kontakt: `api/kontakt.js` (nur Vercel)

Vercel hat keine Netlify-Forms-Entsprechung. `api/kontakt.js` schickt die
Nachricht deshalb per SMTP aus dem **eigenen Postfach des Mitglieds an sich
selbst**, genau wie im Buchhaltungskurs: App-Passwort, Umgebungsvariablen
`KONTAKT_SMTP_SERVER`, `KONTAKT_SMTP_BENUTZER`, `KONTAKT_SMTP_PASSWORT`,
`KONTAKT_AN` (Ziel-Adresse), optional `KONTAKT_SMTP_PORT` (Standard 465).
Abhängigkeit: `nodemailer`.

- Nur POST. Honeypot-Feld `firma-website` gefüllt → 303 auf `/kontakt-danke`
  (still, kein Versand).
- Verstecktes Zeitfeld `formular_geladen`: `public/formular-zeit.js` trägt
  beim Laden der Seite `Date.now()` ein. Kommt die Nachricht weniger als drei
  Sekunden später an, gilt das als Bot: 303 auf `/kontakt-danke`, kein Versand.
  Fehlt das Feld (Besucher ohne JavaScript), geht die Nachricht trotzdem raus,
  Betreff mit dem Zusatz „ohne Zeitprüfung“. Keine Anfrage geht still verloren.
- `Reply-To` der Mail ist die Absenderadresse aus dem Formular. Zeilenumbrüche
  werden aus `name` und `email` entfernt, damit niemand zusätzliche
  Kopfzeilen einschmuggelt (Header-Injection).
- Fehlende Pflichtfelder oder ungültige E-Mail → 303 auf `/kontakt?fehler=1`.
  Fehlende Einstellung oder SMTP-Fehler → 303 auf `/kontakt?fehler=2`, Logzeile
  ohne Passwort und ohne vollen Fehlertext.
- Erfolg → 303 auf `/kontakt-danke`.

## Skripte

| npm run | Datei | tut |
|---|---|---|
| `dev` | astro | lokale Vorschau auf http://localhost:4321 |
| `build` | astro | `dist/` |
| `pruefen` | werkzeuge/pruefen.mjs | baut, prüft Quelle und `dist/` (Liste unten), Ausgabe je Befund mit Datei und Satz für Claude; Rückgabe 1 bei Befund |
| `vorschau` | werkzeuge/vorschau.mjs | pruefen, dann je nach `hosting.anbieter` `vercel deploy` (Standard) oder `netlify deploy --dir dist` (Entwurf, kostenlos), gibt die Vorschauadresse aus |
| `veroeffentlichen` | werkzeuge/veroeffentlichen.mjs | pruefen; bei Netlify Zähler gegen die Grenze prüfen (bei Grenze `befund:` und Abbruch außer `-- --trotzdem`); dann `vercel deploy --prod` (Standard) oder `netlify deploy --prod --dir dist`, Zähler +1 (bei Vercel ohne Sperre) |
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
12. Kontaktformular und Newsletter-Formular je nach `hosting.anbieter`: bei
    Netlify `data-netlify`, `form-name` und das Honeypot-Feld am Kontakt­
    formular; bei Vercel zeigt das Kontaktformular auf `/api/kontakt` und hat
    Honeypot- und Zeitfeld. Das Newsletter-Formular zeigt auf
    `/.netlify/functions/newsletter` bzw. `/api/newsletter` und hat immer ein
    Pflicht-Häkchen `einwilligung`.

### Was der `waechter` prüft

Startseite antwortet mit 200 über HTTPS, Zertifikat noch mehr als 14 Tage
gültig, Seite `/kontakt` antwortet und enthält ihr Formular (je nach
`hosting.anbieter` das Netlify-Formular oder Aktion, Honeypot und Zeitfeld der
Vercel-Variante), bei eingeschaltetem Newsletter antwortet `/newsletter` mit
seinem Formular und die Newsletter-Funktion (`/.netlify/functions/newsletter`
oder `/api/newsletter`) auf GET mit 405 (lebt), Zähler der Veröffentlichungen
unter der Grenze. Ergebnis als Zeile und bei Befund als Mitteilung
(`osascript`), nie als automatische Reparatur.
