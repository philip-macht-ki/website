// Blendet einen Fehlerhinweis über einem Formular ein, wenn die Adresse
// ?fehler=1 oder ?fehler=2 trägt. Gilt für Newsletter (lib/newsletter.mjs)
// und, auf Vercel, für Kontakt (api/kontakt.js). Ohne dieses Skript bleibt
// das Formular voll nutzbar, es fehlt dann nur dieser zusätzliche Hinweis.
(function () {
  var meldungen = {
    '1': 'Bitte prüfen Sie Ihre Angaben (bei der Anmeldung auch das Häkchen) und versuchen Sie es erneut.',
    '2': 'Das hat gerade nicht geklappt. Bitte versuchen Sie es in ein paar Minuten noch einmal.',
  };

  var parameter = new URLSearchParams(window.location.search);
  var code = parameter.get('fehler');
  if (!code || !meldungen[code]) return;

  var ziel = document.querySelector('[data-formular-fehler]');
  if (!ziel) return;

  ziel.textContent = meldungen[code];
  ziel.hidden = false;
})();
