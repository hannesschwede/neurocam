import { lazy, Suspense, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowDown,
  ChevronRight,
  CircleAlert,
  Code2,
  Cuboid,
  Eye,
  Info,
  Maximize2,
  Ruler,
  ShieldAlert,
  Workflow,
  X,
} from "lucide-react";
import { ParametersPanel } from "./components/ParametersPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import type { PlanSettings as Settings } from "./types";
import { formatNumber as number } from "./format";
import { NCPanel } from "./components/NCPanel";
import { calculateCutting } from "./domain/cutting";
import { generateFacing } from "./domain/facing";
import { parseGCode } from "./domain/gcode";
import { toGCode } from "./domain/postprocessor";
import { parseSTL, MAX_STL_BYTES } from "./domain/stl";
import { estimateTime } from "./domain/time";
import { validateMachine } from "./domain/validation";
import { machines, materials, MATERIAL_SOURCE } from "./domain/profiles";
import type { FacingJob, Issue, MeshInfo } from "./domain/types";
import example from "./assets/stufenblock.stl?raw";
import "./styles.css";
const Viewer = lazy(() => import("./components/Viewer"));
const sampleRaw = () => new TextEncoder().encode(example).buffer as ArrayBuffer;
const initial = {
  width: 80,
  height: 50,
  stockHeight: 24,
  depth: 2,
  stepDown: 1,
  stepOver: 5,
  diameter: 10,
  safeZ: 8,
  plungeFeed: 250,
  teeth: 3,
  vc: 250,
  fz: 0.06,
  kc: 700,
  efficiency: 0.8,
};
type MeshState = { mesh: MeshInfo; raw: ArrayBuffer; name: string };
function readExample(): MeshState {
  const raw = sampleRaw();
  return { mesh: parseSTL(raw), raw, name: "stufenblock.stl" };
}
export default function App() {
  const [settings, setSettings] = useState(initial),
    [meshState, setMeshState] = useState(readExample),
    [materialId, setMaterialId] = useState(materials[0].id),
    [machineId, setMachineId] = useState(machines[0].id);
  const [units, setUnits] = useState("mm"),
    [imported, setImported] = useState<{ name: string; text: string } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [ack, setAck] = useState(false),
    [top, setTop] = useState(false),
    [progress, setProgress] = useState(100),
    [partVisible, setPartVisible] = useState(true),
    [pathVisible, setPathVisible] = useState(true),
    [cameraKey, setCameraKey] = useState(0),
    [showInfo, setShowInfo] = useState(false);
  const machine = machines.find((m) => m.id === machineId)!,
    material = materials.find((m) => m.id === materialId)!,
    { mesh } = meshState;
  const update = (key: keyof Settings, value: number) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setImported(null);
    setAck(false);
  };
  const planned = useMemo(() => {
    const issues: Issue[] = [];
    try {
      const cut = calculateCutting({
        diameter: settings.diameter,
        teeth: settings.teeth,
        vc: settings.vc,
        fz: settings.fz,
        ap: Math.min(settings.stepDown, settings.depth),
        ae: settings.stepOver,
        kc: settings.kc,
        efficiency: settings.efficiency,
      });
      const job: FacingJob = { ...settings, feed: cut.feed };
      const motions = generateFacing(job);
      issues.push(...validateMachine(job, cut, machine));
      if (
        settings.vc < material.vcRange[0] ||
        settings.vc > material.vcRange[1]
      )
        issues.push({
          severity: "warning",
          code: "vc-range",
          message:
            "Vc liegt außerhalb der allgemeinen Harvey-Werkstoffgruppe. Werkzeughersteller prüfen.",
        });
      if (settings.stepOver < settings.diameter / 2)
        issues.push({
          severity: "warning",
          code: "engagement",
          message:
            "Beim Eintritt kann ae größer als der Bahnabstand sein. MRR/Leistung sind nur stationäre Nennwerte.",
        });
      if (
        mesh.size[0] > settings.width + 0.001 ||
        mesh.size[1] > settings.height + 0.001 ||
        mesh.size[2] > settings.stockHeight + 0.001
      )
        issues.push({
          severity: "warning",
          code: "mesh-stock",
          message:
            "Das STL ist größer als das eingestellte Rohteil. Modell und Rohteil sind unabhängig.",
        });
      const hasError = issues.some((i) => i.severity === "error");
      return {
        cut,
        job,
        motions: hasError ? [] : motions,
        nc: hasError ? "" : toGCode(motions, cut.rpm, settings.safeZ),
        issues,
      };
    } catch (e) {
      issues.push({
        severity: "error",
        code: "input",
        message: e instanceof Error ? e.message : "Ungültige Eingabe.",
      });
      return { cut: null, job: null, motions: [], nc: "", issues };
    }
  }, [settings, machine, material, mesh]);
  const code = imported?.text ?? planned.nc;
  const parsed = useMemo(() => parseGCode(code), [code]);
  const time = useMemo(
    () =>
      parsed.complete ? estimateTime(parsed.motions, machine.rapid) : null,
    [parsed, machine.rapid],
  );
  const errors = planned.issues.filter((i) => i.severity === "error");
  const reset = () => {
    setSettings(initial);
    setMeshState(readExample());
    setUnits("mm");
    setMaterialId(materials[0].id);
    setImported(null);
    setError("");
    setAck(false);
    setProgress(100);
  };
  const setModel = (raw: ArrayBuffer, name: string, unit: string) => {
    const mesh = parseSTL(raw, unit === "inch" ? 25.4 : 1);
    setMeshState({ raw, name, mesh });
    setSettings((s) => ({
      ...s,
      width: mesh.size[0],
      height: mesh.size[1],
      stockHeight: mesh.size[2],
    }));
    setImported(null);
    setAck(false);
    setError("");
    setProgress(100);
  };
  const importSTL = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (!/\.stl$/i.test(file.name))
        throw new Error("Nur STL wird unterstützt; kein STEP oder IGES.");
      if (file.size > MAX_STL_BYTES) throw new Error("STL maximal 10 MiB.");
      setModel(await file.arrayBuffer(), file.name, units);
    } catch (e) {
      setError(e instanceof Error ? e.message : "STL-Import fehlgeschlagen.");
    }
  };
  const importNC = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error("NC maximal 1 MB.");
      setImported({ name: file.name, text: await file.text() });
      setAck(false);
      setProgress(100);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "NC-Import fehlgeschlagen.");
    }
  };
  const exportNC = () => {
    if (!ack || !parsed.complete || !code) return;
    const url = URL.createObjectURL(
        new Blob([code], { type: "text/plain;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "neurocam-planfraesen.nc";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <header className="site-header">
        <a href="#" className="brand" aria-label="NeuroCAM Start">
          <span className="brand-mark">
            <Workflow size={23} />
          </span>
          <span>
            neuro<span className="brand-light">cam</span>
            <small>3-ACHS / CAM-LABOR</small>
          </span>
        </a>
        <nav aria-label="Hauptnavigation">
          <a className="nav-active" href="#workspace">
            Arbeitsraum
          </a>
          <a href="#nc">NC-Werkbank</a>
        </nav>
        <div className="header-right">
          <span className="local-badge">
            <span className="dot" /> Lokal im Browser
          </span>
          <button
            className="icon-button"
            aria-label="Projektinformationen"
            onClick={() => setShowInfo(true)}
          >
            <Info size={18} />
          </button>
        </div>
      </header>
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow hero-eyebrow">
              <span className="tiny-line" /> VOM DREIECK ZUM WERKZEUGWEG
            </div>
            <h1>
              Vom Modell zur
              <br />
              <span>nachvollziehbaren Bahn.</span>
            </h1>
            <p>
              Geometrie verstehen. Schnittdaten berechnen. Planfräsen erkunden.
              <br className="desktop-break" /> Ein ehrliches CAM-Labor — ohne
              Blackbox, ohne KI-Versprechen.
            </p>
          </div>
          <div className="hero-meta">
            <span className="version">
              ENGINEERING STUDY <span>01.0</span>
            </span>
            <div>
              <span>01</span> STL analysieren <ChevronRight size={13} />
              <span>02</span> Bearbeitung planen <ChevronRight size={13} />
              <span>03</span> NC prüfen
            </div>
            <a href="#workspace" className="hero-link">
              Arbeitsraum entdecken <ArrowDown size={14} />
            </a>
          </div>
        </section>
        <div className="scope-banner">
          <ShieldAlert size={17} />
          <p>
            <strong>Ein Lernwerkzeug, keine Maschinenfreigabe.</strong>{" "}
            Rechteckiges Planfräsen, keine STL-Konturerhaltung oder
            Kollisionsprüfung. NC vor echtem Einsatz unabhängig prüfen.
          </p>
          <span>STL ONLY</span>
        </div>
        {error ? (
          <div role="alert" className="alert">
            <CircleAlert size={18} />
            {error}
            <button
              className="icon-button"
              aria-label="Fehlermeldung schließen"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        ) : null}
        <div className="workspace-heading" id="workspace">
          <h2>
            <span className="status-dot" /> Arbeitsraum
          </h2>
          <span>G54 · XY an Rohteilecke · Z0 an Oberseite · mm</span>
        </div>
        {imported ? (
          <div className="import-banner">
            <Info size={16} />
            <p>
              <strong>NC-Import aktiv: {imported.name}.</strong> Kennzahlen und
              Grenzprüfung rechts gehören weiterhin zum Formular, nicht zur
              importierten Datei. Import startet rechnerisch bei XYZ0 in
              mm/G90/G94; G54 und Werkzeuglängen sind extern vorausgesetzt.
            </p>
            <button
              className="text-button"
              onClick={() => {
                setImported(null);
                setAck(false);
              }}
            >
              Zur Planung
            </button>
          </div>
        ) : null}
        <div className="workspace">
          <ParametersPanel
            settings={settings}
            update={update}
            material={material}
            materialId={materialId}
            units={units}
            importSTL={importSTL}
            reset={reset}
            onUnitsChange={(unit) => {
              try {
                setModel(meshState.raw, meshState.name, unit);
                setUnits(unit);
              } catch (e) {
                setError(String(e));
              }
            }}
            onMaterialChange={(id) => {
              const m = materials.find((m) => m.id === id)!;
              setMaterialId(id);
              setSettings((s) => ({ ...s, vc: m.vc, fz: m.fz, kc: m.kc }));
              setImported(null);
              setAck(false);
            }}
          />
          <section className="visual-column">
            <div className="viewer-panel panel">
              <div className="viewer-toolbar">
                <span>
                  <Cuboid size={16} /> Geometrie & Bahn
                </span>
                <div className="view-tabs">
                  <button
                    className={!top ? "selected" : ""}
                    onClick={() => setTop(false)}
                  >
                    3D
                  </button>
                  <button
                    className={top ? "selected" : ""}
                    onClick={() => setTop(true)}
                  >
                    Draufsicht
                  </button>
                  <button
                    aria-label="Ansicht zurücksetzen"
                    onClick={() => setCameraKey((k) => k + 1)}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>
              <div className="viewport" data-testid="viewport">
                <div className="view-corner">
                  <span className="eyebrow">
                    {imported ? "NC-IMPORT" : "PLANFRÄSEN / 3 ACHSEN"}
                  </span>
                  <strong>{meshState.name}</strong>
                  <span>
                    {number(mesh.triangles)} Dreiecke · {mesh.format}
                  </span>
                </div>
                <Suspense
                  fallback={
                    <div className="loading">3D-Arbeitsraum wird geladen …</div>
                  }
                >
                  <Viewer
                    key={cameraKey}
                    mesh={mesh}
                    width={
                      Number.isFinite(settings.width) && settings.width > 0
                        ? settings.width
                        : 80
                    }
                    height={
                      Number.isFinite(settings.height) && settings.height > 0
                        ? settings.height
                        : 50
                    }
                    stockHeight={
                      Number.isFinite(settings.stockHeight) &&
                      settings.stockHeight > 0
                        ? settings.stockHeight
                        : 24
                    }
                    motions={parsed.motions}
                    progress={progress}
                    top={top}
                    partVisible={partVisible}
                    pathVisible={pathVisible}
                  />
                </Suspense>
                <div className="axis-key">
                  <span>X</span>
                  <span>Y</span>
                  <span>Z</span>
                </div>
                <div className="view-controls">
                  <button
                    className={partVisible ? "active" : ""}
                    onClick={() => setPartVisible((v) => !v)}
                    aria-pressed={partVisible}
                  >
                    <Eye size={13} /> Modell
                  </button>
                  <button
                    className={pathVisible ? "active" : ""}
                    onClick={() => setPathVisible((v) => !v)}
                    aria-pressed={pathVisible}
                  >
                    <Workflow size={13} /> Bahn
                  </button>
                </div>
              </div>
              <div className="viewer-legend">
                <span>
                  <i className="legend-line cut" /> Vorschub
                </span>
                <span>
                  <i className="legend-line rapid" /> Eilgang
                </span>
                <span>
                  <i className="legend-box" /> Rohteil
                </span>
                <small>
                  {top
                    ? "XY-Projektion · Z nicht dargestellt"
                    : "Ziehen: drehen · Scrollen: zoomen"}
                </small>
              </div>
              <div className="timeline">
                <div>
                  <label htmlFor="progress">Segmentansicht</label>
                  <span>
                    {Math.ceil((parsed.motions.length * progress) / 100)} /{" "}
                    {parsed.motions.length}
                  </span>
                </div>
                <input
                  id="progress"
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                />
                <p>
                  Geometrische Vorschau, keine Abtrags- oder
                  Kollisionssimulation.
                </p>
              </div>
            </div>
            <div className="geometry-card panel">
              <div className="section-title">
                <Ruler size={16} />
                <h3>Was tatsächlich im Modell steckt</h3>
                <span className="label-tag">STL-ANALYSE</span>
              </div>
              <div className="geometry-stats">
                <div>
                  <span>Bounding Box</span>
                  <strong>
                    {mesh.size.map((s) => number(s, 2)).join(" × ")}
                    <small> mm</small>
                  </strong>
                </div>
                <div data-testid="mesh-volume">
                  <span>Volumen*</span>
                  <strong>
                    {mesh.volume !== null
                      ? number(mesh.volume / 1000, 2)
                      : "nicht belastbar"}
                    <small>{mesh.volume !== null ? " cm³" : ""}</small>
                  </strong>
                </div>
                <div>
                  <span>Netzprüfung</span>
                  <strong className={mesh.closed ? "mint" : "amber"}>
                    {mesh.closed
                      ? "Kanten geschlossen"
                      : "Netz offen / inkonsistent"}
                  </strong>
                </div>
              </div>
              <p>
                * {mesh.warnings.join(" ")} Das Modell wird zur Ansicht auf
                XY-Minimum und Z-Oberseite ausgerichtet, nicht rotiert.
              </p>
            </div>
            <div className="operation-note">
              <Info size={17} />
              <div>
                <strong>Die Kontur ist keine Bearbeitungsgrenze.</strong>
                <p>
                  Die Bahn plant die gesamte Rohteilfläche. Erhabene
                  STL-Merkmale werden nicht geschützt. Anfahrt: Werkzeugradius +
                  2 mm außerhalb in X; Spannmittel und freien Überlauf selbst
                  prüfen.
                </p>
              </div>
            </div>
          </section>
          <ResultsPanel
            cut={planned.cut}
            time={time}
            machine={machine}
            machineId={machineId}
            issues={planned.issues}
            onMachineChange={(id) => {
              setMachineId(id);
              setAck(false);
            }}
          />
        </div>
        <NCPanel
          code={code}
          name={imported?.name ?? "planfraesen.nc"}
          complete={parsed.complete}
          issues={parsed.issues}
          onImport={importNC}
          onExport={exportNC}
          canExport={
            parsed.complete && !!code && (!!imported || !errors.length)
          }
          acknowledged={ack}
          onAck={setAck}
          isImported={!!imported}
          onReset={() => {
            setImported(null);
            setAck(false);
          }}
        />
        <section className="principles">
          <div>
            <span>01 / ECHTE GEOMETRIE</span>
            <h3>Dreiecke statt Dateinamen.</h3>
            <p>
              Binäre und ASCII-STL, Bounding Box, Kantenprüfung und orientierte
              Volumenberechnung.
            </p>
          </div>
          <div>
            <span>02 / OFFENE ALGORITHMEN</span>
            <h3>Keine Blackbox nötig.</h3>
            <p>
              Metrische Formeln, deterministische Bahnen und ein bewusst
              begrenzter, strenger NC-Parser.
            </p>
          </div>
          <div>
            <span>03 / EHRLICHE GRENZEN</span>
            <h3>Ein Prototyp mit Haltung.</h3>
            <p>
              Keine KI-Show, kein STEP-Versprechen, keine vorgetäuschte
              Kollisionsfreiheit.
            </p>
          </div>
        </section>
        <footer>
          <span>
            neurocam{" "}
            <span className="muted">
              / Engineering Portfolio · Hannes Schwede
            </span>
          </span>
          <span>
            TypeScript · React · Three.js <span className="footer-square" />
          </span>
        </footer>
      </main>
      {showInfo ? (
        <div className="modal-backdrop" onClick={() => setShowInfo(false)}>
          <section
            className="info-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label="Über NeuroCAM"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button close-modal"
              aria-label="Projektinformationen schließen"
              onClick={() => setShowInfo(false)}
            >
              <X size={20} />
            </button>
            <Code2 size={30} />
            <span className="eyebrow">INDEPENDENT REBUILD</span>
            <h2>CAM, nachvollziehbar.</h2>
            <p>
              Eigenständiger Portfolio-Neubau aus TypeScript-Domänenmodulen,
              React und React Three Fiber. Inspiriert von einer MiniMax-Demo,
              nicht aus deren Bundle übernommen. Mit KI-Unterstützung
              entwickelt; keine KI zur Laufzeit.
            </p>
            <p>
              STL und NC werden lokal verarbeitet. Kein Backend, keine
              Telemetrie, keine Anmeldung. Dateien und Einstellungen werden
              nicht dauerhaft gespeichert.
            </p>
            <h3>Bewusst nicht enthalten</h3>
            <p>
              STEP/IGES, konturerhaltendes Schruppen, echte Taschenbearbeitung,
              5-Achs-Kinematik, Materialabtrag, Spannmittel-/Haltermodell und
              Kollisionsprüfung.
            </p>
            <p>
              <a
                href="https://www.sandvik.coromant.com/en-gb/knowledge/machining-formulas-definitions/milling-formulas-definitions"
                target="_blank"
                rel="noreferrer"
              >
                Formeln: Sandvik Coromant ↗
              </a>
              <br />
              <a href={MATERIAL_SOURCE} target="_blank" rel="noreferrer">
                Materialgruppen: Harvey Tool ↗
              </a>
            </p>
            <button
              className="button primary"
              onClick={() => setShowInfo(false)}
            >
              Zurück zum Arbeitsraum
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
