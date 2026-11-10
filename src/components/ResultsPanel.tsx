import {
  Check,
  CircleAlert,
  Gauge,
  Info,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { machines } from "../domain/profiles";
import type { CuttingResult, Machine, Issue } from "../domain/types";
import { formatNumber as number } from "../format";
interface Props {
  cut: CuttingResult | null;
  time: { minutes: number } | null;
  machine: Machine;
  machineId: string;
  issues: Issue[];
  onMachineChange: (id: string) => void;
}
export function ResultsPanel({
  cut,
  time,
  machine,
  machineId,
  issues,
  onMachineChange,
}: Props) {
  const errors = issues.filter((i) => i.severity === "error"),
    warnings = issues.filter((i) => i.severity === "warning");
  return (
    <aside className="results-column">
      <section className="metrics panel">
        <div className="section-title">
          <Gauge size={17} />
          <h3>Berechnet, nicht geschätzt*</h3>
        </div>
        <div className="metric big">
          <span>Drehzahl n</span>
          <strong>
            {number(cut?.rpm ?? NaN)}
            <small> 1/min</small>
          </strong>
          <code>Vc × 1000 / (π × D)</code>
        </div>
        <div className="metric">
          <span>Bahnvorschub vf</span>
          <strong>
            {number(cut?.feed ?? NaN)}
            <small> mm/min</small>
          </strong>
          <code>n × z × fz</code>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span>Zeitspanvolumen</span>
            <strong>
              {number(cut?.mrr ?? NaN, 1)}
              <small> cm³/min</small>
            </strong>
          </div>
          <div className="metric">
            <span>Antriebsleistung*</span>
            <strong>
              {number(cut?.drivePower ?? NaN, 2)}
              <small> kW</small>
            </strong>
          </div>
        </div>
        <div className="time-metric">
          <span>Bewegungszeit*</span>
          <strong>
            {time ? number(time.minutes, 2) : "–"} <small>min</small>
          </strong>
          <p>
            Strecke / Vorschub. Ohne Beschleunigung, Werkzeugwechsel oder
            Spindelhochlauf.
          </p>
        </div>
        <p className="fine-print">
          * MRR und Leistung: Nenn-Eingriff. Leistung und Zeit sind Näherungen,
          keine Prozesssimulation.
        </p>
      </section>
      <section className="machine-card panel">
        <div className="section-title">
          <Settings2 size={16} />
          <h3>Maschinenrahmen</h3>
        </div>
        <label className="field">
          <span>Generisches Lehrprofil</span>
          <select
            value={machineId}
            onChange={(e) => onMachineChange(e.target.value)}
          >
            {machines.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <dl>
          <div>
            <dt>Spindel</dt>
            <dd>≤ {number(machine.maxRpm)} 1/min</dd>
          </div>
          <div>
            <dt>Vorschub</dt>
            <dd>≤ {number(machine.maxFeed)} mm/min</dd>
          </div>
          <div>
            <dt>Verfahrweg</dt>
            <dd>{machine.travel.join(" × ")} mm</dd>
          </div>
          <div>
            <dt>Leistung / Eilgang</dt>
            <dd>
              {number(machine.power, 1)} kW / {number(machine.rapid)}
            </dd>
          </div>
        </dl>
        <p>
          Modellwerte, keine Herstellerspezifikation. Aufspannung und verfügbare
          Maschinenposition fehlen.
        </p>
      </section>
      <section className="rules panel" data-testid="rule-panel">
        <div className="section-title">
          <ShieldAlert size={16} />
          <h3>Regelbasierte Hinweise</h3>
        </div>
        <div className={`rule-status ${errors.length ? "bad" : ""}`}>
          {errors.length ? <CircleAlert size={17} /> : <Check size={17} />}
          <strong>
            {errors.length
              ? `${errors.length} Grenzverletzung(en)`
              : "Lehrprofil: keine Grenzverletzung"}
          </strong>
        </div>
        {issues.map((i) => (
          <div className={`rule ${i.severity}`} key={i.code}>
            <CircleAlert size={14} />
            <span>{i.message}</span>
          </div>
        ))}
        {!errors.length && !warnings.length ? (
          <p className="rule good">
            <Check size={14} /> n, vf, Nennleistung und Wegspanne liegen im
            Profil. Das ist keine Sicherheitsfreigabe.
          </p>
        ) : null}
        <p className="rule">
          <Info size={14} /> Feste, nachvollziehbare Regeln. Kein KI-Agent, kein
          Safety-Score.
        </p>
      </section>
    </aside>
  );
}
