// Trägt beim Laden der Seite die Uhrzeit in jedes versteckte Feld
// "formular_geladen" ein. api/kontakt.js (Vercel) vergleicht das beim
// Absenden mit der aktuellen Uhrzeit: kommt die Nachricht weniger als drei
// Sekunden später an, gilt das als Bot. Nur auf Vercel eingebunden, siehe
// KontaktFormular.astro. Ohne dieses Skript (kein JavaScript beim Besucher)
// bleibt das Feld leer; die Nachricht geht dann trotzdem raus, mit dem
// Betreffzusatz „ohne Zeitprüfung“. Keine Anfrage geht still verloren.
(function () {
  var zeit = String(Date.now());
  document.querySelectorAll('[data-formular-geladen]').forEach(function (feld) {
    feld.value = zeit;
  });
})();
