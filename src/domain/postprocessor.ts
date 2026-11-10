import type { Motion } from "./types";
/** Generic Fanuc/Haas-style educational post. Tool 1 / H1 must be set up independently. */
export function toGCode(motions: Motion[], rpm: number, safeZ: number): string {
  if (
    !motions.length ||
    !Number.isFinite(rpm) ||
    rpm < 1 ||
    !Number.isFinite(safeZ) ||
    safeZ <= 0
  )
    throw new Error("Ungültiger NC-Auftrag.");
  const first = motions[0];
  if (
    first.kind !== "rapid" ||
    first.from.some((v) => v !== 0) ||
    first.to[0] !== 0 ||
    first.to[1] !== 0 ||
    first.to[2] !== safeZ
  )
    throw new Error(
      "Erste Bahnbewegung muss reiner Z-Rückzug aus dem Vorschau-Ursprung sein.",
    );
  for (let i = 0; i < motions.length; i++) {
    const m = motions[i];
    if (i > 0 && m.from.some((v, a) => v !== motions[i - 1].to[a]))
      throw new Error("Bahn ist nicht kontinuierlich.");
    if (
      m.kind === "rapid" &&
      (m.from[0] !== m.to[0] || m.from[1] !== m.to[1]) &&
      Math.min(m.from[2], m.to[2]) < safeZ
    )
      throw new Error("XY-Eilgang unter Sicherheits-Z.");
  }
  if (motions.at(-1)!.to[2] < safeZ)
    throw new Error("Bahn endet nicht auf Sicherheits-Z.");
  const lines = [
    "%",
    "O1001 (NEUROCAM - RECTANGULAR FACING STUDY)",
    "(NOT VERIFIED FOR MACHINING - CHECK OFFSETS AND CLEARANCE)",
    "(G54: XY STOCK CORNER - Z0 STOCK TOP - TOOL 1 H1)",
    "(FIRST POSITION ASSUMED XYZ0 FOR PREVIEW ONLY)",
    `(SAFE Z ${safeZ.toFixed(3)} MM - CLEAR ALL FIXTURES)`,
    "G21 G90 G17 G94 G40 G49 G80",
    "G54",
    "T1 M6",
    `S${Math.round(rpm)} M3`,
    "M8",
  ];
  for (const [index, m] of motions.entries()) {
    if ([...m.from, ...m.to].some((x) => !Number.isFinite(x)))
      throw new Error("Ungültige Bahnkoordinate.");
    if (
      m.kind === "cut" &&
      (!m.feed || !Number.isFinite(m.feed) || m.feed <= 0)
    )
      throw new Error("Schnittvorschub fehlt.");
    const xy =
      index === 0 || (m.to[0] === m.from[0] && m.to[1] === m.from[1])
        ? ""
        : ` X${m.to[0].toFixed(3)} Y${m.to[1].toFixed(3)}`;
    lines.push(
      `${m.kind === "rapid" ? "G0" : "G1"}${index === 0 ? " G43 H1" : ""}${xy} Z${m.to[2].toFixed(3)}${m.kind === "cut" ? ` F${m.feed!.toFixed(3)}` : ""}`,
    );
  }
  lines.push("M9", "M5", "M30", "%");
  return lines.join("\n") + "\n";
}
