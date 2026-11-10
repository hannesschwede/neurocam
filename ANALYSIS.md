# Audit: ursprüngliche MiniMax-Demo

**Ergebnis:** funktionierender UI-Prototyp mit wenigen echten Parameterchecks und Dateidownload, aber **kein geometrieverarbeitendes CAM-System**. CAD-Import, 3D-Werkstück, Werkzeugbewegung und mehrere Sicherheits-/Zeitkennzahlen sind Platzhalter bzw. voneinander entkoppelt. Nicht pauschal „alles fake“: Die Schnittgeschwindigkeitswarnung enthält tatsächlich eine korrekte Formel.

## Untersuchungsgrundlage

- URL: https://cs7js8ple3tg.space.minimax.io/
- Geprüft am 10.11.2026, Europe/Berlin.
- HTML per curl: HTTP 200, Titel „Neuro-CAM Auto-Interface System“, Vite-Favicon, Root-Container und Einstieg `/assets/index-CtCRiBjF.js`.
- Bereits vorhandenes `/workspace/mm.js` erneut mit dem öffentlich geladenen Bundle verglichen: identischer SHA-256 **`f89391b8c34485362d393876523ae5e07a6d1c0de9b27533369dc275367a7790`**, 1.065.218 Bytes.
- Methoden: statische Untersuchung der App-Routinen im minifizierten Bundle; zusätzlich nur den zuvor gelesenen, reinen Konstanten-/Validierungs-/Generatorblock isoliert in einem Node-VM-Kontext ohne App, DOM oder bereitgestellte Netzwerk-/Dateifunktionen ausgeführt. Das gesamte Bundle wurde nicht ausgeführt. Kein manueller Volltest der Originaloberfläche und kein vollständiger dynamischer Netzwerkaudit.
- Anker unten sind **0-basierte Zeichenoffsets im UTF-8-dekodierten Text**, keine Byteadressen. Minifiernamen gelten nur für diesen Hash.

## Echt oder Platzhalter?

| Bereich                 | Nachweis                                                                                                                                          | Urteil                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| CAD-Upload              | `importCADFile` (160639) liest per `FileReader.readAsText`, verwirft `s.target.result`, erkennt nur Dateiendung und speichert Metadaten.          | Kein STEP-/IGES-/STL-Geometrieparser in diesem Importpfad.                                                                                         |
| 3D-Modell               | `AB` (1025572) baut feste Box 120 × 30 × 120, Ebenen und Zylinder.                                                                                | Festes Demomodell, nicht die hochgeladene Geometrie.                                                                                               |
| Werkzeugbahn / Bewegung | `CB` (1026989) und `bB` (1027341) erzeugen eine feste Kosinus-/Sinusspirale aus 51 Punkten.                                                       | Nicht aus NC oder CAD abgeleitet; passt auch nicht zur ausgegebenen Zickzackvorlage.                                                               |
| G-Code                  | `kB` (1051663): Geometrieargument `e` unbenutzt, X/Y von −60 bis +60 und Reihenabstand 20 mm fest.                                                | Parametrisierte Vorlage, keine geometrieabhängige Bahnplanung. Spindel, Vorschub, Zustellung und Kühlmittel beeinflussen Teile des Texts wirklich. |
| Parameterchecks         | `OB` (1050544): positive Werte, globale Maxima, große Werkzeuge und Zustellung > D/2. `n × π × D / 1000` wird mit Materialgrenze verglichen.      | Echte, einfache Plausibilitätsrechnung. Kein vollständiges Schnittdatenmodell oder Sicherheitsnachweis.                                            |
| Maschinenprofil         | `Vr` enthält globale Grenzen 24.000 RPM / 12.000 mm/min; der Generator verwendet diese statt eines ausgewählten Maschinenprofils.                 | Angezeigte Profile sind nicht mit einer vollständigen profilabhängigen CAM-Prüfung verbunden.                                                      |
| Materialliste           | UI-Tabelle `NE` enthält neun Materialien, Berechnungstabelle `jb` nur drei. Hauptgenerator nutzt `geometryInfo.material` bzw. Aluminium-Fallback. | Anzeige und Berechnungsdaten sind nicht konsistent gekoppelt.                                                                                      |
| NC-Import               | `importGCode` (161076) speichert Text, zählt Zeilen/M6 und liest erstes `S(\\d+)` / `F(\\d+)`.                                                    | Kein modaler Bewegungsparser, keine NC-abhängige 3D-Simulation.                                                                                    |
| „Agenten“               | `zB` enthält feste Texte wie „Safe parameters applied“ und feste Verzögerungen 0/400/800/1200 ms.                                                 | Gescriptete Ereignis-/Rollentexte, kein Nachweis autonomer KI-Agenten.                                                                             |
| Abschlusskennzahlen     | bei 1056430: nach Complete `95`, „12 min“, „Low“, „None“.                                                                                         | Safety-Score, Zeit, Verschleiß und Kollisionsrisiko sind in dieser Anzeige hart codiert.                                                           |
| Safety-Score intern     | `FB` (1051439) addiert z. B. Punkte für Kühlmittel und geringe Zustellung.                                                                        | Arbitrarische Heuristik, keine validierte Risikobewertung. Nicht identisch mit der festen UI-95.                                                   |
| Download / Clipboard    | Browser-Blob, Objekt-URL und Clipboard-API.                                                                                                       | Reale Dateiausgabe bzw. Kopierfunktion, aber kein Beweis für brauchbares CAM.                                                                      |

## Reproduzierte Generatorprobleme

Das Ergebnis der isolierten Funktionsproben steht in [`docs/original-audit-result.json`](docs/original-audit-result.json).

Bei gleichen Bearbeitungsparametern wurden zwei verschiedene Geometrieobjekte übergeben: 20 × 30 × 40 und 300 × 400 × 500. **Der gesamte erzeugte G-Code war identisch.**

Der Generator verwendet `ceil(2 / depthOfCut)` und bricht ab, wenn die nächste volle Zustellung unter −2 mm ginge:

| Eingestellte Zustellung | Erzeugte Z-Schnittzeilen                       |
| ----------------------- | ---------------------------------------------- |
| 2 mm                    | Z−2,000                                        |
| 3 mm                    | **keine einzige** Schnitt-Zeile                |
| 0,7 mm                  | Z−0,700 und Z−1,400; der Rest bis −2,000 fehlt |

Die Vorlage behandelt also nicht einmal den letzten Rest-Tiefenschritt zuverlässig. Ausgegebene G-Code-Zeilen allein machen das Projekt nicht zu einem funktionierenden CAM.

## Weitere statische Auffälligkeiten

- Die Settings-UI ruft `setSelectedMachine` und `setSelectedMaterial` auf; im untersuchten Store existieren keine entsprechenden Definitionen. Statisch auffällig, nicht manuell durch Klicks reproduziert.
- Der NC-Viewer fügt seine Regex-hervorgehobenen, importierbaren Strings über `dangerouslySetInnerHTML` ein, ohne im sichtbaren Pfad eine HTML-Escapierung. Das ist eine potenzielle lokale HTML-/Script-Injection-Fläche; nicht ausgenutzt. Der Neubau rendert NC ausschließlich als React-Text.
- In den untersuchten App-Routinen wurde keine KI-/CAM-Backend-Anbindung gefunden. Das ist kein vollständiger Beweis, dass keinerlei Netzwerkverkehr oder weiterer Dienst existiert. Three.js enthält selbstverständlich allgemeine Asset-Lader; Branding und Schriftquellen sind ebenfalls Netzwerkressourcen.

## Konsequenz für den Neubau

Nicht die Vorlage „polieren“, sondern den Kern ersetzen: echter STL-Parser, getrennte und testbare metrische Domänenlogik, ein klar begrenzter Rechteck-Planfräser, Roundtrip von NC zu Vorschau und Zeit, ehrliche Regelhinweise. STEP/IGES, „KI-Agenten“, feste Risikowerte und vorgetäuschte Kollisionsfreiheit entfallen. Der Neubau behauptet bewusst nicht, beliebige STL-Konturen zu fräsen.

Kein Original-App-Code wurde in die neue Anwendung übernommen; kurze Audit-Zitate dienen ausschließlich der Erläuterung. Dieses Dokument ist eine gezielte Funktionsanalyse, kein vollständiges Security- oder Lizenzgutachten.
