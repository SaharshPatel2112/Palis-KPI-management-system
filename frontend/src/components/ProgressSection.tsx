import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { client } from "../api/client";

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: 1 });

type PeriodStat = {
  target: number;
  achieved: number;
  achievementPercent: number;
};

type MetricProgress = {
  name: string;
  base: PeriodStat;
  compare: PeriodStat;
  delta: number;
};

type DepartmentProgress = {
  department: string;
  base: PeriodStat;
  compare: PeriodStat;
  delta: number;
  status: "increase" | "decrease" | "same";
  metrics: MetricProgress[];
};

type ProgressResponse = {
  basePeriod: string;
  comparePeriod: string;
  overall: {
    base: PeriodStat;
    compare: PeriodStat;
    delta: number;
    status: "increase" | "decrease" | "same";
  };
  departments: DepartmentProgress[];
};

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];
const YEARS = [
  CURRENT_YEAR - 2,
  CURRENT_YEAR - 1,
  CURRENT_YEAR,
  CURRENT_YEAR + 1,
];

export default function ProgressSection() {
  const { getToken, isLoaded } = useAuth();
  const [mode, setMode] = useState<"month" | "year">("month");

  const currentMonthStr = String(NOW.getMonth() + 1).padStart(2, "0");
  const prevMonthStr = String(
    NOW.getMonth() === 0 ? 12 : NOW.getMonth(),
  ).padStart(2, "0");
  const prevMonthYear = NOW.getMonth() === 0 ? CURRENT_YEAR - 1 : CURRENT_YEAR;

  const [baseMonthYear, setBaseMonthYear] = useState(String(prevMonthYear));
  const [baseMonth, setBaseMonth] = useState(prevMonthStr);

  const [compareMonthYear, setCompareMonthYear] = useState(
    String(CURRENT_YEAR),
  );
  const [compareMonth, setCompareMonth] = useState(currentMonthStr);

  const [baseYear, setBaseYear] = useState(String(CURRENT_YEAR - 1));
  const [compareYear, setCompareYear] = useState(String(CURRENT_YEAR));

  const [data, setData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeDept, setActiveDept] = useState<string>("Sales");

  const basePeriod =
    mode === "month" ? `${baseMonthYear}-${baseMonth}` : baseYear;
  const comparePeriod =
    mode === "month" ? `${compareMonthYear}-${compareMonth}` : compareYear;

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        const token = await getToken();
        const res = await client.get<ProgressResponse>("/kpi/progress", {
          params: { basePeriod, comparePeriod, all: "true" },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!cancelled) {
          setData(res.data);
          if (
            res.data.departments.length > 0 &&
            !res.data.departments.find((d) => d.department === "Sales")
          ) {
            setActiveDept(res.data.departments[0].department);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(
            err.response?.data?.message || "Failed to load progress data.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [basePeriod, comparePeriod, isLoaded, getToken]);

  const mainChartData = (data?.departments || []).map((d) => ({
    department: d.department,
    [basePeriod]: d.base.achievementPercent,
    [comparePeriod]: d.compare.achievementPercent,
    baseTarget: d.base.target,
    baseAchieved: d.base.achieved,
    compareTarget: d.compare.target,
    compareAchieved: d.compare.achieved,
    delta: d.delta,
  }));

  const activeDeptData = data?.departments.find(
    (d) => d.department === activeDept,
  );
  const detailedChartData = (activeDeptData?.metrics || []).map((m) => ({
    name: m.name,
    [basePeriod]: m.base.achievementPercent,
    [comparePeriod]: m.compare.achievementPercent,
    baseTarget: m.base.target,
    baseAchieved: m.base.achieved,
    compareTarget: m.compare.target,
    compareAchieved: m.compare.achieved,
  }));

  const getTicks = (chartData: any[]) => {
    let maxVal = 100;
    chartData.forEach((d) => {
      if (d[basePeriod] > maxVal) maxVal = d[basePeriod];
      if (d[comparePeriod] > maxVal) maxVal = d[comparePeriod];
    });
    if (maxVal <= 100) return [0, 25, 50, 75, 100];
    if (maxVal <= 125) return [0, 25, 50, 75, 100, 125];
    if (maxVal <= 150) return [0, 25, 50, 75, 100, 125, 150];
    return [0, 25, 50, 75, 100, 125, 150, 175, 200];
  };

  const mainTicks = getTicks(mainChartData);
  const detailTicks = getTicks(detailedChartData);

  // Updated Tooltip to accept a showRaw prop
  const CustomTooltip = ({ active, payload, label, showRaw = false }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-line rounded-lg shadow-lg px-3.5 py-2.5 text-xs">
          <p className="font-semibold text-ink mb-1.5">{label}</p>
          {payload.map((entry: any) => {
            const isBase = entry.dataKey === basePeriod;
            const target = isBase
              ? entry.payload.baseTarget
              : entry.payload.compareTarget;
            const achieved = isBase
              ? entry.payload.baseAchieved
              : entry.payload.compareAchieved;
            return (
              <div
                key={entry.dataKey}
                className="flex items-center gap-2 mb-1.5 last:mb-0"
              >
                <span
                  className="w-2 h-2 rounded-sm inline-block shrink-0"
                  style={{ background: entry.color }}
                />
                <span className="text-muted w-16">{entry.name}:</span>
                <span className="font-semibold text-ink">
                  {showRaw ? (
                    <>
                      {fmt(achieved)} / {fmt(target)}{" "}
                      <span className="text-muted font-normal ml-1">
                        ({entry.value}%)
                      </span>
                    </>
                  ) : (
                    `${entry.value}%`
                  )}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const renderDeltaBadge = (delta: number) => {
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-soft text-primary border border-primary/20">
          <TrendingUp size={13} /> +{delta}%
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-badBg text-bad border border-bad/20">
          <TrendingDown size={13} /> {delta}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-panel text-muted border border-line">
        <Minus size={13} /> 0%
      </span>
    );
  };

  return (
    <div className="bg-white border border-line rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-line">
        {data ? (
          <div className="flex items-center gap-5 sm:gap-8 bg-panel px-5 py-3.5 rounded-xl border border-line">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted">
                Overall Organization
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold text-ink">
                  {data.overall.base.achievementPercent}%
                </span>
                <ArrowRight size={15} className="text-muted" />
                <span className="font-mono text-xl font-bold text-ink">
                  {data.overall.compare.achievementPercent}%
                </span>
              </div>
            </div>
            <div className="border-l border-line pl-5 sm:pl-8">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted mb-1">
                Net Delta
              </p>
              <div>{renderDeltaBadge(data.overall.delta)}</div>
            </div>
          </div>
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex bg-panel p-1 rounded-lg border border-line text-xs font-medium">
            <button
              onClick={() => setMode("month")}
              className={`px-4 py-1.5 rounded-md transition ${mode === "month" ? "bg-white text-ink shadow-sm font-semibold" : "text-muted hover:text-ink"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setMode("year")}
              className={`px-4 py-1.5 rounded-md transition ${mode === "year" ? "bg-white text-ink shadow-sm font-semibold" : "text-muted hover:text-ink"}`}
            >
              Yearly
            </button>
          </div>

          <div className="flex items-center gap-2">
            {mode === "month" ? (
              <>
                <div className="flex gap-1">
                  <select
                    value={baseMonthYear}
                    onChange={(e) => setBaseMonthYear(e.target.value)}
                    className="border border-line rounded-md px-2 py-1.5 text-xs bg-white text-ink cursor-pointer"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    value={baseMonth}
                    onChange={(e) => setBaseMonth(e.target.value)}
                    className="border border-line rounded-md px-2 py-1.5 text-xs bg-white text-ink cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <ArrowRight size={14} className="text-muted shrink-0" />
                <div className="flex gap-1">
                  <select
                    value={compareMonthYear}
                    onChange={(e) => setCompareMonthYear(e.target.value)}
                    className="border border-line rounded-md px-2 py-1.5 text-xs bg-white text-ink cursor-pointer"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <select
                    value={compareMonth}
                    onChange={(e) => setCompareMonth(e.target.value)}
                    className="border border-line rounded-md px-2 py-1.5 text-xs bg-white text-ink cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <select
                  value={baseYear}
                  onChange={(e) => setBaseYear(e.target.value)}
                  className="border border-line rounded-md px-2.5 py-1.5 text-xs bg-white text-ink cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ArrowRight size={14} className="text-muted shrink-0" />
                <select
                  value={compareYear}
                  onChange={(e) => setCompareYear(e.target.value)}
                  className="border border-line rounded-md px-2.5 py-1.5 text-xs bg-white text-ink cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-primary" size={28} />
          <p className="text-xs text-muted">Calculating progress deltas...</p>
        </div>
      ) : errorMsg ? (
        <div className="my-8 p-4 bg-badBg/50 border border-bad/20 rounded-xl flex items-center gap-3 text-bad text-sm">
          <AlertCircle size={20} className="shrink-0" />
          <p>{errorMsg}</p>
        </div>
      ) : data ? (
        <div className="space-y-10 mt-8">
          <div>
            <h4 className="text-sm font-semibold text-ink mb-5">
              Department Achievement Progress (%)
            </h4>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mainChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E3EAE6"
                  />
                  <XAxis
                    dataKey="department"
                    stroke="#5B6B63"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: "#E3EAE6" }}
                    tickLine={false}
                  />
                  <YAxis
                    ticks={mainTicks}
                    domain={[0, mainTicks[mainTicks.length - 1]]}
                    stroke="#5B6B63"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/* showRaw={false} hides the target/achieved numbers on the main chart */}
                  <Tooltip
                    content={<CustomTooltip showRaw={false} />}
                    cursor={{ fill: "#F1FAF4" }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="square"
                    iconSize={12}
                  />
                  <Bar
                    dataKey={basePeriod}
                    fill="#DCE7DF"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey={comparePeriod}
                    fill="#087D43"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink mb-3">
              Department Growth Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {data.departments.map((dept) => {
                const isActive = activeDept === dept.department;
                return (
                  <div
                    key={dept.department}
                    onClick={() => setActiveDept(dept.department)}
                    className={`border rounded-xl p-4 transition cursor-pointer flex items-center justify-between ${
                      isActive
                        ? "border-primary bg-soft/30 ring-1 ring-primary"
                        : "border-line bg-white hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-ink text-sm">
                        {dept.department}
                      </p>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        {dept.base.achievementPercent}% →{" "}
                        {dept.compare.achievementPercent}%
                      </p>
                    </div>
                    {renderDeltaBadge(dept.delta)}
                  </div>
                );
              })}
            </div>
          </div>

          {activeDeptData && detailedChartData.length > 0 && (
            <div className="pt-8 border-t border-line">
              <h4 className="text-base font-semibold text-ink mb-6">
                {activeDept}
              </h4>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={detailedChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E3EAE6"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#5B6B63"
                      tick={{ fontSize: 11 }}
                      axisLine={{ stroke: "#E3EAE6" }}
                      tickLine={false}
                    />
                    <YAxis
                      ticks={detailTicks}
                      domain={[0, detailTicks[detailTicks.length - 1]]}
                      stroke="#5B6B63"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    {/* showRaw={true} keeps the detailed metrics in the lower chart */}
                    <Tooltip
                      content={<CustomTooltip showRaw={true} />}
                      cursor={{ fill: "#F1FAF4" }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="square"
                      iconSize={12}
                    />
                    <Bar
                      dataKey={basePeriod}
                      fill="#DCE7DF"
                      radius={[4, 4, 0, 0]}
                      barSize={32}
                    />
                    <Bar
                      dataKey={comparePeriod}
                      fill="#087D43"
                      radius={[4, 4, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
