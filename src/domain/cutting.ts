import type { CuttingInput, CuttingResult } from "./types";
/** Metric formulas: Sandvik Coromant, see docs/SOURCES.md. No chip-thinning correction. */
export function calculateCutting(input: CuttingInput): CuttingResult {
  for (const [key, value] of Object.entries(input))
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(`${key}: endlicher Wert > 0 erforderlich.`);
  const { diameter, teeth, vc, fz, ap, ae, kc, efficiency } = input;
  if (!Number.isInteger(teeth) || teeth > 100)
    throw new Error("Schneidenzahl muss ganzzahlig zwischen 1 und 100 liegen.");
  if (efficiency > 1)
    throw new Error("Wirkungsgrad darf 1 nicht überschreiten.");
  if (ae > diameter)
    throw new Error(
      "Eingriffsbreite darf den Werkzeugdurchmesser nicht überschreiten.",
    );
  const rpm = (vc * 1000) / (Math.PI * diameter),
    feed = rpm * teeth * fz,
    mrr = (ae * ap * feed) / 1000,
    cuttingPower = (kc * mrr) / 60000;
  const result = {
    rpm,
    feed,
    mrr,
    cuttingPower,
    drivePower: cuttingPower / efficiency,
  };
  if (Object.values(result).some((x) => !Number.isFinite(x)))
    throw new Error("Rechenbereich überschritten.");
  return result;
}
