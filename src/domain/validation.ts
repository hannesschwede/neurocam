import type { CuttingResult, FacingJob, Issue, Machine } from "./types";
export function validateMachine(
  job: FacingJob,
  cut: CuttingResult,
  machine: Machine,
): Issue[] {
  const issues: Issue[] = [];
  const error = (code: string, message: string) =>
    issues.push({ severity: "error", code, message });
  if (Object.values(cut).some((x) => !Number.isFinite(x) || x < 0))
    error("nonfinite", "Schnittdaten sind nicht gültig.");
  if (cut.rpm > machine.maxRpm)
    error(
      "rpm",
      `Drehzahl überschreitet ${machine.maxRpm.toLocaleString("de-DE")} 1/min. Vc reduzieren.`,
    );
  if (Math.max(cut.feed, job.plungeFeed) > machine.maxFeed)
    error(
      "feed",
      `Vorschub überschreitet ${machine.maxFeed.toLocaleString("de-DE")} mm/min.`,
    );
  if (cut.drivePower > machine.power)
    error(
      "power",
      `Geschätzte Antriebsleistung überschreitet ${machine.power} kW.`,
    );
  // Tool-centre span includes radius + 2 mm free approach on both X sides.
  if (
    job.width + job.diameter + 4 > machine.travel[0] ||
    job.height > machine.travel[1]
  )
    error(
      "travel-xy",
      "Werkzeugmittelpunktweg inklusive Außenanfahrt überschreitet X/Y-Verfahrweg.",
    );
  if (job.stockHeight + job.safeZ > machine.travel[2])
    error(
      "travel-z",
      "Rohteilhöhe + Sicherheits-Z überschreitet Z-Verfahrweg.",
    );
  if (job.stepDown > job.diameter * 0.5)
    issues.push({
      severity: "warning",
      code: "ap",
      message:
        "Zustellung > 50 % des Durchmessers. Werkzeugdaten und Stabilität prüfen.",
    });
  return issues;
}
