import { expect, it } from "vitest";
import example from "../src/assets/stufenblock.stl?raw";
import { parseSTL } from "../src/domain/stl";
it("eigenes Stufenblock-Beispiel hat geschlossenes Netz und nachrechenbares Volumen", () => {
  const m = parseSTL(new TextEncoder().encode(example).buffer);
  expect(m.closed).toBe(true);
  expect(m.volume).toBeCloseTo(81000);
  expect(m.size).toEqual([80, 50, 24]);
});
