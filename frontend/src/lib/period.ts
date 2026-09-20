export type Granularity = "daily" | "monthly" | "yearly";

export const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

// Today's period in the given granularity: "2026-09-18", "2026-09", or "2026".
export function defaultPeriod(g: Granularity): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return g === "yearly"
    ? String(y)
    : g === "monthly"
      ? `${y}-${m}`
      : `${y}-${m}-${day}`;
}

// Year dropdown options: 10 back, 2 ahead.
export function yearOptions(pad = 10): number[] {
  const y = new Date().getFullYear();
  const years: number[] = [];
  for (let i = y - pad; i <= y + 2; i++) years.push(i);
  return years;
}
