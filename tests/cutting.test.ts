import { describe, expect, it } from "vitest";
import { calculateCutting } from "../src/domain/cutting";
import { validateMachine } from "../src/domain/validation";
import type { CuttingInput, FacingJob, Machine } from "../src/domain/types";
const input: CuttingInput = {
  diameter: 10,
  teeth: 4,
  vc: Math.PI * 100,
  fz: 0.05,
  ap: 2,
  ae: 5,
  kc: 1800,
  efficiency: 0.8,
};
const job: FacingJob = {
  width: 80,
  height: 50,
  stockHeight: 20,
  depth: 2,
  stepDown: 1,
  stepOver: 5,
  diameter: 10,
  safeZ: 8,
  feed: 2000,
  plungeFeed: 300,
};
const machine: Machine = {
  id: "test",
  name: "Test",
  maxRpm: 12000,
  maxFeed: 6000,
  travel: [500, 400, 300],
  power: 7.5,
  rapid: 12000,
};
describe("Schnittdaten", () => {
  it("rechnet Drehzahl, Vorschub, MRR und Leistung mit korrekten Einheiten", () => {
    const r = calculateCutting(input);
    expect(r.rpm).toBeCloseTo(10000);
    expect(r.feed).toBeCloseTo(2000);
    expect(r.mrr).toBeCloseTo(20);
    expect(r.cuttingPower).toBeCloseTo(0.6);
    expect(r.drivePower).toBeCloseTo(0.75);
  });
  it.each([
    "diameter",
    "teeth",
    "vc",
    "fz",
    "ap",
    "ae",
    "kc",
    "efficiency",
  ] as const)("weist ungültiges %s zurück", (key) => {
    expect(() => calculateCutting({ ...input, [key]: 0 })).toThrow();
  });
  it("weist Infinity und gebrochene Schneidenzahl zurück", () => {
    expect(() => calculateCutting({ ...input, vc: Infinity })).toThrow();
    expect(() => calculateCutting({ ...input, teeth: 2.5 })).toThrow();
  });
  it("prüft Wirkungsgrad und Eingriffsbreite", () => {
    expect(() => calculateCutting({ ...input, efficiency: 1.2 })).toThrow();
    expect(() => calculateCutting({ ...input, ae: 11 })).toThrow();
  });
  it("skaliert Vorschub bei geänderter Schnittgeschwindigkeit", () => {
    expect(calculateCutting({ ...input, vc: input.vc / 2 }).feed).toBeCloseTo(
      1000,
    );
  });
});
describe("Maschinengrenzen", () => {
  it("meldet keine Grenzfehler im normalen Bereich", () => {
    expect(
      validateMachine(job, calculateCutting(input), machine).filter(
        (i) => i.severity === "error",
      ),
    ).toHaveLength(0);
  });
  it("meldet Drehzahl, Vorschub und Leistung unabhängig", () => {
    const issues = validateMachine(
      job,
      { rpm: 20000, feed: 7000, mrr: 1, drivePower: 9, cuttingPower: 8 },
      machine,
    );
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(["rpm", "feed", "power"]),
    );
  });
  it("prüft Überlauf inklusive Werkzeugradius statt nur Rohteil", () => {
    const issues = validateMachine(
      { ...job, width: 490 },
      calculateCutting(input),
      machine,
    );
    expect(issues.some((i) => i.code === "travel-xy")).toBe(true);
  });
  it("prüft Rohteilhöhe plus Sicherheits-Z", () => {
    expect(
      validateMachine(
        { ...job, stockHeight: 295 },
        calculateCutting(input),
        machine,
      ).some((i) => i.code === "travel-z"),
    ).toBe(true);
  });
});
