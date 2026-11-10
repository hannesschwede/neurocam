# Verifikationsprotokoll

10.11.2026, Europe/Berlin. Box: Linux, Node 24.22.1, npm 11.21.1.

## Frisch ausgeführt nach Implementierung und Refactoring

| Schritt                        | Ergebnis                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `npm ci`                       | Erfolgreich, sauberer Lockfile-Install                                          |
| `npm test`                     | 4 Dateien, **52 Tests bestanden**, keine fehlgeschlagenen Tests                 |
| `npm run lint`                 | Exit 0, keine ESLint-Meldungen                                                  |
| `npm run build`                | Strikter TypeScript-Check + Vite 8.3.7, Exit 0; keine Chunkgrößenwarnung        |
| `npm run test:e2e`             | **4 Chromium-Tests bestanden** gegen laufenden Produktionspreview auf Port 4173 |
| `npm run format:check`         | Alle erfassten Dateien im Prettier-Stil                                         |
| `npm audit`                    | **0 bekannte Schwachstellen** zum Prüfzeitpunkt                                 |
| `node scripts/screenshots.mjs` | 6 echte PNG-Screenshots; **0 unbehandelte Seitenfehler**                        |

Die Browser-Tests decken echten Dateidownload/-reimport, NC-Roundtrip, einen bewusst nicht unterstützten Kreisbogen, ungültige STL, Grenzverletzungen, tatsächlichen STL-Import, mobile Breite/Draufsicht und einen absichtlich ausgelösten WebGL-Ausfall mit nutzbarer 2D-Ersatzdarstellung ab.

Die Domänen-Tests wurden zuerst gegen nicht implementierte Funktionen ausgeführt (31 fachliche Positivtests schlugen wie erwartet fehl); danach implementiert und grün gemacht. Zusätzliche Review-Regressionsfälle für ersten Z-only-Verfahrblock, Kommentarlexing und Postprozessor-Invarianten wurden ebenfalls zuerst rot, danach grün beobachtet. Tests auf ungültige Eingaben bestanden teilweise bereits bei den anfänglichen werfenden Stubs; deren positive Gegenfälle prüfen die tatsächliche Implementierung.

## Screenshots

- `desktop-overview.png`: Desktop-Viewport, 1512 × 1100.
- `desktop.png`: komplette Desktop-Seite.
- `arbeitsraum-3d.png`: tatsächliche WebGL-Szene mit STL, Rohteilrahmen und Bahnen.
- `nc-werkbank.png`: NC-Panel.
- `mobile.png`: mobiler Viewport, 390 × 844.
- `mobile-full.png`: komplette mobile Seite.

Alle unter `docs/screenshots/`, aus einem separaten Headless-Testbrowser ohne Desktopprofil oder Anmeldung, ausschließlich gegen localhost. Dateien wurden visuell geöffnet und überprüft. Kein generiertes Mockup.

## Grenzen der Verifikation

- Softwaretests und Selbstreview, **keine unabhängige CNC-Fachprüfung**.
- Kein Lauf auf einer echten Maschine und keine steuerungsspezifische Post-Qualifikation.
- Keine umfassende Browsermatrix oder vollständige Accessibility-/Security-Zertifizierung.
- Erwartete Entwicklungs-/Testhinweise: Playwright kann eine NO_COLOR/FORCE_COLOR-Umgebungswarnung melden; R3F/Three kann im Dev-Modus einen THREE.Clock-Deprecation-Hinweis ausgeben. Ein absichtlich deaktiviertes WebGL erzeugt im Fehlertest einen abgefangenen Rendererfehler. Normale Produktionsscreenshots hatten keine unbehandelten Seitenfehler.
- Kein Remote-Repository erstellt, kein Push und kein öffentliches Deployment.
