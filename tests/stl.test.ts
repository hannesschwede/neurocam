import { describe, expect, it } from "vitest";
import { parseSTL } from "../src/domain/stl";
import { ascii, binary, boxTriangles } from "./fixtures";
describe("STL-Parser", () => {
  it("analysiert ASCII-Würfel mit Box und Volumen", () => {
    const m = parseSTL(ascii());
    expect(m.format).toBe("ASCII");
    expect(m.triangles).toBe(12);
    expect(m.size).toEqual([1, 1, 1]);
    expect(m.volume).toBeCloseTo(1);
    expect(m.closed).toBe(true);
  });
  it("erkennt binäre STL trotz solid-Header", () => {
    const m = parseSTL(binary());
    expect(m.format).toBe("Binary");
    expect(m.size).toEqual([2, 3, 4]);
    expect(m.volume).toBeCloseTo(24);
  });
  it("behandelt Translation und explizite Skalierung korrekt", () => {
    const m = parseSTL(ascii(boxTriangles(2, 3, 4, 100)), 2);
    expect(m.size).toEqual([4, 6, 8]);
    expect(m.volume).toBeCloseTo(192);
  });
  it("markiert offene Netze ohne belastbares Volumen", () => {
    const m = parseSTL(ascii(boxTriangles().slice(1)));
    expect(m.closed).toBe(false);
    expect(m.volume).toBeNull();
    expect(m.warnings.length).toBeGreaterThan(0);
  });
  it("erkennt falsche Orientierung", () => {
    const t = boxTriangles();
    t[0] = [...t[0].slice(6), ...t[0].slice(3, 6), ...t[0].slice(0, 3)];
    expect(parseSTL(ascii(t)).closed).toBe(false);
  });
  it("weist abgeschnittene Binärdatei und leere Datei zurück", () => {
    expect(() => parseSTL(binary().slice(0, 100))).toThrow();
    expect(() => parseSTL(new ArrayBuffer(0))).toThrow();
  });
  it("weist ungültige Koordinaten zurück", () => {
    const b = binary();
    new DataView(b).setFloat32(96, NaN, true);
    expect(() => parseSTL(b)).toThrow();
  });
  it("weist nicht-STL und negative Skalierung zurück", () => {
    expect(() =>
      parseSTL(new TextEncoder().encode("not a model").buffer),
    ).toThrow();
    expect(() => parseSTL(ascii(), -1)).toThrow();
  });
  it("markiert degenerierte Dreiecke", () => {
    expect(parseSTL(ascii([[0, 0, 0, 0, 0, 0, 1, 1, 1]])).closed).toBe(false);
  });
  it("weist zu viele Dreiecke vor Speicherallokation zurück", () => {
    const b = new ArrayBuffer(84);
    new DataView(b).setUint32(80, 100001, true);
    expect(() => parseSTL(b)).toThrow();
  });
});
