import type { Motion } from "./types";
export function estimateTime(
  motions: Motion[],
  rapid: number,
): { minutes: number; cutDistance: number; rapidDistance: number } {
  if (!Number.isFinite(rapid) || rapid <= 0)
    throw new Error("Eilgang muss > 0 sein.");
  let minutes = 0,
    cutDistance = 0,
    rapidDistance = 0;
  for (const m of motions) {
    const length = Math.hypot(...m.to.map((v, i) => v - m.from[i])),
      speed = m.kind === "rapid" ? rapid : m.feed;
    if (
      !Number.isFinite(length) ||
      !speed ||
      !Number.isFinite(speed) ||
      speed <= 0
    )
      throw new Error("Bewegung ohne gültigen Vorschub.");
    minutes += length / speed;
    if (m.kind === "rapid") rapidDistance += length;
    else cutDistance += length;
  }
  return { minutes, cutDistance, rapidDistance };
}
