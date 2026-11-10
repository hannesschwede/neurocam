# Architektur und Algorithmen

## Grundentscheidung

Eine statische SPA genügt: Für Parsing, Formeln und einen begrenzten Rechteckalgorithmus braucht es weder Server noch Authentifizierung. Vite liefert den Build; React komponiert die UI. Three.js wird mit dem Viewer nachgeladen und separat gechunked. Kein Backend/LLM, keine Persistenz und keine Telemetrie.

## Verantwortlichkeiten

| Datei                                | Aufgabe                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| `src/domain/types.ts`                | Explizite Vektor-, Bewegungs-, Profil- und Analyseverträge          |
| `stl.ts`                             | ASCII-/Binary-STL, Bounding Box, Kantenorientierung, Volumen        |
| `cutting.ts`                         | Metrische Formeln und Eingabeinvarianten                            |
| `profiles.ts`                        | Quellenverknüpfte Werkstoffgruppen + deklarierte Lehrannahmen       |
| `validation.ts`                      | Strukturierte Maschinen-Grenzverletzungen und Hinweise              |
| `facing.ts`                          | Rechteckauftrag → deterministische Bewegungen                       |
| `postprocessor.ts`                   | Kanonische Bewegungen → dokumentierter NC-Dialekt                   |
| `gcode.ts`                           | NC → lineare Bewegungen + erster nicht unterstützter Block          |
| `time.ts`                            | Räumliche Bewegungslängen und Bewegungszeit                         |
| `src/components/ParametersPanel.tsx` | Typisierte Eingabegruppen                                           |
| `ResultsPanel.tsx`                   | Schnittdaten, Maschinenrahmen und Regelhinweise                     |
| `Viewer.tsx`                         | Tatsächliches Mesh, Bahnen, Kamera und SVG-Fallback                 |
| `NCPanel.tsx`                        | NC-Text als React-Text, Import, Hinweise, Lernexport                |
| `src/App.tsx`                        | Zustands-/Dateiworkflow und Komposition, keine Geometriealgorithmen |

`Motion` enthält `from`, `to`, `kind` (rapid/cut) und metrischen Vorschub. Die App erzeugt die Bahn, exportiert sie und **parst denselben NC-Text** zur Darstellung und Zeitberechnung. Roundtrip-Tests prüfen Segmentanzahl, Art und Koordinaten. Das schafft einen überprüfbaren Vertrag zwischen Generator, Post und Viewer.

## STL im Detail

1. Eingabegröße und Skalierung prüfen.
2. Bei konsistenter Binärlänge `84 + 50 × count` binär lesen, auch wenn der Header `solid` enthält. Sonst vollständige ASCII-Facetten mit normal/outer loop/3 Vertices/endloop/endfacet verlangen. Keine STEP-Erkennung nach Dateinamen.
3. Endliche Koordinaten und Dreiecksbudget prüfen. Bounding Box über sämtliche Vertices berechnen.
4. Pro Dreieck drei kanonisch sortierte Kanten registrieren. Eine geschlossene, konsistent orientierte Kante muss genau zweimal, in entgegengesetzter Richtung vorkommen. Degenerierte Dreiecke verhindern einen positiven Netzstatus.
5. Orientiertes Volumen mit `dot(a, cross(b,c))/6` summieren; zur numerischen Stabilität zuvor den Box-Minimalpunkt abziehen. Absoluten Gesamtwert nur bei geschlossenem Kantenstatus ausgeben.

Parsing und Kantenaufbau sind linear in der Dreiecksanzahl, Speicherbedarf ebenfalls. Koordinaten werden für die Kantenprüfung exakt verglichen; fast gleiche Vertices werden nicht willkürlich verschweißt. Selbstüberschneidungen, überlappende Körper und verschachtelte Schalen werden nicht geometrisch geprüft. „Kanten geschlossen“ ist daher bewusst nicht „gültiger CAD-Solid“.

## Planfräsen im Detail

G54 liegt an einer Rohteilecke, Z0 an der Oberseite. Das Rechteck reicht von X0 bis Breite und Y0 bis Höhe. Z-Schichten enden bei `-min(Gesamtabtrag, Schicht × Zustellung)`, wodurch ein Restschritt exakt endet. Rohteilhöhe muss größer als der Gesamtabtrag bleiben.

Anfahrt beginnt bei `X = -D/2 - 2 mm`, die gegenüberliegende Bahngrenze bei `Breite + D/2 + 2 mm`. So erfolgen Zustellung und Reihenwechsel außerhalb des gedachten Rechtecks. Y-Reihen beginnen bei 0 und enden exakt bei der Rohteilhöhe; der Abstand ist höchstens D. Jede Reihe wechselt die X-Richtung. Zwischen Tiefenschichten und vor XY-Eilgängen wird auf Sicherheits-Z zurückgezogen. Maximal 10.000 Segmente verhindern Rechen-/Darstellungsüberlastung.

Das Werkzeug überfährt die komplette Rechteckfläche. **Es wird kein STL geschnitten und keine geschützte Kontur abgeleitet.** Der Algorithmus ist deswegen Planfräsen, nicht echtes Taschenfräsen oder Z-Level-Schruppen. Er besitzt weder Werkzeughalter- noch Spannmittelwissen.

Der Postprozessor prüft eine kontinuierliche kanonische Bahn: erster Schritt reiner Z-Rückzug aus dem angenommenen Vorschau-Ursprung, keine XY-Eilgänge unter Sicherheits-Z, letzter Punkt auf Sicherheits-Z. Der erste NC-Verfahrblock enthält keine XY-Wörter. Werkzeugwechsel T1/M6 setzt voraus, dass sich die Maschine vor Programmstart in einer geeigneten, unabhängig geprüften Wechsel-/Freiposition befindet. Ein generischer Post kann das nicht garantieren.

## NC-Teilmenge und Fehlermodell

Unterstützte Bewegungen: G0/G1; modale Achsen/Vorschübe, G20/G21, G90/G91. G17/G40/G43/G49/G54/G80/G94 und grundlegende Werkzeug-/Spindel-/Kühlmittel-Metadaten werden akzeptiert, ohne reale Offset-/Werkzeuggeometrie zu simulieren. G43/H-Werte und G54 gelten als extern eingerichtet. Startannahmen sind XYZ0, mm, absolut und Vorschub pro Minute. Ohne expliziten G0/G1-Modus werden Achsbewegungen abgelehnt.

G2/G3, andere Ebenen, Zyklen, Unterprogramme, Makros, G53/G55/G92, unbekannte Wörter, doppelte Achsen oder widersprüchliche Modi stoppen die Vorschau am ersten betroffenen Block. Bereits geparste Segmente bleiben als **Teilvorschau** sichtbar; Zeit und Export werden bei Parserfehlern gesperrt. M2/M30 beendet das Programm. Es wird kein importierter Text ausgeführt oder als HTML interpretiert.

Die Zeit ist die Summe räumlicher Segmentlängen geteilt durch Vorschub; Eilgang nutzt einen separaten Modellwert. Einheiten werden beim Parsen nach mm konvertiert. Keine Beschleunigungen, Maschinenwechselzeiten, Spindelrampen oder Warte-/Stopzeiten. Nicht mit einer vollständigen Maschinen-Taktzeit verwechseln.

## Fehlereingaben und Browsergrenzen

Leere, negative, nicht-endliche oder unpassende Parameter führen zu lesbaren Meldungen statt stillen Fallbacks. Maschinenverletzungen sperren die generierte Bahn/NC. Warnungen sind keine Freigaben. NC-Import hat einen sichtbaren separaten Modus; Formularwerte werden nicht fälschlich als importierte Schnittdaten ausgegeben.

STL max. 10 MiB/100.000 Dreiecke, NC max. 1 MB/20.000 Zeilen, Vorschau-Textanzeige max. 400 Zeilen. Der vollständige unterstützte NC-Text bleibt exportierbar. Große Parsing-Arbeiten laufen derzeit synchron, nicht in einem Worker. Die Budgets begrenzen, beseitigen aber nicht jede mögliche UI-Pause.

## Nächste sinnvolle Schritte

Keine ungetesteten Zusatzfeatures vortäuschen: Worker für große Meshes, toleranzbewusste Topologie, mehr Tastatur-/Screenreader-Prüfungen, unabhängige CNC-Fachprüfung und ein steuerungsspezifisch qualifizierter Post wären reale Weiterentwicklung. Konturerhaltendes CAM erfordert darüber hinaus wesentlich mehr Geometriearbeit.
