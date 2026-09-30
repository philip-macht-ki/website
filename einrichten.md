# Einrichten: Schritt für Schritt

Diese Datei ist für dich, Claude. Arbeite sie mit deinem Menschen Teil für Teil
ab, in dieser Reihenfolge. Lies vorher `CLAUDE.md`. Nach jedem Teil sagst du
ihm in einem Satz, was jetzt läuft, und wartest auf ein Weiter.

Was er selbst tun muss, steht jeweils unter **Er**. Alles andere machst du.

## Teil 1: Die Vorlage auf seinen Mac (Lektion web0-1)

1. Prüf, ob Node da ist: `node -v` (20 oder neuer). Fehlt es, installier es
   über Homebrew (`brew install node`). Fehlt Homebrew, erklär ihm, dass du
   dafür einmal sein Mac-Passwort im Terminal brauchst, und installier es.
2. Hol die Vorlage in einen eigenen Ordner, z. B. `~/Website`, und leg ein
   eigenes, privates GitHub-Repo dafür an (`gh repo create meine-website
   --private --source . --push`), damit jede Änderung gesichert ist.
3. `npm install`. Meldet npm „install-scripts“, zeig ihm die Liste
   (`npm install-scripts ls`) und gib nur frei, was zu Astro gehört.
4. `npm run dev` und öffne http://localhost:4321. Er sieht den Musterbetrieb
   „Studio Beispiel“.
5. Frag ihn nach Name, Beruf, Ort, Anschrift und E-Mail und trag sie in
   `seite.json` ein. Schreib einen ersten Einstieg für seine Startseite in
   `inhalt/startseite.md`, nur den ersten Abschnitt, und zeig ihn in der
   Vorschau.

## Teil 2: Vorbilder und Gestaltung (web1-1)

Folge dem Abschnitt „Bevor du gestaltest“ in `CLAUDE.md`. Ergebnis ist
`gestaltung.md` und neue Werte in `seite.json.gestaltung`.

- Schlag ihm vor, den taste-skill zu installieren, falls er ihn noch nicht hat:
  `npx skills add https://github.com/Leonxlnx/taste-skill`. Er liegt dann in
  seinen Skills, nicht in diesem Repo.
- Schriften: Such passende Fontsource-Pakete aus (`npm install
  @fontsource/<name>`), trag die Namen in `seite.json` ein. Nie Google Fonts
  einbinden.
- **Er:** sagt Ja zu `gestaltung.md`.

## Teil 3: Inhalt und Texte (web1-2, web1-3)

- Hat er schon eine Seite: lies **seine eigene** alte Seite aus (Texte,
  Leistungen, Preise, Öffnungszeiten) und schreib eine Liste, was davon bleibt.
  Bilder nur, wenn sie ihm gehören.
- Frag ihn wie ein Kunde: Wer kommt zu dir? Mit welchem Problem? Was machst du
  anders? Was kostet es ungefähr? Was fragen Leute immer vorher?
- Schreib `inhalt/*.md` nach den Regeln unter „Texte“ in `CLAUDE.md`. Wechsle
  die Abschnittsarten (Tabelle in `ARCHITEKTUR.md`).
- `npm run pruefen` muss grün sein, bevor du ihm den Stand zeigst.
- **Er:** liest die Texte und sagt, was nicht nach ihm klingt.

## Teil 4: Bilder (web2-2)

- Eigene Fotos: er legt sie in einen Ordner, du verkleinerst sie auf höchstens
  1600 px und 400 KB (`sips -Z 1600 --setProperty formatOptions 75`), gibst
  ihnen sprechende Namen und `alt`-Texte.
- Keine erzeugten Gesichter, keine Stockfotos von Menschen am Laptop.

## Teil 5: Hosting (web3-1)

Frag ihn, welchen Weg er will, und trag die Antwort in
`seite.json.hosting.anbieter` ein. Philip nutzt selbst Vercel, das ist der
Standard. Günstiger geht es mit Netlify.

### Vercel (Standard)

1. `npx vercel login`. **Er:** bestätigt im Browser.
2. `npx vercel link`. Das legt `.vercel/` an (liegt in `.gitignore`) und
   verknüpft den Ordner mit einem Vercel-Projekt. Den Projektnamen trägst du
   in `seite.json.veroeffentlichen.vercel_projekt` ein.
3. **Er:** wechselt im Vercel-Konto auf den Pro-Tarif, weil der Free-Tarif nur
   für private, nicht-gewerbliche Seiten gilt. Sag ihm das offen, bevor er
   klickt.
4. `npm run vorschau` (kostenlos, eine Vorschauadresse unter `*.vercel.app`).
5. `npm run veroeffentlichen`, wenn er es sagt. Vercel kennt kein
   Credit-System wie Netlify, du kannst also veröffentlichen, sooft er will,
   ohne eine Grenze im Blick zu behalten.
6. **Er:** trägt in Vercel unter Environment variables später die
   SMTP-Zugangsdaten fürs Kontaktformular ein (Teil 7).

### Netlify (günstigere Variante)

1. `npx netlify login`. **Er:** bestätigt im Browser.
2. `npx netlify sites:create --name <kurzer-name>`. Die Seiten-ID trägst du in
   `seite.json.veroeffentlichen.netlify_site` ein.
3. **Er:** schaltet in der Netlify-Oberfläche unter Forms die
   Formularerkennung ein („Enable form detection“). Das geht nur dort.
4. `npm run vorschau` (kostenlos). Er sieht die Vorschauadresse.
5. `npm run veroeffentlichen`, wenn er es sagt. Die Seite läuft unter
   `<kurzer-name>.netlify.app`.
6. **Er:** richtet unter Notifications eine Mail-Benachrichtigung für
   Formulareinsendungen an seine Adresse ein. Du sagst ihm, wo.

Erklär ihm einmal die Credits: Netlify Free hat 300 im Monat, jede
Veröffentlichung kostet 15, Vorschauen nichts. `npm run veroeffentlichen`
stoppt an der Grenze in `seite.json`.

## Teil 6: Domain (web3-2)

1. Frag, wo seine Domain liegt (IONOS, Strato, united-domains, …) und ob dort
   ein Postfach läuft.
2. Bei Vercel: im Projekt unter Domains, Add. Bei Netlify: Domain management,
   Add a domain. Beide zeigen dir die nötigen DNS-Werte an, nimm genau diese.
3. **Er:** trägt beim Domainanbieter nur die dort angezeigten Einträge ein
   (meist ein A-Eintrag für die Domain selbst und ein CNAME für `www`) oder
   gibt dir Zugang, falls der Anbieter eine Schnittstelle hat. **MX- und
   TXT-Einträge bleiben unverändert**, sonst fällt sein Postfach aus.
4. Warte, bis das Zertifikat ausgestellt ist (bis zu einem Tag), dann
   `npm run waechter`.
5. Erst jetzt darf er den alten Baukasten kündigen. Erinner ihn an die Frist.

## Teil 7: Kontakt, Newsletter, Termin (web4)

- **Kontakt bei Vercel:** läuft über `api/kontakt.js`, eine eigene Funktion,
  weil es bei Vercel keine Formularerkennung wie bei Netlify gibt. **Er:**
  richtet in seinem eigenen Postfach ein App-Passwort ein (wie im
  Buchhaltungskurs beschrieben) und trägt es bei Vercel unter Environment
  variables ein: `KONTAKT_SMTP_SERVER`, `KONTAKT_SMTP_BENUTZER`,
  `KONTAKT_SMTP_PASSWORT`, `KONTAKT_AN` (an welche Adresse die Nachrichten
  gehen, meist seine eigene). Schick danach eine Testnachricht über die Seite
  und prüf, ob sie ankommt.
- **Kontakt bei Netlify:** läuft automatisch mit Teil 5 über Netlify Forms.
  Schick eine Testnachricht über die Seite und prüf, ob sie ankommt.
- **Newsletter:** frag MailerLite (Standard, 250 Abonnenten frei) oder, für
  mehr kostenlos, Brevo (300 Mails am Tag frei). **Er:** legt das Konto an,
  erstellt den Schlüssel und trägt ihn beim Hosting-Anbieter unter Environment
  variables ein (`MAILERLITE_API_KEY` oder `BREVO_API_KEY`). Du setzt die
  übrigen Werte (bei Vercel über die Oberfläche oder `npx vercel env add`, bei
  Netlify `npx netlify env:set`): `NEWSLETTER_ANBIETER mailerlite` (oder
  `brevo`), `NEWSLETTER_LISTE <id>`, `SEITE_DOMAIN <domain>`, bei Brevo
  zusätzlich `BREVO_DOI_TEMPLATE <id>` (vorher mit ihm in Brevo eine
  Bestätigungsvorlage für Double-Opt-in anlegen). Bei MailerLite: **Er**
  schaltet Double-Opt-in für Anmeldungen über die Schnittstelle ein. Danach
  `seite.json.newsletter.an = true`, `npm run rechtstexte`, Vorschau,
  Testanmeldung mit seiner eigenen Adresse bis zur Bestätigung.
- **Termin (optional):** **Er** legt in Google Kalender einen Terminplan an
  (oder bei Cal.com) und gibt dir den Link. Du trägst ihn in
  `seite.json.termin` ein, `an = true`, `npm run rechtstexte`.

## Teil 8: Rechtstexte und Wächter (web5)

- `npm run rechtstexte`. Zeig ihm beide Texte und sag den Satz aus `CLAUDE.md`
  (Muster, keine Rechtsberatung, gegenprüfen lassen). Geh mit ihm jede Stelle
  `<!-- prüfen: … -->` durch.
- Wächter: kopier `zeitplan/de.eigene-website.waechter.plist` nach
  `~/Library/LaunchAgents/`, ersetz die Platzhalter (Node-Pfad absolut, siehe
  `which node`) und lade ihn (`launchctl bootstrap gui/$(id -u) …`). Test:
  `npm run waechter`.

## Danach: ändern mit einem Satz

Er sagt, was anders sein soll. Du änderst, prüfst (`npm run pruefen`), zeigst
es in der Vorschau und veröffentlichst gebündelt, wenn er es sagt. Jede
Änderung committest du in sein GitHub-Repo, damit man zurück kann.
