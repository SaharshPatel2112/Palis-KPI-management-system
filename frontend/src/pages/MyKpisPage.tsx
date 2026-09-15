import { useEffect, useState } from "react";
import { client } from "../api/client";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

type MyEntry = {
  id: number;
  period: string;
  target: number;
  achieved: number;
  remarks: string | null;
  metric: { id: number; name: string; unit: string | null };
};

function pct(target: number, achieved: number) {
  return target > 0 ? Math.round((achieved / target) * 100) : 0;
}

function statusClass(p: number) {
  if (p >= 90) return "text-primary";
  if (p >= 70) return "text-warn";
  return "text-bad";
}

export default function MyKpisPage() {
  const { employee, loading: meLoading } = useEmployee();
  const [entries, setEntries] = useState<MyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await client.get<MyEntry[]>("/kpi/my-kpis");
        setEntries(data);
      } finally {
        setLoading(false);
      }
    }
    if (employee) load();
  }, [employee]);

  const byPeriod = entries.reduce<Record<string, MyEntry[]>>((acc, e) => {
    (acc[e.period] ??= []).push(e);
    return acc;
  }, {});
  const periods = Object.keys(byPeriod).sort().reverse();

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-ink mb-1">My KPIs</h1>
        <p className="text-sm text-muted mb-8">
          Your own targets, achievements, and manager remarks
          {employee ? ` — ${employee.name}` : ""}.
        </p>

        {loading || meLoading ? (
          <p className="text-muted">Loading…</p>
        ) : periods.length === 0 ? (
          <p className="text-muted">
            Nothing logged for you yet — check back after your manager records
            this period's numbers.
          </p>
        ) : (
          <div className="space-y-8">
            {periods.map((period) => (
              <div key={period}>
                <h2 className="font-mono text-sm text-muted mb-3">{period}</h2>
                <div className="border border-line rounded-lg overflow-hidden overflow-x-auto">
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
                            </td>
                            <td className="px-4 py-2.5 font-mono text-muted">
                              {e.target}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-ink">
                              {e.achieved}
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
