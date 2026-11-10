import { describe, expect, it } from "vitest";
import { generateFacing } from "../src/domain/facing";
import { toGCode } from "../src/domain/postprocessor";
import { parseGCode } from "../src/domain/gcode";
import { estimateTime } from "../src/domain/time";
import type { FacingJob } from "../src/domain/types";
const job: FacingJob = {
  width: 80,
  height: 43,
  stockHeight: 20,
  depth: 2.5,
  stepDown: 1,
  stepOver: 6,
  diameter: 10,
  safeZ: 8,
  feed: 1200,
  plungeFeed: 200,
};
describe("Planfräsbahn", () => {
  it("deckt Grenzen und exakte letzte Tiefenschicht ab", () => {
    const m = generateFacing(job);
    expect(Math.min(...m.map((s) => s.to[2]))).toBe(-2.5);
    expect(m.some((s) => s.to[1] === 43)).toBe(true);
    expect(m.some((s) => s.to[0] > 80)).toBe(true);
    expect(m.some((s) => s.to[0] < 0)).toBe(true);
  });
  it("führt jeden XY-Eilgang auf Sicherheits-Z aus", () => {
    for (const m of generateFacing(job)) {
      if (
        m.kind === "rapid" &&
        (m.from[0] !== m.to[0] || m.from[1] !== m.to[1])
      ) {
        expect(m.from[2]).toBe(job.safeZ);
        expect(m.to[2]).toBe(job.safeZ);
      }
    }
  });
  it("ändert Bahn bei geänderter Rohteilgröße", () => {
    expect(generateFacing(job)).not.toEqual(
      generateFacing({ ...job, width: 50 }),
    );
  });
  it("begrenzt Reihen und Tiefe", () => {
    expect(() => generateFacing({ ...job, stepOver: 0.00001 })).toThrow();
    expect(() => generateFacing({ ...job, stepDown: 0 })).toThrow();
    expect(() => generateFacing({ ...job, depth: 21 })).toThrow();
  });
  it("verhindert ungeschnittene Lücken und negative Werte", () => {
    expect(() => generateFacing({ ...job, stepOver: 11 })).toThrow();
    expect(() => generateFacing({ ...job, width: -1 })).toThrow();
  });
});
describe("Postprozessor + Parser", () => {
  it("beginnt nach Werkzeugwechsel mit reinem Z-Rückzug, nicht simultan XY", () => {
    const nc = toGCode(generateFacing(job), 8000, 8);
    const first = nc.split("\n").find((l) => /^G0(?: |$)/.test(l));
    expect(first).toContain("Z8.000");
    expect(first).not.toMatch(/[XY]/);
  });
  it("exportiert Setup und Abschluss; Roundtrip erhält die Bewegungen", () => {
    const m = generateFacing(job),
      nc = toGCode(m, 8000, 8),
      r = parseGCode(nc);
    expect(nc).toContain("G21 G90 G17 G94 G40 G49 G80");
    expect(nc).toContain("T1 M6");
    expect(nc).toContain("G43 H1");
    expect(nc).toContain("M30");
    expect(r.issues).toEqual([]);
    expect(r.complete).toBe(true);
    expect(r.motions).toHaveLength(m.length);
    r.motions.forEach((s, i) => {
      s.to.forEach((v, a) => expect(v).toBeCloseTo(m[i].to[a], 3));
      expect(s.kind).toBe(m[i].kind);
    });
  });
  it("erlaubt Semikolon innerhalb vollständiger Klammerkommentare", () => {
    expect(parseGCode("G0 X1 (note; still a comment)\nM30").complete).toBe(
      true,
    );
  });
  it("weist nicht-kanonische Startbewegung beim Postprozessieren zurück", () => {
    expect(() =>
      toGCode(
        [{ from: [0, 0, 0], to: [1, 1, 8], kind: "rapid", feed: null }],
        8000,
        8,
      ),
    ).toThrow();
  });
  it("liest modale kompakte Tokens und Kommentare", () => {
    const r = parseGCode(
      "G21 G90\nG0X1Y2Z3\nG1X11 F100 (hi)\nY12 ; Kommentar\nM30",
    );
    expect(r.complete).toBe(true);
    expect(r.motions.at(-1)?.to).toEqual([11, 12, 3]);
    expect(r.motions.at(-1)?.feed).toBe(100);
  });
  it("rechnet Inch und inkrementelle Koordinaten", () => {
    const r = parseGCode("G20 G90\nG0 X1\nG91\nG1 Y1 F10\nX1");
    expect(r.motions.at(-1)?.to).toEqual([50.8, 25.4, 0]);
    expect(r.motions.at(-1)?.feed).toBe(254);
  });
  it.each([
    "G2 X10 I5",
    "G81 Z-10",
    "G53 G0 Z0",
    "G92 X0",
    "G55",
    "G93",
    "M98 P1",
    "G1 X#1",
    "<img src=x>",
  ])("stoppt sichtbar bei unbekanntem Inhalt %s", (code) => {
    const r = parseGCode("G21 G90\nG0 Z5\n" + code + "\nG1 X100 F200");
    expect(r.complete).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.motions).toHaveLength(1);
  });
  it("akzeptiert keinen Schnitt ohne Vorschub", () => {
    expect(parseGCode("G1 X10").complete).toBe(false);
  });
  it("stoppt bei Programmende", () => {
    const r = parseGCode("G0 X1\nM30\nG0 X99");
    expect(r.motions.at(-1)?.to[0]).toBe(1);
  });
  it("weist leeren NC-Text zurück", () => {
    expect(parseGCode("").complete).toBe(false);
  });
});
describe("Zeitabschätzung", () => {
  it("rechnet räumliche Strecken und Eilgang separat", () => {
    const r = estimateTime(
      [
        { from: [0, 0, 0], to: [3, 4, 0], kind: "cut", feed: 5 },
        { from: [3, 4, 0], to: [3, 4, 10], kind: "rapid", feed: null },
      ],
      10,
    );
    expect(r.minutes).toBeCloseTo(2);
    expect(r.cutDistance).toBe(5);
    expect(r.rapidDistance).toBe(10);
  });
  it("weist fehlenden Vorschub und unbrauchbaren Eilgang zurück", () => {
    expect(() =>
      estimateTime(
        [{ from: [0, 0, 0], to: [1, 0, 0], kind: "cut", feed: null }],
        100,
      ),
    ).toThrow();
    expect(() => estimateTime([], 0)).toThrow();
  });
});
