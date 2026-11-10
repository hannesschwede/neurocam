# NeuroCAM – Designentwurf und Übergabe

**Historischer Designentwurf. Nach späterem Go-ahead eigenständig lokal umgesetzt. Aktueller Stand: README.md, ANALYSIS.md und docs/ARCHITEKTUR.md.**

## Richtung

1. **Empfohlen:** Vite + React + TypeScript + React Three Fiber, statisches 3-Achs-CAM-Labor: echte STL-Analyse, Schnittdaten, rechteckiges Planfräsen, NC-Import/-Export und Vorschau. Klarer, testbarer Umfang ohne unnötige Accounts.
2. Next.js mit identischen reinen Domänenmodulen: passt zu Hannes’ Stack, benötigt für diesen Umfang aber keinen Server.
3. STEP/IGES mit OpenCascade/WASM: deutlich größerer Kernel-/Lizenz-/Testumfang, nicht MVP.

Kein Supabase oder Stripe nur für eine Tech-Stack-Liste. Keine KI-/Agentenbehauptungen. „NeuroCAM“ darf Projektname sein, nicht Funktionsversprechen. Keine kopierten MiniMax-Quellen im Rebuild.

## Oberfläche

Deutsche UI, ruhiger technischer Stil (Graphit, helle Schrift, Cyan für Bahnen, Orange für Warnungen). Links Werkstück und Bearbeitungsparameter, zentral 3D, rechts Kennzahlen und nachvollziehbare Regelhinweise. Darunter NC-Panel mit Zeilennummern, Import/Export, Parserwarnungen und Zeitschätzung. Mobile untereinander; Labels, Tastatur, sichtbarer Fokus und nicht nur farbcodierte Zustände.

## Fachliche Anforderungen

### STL

ASCII und Binary; binäre Header können mit `solid` beginnen. Längen, Dateigröße, Dreiecksbudget und endliche Koordinaten prüfen. STL hat keine verlässlichen Einheiten: mm explizit annehmen oder Skalierung abfragen. Bounding Box aus Vertices; Volumen über `abs(sum(dot(a,cross(b,c))/6))` nur bei geschlossenem, konsistent orientiertem Mesh als belastbar anzeigen. Offene/degenerierte Netze warnen. STEP/IGES klar ablehnen statt nur einen Dateifilter anzubieten.

### Schnittdaten

- Drehzahl `n = Vc*1000/(pi*D)` in 1/min bei Vc m/min und D mm.
- Vorschub `vf = n*z*fz` in mm/min; z ganzzahlig, fz mm/Zahn.
- Zeitspanvolumen `Q = ae*ap*vf/1000` in cm³/min.
- Näherungs-Schnittleistung `Pc = kc*ae*ap*vf/60000000` in kW bei kc N/mm²; Antriebsleistung `Pc/eta`.
- Werkzeug-/Beschichtungs-/Eingriffsannahmen sichtbar. kc ist keine universelle Materialkonstante.
- Herstellerquellen während Implementierung wirklich öffnen: Tabelle mit Quelle, Bereich, Auswahlwert und Annahmen. Keine erfundenen Belege.
- Drehzahllimit nicht still kappen: Wunsch-/Ist-Werte zeigen und Vorschub sowie Vc konsistent neu rechnen.

### Maschinen

Generisches editierbares Profil zuerst. Markenprofile nur mit belegter Variante. n, vf, Leistung und gesamten Weg inklusive Werkzeugradius/Überlauf/Sicherheits-Z prüfen. Verfahrweg passt ≠ kollisionsfreie Aufspannung. Ein auswählbarer 5-Achs-Maschinenname macht den Generator nicht 5-achsig.

### Werkzeugweg

Nur **Planfräsen eines definierten rechteckigen Rohteils**, optional aus STL-Bounding-Box initialisiert. Kein konturerhaltendes STL-Schruppen, kein echtes Pocketing. Warnung: kann Modellmerkmale abtragen. G54 X/Y an Rohteilecke, Z0 an Oberseite; Ziel-Z negativ, sichere Ebene positiv. Reihenabstand maximal Werkzeugdurchmesser, letzte Reihe und Tiefenschicht exakt. Werkzeugradius, nötigen Außenüberlauf und Spannmittel erklären. XY-Eilgänge nur bei sicherem Z; Zustellung mit separatem Vorschub. Segment-/Tiefenbudgets gegen Browserblockade.

NC mit klarer modaler Initialisierung (G21 G90 G17 G94 G40 G49 G80, G54), Werkzeugwechsel, dokumentierter Werkzeuglängenkorrektur G43 H, Spindel/Kühlmittel, Vorschüben, Rückzug und M9/M5/M30. Kein universell maschinensicheres NC versprechen; Offsets/Werkzeuge/Steuerung müssen fachlich geprüft werden. Simulation, Dry Run und Freigabe vor echter Maschine.

### NC-Parser und Zeit

Dokumentierte Teilmenge: G0/G1, modale Achsen/Vorschübe, G20/G21, G90/G91, Kommentare, Zeilennummern. Nicht implementierte Arcs/Zyklen/Makros/Offsets sichtbar melden, niemals still ignorieren oder als Geraden verfälschen. Bei unbekannter Bewegung kein scheinbar vollständiges Simulationsergebnis.

Zeit aus räumlicher Strecke/Vorschub; Eilgang separat, Einheitenwechsel korrekt. Beschleunigung, Werkzeugwechsel und Spindelhochlauf fehlen oder werden ausdrücklich modelliert: keine verifizierte Taktzeit.

## Modulgrenzen

- `src/domain/stl.ts`: Parser/Meshanalyse, ohne React/Three-Abhängigkeit.
- `cutting.ts`, `profiles.ts`, `validation.ts`: Einheiten, belegte Werte, strukturierte Fehlercodes.
- `facing.ts`: validierter Auftrag → Bewegungsmodell.
- `postprocessor.ts`: Bewegungsmodell → dokumentierter NC-Dialekt.
- `gcode.ts`: NC → Bewegungen + Unsupported-Meldungen.
- `time.ts`: Bewegungen → Näherungszeit.
- `src/components/`: Upload, Formulare, Kennzahlen, Viewer, NC und Hinweise.
- `src/App.tsx`: Workflow, keine eingebetteten Fachalgorithmen.
- Tests bei Domänenmodulen, deterministische Fixtures unter `public/examples/`.

Gemeinsames Bewegungsmodell verhindert abweichende Vorschau und Ausgabe. Export wieder parsen und numerisch vergleichen.

## Verifikation / Abnahme

Tests zuerst schreiben, erwartetes Scheitern beobachten, minimal implementieren.

1. ASCII-/Binary-Würfel, Binary-Header `solid`, abgeschnittene Dateien, NaN/Infinity, offene/degenerierte Netze, Bounding Box und Volumen.
2. Nachrechenbare Schnittdaten, Einheiten, Null/negative/Nichtzahl-Eingaben, Schneidenzahl, Grenzwerte und Drehzahl-Neuberechnung.
3. Flächenabdeckung, unteilbarer Reihenabstand, mehrere Tiefen, exaktes Ziel-Z, keine XY-Eilgänge unter Sicherheits-Z, begrenzte Segmentzahl.
4. NC-Roundtrip, modale Eingaben, kompakte Tokens, Kommentare, inch/mm, absolut/inkrementell, unbekannte Bewegungen sichtbar abgelehnt.
5. Zeit für analytisch bekannte räumliche Bewegungen, fehlender Vorschub und Einheitenwechsel.
6. `npm run test -- --run`, `npm run lint`, `npm run build` frisch ausführen und echte Ausgaben dokumentieren.
7. Browser-E2E: Beispiel → Werte → Parameter ändern → Bahn ändert sich → Export → Reimport → gleiche Bahn. Eigene STL, ungültige Datei, Mobilansicht, Tastatur und WebGL-Ausfall testen.
8. Screenshots aus tatsächlich laufendem Build (Desktop, mobil, NC-Workflow), keine Mockups als fertige App ausgeben.
9. README DE + kurzer EN-Abschnitt, Quellen, Architektur, Grenzen, Safety, Setup, Teststand, ehrliche KI-Unterstützungsangabe.

## Aktueller Übergabestatus

Der spätere Auftrag hat die lokale Eigenimplementierung auf der Box ausdrücklich freigegeben. Sie liegt in diesem Ordner und wurde automatisiert verifiziert. Kein CloudAgent wurde verwendet. Kein Remote-Repository erstellen, nichts pushen und nichts deployen: Veröffentlichung und GitHub-Anmeldung übernimmt der Parent separat. Die früheren Tool-/Freigabe-Blocker dieses Entwurfs sind daher nicht der aktuelle Implementierungsstatus.
