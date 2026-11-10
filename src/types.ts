import type { FacingJob } from "./domain/types";
export interface PlanSettings extends Omit<FacingJob, "feed"> {
  teeth: number;
  vc: number;
  fz: number;
  kc: number;
  efficiency: number;
}
