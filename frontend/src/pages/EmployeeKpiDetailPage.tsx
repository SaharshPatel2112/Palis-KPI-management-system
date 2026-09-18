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
  const byPeriod = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.period] ??= []).push(e);
    return acc;
  }, {});
  const periods = Object.keys(byPeriod).sort().reverse();
  const totalT = entries.reduce((s, e) => s + e.target, 0);
  const totalA = entries.reduce((s, e) => s + e.achieved, 0);

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{name} — KPIs</h1>
            <p className="text-sm text-muted mt-1">
              All logged periods · overall{" "}
              <span
                className={`font-mono font-semibold ${statusClass(pct(totalT, totalA))}`}
              >
                {pct(totalT, totalA)}%
              </span>
            </p>
          </div>
          <Link
            to="/users-kpis"
            className="text-sm font-medium text-primary hover:text-deep"
          >
            Back to Employee KPIs
          </Link>
        </div>

        {loading || meLoading ? (
          <p className="text-muted">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-muted">Nothing logged for this employee yet.</p>
        ) : (
          <div className="space-y-8">
            {periods.map((period) => (
              <div key={period}>
                <h2 className="font-mono text-sm text-muted mb-3">{period}</h2>
                <div className="border border-line rounded-xl overflow-hidden overflow-x-auto shadow-sm">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead className="bg-panel text-left text-muted">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Metric</th>
                        <th className="px-4 py-2.5 font-medium w-24">Target</th>
                        <th className="px-4 py-2.5 font-medium w-24">
                          Achieved
                        </th>
                        <th className="px-4 py-2.5 font-medium w-20">%</th>
                        <th className="px-4 py-2.5 font-medium">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byPeriod[period].map((e) => {
                        const p = pct(e.target, e.achieved);
                        return (
                          <tr key={e.id} className="border-t border-line">
                            <td className="px-4 py-2.5 text-ink">
                              {e.metric.name}
                              <span className="block text-[11px] text-muted">
                                {e.metric.department.name}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-muted">
                              {e.target.toLocaleString("en-IN")}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-ink">
                              {e.achieved.toLocaleString("en-IN")}
                            </td>
                            <td
                              className={`px-4 py-2.5 font-mono font-semibold ${statusClass(p)}`}
                            >
                              {p}%
                            </td>
                            <td className="px-4 py-2.5 text-muted">
                              {e.remarks || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
