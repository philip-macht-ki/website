# Die eigene Website

Eine Vorlage für Selbstständige, die keine Programmierer sind. Du sagst
deinem Claude, was auf der Seite stehen soll, welche Farben sie hat und ob du
ein Kontaktformular, einen Newsletter oder einen Terminknopf willst. Er baut
und pflegt den Rest: Text, Gestaltung, Formulare, Rechtstexte, Veröffentlichung.

Sag deinem Claude: Hol dir die Vorlage github.com/philip-macht-ki/website und
bau mir daraus meine Website.

## Was du brauchst

- Einen Computer mit Claude Code.
- Ein Konto beim Hosting-Anbieter: Vercel (Standard, für gewerbliche Seiten
  der kostenpflichtige Pro-Tarif) oder, günstiger, Netlify (kostenloser
  Free-Tarif).
- Eine eigene Domain (kann später dazukommen).
- Falls gewünscht: ein Konto bei MailerLite (Standard, frei bis 250
  Abonnenten) oder, für mehr kostenlos, Brevo (300 Mails am Tag frei) für den
  Newsletter.

Alles Weitere, Konten anlegen, Schlüssel eintragen, im Browser bestätigen,
macht dein Claude mit dir zusammen, Schritt für Schritt.

## Wie die Seite gebaut ist

Die Seite ist statisches HTML (Astro), läuft schnell und braucht keine
Datenbank. Alle Texte liegen als einfache Dateien im Ordner `inhalt/`, alle
Einstellungen in `seite.json`. Wer mehr über den technischen Aufbau wissen
will, findet ihn in `ARCHITEKTUR.md`.

## Lizenz

MIT, siehe `LICENSE`.
