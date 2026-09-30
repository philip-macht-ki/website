// Vertrag: ARCHITEKTUR.md. Statischer Bau, keine Server-Adapter.
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

const seite = JSON.parse(
  readFileSync(new URL('./seite.json', import.meta.url), 'utf-8')
);

// Newsletter- und Termin-Seiten liegen nicht unter src/pages/, sondern unter
// src/optional/, und werden hier nur eingehängt, wenn seite.json sie
// einschaltet. So bleibt „Seite gar nicht bauen“ möglich, ohne bei jedem
// Umschalten Dateien zwischen Ordnern zu verschieben. Termin hat aktuell
// keine eigene Seite, nur eine Sektion und einen Knopf, die sich in ihren
// eigenen Komponenten über seite.json.termin.an abschalten.
function optionaleSeiten() {
  return {
    name: 'optionale-seiten',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        if (seite.newsletter.an) {
          injectRoute({
            pattern: '/newsletter',
            entrypoint: './src/optional/newsletter.astro',
          });
          injectRoute({
            pattern: '/newsletter-danke',
            entrypoint: './src/optional/newsletter-danke.astro',
          });
          injectRoute({
            pattern: '/newsletter-bestaetigt',
            entrypoint: './src/optional/newsletter-bestaetigt.astro',
          });
        }
      },
    },
  };
}

export default defineConfig({
  site: `https://${seite.domain}`,
  // Kein Trailing Slash: Astro baut /kontakt-danke.html, Netlify serviert das
  // Datei-basiert unter /kontakt-danke, genau die Adresse aus der
  // Formular-Aktion in KontaktFormular.astro.
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [optionaleSeiten()],
});
