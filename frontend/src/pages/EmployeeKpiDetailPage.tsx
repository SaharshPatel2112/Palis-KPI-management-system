import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { client } from "../api/client";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

type Entry = {
  id: number;
  period: string;
  target: number;
  achieved: number;
  remarks: string | null;
  employee: { id: number; name: string };
  metric: {
    id: number;
    name: string;
    department: { id: number; name: string };
  };
};

function pct(target: number, achieved: number) {
  return target > 0 ? Math.round((achieved / target) * 100) : 0;
}

function statusClass(p: number) {
  if (p >= 90) return "text-primary";
  if (p >= 70) return "text-warn";
  return "text-bad";
}

export default function EmployeeKpiDetailPage() {
  const { employeeId } = useParams();
  const { employee, loading: meLoading } = useEmployee();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await client.get<Entry[]>("/kpi/entries", {
          params: { employeeId },
        });
        setEntries(data);
      } finally {
        setLoading(false);
      }
    }
    if (employee) load();
  }, [employee, employeeId]);

  if (
    !meLoading &&
    employee &&
    !["ADMIN", "HR", "MANAGER"].includes(employee.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  const name = entries[0]?.employee.name ?? "Employee";
  const byMonth = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    const month = e.period.slice(0, 7); // "YYYY-MM"
    (acc[month] ??= []).push(e);
    return acc;
  }, {});
  const months = Object.keys(byMonth).sort().reverse();

  const avgPcts = entries.map((e) => pct(e.target, e.achieved));
  const overallPct = avgPcts.length
    ? Math.round(avgPcts.reduce((s, x) => s + x, 0) / avgPcts.length)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{name} — KPIs</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted">All logged periods</span>
              <span className="text-muted text-xs">&bull;</span>
              <span className="text-sm text-muted">Overall:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-panel border border-line ${statusClass(overallPct)}`}
              >
                {overallPct}%
              </span>
            </div>
          </div>
          <Link
            to="/users-kpis"
            className="text-sm font-medium text-primary hover:text-deep shrink-0 transition-colors"
          >
            &larr; Back to Employee KPIs
          </Link>
        </div>

        {loading || meLoading ? (
          <div className="py-8 flex justify-center">
            <span className="text-muted animate-pulse">Loading…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-panel border border-line rounded-lg p-8 text-center text-muted">
            Nothing logged for this employee yet.
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {months.map((month) => (
              <div key={month}>
                <h2 className="font-mono text-sm font-medium text-muted mb-3 uppercase tracking-wider">
                  {month}
                </h2>
                <div className="border border-line rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[620px]">
                      <thead className="bg-panel text-left text-muted border-b border-line">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Metric</th>
                          <th className="px-4 py-3 font-medium w-24">Target</th>
                          <th className="px-4 py-3 font-medium w-24">
                            Achieved
                          </th>
                          <th className="px-4 py-3 font-medium w-20">%</th>
                          <th className="px-4 py-3 font-medium">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {byMonth[month].map((e) => {
                          const p = pct(e.target, e.achieved);
                          return (
                            <tr
                              key={e.id}
                              className="hover:bg-panel/50 transition-colors"
                            >
                              <td className="px-4 py-3.5 font-mono text-muted">
                                {e.period.split("-").reverse().join("-")}
                              </td>
                              <td className="px-4 py-3.5 text-ink font-medium">
                                {e.metric.name}
                                <span className="block text-[11px] text-muted font-normal mt-0.5">
                                  {e.metric.department.name}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-mono text-muted">
                                {e.target.toLocaleString("en-IN")}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-ink">
                                {e.achieved.toLocaleString("en-IN")}
                              </td>
                              <td
                                className={`px-4 py-3.5 font-mono font-semibold ${statusClass(p)}`}
                              >
                                {p}%
                              </td>
                              <td className="px-4 py-3.5 text-muted">
                                {e.remarks || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
