import type { FacingJob, Motion, Vec3 } from "./types";
/** Rectangular face milling only; does NOT preserve the imported mesh's contour. */
export function generateFacing(job: FacingJob): Motion[] {
  for (const [key, value] of Object.entries(job))
    if (!Number.isFinite(value) || value < 0.01 || value > 1e6)
      throw new Error(`${key}: Wert zwischen 0,01 und 1.000.000 erforderlich.`);
  const {
    width,
    height,
    stockHeight,
    depth,
    stepDown,
    stepOver,
    diameter,
    safeZ,
    feed,
    plungeFeed,
  } = job;
  if (depth >= stockHeight)
    throw new Error("Abtrag muss kleiner als die Rohteilhöhe sein.");
  if (stepOver > diameter)
    throw new Error(
      "Bahnabstand darf den Werkzeugdurchmesser nicht überschreiten.",
    );
  const rows = Math.ceil(height / stepOver) + 1,
    layers = Math.ceil(depth / stepDown);
  if (rows * layers * 2 + layers * 5 > 10000)
    throw new Error(
      "Zu viele Bahnsegmente. Bahnabstand oder Zustellung erhöhen (max. 10.000).",
    );
  const motions: Motion[] = [],
    x0 = -diameter / 2 - 2,
    x1 = width + diameter / 2 + 2;
  let position: Vec3 = [0, 0, 0];
  const move = (
    to: Vec3,
    kind: Motion["kind"],
    velocity: number | null = null,
  ) => {
    if (to.every((x, i) => Math.abs(x - position[i]) < 1e-10)) return;
    motions.push({ from: [...position], to, kind, feed: velocity });
    position = to;
  };
  move([0, 0, safeZ], "rapid");
  for (let layer = 1; layer <= layers; layer++) {
    const z = -Math.min(depth, layer * stepDown);
    move([x0, 0, safeZ], "rapid");
    move([x0, 0, z], "cut", plungeFeed);
    for (let row = 0; row < rows; row++) {
      const y = Math.min(height, row * stepOver),
        endX = row % 2 === 0 ? x1 : x0;
      if (row > 0) move([position[0], y, z], "cut", feed);
      move([endX, y, z], "cut", feed);
    }
    move([position[0], position[1], safeZ], "rapid");
  }
  move([0, 0, safeZ], "rapid");
  return motions;
}
