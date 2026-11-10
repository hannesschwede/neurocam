import type { MeshInfo, Vec3 } from "./types";
export const MAX_STL_BYTES = 10 * 1024 * 1024;
const MAX_TRIANGLES = 100000;
const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?";
/** No CAD kernel: exact-edge topology only; self intersections are not checked. */
export function parseSTL(data: ArrayBuffer, scale = 1): MeshInfo {
  if (!Number.isFinite(scale) || scale <= 0 || scale > 1000)
    throw new Error("Skalierung muss > 0 und ≤ 1000 sein.");
  if (!data.byteLength || data.byteLength > MAX_STL_BYTES)
    throw new Error("STL muss zwischen 1 Byte und 10 MiB groß sein.");
  let values: number[] = [],
    format: MeshInfo["format"] = "ASCII";
  const view = new DataView(data),
    count = data.byteLength >= 84 ? view.getUint32(80, true) : 0;
  if (count > 0 && 84 + count * 50 === data.byteLength) {
    if (count > MAX_TRIANGLES)
      throw new Error("Maximal 100.000 Dreiecke erlaubt.");
    format = "Binary";
    values = new Array(count * 9);
    for (let i = 0; i < count; i++)
      for (let j = 0; j < 9; j++)
        values[i * 9 + j] =
          view.getFloat32(84 + i * 50 + 12 + j * 4, true) * scale;
  } else {
    const text = new TextDecoder().decode(data);
    const match =
      /^\s*solid[^\r\n]*\r?\n([\s\S]*?)\bendsolid[^\r\n]*\s*$/i.exec(text);
    if (!match)
      throw new Error("Keine gültige ASCII-STL oder abgeschnittene Binär-STL.");
    const vertex = `vertex\\s+(${number})\\s+(${number})\\s+(${number})`;
    const facet = new RegExp(
      `facet\\s+normal\\s+${number}\\s+${number}\\s+${number}\\s+outer\\s+loop\\s+${vertex}\\s+${vertex}\\s+${vertex}\\s+endloop\\s+endfacet`,
      "gi",
    );
    const rest = match[1].replace(facet, (_all, ...groups: unknown[]) => {
      if (values.length >= MAX_TRIANGLES * 9)
        throw new Error("Maximal 100.000 Dreiecke erlaubt.");
      for (let i = 0; i < 9; i++) values.push(Number(groups[i]) * scale);
      return "";
    });
    if (rest.trim() || !values.length)
      throw new Error("Ungültige ASCII-STL: vollständige Dreiecke erwartet.");
  }
  if (values.some((x) => !Number.isFinite(x) || Math.abs(x) > 1e7))
    throw new Error("Nicht endliche oder zu große STL-Koordinate.");
  const min: Vec3 = [Infinity, Infinity, Infinity],
    max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < values.length; i++) {
    const a = i % 3;
    min[a] = Math.min(min[a], values[i]);
    max[a] = Math.max(max[a], values[i]);
  }
  const size = max.map((x, i) => x - min[i]) as Vec3;
  const edges = new Map<string, { count: number; balance: number }>();
  let signedVolume = 0,
    degenerate = 0;
  for (let i = 0; i < values.length; i += 9) {
    const pts = [
      values.slice(i, i + 3),
      values.slice(i + 3, i + 6),
      values.slice(i + 6, i + 9),
    ];
    const [a, b, c] = pts.map((v) => v.map((x, j) => x - min[j]));
    signedVolume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    const u = b.map((x, j) => x - a[j]),
      v = c.map((x, j) => x - a[j]);
    if (
      Math.hypot(
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ) < 1e-12
    )
      degenerate++;
    const keys = pts.map((v) => v.map((x) => (x === 0 ? 0 : x)).join(","));
    for (let j = 0; j < 3; j++) {
      const from = keys[j],
        to = keys[(j + 1) % 3],
        key = from < to ? `${from}|${to}` : `${to}|${from}`;
      const edge = edges.get(key) || { count: 0, balance: 0 };
      edge.count++;
      edge.balance += from < to ? 1 : -1;
      edges.set(key, edge);
    }
  }
  const closed =
    !degenerate &&
    [...edges.values()].every((e) => e.count === 2 && e.balance === 0);
  const warnings: string[] = [];
  if (!closed)
    warnings.push(
      "Offene, nicht-mannigfaltige, degenerierte oder inkonsistent orientierte Kanten: kein belastbares Volumen.",
    );
  if (closed)
    warnings.push(
      "Kanten geschlossen. Selbstüberschneidungen und überlappende Körper sind nicht geprüft.",
    );
  return {
    positions: new Float32Array(values),
    triangles: values.length / 9,
    min,
    max,
    size,
    volume: closed ? Math.abs(signedVolume) : null,
    closed,
    format,
    warnings,
  };
}
