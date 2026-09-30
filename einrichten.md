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

## Teil 5: Netlify (web3-1)

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
2. In Netlify: Domain management, Add a domain. Netlify zeigt die DNS-Werte
   an, nimm genau diese.
3. **Er:** trägt beim Domainanbieter die angezeigten Einträge ein (meist ein
   A-Eintrag für die Domain selbst und ein CNAME für `www`) oder gibt dir
   Zugang, falls der Anbieter eine Schnittstelle hat. **MX- und TXT-Einträge
   bleiben unverändert**, sonst fällt sein Postfach aus.
4. Warte, bis Netlify das Zertifikat ausgestellt hat (bis zu einem Tag), dann
   `npm run waechter`.
5. Erst jetzt darf er den alten Baukasten kündigen. Erinner ihn an die Frist.

## Teil 7: Kontakt, Newsletter, Termin (web4)

- **Kontakt:** läuft mit Teil 5. Schick eine Testnachricht über die Seite und
  prüf, ob sie ankommt.
- **Newsletter:** frag Brevo (Standard, 300 Mails am Tag frei) oder MailerLite
  (250 Abonnenten frei). **Er:** legt das Konto an, erstellt den Schlüssel und
  trägt ihn bei Netlify unter Environment variables ein (`BREVO_API_KEY` oder
  `MAILERLITE_API_KEY`). Du setzt die übrigen Werte:
  `npx netlify env:set NEWSLETTER_ANBIETER brevo`, `NEWSLETTER_LISTE <id>`,
  `SEITE_DOMAIN <domain>`, bei Brevo `BREVO_DOI_TEMPLATE <id>` (vorher mit ihm
  in Brevo eine Bestätigungsvorlage für Double-Opt-in anlegen). Bei MailerLite:
  **Er** schaltet Double-Opt-in für Anmeldungen über die Schnittstelle ein.
  Danach `seite.json.newsletter.an = true`, `npm run rechtstexte`, Vorschau,
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
