export function boxTriangles(w = 1, h = 1, d = 1, offset = 0): number[][] {
  const v = [
    [0, 0, 0],
    [w, 0, 0],
    [w, h, 0],
    [0, h, 0],
    [0, 0, d],
    [w, 0, d],
    [w, h, d],
    [0, h, d],
  ].map((p) => p.map((x) => x + offset));
  const f = [
    [0, 2, 1],
    [0, 3, 2],
    [4, 5, 6],
    [4, 6, 7],
    [0, 1, 5],
    [0, 5, 4],
    [3, 7, 6],
    [3, 6, 2],
    [0, 4, 7],
    [0, 7, 3],
    [1, 2, 6],
    [1, 6, 5],
  ];
  return f.map((t) => t.flatMap((i) => v[i]));
}
export function ascii(tris = boxTriangles()): ArrayBuffer {
  return new TextEncoder().encode(
    "solid box\n" +
      tris
        .map(
          (t) =>
            "facet normal 0 0 0\nouter loop\n" +
            [0, 3, 6]
              .map((i) => `vertex ${t.slice(i, i + 3).join(" ")}`)
              .join("\n") +
            "\nendloop\nendfacet",
        )
        .join("\n") +
      "\nendsolid box",
  ).buffer as ArrayBuffer;
}
export function binary(): ArrayBuffer {
  const tris = boxTriangles(2, 3, 4),
    b = new ArrayBuffer(84 + 50 * tris.length),
    v = new DataView(b);
  new Uint8Array(b).set(
    new TextEncoder().encode("solid misleading binary header"),
  );
  v.setUint32(80, tris.length, true);
  tris.forEach((t, i) =>
    t.forEach((x, j) => v.setFloat32(84 + i * 50 + 12 + j * 4, x, true)),
  );
  return b;
}
