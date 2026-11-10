# Für Hannes: erklären können statt nur vorzeigen

## Ein Satz, der stimmt

„Ich habe einen browserbasierten 3-Achs-CAM-Prototyp aufgebaut, der STL-Dateien analysiert, Schnittdaten berechnet und rechteckige Planfräsbahnen samt NC-Parser und 3D-Vorschau enthält. Der Umfang ist bewusst begrenzt und die Entwicklung war KI-unterstützt.“

Die App läuft lokal, ist getestet und dokumentiert. Sie ist **kein fertigungsfreigegebenes industrielles CAM**. Remote-Repo-Erstellung, Push und Veröffentlichung sind noch nicht erfolgt; lokal ist der Projektstand in Git festgehalten.

## Warum dieses Projekt mehr als ein Re-Skin ist

Der untersuchte Ausgangsprototyp ignorierte den CAD-Dateiinhalt, zeichnete ein festes Werkstück und eine feste Spirale und exportierte eine starre Zickzackvorlage. Manche Parameterchecks waren echt, aber Zeit und Risikokennzahlen waren fest verdrahtet. Im Neubau werden echte Dateidreiecke eingelesen und getrennte TypeScript-Algorithmen benutzt. Keine ursprüngliche App-Implementierung wurde übernommen. Details und Proben stehen in `ANALYSIS.md`.

## Architektur im Gespräch

**React** zeigt Eingaben, Ergebnisse und Fehler. **Reine TypeScript-Module** rechnen und parsen unabhängig vom UI. **React Three Fiber** visualisiert tatsächlich importierte Geometrie und die aus NC gelesenen Bewegungen. Der Generator schreibt ein gemeinsames Bewegungsmodell; der Postprozessor macht daraus NC. Der Parser liest genau diesen NC-Text für Vorschau und Zeit zurück.

Dafür braucht es kein Backend. Next.js, Supabase oder Stripe wären erst bei einer echten Server-/Persistenz-/Abrechnungsanforderung sinnvoll. Nicht jeder Tech-Stack muss in jedes Projekt.

## Die wichtigsten Algorithmen

### 1. STL

ASCII-STL enthält lesbare Facetten, Binary-STL feste 50-Byte-Dreiecksdatensätze nach einem 84-Byte-Header. Ein binärer Header darf ebenfalls mit `solid` anfangen; deshalb zuerst die Datensatzlänge prüfen.

Kleinste/größte Achsenwerte aller Vertices liefern die Bounding Box. Für das Volumen werden orientierte Tetraedervolumina `dot(a,cross(b,c))/6` summiert. Vorher wird der Ursprung zur Box-Minimalecke verschoben, um Auslöschung bei weit entfernten Koordinaten zu reduzieren. Jede Kante muss zweimal in Gegenrichtung vorkommen. Bei offenem/falsch orientiertem Netz wird kein belastbares Volumen behauptet. Selbstüberschneidungen werden trotzdem nicht geprüft.

Das eigene Stufenblock-Beispiel ist nachrechenbar: `80 × 50 × 14 + 50 × 50 × 10 = 81.000 mm³ = 81 cm³`.

### 2. Schnittdaten

Werkzeugumfang ist π·D. Daher `n = Vc·1000/(π·D)`. Vorschub `vf = n·z·fz`. Zeitspanvolumen `Q = ae·ap·vf/1000` in cm³/min. Näherungs-Schnittleistung `Pc = kc·ae·ap·vf/60.000.000`, Antriebsleistung `Pc/η`.

Vc-Bereiche stammen aus Harvey Tools allgemeinen Vollhartmetall-Werkstoffgruppen; Formeln aus Sandvik Coromant. fz, kc und η sind sichtbar gekennzeichnete Modellannahmen, keine konkreten Werkzeugfreigaben. Die gewählten Maschinen sind ebenfalls ausdrücklich Lehrprofile.

### 3. Planfräsen

Ein Rechteck wird in parallelen, wechselnden X-Bahnen abgefahren. Reihen enden exakt an der Y-Grenze, Tiefenschichten exakt am Gesamtabtrag. Außenanfahrt in X mit Radius + 2 mm; vor XY-Eilgängen wird auf Sicherheits-Z zurückgezogen. Der erste NC-Verfahrblock bewegt nur Z.

Die STL-Kontur wird **nicht** als geschützte Geometrie benutzt. Das Verfahren kann erhabene Merkmale entfernen. Eine simple Bounding-Box-Bahn ist kein allgemeines Formschruppen und keine echte Taschenbearbeitung.

### 4. NC und Zeit

G-Code ist modal. Ein G1 oder Vorschub gilt weiter, ebenso Einheiten und absoluter/inkrementeller Modus. Der Parser verfolgt das und stoppt bei unbekannten Bewegungen, statt zum Beispiel G2 als Gerade zu erfinden. Startposition XYZ0 und externe Offsets sind dokumentierte Annahmen.

Zeit ist nur die Summe räumlicher Strecken geteilt durch Vorschübe, inklusive vereinfachtem Eilgang. Werkzeugwechsel, Beschleunigung, Spindelhochlauf und Stopzeiten fehlen. Daher heißt sie Bewegungszeit, nicht verifizierte Maschinenzykluszeit.

## Einarbeitung vor der Vita

1. `npm ci`, `npm test`, `npm run build`, `npm run dev` selbst ausführen.
2. In `tests/cutting.test.ts` den Fall D10, Vc = π·100, z4, fz0,05 nachrechnen: 10.000 RPM, 2.000 mm/min, bei ae5/ap2: 20 cm³/min.
3. Im UI Rohteil X verändern und die neue X-Endposition im NC erklären: Breite + Radius + 2 mm.
4. `tests/gcode.test.ts` öffnen: Warum muss der allererste NC-Verfahrblock ohne XY sein? Welche externe Start-/Wechselposition bleibt trotzdem ungeprüft?
5. Eine offene STL und eine NC-Datei mit G2 importieren. Erklären, warum die Anwendung dort Einschränkungen anzeigt.
6. Eine eigene kleine Verbesserung samt Regressionstest vornehmen und nachvollziehbar committen.

## Ehrliche CV-Zeilen

Erst verwenden, wenn du die Implementierung tatsächlich nachvollzogen hast; bei Nachfragen KI-Unterstützung transparent benennen. Wähle 2–3 Zeilen, nicht alle als voneinander unabhängige Großprojekte darstellen.

- **„Entwicklung eines browserbasierten 3-Achs-CAM-Prototyps mit React und TypeScript: ASCII-/Binary-STL-Analyse, Schnittdatenberechnung und interaktive 3D-Werkzeugbahnvorschau.“**
- **„Implementierung eines deterministischen Rechteck-Planfräsalgorithmus mit Fanuc/Haas-artigem NC-Export und modalem G0/G1-Parser; Absicherung der Kernlogik durch 52 Unit-Tests und 4 Browser-E2E-Tests.“**
- **„Konzeption einer deutschsprachigen technischen Oberfläche mit transparenten Modellannahmen, Maschinen-Plausibilitätsprüfungen und dokumentierten Sicherheitsgrenzen.“**

Nicht behaupten: autonome KI-CAM, produktionsreife Kollisionsprüfung, 5-Achs-Generierung, STEP-/IGES-Import, beliebiges STL-zu-Fertigteil-CAM oder ausschließlich eigenhändig ohne Unterstützung geschriebener Code.

## Was eine unabhängige Fachperson noch prüfen müsste

Steuerungsspezifischer Post, Werkzeug-/Offsetbehandlung, sichere Start-/Wechselposition, Spannmittel und Halter, reale Zerspanungswerte, Dynamik und Werkstoffzustand. Automatisierte Softwaretests ersetzen diese Maschinen-/Prozessvalidierung nicht.
