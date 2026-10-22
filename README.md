# Die eigene Website

Eine Vorlage für Selbstständige, die keine Programmierer sind. Du sagst
deinem Claude, was auf der Seite stehen soll, welche Farben sie hat und ob du
ein Kontaktformular, einen Newsletter oder einen Terminknopf willst. Er baut
und pflegt den Rest: Text, Gestaltung, Formulare, Rechtstexte, Veröffentlichung.

Sag deinem Claude: Hol dir die Vorlage github.com/philip-macht-ki/website und
bau mir daraus meine Website.

## Was du brauchst

- Einen Mac mit der Claude-App (Code-Tab) und deinem Claude-Abo.
- Ein Konto beim Hosting-Anbieter, nur mit deiner E-Mail-Adresse, ohne
  GitHub: Vercel (Standard, für gewerbliche Seiten der Pro-Tarif, Stand
  Oktober 2026 20 US-Dollar im Monat plus Steuer) oder, günstiger, Netlify
  (kostenloser Free-Tarif mit 300 Credits im Monat).
- Eine eigene Domain.
- Später, falls gewünscht: ein App-Passwort deines Postfachs für das
  Kontaktformular und ein Konto bei MailerLite oder Brevo für den Newsletter.

Kein Homebrew, kein Admin-Passwort, kein Befehl zum Abtippen. Was fehlt,
installiert dein Claude in deinen Benutzerordner. Konten anlegen, im Browser
bestätigen und bezahlen machst du selbst, Schritt für Schritt mit deinem
Claude. Die Reihenfolge steht in `einrichten.md`.

## Wie die Seite gebaut ist

Die Seite ist statisches HTML (Astro), läuft schnell und braucht keine
Datenbank. Alle Texte liegen als einfache Dateien im Ordner `inhalt/`, alle
Einstellungen in `seite.json`. Wer mehr über den technischen Aufbau wissen
will, findet ihn in `ARCHITEKTUR.md`.

## Lizenz

MIT, siehe `LICENSE`.
