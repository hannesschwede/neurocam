export type Vec3 = [number, number, number];
export type Motion = {
  from: Vec3;
  to: Vec3;
  kind: "rapid" | "cut";
  feed: number | null;
  line?: number;
};
export type Issue = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
};
export interface FacingJob {
  width: number;
  height: number;
  stockHeight: number;
  depth: number;
  stepDown: number;
  stepOver: number;
  diameter: number;
  safeZ: number;
  feed: number;
  plungeFeed: number;
}
export interface CuttingInput {
  diameter: number;
  teeth: number;
  vc: number;
  fz: number;
  ap: number;
  ae: number;
  kc: number;
  efficiency: number;
}
export interface CuttingResult {
  rpm: number;
  feed: number;
  mrr: number;
  cuttingPower: number;
  drivePower: number;
}
export interface Machine {
  id: string;
  name: string;
  maxRpm: number;
  maxFeed: number;
  travel: Vec3;
  power: number;
  rapid: number;
}
export interface MeshInfo {
  positions: Float32Array;
  triangles: number;
  min: Vec3;
  max: Vec3;
  size: Vec3;
  volume: number | null;
  closed: boolean;
  format: "ASCII" | "Binary";
  warnings: string[];
}
