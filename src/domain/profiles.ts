import type { Machine } from "./types";
export const MATERIAL_SOURCE =
  "https://www.harveytool.com/resources/general-machining-guidelines";
export interface Material {
  id: string;
  name: string;
  grade: string;
  vcRange: [number, number];
  vc: number;
  fz: number;
  kc: number;
  note: string;
}
// Vc ranges converted from Harvey Tool SFM (x 0.3048). fz and kc are educational assumptions.
export const materials: Material[] = [
  {
    id: "al6061",
    name: "Aluminium 6061",
    grade: "T6 / T651",
    vcRange: [243.84, 457.2],
    vc: 250,
    fz: 0.06,
    kc: 700,
    note: "Harvey: 800–1500 SFM, Vollhartmetall. fz = 0,06 und kc = 700 sind Modellannahmen.",
  },
  {
    id: "al7075",
    name: "Aluminium 7075",
    grade: "T6",
    vcRange: [243.84, 457.2],
    vc: 250,
    fz: 0.06,
    kc: 800,
    note: "Gleiche Harvey-Werkstoffgruppe. fz = 0,06 und kc = 800 sind Modellannahmen.",
  },
  {
    id: "steel1018",
    name: "Stahl 1018",
    grade: "unlegiert / weich",
    vcRange: [30.48, 91.44],
    vc: 60,
    fz: 0.04,
    kc: 1800,
    note: "Harvey: Gruppe 10XX, 100–300 SFM. fz = 0,04 und kc = 1800 sind Modellannahmen.",
  },
  {
    id: "ss304",
    name: "Edelstahl 304",
    grade: "austenitisch",
    vcRange: [30.48, 76.2],
    vc: 45,
    fz: 0.025,
    kc: 2400,
    note: "Harvey: 304, 100–250 SFM. fz = 0,025 und kc = 2400 sind Modellannahmen.",
  },
];
// Deliberately generic teaching profiles, NOT asserted manufacturer specifications.
export const machines: Machine[] = [
  {
    id: "lab",
    name: "3-Achs-Labor · generisch",
    maxRpm: 12000,
    maxFeed: 6000,
    travel: [500, 400, 300],
    power: 7.5,
    rapid: 12000,
  },
  {
    id: "compact",
    name: "Kompaktfräse · generisch",
    maxRpm: 8000,
    maxFeed: 3000,
    travel: [300, 200, 180],
    power: 2.2,
    rapid: 6000,
  },
];
