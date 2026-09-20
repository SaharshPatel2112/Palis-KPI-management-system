import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from "recharts";
import { client } from "../api/client";
import KpiCard from "../components/KpiCard";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";
import { ArrowLeft } from "lucide-react";

type DeptSummary = {
  department: string;
  target: number;
  achieved: number;
  achievementPercent: number;
};

type MetricPoint = {
  id: number;
  name: string;
  unit: string | null;
  target: number;
  achieved: number;
  achievementPercent: number;
};

type DeptBreakdown = {
  id: number;
  name: string;
  target: number;
  achieved: number;
  achievementPercent: number;
  metrics: MetricPoint[];
};

const GOOD = "#087D43";
const WARN = "#C98A2B";
const BAD = "#C6423C";
const NO_TARGET = "#B9C4BE";

function barColor(m: MetricPoint) {
  if (m.target === 0) return NO_TARGET;
  return m.achievementPercent >= 90
    ? GOOD
    : m.achievementPercent >= 70
      ? WARN
      : BAD;
}

function badgeClass(p: number) {
  if (p >= 90) return "bg-soft text-primary";
  if (p >= 70) return "bg-[#FBF3E4] text-warn";
  return "bg-badBg text-bad";
}

const formatNum = (n: number) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: 1 });

function BreakdownTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload as MetricPoint;
  return (
    <div className="bg-white border border-line rounded-lg shadow-lg px-3.5 py-2.5 text-xs max-w-[230px]">
      <p className="font-semibold text-ink mb-1.5">{m.name}</p>
      <p className="font-mono text-muted">
        Target:{" "}
        <span className="text-ink font-semibold">{formatNum(m.target)}</span>
      </p>
      <p className="font-mono text-muted">
        Achieved:{" "}
        <span className="text-ink font-semibold">{formatNum(m.achieved)}</span>
      </p>
      <p className="font-mono text-primary font-semibold mt-1.5 pt-1.5 border-t border-line">
        {m.target === 0
          ? "No target set"
          : `${m.achievementPercent}% of target`}
      </p>
    </div>
  );
}

// One chart per department. Achievement % is unit-agnostic, so Revenue (₹)
// and order counts can share an axis safely; raw values live in the table
// under each chart.
function DepartmentChart({ dept }: { dept: DeptBreakdown }) {
  const data = dept.metrics.map((m) => ({ ...m, pct: m.achievementPercent }));
  const maxPct = Math.max(100, ...data.map((d) => d.pct + 10));

  return (
    <div className="bg-white border border-line rounded-xl shadow-sm p-5 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-ink">{dept.name}</h3>
        <span
          className={`font-mono text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass(dept.achievementPercent)}`}
        >
          {dept.achievementPercent}% overall
        </span>
      </div>
      <p className="text-xs text-muted font-mono mb-3">
        {formatNum(dept.achieved)} / {formatNum(dept.target)} across{" "}
        {dept.metrics.length} metric{dept.metrics.length === 1 ? "" : "s"}
      </p>

      <div className="flex-1">
        <ResponsiveContainer
          width="100%"
          height={Math.max(120, dept.metrics.length * 46)}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="#E3EAE6"
            />
            <XAxis
              type="number"
              domain={[0, maxPct]}
              tickFormatter={(v) => `${v}%`}
              stroke="#5B6B63"
              tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
              axisLine={{ stroke: "#E3EAE6" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              stroke="#5B6B63"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<BreakdownTooltip />}
              cursor={{ fill: "#F1FAF4" }}
            />
            <ReferenceLine
              x={100}
              stroke={GOOD}
              strokeDasharray="4 4"
              strokeOpacity={0.45}
            />
            <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={20}>
              {data.map((d) => (
                <Cell key={d.id} fill={barColor(d)} />
              ))}
              <LabelList
                dataKey="pct"
                position="right"
                formatter={(v: number) => `${v}%`}
                style={{
                  fontSize: 11,
                  fill: "#5B6B63",
                  fontFamily: "IBM Plex Mono",
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="w-full text-xs mt-4 pt-3 border-t border-line">
        <tbody>
          {dept.metrics.map((m) => (
            <tr key={m.id} className="text-muted">
              <td className="py-1 pr-2 text-ink truncate max-w-[150px]">
                {m.name}
              </td>
              <td className="py-1 pr-2 font-mono text-right whitespace-nowrap">
                {formatNum(m.target)}
              </td>
              <td className="py-1 font-mono text-right text-ink whitespace-nowrap">
                {formatNum(m.achieved)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const { employee, loading: meLoading } = useEmployee();
  const [summary, setSummary] = useState<DeptSummary[]>([]);
  const [breakdown, setBreakdown] = useState<DeptBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [sumRes, brkRes] = await Promise.all([
          client.get<DeptSummary[]>("/kpi/dashboard-summary"),
          client.get<DeptBreakdown[]>("/kpi/department-breakdown"),
        ]);
        setSummary(sumRes.data);
        setBreakdown(brkRes.data);
      } catch {
        setError("Could not load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    if (employee) load();
  }, [employee]);

  const canManage =
    !!employee && ["ADMIN", "HR", "MANAGER"].includes(employee.role);
  const canAccessTeam =
    !!employee && ["ADMIN", "MANAGER", "HR"].includes(employee.role);

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-muted hover:text-ink transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          </div>
          <div className="flex items-center gap-5">
            {employee?.role !== "ADMIN" && (
              <Link
                to="/my-kpis"
                className="text-sm font-medium text-primary hover:text-deep"
              >
                My KPIs
              </Link>
            )}
            {employee?.role === "ADMIN" || employee?.role === "HR" ? (
              <Link
                to="/users-kpis"
                className="text-sm font-medium text-primary hover:text-deep"
              >
                Users&apos; KPIs
              </Link>
            ) : null}
            {employee?.role === "ADMIN" && (
              <Link
                to="/upload-csv"
                className="text-sm font-medium text-primary hover:text-deep"
              >
                Upload CSV
              </Link>
            )}
            {canManage && (
              <Link
                to="/reports"
                className="text-sm font-medium text-primary hover:text-deep"
              >
                Reports
              </Link>
            )}
            {canAccessTeam && (
              <Link
                to="/team"
                className="text-sm font-medium text-primary hover:text-deep"
              >
                Team
              </Link>
            )}
          </div>
        </div>

        {(loading || meLoading) && <p className="text-muted">Loading...</p>}
        {error && <p className="text-bad">{error}</p>}

        {!loading && !meLoading && !error && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {summary.map((s) => (
                <KpiCard key={s.department} {...s} />
              ))}
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink">
                Department Performance
              </h2>
              <span className="text-xs text-muted">
                Achievement % per metric · dashed line = 100% of target
              </span>
            </div>

            {breakdown.length === 0 ? (
              <p className="text-muted text-sm">
                No KPI entries yet — log some numbers or upload a CSV to see
                charts here.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {breakdown.map((d) => (
                  <DepartmentChart key={d.id} dept={d} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
