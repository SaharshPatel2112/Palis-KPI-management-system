import {
  GRANULARITIES,
  defaultPeriod,
  yearOptions,
  type Granularity,
} from "../lib/period";

type Props = {
  granularity: Granularity;
  period: string;
  onChange: (granularity: Granularity, period: string) => void;
};

// Daily / Monthly / Yearly toggle plus the matching input
// (date picker / month picker / year dropdown). Shared by the KPI entry
// screen and the reports filters.
export default function PeriodPicker({ granularity, period, onChange }: Props) {
  const inputClass = "border border-line rounded-md px-3 py-2 text-sm bg-white";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex rounded-md border border-line overflow-hidden">
        {GRANULARITIES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => onChange(g.value, defaultPeriod(g.value))}
            className={`px-3 py-2 text-sm ${
              granularity === g.value
                ? "bg-primary text-white font-semibold"
                : "bg-white text-muted hover:text-ink"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {granularity === "daily" && (
        <input
          type="date"
          value={period}
          onChange={(e) => onChange(granularity, e.target.value)}
          className={inputClass}
        />
      )}
      {granularity === "monthly" && (
        <input
          type="month"
          value={period}
          onChange={(e) => onChange(granularity, e.target.value)}
          className={inputClass}
        />
      )}
      {granularity === "yearly" && (
        <select
          value={period}
          onChange={(e) => onChange(granularity, e.target.value)}
          className={inputClass}
        >
          {yearOptions().map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
