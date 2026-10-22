# Einrichten: Schritt für Schritt

Diese Datei ist für dich, Claude. Arbeite sie mit deinem Menschen ab, in
dieser Reihenfolge. Lies vorher `CLAUDE.md`. Nach jedem Schritt sagst du ihm in
einem Satz, was jetzt läuft, und wartest auf ein Weiter.

Der Kurs „Die eigene Website“ hat drei Teile. Jeder Teil endet mit etwas, das
läuft. Bau nur den Teil, den er gerade macht.

| Teil | Am Ende läuft | Er braucht dafür |
|---|---|---|
| 1 | seine Seite mit seinen Texten, Impressum und Datenschutz unter seiner Domain | Vercel-Konto (Pro-Tarif) oder Netlify, seine Domain |
| 2 | eigene Gestaltung, eigene Fotos, eigene Schriften | Vorbilder, auf Wunsch Fotos |
| 3 | Kontaktformular, Newsletter, Termin-Knopf, Wächter | App-Passwort seines Postfachs, auf Wunsch MailerLite oder Brevo |

Was er selbst tun muss, steht jeweils unter **Er**. Alles andere machst du. Er
tippt keinen Befehl ins Terminal, du tippst alle. Sag ihm einmal am Anfang:
Die Claude-App fragt öfter, ob du einen Schritt ausführen darfst. Er kann für
diese Sitzung „immer erlauben“ wählen, das entscheidet er.

Fachwörter wie Repo, Terminal, Node, npm, DNS oder Umgebungsvariable sagst du
nicht von dir aus. Wo er etwas in einer englischen Oberfläche anklickt, nennst
du den Knopf auf Englisch und sagst dahinter auf Deutsch, was er tut.

---

# Teil 1: Deine Seite online unter deiner Adresse

## 1.1 Werkzeuge, ohne Admin-Passwort (Lektion web0-1)

1. Prüf still, ob Node da ist: `node -v` (20 oder neuer).
2. Fehlt es: **kein Homebrew, kein sudo.** Hol das offizielle Archiv von
   nodejs.org in seinen Benutzerordner. Nimm die aktuelle LTS-Version aus
   `https://nodejs.org/dist/index.json` (Feld `lts` nicht `false`) und den
   passenden Chip aus `uname -m` (`arm64` oder `x64`):

   ```sh
   mkdir -p ~/.local/node
   curl -fsSL https://nodejs.org/dist/v<version>/node-v<version>-darwin-<chip>.tar.gz \
     | tar -xz -C ~/.local/node --strip-components=1
   grep -q '.local/node/bin' ~/.zprofile 2>/dev/null || echo 'export PATH="$HOME/.local/node/bin:$PATH"' >> ~/.zprofile
   export PATH="$HOME/.local/node/bin:$PATH"
   node -v
   ```

3. Ein GitHub-Konto und `gh` braucht er nicht. Hol die Vorlage als Archiv in
   einen eigenen Ordner, z. B. `~/Website`:

   ```sh
   mkdir -p ~/Website
   curl -fsSL https://github.com/philip-macht-ki/website/archive/refs/heads/main.tar.gz \
     | tar -xz -C ~/Website --strip-components=1
   ```

   Liegt der Ordner unter iCloud Drive (Schreibtisch und Dokumente mit
   iCloud-Abgleich), nimm stattdessen einen Ordner direkt im Benutzerordner.
4. `npm install`. Meldet npm „install-scripts“, zeig ihm die Liste
   (`npm install-scripts ls`) in einem Satz und gib nur frei, was zu Astro
   gehört.
5. `npm run dev` und öffne http://localhost:4321. Er sieht den Musterbetrieb
   „Studio Beispiel“.
6. Frag ihn nach Name des Betriebs, Beruf und Ort und trag sie in `seite.json`
   ein. Schreib einen ersten Einstieg in `inhalt/startseite.md`, nur den ersten
   Abschnitt, und zeig ihn in der Vorschau.

Für Teil 1 setzt du in `seite.json` `kontakt.an` und `newsletter.an` auf
`false` und `kontakt.benachrichtigung` auf seine Adresse. Die Kontaktseite
zeigt dann seine E-Mail-Adresse und, falls eingetragen, seine Telefonnummer
statt eines Formulars. Das Formular kommt in Teil 3.

## 1.2 Kosten ehrlich (web0-2)

Sag ihm, bevor er irgendwo klickt, was es kostet (Stand Oktober 2026, die
Preisseiten ändern sich, sieh vorher nach):

- **Vercel Pro** (Standard): 20 US-Dollar im Monat zuzüglich Umsatzsteuer, ein
  Nutzungsguthaben in gleicher Höhe ist enthalten, 14 Tage einmal kostenlos
  testbar. Der kostenlose Hobby-Tarif ist nur für private Seiten erlaubt.
- **Netlify Free** (günstiger): kostenlos, 300 Credits im Monat, eine
  Veröffentlichung kostet 15, eine Vorschau nichts. Ist das Guthaben weg,
  hält Netlify die Seite bis zum Monatswechsel an.
- **Domain**: was er heute schon bei seinem Anbieter zahlt.

Frag ihn, welchen Weg er will, und trag die Antwort in
`seite.json.hosting.anbieter` ein.

## 1.3 Texte (web1-2, web1-3)

- Hat er schon eine Seite: lies **seine eigene** alte Seite aus (Texte,
  Leistungen, Preise, Öffnungszeiten) und schreib eine Liste, was davon bleibt.
  Bilder nur, wenn sie ihm gehören.
- Frag ihn wie ein Kunde: Wer kommt zu dir? Mit welchem Problem? Was machst du
  anders? Was kostet es ungefähr? Was fragen Leute immer vorher?
- Frag einmal: Du oder Sie.
- Schreib `inhalt/*.md` nach den Regeln unter „Texte“ in `CLAUDE.md`. Wechsle
  die Abschnittsarten (Tabelle in `ARCHITEKTUR.md`). Die Gestaltung bleibt in
  Teil 1 die der Vorlage, Musterbilder ohne Bezug zu ihm nimmst du heraus.
- `npm run pruefen` muss grün sein, bevor du ihm den Stand zeigst.
- **Er:** liest die Texte und sagt, was nicht nach ihm klingt.

## 1.4 Impressum und Datenschutz (web5-1)

Bevor irgendetwas öffentlich wird:

- Frag nach Anschrift, Rechtsform, Telefon (freiwillig) und, falls er eine
  hat, Umsatzsteuer-ID. Trag sie in `seite.json` ein.
- `npm run rechtstexte`. Zeig ihm beide Texte und sag den Satz aus `CLAUDE.md`
  (Muster, keine Rechtsberatung, gegenprüfen lassen). Geh mit ihm jede Stelle
  `<!-- prüfen: … -->` durch.

## 1.5 Online gehen (web3-1)

### Vercel (Standard)

1. **Er:** legt ein Konto an, falls er keins hat: vercel.com, oben rechts
   Sign Up (Registrieren), Tarif Hobby, Continue with Email (Weiter mit
   E-Mail), sechsstelliger Code aus der Mail. Kein GitHub nötig.
2. `npx vercel login`. Kündige vorher an: „Gleich öffnet sich ein
   Browserfenster mit einem Code. Prüf Ort und Uhrzeit und klick auf Confirm.“
   **Er:** bestätigt im Browser.
3. **Er:** wechselt auf Pro, bevor du veröffentlichst: links Settings
   (Einstellungen), Billing (Abrechnung), unter Plan auf Upgrade. Legt Vercel
   dabei ein Team an (Create a Team), nimmt er den Namen seines Betriebs; zum
   Testen wählt er Pro Trial. Karte eintragen, Confirm and Upgrade. Sag ihm
   vorher offen, was es kostet. Du bestätigst nie etwas, das Geld kostet.
4. `npx vercel link` und wähl dabei das Pro-Team. Das legt `.vercel/` an
   (steht in `.gitignore`). Den Projektnamen trägst du in
   `seite.json.veroeffentlichen.vercel_projekt` ein.
5. `npm run vorschau` (kostenlos, eine Vorschauadresse unter `*.vercel.app`).
   **Er:** öffnet sie.
6. `npm run veroeffentlichen`, wenn er es sagt. Bei Vercel gibt es keine Grenze.

### Netlify (günstigere Variante)

1. **Er:** legt ein Konto an, dann `npx netlify login`. **Er:** bestätigt im
   Browser.
2. `npx netlify sites:create --name <kurzer-name>`. Die Seiten-ID trägst du in
   `seite.json.veroeffentlichen.netlify_site` ein.
3. `npm run vorschau` (kostenlos). Er sieht die Vorschauadresse.
4. `npm run veroeffentlichen`, wenn er es sagt. Die Seite läuft unter
   `<kurzer-name>.netlify.app`. `veroeffentlichen` stoppt an der Grenze in
   `seite.json` (8 im Monat), weit vor Netlifys eigener.

## 1.6 Domain (web3-2)

1. Frag, wo seine Domain liegt (IONOS, Strato, united-domains, beim alten
   Baukasten, …) und ob dort ein Postfach läuft. Hat er noch keine, kauft er
   sie zuerst selbst bei einem Anbieter seiner Wahl.
2. Liegt die Domain beim Baukasten selbst (Wix, Jimdo, Squarespace): erst zu
   einem Domainanbieter umziehen, sonst kündigt er sie später mit.
3. Vercel: `npx vercel domains add <domain>` oder im Projekt Settings,
   Domains, Add Domain. Netlify: Domain management, Add a domain. Lies ihm die
   angezeigten Einträge vor, nimm genau diese.
4. **Er:** setzt beim Domainanbieter nur diese Einträge (meist A für die Domain
   selbst, CNAME für `www`). Er meldet sich dort selbst an, du fragst nie nach
   seinem Passwort. Sag ihm Feld für Feld, was hineingehört. **MX- und
   TXT-Einträge bleiben unverändert**, sonst fällt sein Postfach aus.
5. Warte auf das Zertifikat (meist Minuten, bis zu einem Tag), dann einmal
   `npm run waechter` von Hand. Einen Zeitplan richtest du in Teil 1 nicht ein.
6. Erst jetzt darf er den alten Baukasten kündigen. Such mit ihm die Frist in
   seinem Vertrag und trag sie, wenn er will, in seinen Kalender ein.

## 1.7 Ändern mit einem Satz (web3-3)

Er sagt, was anders sein soll. Du änderst, prüfst (`npm run pruefen`), zeigst
es in der Vorschau und veröffentlichst gebündelt, wenn er es sagt.

Sicherung vor jeder Veröffentlichung, ohne GitHub:
- Ist `git` vorhanden (`git --version` antwortet ohne Installationsdialog),
  leg einmal `git init` an und committe jeden Stand lokal.
- Sonst kopier den Stand ohne `node_modules`, `dist` und `.vercel` nach
  `arbeit/staende/<JJJJ-MM-TT-HHMM>/`.
- Zurück geht es außerdem über Vercel: im Pro-Tarif zu jeder früheren
  Veröffentlichung (Projekt, Deployments, Instant Rollback, oder
  `npx vercel rollback`). Nach einem Rollback gehen neue Veröffentlichungen
  erst wieder live mit `npx vercel promote` oder Undo Rollback.

Teil 1 ist fertig, wenn die Seite unter seiner Domain mit Schloss-Symbol lädt.
Schreib in `mein-betrieb.md`, was jetzt läuft, und nenn in einem Satz Teil 2
und Teil 3.

---

# Teil 2: Sieht nach dir aus

## 2.1 Vorbilder (web1-1)

Folge dem Abschnitt „Bevor du gestaltest“ in `CLAUDE.md`. Ergebnis ist
`gestaltung.md` und neue Werte in `seite.json.gestaltung`.

- Schlag ihm vor, den taste-skill zu installieren, falls er ihn noch nicht hat:
  `npx skills add https://github.com/Leonxlnx/taste-skill`. Er liegt dann in
  seinen Skills, nicht in diesem Ordner.
- **Er:** sagt Ja zu `gestaltung.md`.

## 2.2 Aufbau, Bilder, Schriften, Prüfung (web2-1 bis web2-3, web5-2)

- Bau die Startseite mit wechselnden Abschnittsarten (`ARCHITEKTUR.md`).
- Eigene Fotos: er legt sie in einen Ordner, du verkleinerst sie auf höchstens
  1600 px und 400 KB (`sips -Z 1600 --setProperty formatOptions 75`), gibst
  ihnen sprechende Namen und `alt`-Texte. Keine erzeugten Gesichter, keine
  Stockfotos von Menschen am Laptop.
- Schriften: passende Fontsource-Pakete (`npm install @fontsource/<name>`),
  Namen in `seite.json`. Nie Google Fonts einbinden.
- `npm run pruefen` bis zur Zeile `ok`, Handybreite 375 px ansehen, dann
  Vorschau und auf sein Wort veröffentlichen.

---

# Teil 3: Kontakt, Newsletter, Termine und Wächter

## 3.1 Kontaktformular (web4-1)

Schalte `seite.json.kontakt.an = true`, `npm run rechtstexte`.

**Bei Vercel** läuft es über `api/kontakt.js` und sein eigenes Postfach.

| Postfach | `KONTAKT_SMTP_SERVER` | `KONTAKT_SMTP_PORT` | Was er anlegt |
|---|---|---|---|
| Gmail, Google Workspace | smtp.gmail.com | 465 | App-Passwort, nur mit Bestätigung in zwei Schritten |
| GMX | mail.gmx.net | 587 | POP3/IMAP in den Einstellungen einschalten, mit Zwei-Faktor App-Passwort |
| web.de | smtp.web.de | 587 | POP3/IMAP in den Einstellungen einschalten, mit Zwei-Faktor App-Passwort |
| T-Online | securesmtp.t-online.de | 465 | Passwort für E-Mail-Programme im Kundencenter |
| iCloud | smtp.mail.me.com | 587 | app-spezifisches Passwort (account.apple.com) |
| IONOS | smtp.ionos.de | 465 | Passwort der Mailadresse |
| Strato | smtp.strato.de | 465 | Passwort der Mailadresse |
| Posteo | posteo.de | 465 | mit Zusatzschutz App-Passwort |
| mailbox.org | smtp.mailbox.org | 465 | mit Zwei-Faktor Anwendungspasswort |
| Outlook.com, Microsoft 365 | – | – | geht nicht zuverlässig, Microsoft schaltet den Weg ab. Netlify Forms oder ein anderes Postfach |

Stand Oktober 2026. Prüf den Server kurz beim Anbieter, bevor du ihn einträgst.

1. Du setzt mit `npx vercel env add` für Production: `KONTAKT_SMTP_SERVER`,
   `KONTAKT_SMTP_PORT`, `KONTAKT_SMTP_BENUTZER` (meist die volle Adresse) und
   `KONTAKT_AN` (wohin die Nachrichten gehen, meist seine eigene Adresse).
2. **Er:** legt das App-Passwort an (öffne ihm die Seite seines Anbieters) und
   trägt es selbst ein: Projekt bei Vercel, Settings (Einstellungen),
   Environment Variables (Umgebungsvariablen), Key `KONTAKT_SMTP_PASSWORT`,
   Value das Passwort, Save. Er schickt es dir nie, auch nicht im Chat.
3. Veröffentliche einmal neu, sonst kennt Vercel die Werte nicht.
4. Testnachricht über die Seite, prüf mit ihm, ob sie ankommt.

**Bei Netlify** läuft es über Netlify Forms. **Er:** schaltet in der
Netlify-Oberfläche unter Forms die Formularerkennung ein (Enable form
detection) und legt unter Notifications eine Mail an seine Adresse an. Dann
Testnachricht.

## 3.2 Newsletter (web4-2)

Frag MailerLite (Standard, Stand Oktober 2026 frei bis 250 Abonnenten) oder
Brevo (frei bis 300 Mails am Tag). **Er:** legt das Konto an, erstellt den
Schlüssel (MailerLite: Integrations, API, Generate new token; Brevo: oben
rechts sein Name, SMTP & API, API Keys, Generate a new API key) und trägt ihn
selbst beim Hosting-Anbieter ein (`MAILERLITE_API_KEY` oder `BREVO_API_KEY`,
bei Vercel wie oben unter Environment Variables). Du setzt die übrigen Werte
(Vercel `npx vercel env add`, Netlify `npx netlify env:set`):
`NEWSLETTER_ANBIETER mailerlite` (oder `brevo`), `NEWSLETTER_LISTE <id>`,
`SEITE_DOMAIN <domain>`, bei Brevo zusätzlich `BREVO_DOI_TEMPLATE <id>`
(vorher mit ihm in Brevo eine Bestätigungsvorlage für Double-Opt-in anlegen).
Bei MailerLite: **Er** schaltet Double-Opt-in für Anmeldungen über die
Schnittstelle ein. Danach `seite.json.newsletter.an = true`,
`npm run rechtstexte`, neu veröffentlichen, Testanmeldung mit seiner eigenen
Adresse bis zur Bestätigung.

## 3.3 Termin (web4-3, optional)

**Er** legt in Google Kalender einen Terminplan an (nur am Computer im Browser,
nicht in der App) oder bei Cal.com und gibt dir den Link. Du trägst ihn in
`seite.json.termin` ein, `an = true`, `npm run rechtstexte`.

## 3.4 Wächter (web5-3)

Nur auf einem Mac, der montags früh wach ist, am besten dem Dauerrechner.
Kopier `zeitplan/de.eigene-website.waechter.plist` nach
`~/Library/LaunchAgents/`, ersetz die Platzhalter (Node-Pfad absolut, siehe
`which node`, bei der Installation aus 1.1 also `~/.local/node/bin/node`
ausgeschrieben) und lade ihn (`launchctl bootstrap gui/$(id -u) …`). Test:
`npm run waechter`. Häng danach, wenn der Mitgliederbereich es anbietet, ein
Lebenszeichen an den Lauf, damit er eine Mail bekommt, wenn der Wächter
ausbleibt.
