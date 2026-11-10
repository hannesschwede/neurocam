import type { Motion, Vec3 } from "./types";
export interface ParsedGCode {
  motions: Motion[];
  issues: string[];
  complete: boolean;
}
/** Strict linear subset, stops at first unknown block. G54/H offsets are assumed set externally. */
export function parseGCode(text: string): ParsedGCode {
  const motions: Motion[] = [],
    issues: string[] = [];
  if (!text.trim() || text.length > 1000000)
    return {
      motions,
      issues: ["NC-Text fehlt oder ist größer als 1 MB."],
      complete: false,
    };
  const lines = text.split(/\r?\n/);
  if (lines.length > 20000)
    return {
      motions,
      issues: ["Maximal 20.000 NC-Zeilen erlaubt."],
      complete: false,
    };
  let position: Vec3 = [0, 0, 0],
    unit = 1,
    absolute = true,
    mode: 0 | 1 | null = null,
    feed: number | null = null,
    ended = false;
  const supportedG = new Set([
      0, 1, 17, 20, 21, 40, 43, 49, 54, 80, 90, 91, 94,
    ]),
    supportedM = new Set([0, 1, 2, 3, 5, 6, 8, 9, 30]);
  for (let i = 0; i < lines.length; i++) {
    const fail = (reason: string) =>
      issues.push(`Zeile ${i + 1}: ${reason} Vorschau hier gestoppt.`);
    const line = lines[i]
      .replace(/\([^()]*\)/g, "")
      .split(";")[0]
      .trim()
      .toUpperCase();
    if (!line || line === "%") continue;
    const tokens = [...line.matchAll(/([A-Z])([+-]?(?:\d+(?:\.\d*)?|\.\d+))/g)];
    if (
      !tokens.length ||
      line.replace(/([A-Z])([+-]?(?:\d+(?:\.\d*)?|\.\d+))/g, "").trim()
    ) {
      fail("Nicht unterstützte Syntax.");
      break;
    }
    const words = tokens.map((t) => ({ letter: t[1], value: Number(t[2]) }));
    const unknown = words.find(
      (w) =>
        !Number.isFinite(w.value) ||
        Math.abs(w.value) > 1e7 ||
        !"NGMXYZFSTHO".includes(w.letter) ||
        (w.letter === "G" && !supportedG.has(w.value)) ||
        (w.letter === "M" && !supportedM.has(w.value)),
    );
    if (unknown) {
      fail(`${unknown.letter}${unknown.value} wird nicht unterstützt.`);
      break;
    }
    if (
      ["X", "Y", "Z", "F", "S", "T", "H"].some(
        (c) => words.filter((w) => w.letter === c).length > 1,
      )
    ) {
      fail("Mehrdeutige doppelte Wörter.");
      break;
    }
    const gs = words.filter((w) => w.letter === "G").map((w) => w.value);
    if (
      [
        [0, 1],
        [20, 21],
        [90, 91],
        [43, 49],
      ].some((group) => gs.filter((g) => group.includes(g)).length > 1)
    ) {
      fail("Widersprüchliche modale Befehle.");
      break;
    }
    if (gs.includes(20)) unit = 25.4;
    if (gs.includes(21)) unit = 1;
    if (gs.includes(90)) absolute = true;
    if (gs.includes(91)) absolute = false;
    if (gs.includes(0)) mode = 0;
    if (gs.includes(1)) mode = 1;
    const f = words.find((w) => w.letter === "F")?.value;
    if (f !== undefined) {
      if (f <= 0) {
        fail("Vorschub muss > 0 sein.");
        break;
      }
      feed = f * unit;
    }
    const axes = words.filter((w) => "XYZ".includes(w.letter));
    if (axes.length) {
      if (mode === null) {
        fail("Kein G0/G1-Bewegungsmodus gesetzt.");
        break;
      }
      if (mode === 1 && (!feed || feed <= 0)) {
        fail("Schnitt ohne gültigen Vorschub.");
        break;
      }
      const to: Vec3 = [...position];
      for (const axis of axes) {
        const a = "XYZ".indexOf(axis.letter);
        to[a] = axis.value * unit + (absolute ? 0 : position[a]);
      }
      if (to.some((x) => !Number.isFinite(x) || Math.abs(x) > 1e7)) {
        fail("Koordinatenbereich überschritten.");
        break;
      }
      if (to.some((x, a) => Math.abs(x - position[a]) > 1e-10))
        motions.push({
          from: [...position],
          to,
          kind: mode === 0 ? "rapid" : "cut",
          feed: mode === 0 ? null : feed,
          line: i + 1,
        });
      position = to;
    }
    if (words.some((w) => w.letter === "M" && [2, 30].includes(w.value))) {
      ended = true;
      break;
    }
  }
  if (!motions.length && !issues.length)
    issues.push("Keine unterstützten linearen Bewegungen gefunden.");
  // A missing M30 is allowed for snippets; unknown blocks never are.
  void ended;
  return { motions, issues, complete: issues.length === 0 };
}
