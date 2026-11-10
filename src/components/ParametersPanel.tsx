import type { ChangeEvent } from "react";
import {
  ArrowUpRight,
  Box,
  Check,
  FileUp,
  Layers3,
  ScanLine,
  SlidersHorizontal,
} from "lucide-react";
import { Field } from "./Field";
import { materials, MATERIAL_SOURCE } from "../domain/profiles";
import type { Material } from "../domain/profiles";
import type { PlanSettings } from "../types";
import { formatNumber as number } from "../format";
interface Props {
  settings: PlanSettings;
  update: (key: keyof PlanSettings, value: number) => void;
  material: Material;
  materialId: string;
  units: string;
  onUnitsChange: (unit: string) => void;
  onMaterialChange: (id: string) => void;
  importSTL: (e: ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
}
export function ParametersPanel({
  settings,
  update,
  material,
  materialId,
  units,
  onUnitsChange,
  onMaterialChange,
  importSTL,
  reset,
}: Props) {
  return (
    <aside className="parameters panel" aria-label="Bearbeitungsparameter">
      <section className="config-section">
        <div className="section-title">
          <span>01</span>
          <h3>Werkstück</h3>
          <Box size={16} />
        </div>
        <label className="upload-zone">
          <FileUp size={22} />
          <strong>STL öffnen</strong>
          <span>ASCII oder Binär · max. 10 MiB</span>
          <input
            type="file"
            aria-label="STL-Datei importieren"
            accept=".stl"
            onChange={importSTL}
          />
        </label>
        <div className="sample-row">
          <button className="text-button" onClick={reset}>
            Beispiel laden <ArrowUpRight size={13} />
          </button>
          <a href="/examples/stufenblock.stl" download>
            STL ↗
          </a>
        </div>
        <label className="field">
          <span>Einheit der STL-Datei</span>
          <select value={units} onChange={(e) => onUnitsChange(e.target.value)}>
            <option value="mm">Millimeter (Annahme)</option>
            <option value="inch">Zoll → mm (× 25,4)</option>
          </select>
        </label>
        <div className="field-grid three">
          <Field
            label="Rohteil X"
            unit="mm"
            value={settings.width}
            onChange={(v) => update("width", v)}
          />
          <Field
            label="Rohteil Y"
            unit="mm"
            value={settings.height}
            onChange={(v) => update("height", v)}
          />
          <Field
            label="Rohteil Z"
            unit="mm"
            value={settings.stockHeight}
            onChange={(v) => update("stockHeight", v)}
          />
        </div>
      </section>
      <section className="config-section">
        <div className="section-title">
          <span>02</span>
          <h3>Schnittdaten</h3>
          <SlidersHorizontal size={16} />
        </div>
        <label className="field">
          <span>Material · Vollhartmetall-Fräser</span>
          <select
            value={materialId}
            onChange={(e) => onMaterialChange(e.target.value)}
          >
            {materials.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name} · {m.grade}
              </option>
            ))}
          </select>
        </label>
        <div className="field-grid">
          <Field
            label="Durchmesser D"
            unit="mm"
            value={settings.diameter}
            onChange={(v) => update("diameter", v)}
          />
          <Field
            label="Schneiden z"
            unit="Z"
            value={settings.teeth}
            onChange={(v) => update("teeth", v)}
            min={1}
          />
          <Field
            label="Schnittgeschwindigkeit Vc"
            unit="m/min"
            value={settings.vc}
            onChange={(v) => update("vc", v)}
          />
          <Field
            label="Zahnvorschub fz"
            unit="mm"
            min={0.001}
            step={0.005}
            value={settings.fz}
            onChange={(v) => update("fz", v)}
          />
        </div>
        <p className="source-note">
          Vc: {number(material.vcRange[0], 1)}–{number(material.vcRange[1], 1)}{" "}
          m/min ·{" "}
          <a href={MATERIAL_SOURCE} target="_blank" rel="noreferrer">
            Harvey Tool ↗
          </a>
          <br />
          Allgemeine Gruppe, keine Werkzeugfreigabe.
        </p>
        <details>
          <summary>Leistungsmodell & Annahmen</summary>
          <Field
            label="Spezifische Schnittkraft kc"
            unit="N/mm²"
            value={settings.kc}
            onChange={(v) => update("kc", v)}
          />
          <Field
            label="Wirkungsgrad η"
            unit="0–1"
            step={0.05}
            value={settings.efficiency}
            onChange={(v) => update("efficiency", v)}
          />
          <p className="source-note">
            {material.note} Antriebswirkungsgrad 0,8 ist ebenfalls eine Annahme.
          </p>
        </details>
      </section>
      <section className="config-section">
        <div className="section-title">
          <span>03</span>
          <h3>Planfräsen</h3>
          <Layers3 size={16} />
        </div>
        <div className="strategy">
          <ScanLine size={18} />
          <div>
            <strong>Rechteck · Zickzack</strong>
            <span>Außenanfahrt, mehrere Z-Ebenen</span>
          </div>
          <Check size={15} />
        </div>
        <div className="field-grid">
          <Field
            label="Gesamtabtrag"
            unit="mm"
            step={0.5}
            value={settings.depth}
            onChange={(v) => update("depth", v)}
          />
          <Field
            label="Zustellung ap"
            unit="mm"
            step={0.5}
            value={settings.stepDown}
            onChange={(v) => update("stepDown", v)}
          />
          <Field
            label="Bahnabstand ae"
            unit="mm"
            value={settings.stepOver}
            onChange={(v) => update("stepOver", v)}
          />
          <Field
            label="Sicherheits-Z"
            unit="mm"
            value={settings.safeZ}
            onChange={(v) => update("safeZ", v)}
          />
        </div>
        <Field
          label="Zustellvorschub"
          unit="mm/min"
          value={settings.plungeFeed}
          onChange={(v) => update("plungeFeed", v)}
        />
        <div className="live-note">
          <span className="dot" /> Änderungen werden live berechnet
        </div>
      </section>
    </aside>
  );
}
