export const formatNumber = (n: number, digits = 0) =>
  Number.isFinite(n)
    ? n.toLocaleString("de-DE", { maximumFractionDigits: digits })
    : "–";
