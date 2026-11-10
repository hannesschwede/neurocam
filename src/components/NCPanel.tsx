import { Download, FileCode2, Upload, Check, CircleAlert } from "lucide-react";
import type { ChangeEvent } from "react";
export function NCPanel({
  code,
  name,
  complete,
  issues,
  onImport,
  onExport,
  canExport,
  acknowledged,
  onAck,
  onReset,
  isImported,
}: {
  code: string;
  name: string;
  complete: boolean;
  issues: string[];
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  canExport: boolean;
  acknowledged: boolean;
  onAck: (v: boolean) => void;
  onReset: () => void;
  isImported: boolean;
}) {
  const lines = code.split("\n");
  return (
    <section className="nc-panel panel" id="nc">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">04 / POSTPROZESSOR</span>
          <h2>
            <FileCode2 size={18} /> NC-Werkbank
          </h2>
        </div>
        <label className="button secondary file-button">
          <Upload size={15} /> NC importieren
          <input
            type="file"
            aria-label="NC-Datei importieren"
            accept=".nc,.gcode,.tap,.txt"
            onChange={onImport}
          />
        </label>
      </div>
      <div className="nc-layout">
        <div className="code-wrap">
          <div className="code-tab">
            <span className="dot" />
            <span className="nc-filename">{name}</span>
            <span>{lines.length} Zeilen</span>
          </div>
          <div
            className="code-scroll"
            tabIndex={0}
            role="region"
            aria-label="NC-Quelltext"
          >
            <ol data-testid="nc-code">
              {lines.slice(0, 400).map((line, i) => (
                <li key={i}>
                  <code className={line.startsWith("(") ? "comment" : ""}>
                    {line || " "}
                  </code>
                </li>
              ))}
            </ol>
            {lines.length > 400 ? (
              <p>
                Anzeige auf 400 Zeilen begrenzt; Export enthält den
                vollständigen Text.
              </p>
            ) : null}
          </div>
        </div>
        <div className="export-panel">
          <span className="eyebrow">NACHVOLLZIEHBAR, NICHT FREIGEGEBEN</span>
          <h3>
            Lesbarer Code.
            <br />
            Klare Verantwortung.
          </h3>
          <div
            className={`parser-status ${complete ? "" : "invalid"}`}
            data-testid="parser-status"
          >
            {complete ? <Check size={16} /> : <CircleAlert size={16} />}
            <span>
              {complete
                ? "Lineare Vorschau vollständig"
                : "Vorschau gestoppt / nicht verfügbar"}
            </span>
          </div>
          {issues.map((issue, i) => (
            <p className="parse-error" key={i}>
              {issue}
            </p>
          ))}
          <p>
            Fanuc/Haas-Stil · G54 · Werkzeug T1 / H1. Werkzeuglänge und
            Nullpunkt müssen auf der Maschine eingerichtet sein.
          </p>
          <p>
            {isImported
              ? "Import: nur dokumentierte G0/G1-Teilmenge. Keine Prüfung gegen das gewählte Maschinenprofil."
              : "Der Export folgt exakt der dargestellten Planfräsbahn. Kein Formschruppen, keine Kollisionskontrolle."}
          </p>
          <label className="ack">
            <input
              type="checkbox"
              aria-label="Sicherheitsgrenzen gelesen"
              checked={acknowledged}
              onChange={(e) => onAck(e.target.checked)}
            />
            <span>
              Sicherheitsgrenzen gelesen. Vor echtem Einsatz: unabhängig
              simulieren, Offsets prüfen und fachlich freigeben.
            </span>
          </label>
          <button
            className="button primary export-button"
            disabled={!canExport || !acknowledged}
            onClick={onExport}
          >
            <Download size={16} /> NC herunterladen
          </button>
          {isImported ? (
            <button className="text-button" onClick={onReset}>
              Zur generierten Bahn zurück
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
