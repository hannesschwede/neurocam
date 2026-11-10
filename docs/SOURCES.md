# Quellen und Annahmen

Geöffnet und geprüft am 10.11.2026 (Europe/Berlin). Die Quellen belegen Formeln bzw. allgemeine Werkstoffgruppen, nicht die Eignung eines bestimmten Werkzeugs oder einer Maschine.

## Formeln: Sandvik Coromant

[Milling formulas and definitions](https://www.sandvik.coromant.com/en-gb/knowledge/machining-formulas-definitions/milling-formulas-definitions)

| Größe                    | Formel im Projekt              | Einheiten                        |
| ------------------------ | ------------------------------ | -------------------------------- |
| Drehzahl n               | `Vc × 1000 / (π × D)`          | 1/min; Vc m/min, D mm            |
| Bahnvorschub vf          | `n × z × fz`                   | mm/min; fz mm/Zahn               |
| Zeitspanvolumen Q        | `ae × ap × vf / 1000`          | cm³/min; ae, ap mm               |
| Netto-Schnittleistung Pc | `kc × ae × ap × vf / 60000000` | kW; kc N/mm²                     |
| Antriebsleistung         | `Pc / η`                       | kW; η dimensionslos              |
| Bewegungszeit            | `Strecke / Vorschub`           | min; Strecke mm, Vorschub mm/min |

Kein Modell für Spanverdünnung, unterbrochenen Schnitt, Werkzeugverschleiß, Rattern oder dynamische Maschinenleistung. Erste Reihe bzw. Ein-/Austritt können vom Nenn-Eingriff abweichen; bei ae < D/2 erscheint ein zusätzlicher Hinweis. Die Leistung dient ausschließlich einer groben Lehrmodell-Plausibilisierung.

## Schnittgeschwindigkeitsbereiche: Harvey Tool

[General Machining Guidelines](https://www.harveytool.com/resources/general-machining-guidelines), Tabellen „Carbide End Mills Non-Ferrous“ und „Carbide End Mills Iron, Steel, Stainless“.

Exakte Umrechnung: **1 SFM = 0,3048 m/min**.

| Profil            | Quellgruppe                                               | Quelle SFM | Umgerechnet m/min | Gewählter Vc-Start |
| ----------------- | --------------------------------------------------------- | ---------- | ----------------- | ------------------ |
| Al 6061-T6/T651   | 2024-T4/T6, 2014, 6061-T6/T651, 7075-T6                   | 800–1500   | 243,84–457,20     | 250                |
| Al 7075-T6        | dieselbe Gruppe                                           | 800–1500   | 243,84–457,20     | 250                |
| Stahl 1018, weich | Low Alloy 10XX, 11XX, 13XX                                | 100–300    | 30,48–91,44       | 60                 |
| Edelstahl 304     | Austenitic 304, 310, 314, 316, 321, 330, 347, 348, 21-6-9 | 100–250    | 30,48–76,20       | 45                 |

Die Quelle hat zusätzlich **durchmesserabhängige** Zahnvorschübe. Sie werden nicht als universelle Projektvorgabe ausgegeben. Werkzeugprodukt, Beschichtung, Schnittart und Aufspannung müssen unabhängig ausgewählt werden. Die Vc-Bereiche sind Orientierung, keine „sicheren Grenzwerte“.

## Explizite Projektannahmen, nicht aus der Quelle übernommen

| Profil        | fz-Start mm/Zahn | angenommener kc N/mm² |
| ------------- | ---------------- | --------------------- |
| Al 6061       | 0,06             | 700                   |
| Al 7075       | 0,06             | 800                   |
| Stahl 1018    | 0,04             | 1800                  |
| Edelstahl 304 | 0,025            | 2400                  |

Diese Zahlen sind transparente, editierbare Lehrmodell-Startwerte für einen gedachten Vollhartmetall-Schaftfräser. kc hängt u. a. von Spanungsdicke und Schneidengeometrie ab; kein universeller Werkstoffkennwert. Wirkungsgrad-Startwert η = 0,8 ebenfalls angenommen. Kein Werkzeughersteller hat diese Kombination freigegeben.

## Maschinenprofile: bewusst generisch

| Modell       | n max        | vf max       | Wegspanne X/Y/Z mm | Antriebsleistung | modellierter Eilgang |
| ------------ | ------------ | ------------ | ------------------ | ---------------- | -------------------- |
| 3-Achs-Labor | 12.000 1/min | 6.000 mm/min | 500 / 400 / 300    | 7,5 kW           | 12.000 mm/min        |
| Kompaktfräse | 8.000 1/min  | 3.000 mm/min | 300 / 200 / 180    | 2,2 kW           | 6.000 mm/min         |

Frei gewählte Lehrprofile, **keine Haas-/DMG-Spezifikationen**. Es werden Wegspannen geprüft, nicht absolute Achsgrenzen oder Offsetpositionen. Werkzeuglänge, Freiraum und Aufspannung sind unbekannt. Der Eilgang wird vereinfachend als räumlicher Bahnvorschub modelliert, ohne achsweise Beschleunigung.
