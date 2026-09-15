import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { client } from "../api/client";
import KpiCard from "../components/KpiCard";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

type DeptSummary = {
  department: string;
  target: number;
  achieved: number;
  achievementPercent: number;
};

export default function Dashboard() {
  const { employee, loading: meLoading } = useEmployee();
  const [summary, setSummary] = useState<DeptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await client.get<DeptSummary[]>(
          "/kpi/dashboard-summary",
        );
        setSummary(data);
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
  const isAdmin = employee?.role === "ADMIN";

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-ink">Overview</h1>
          <div className="flex items-center gap-5">
            <Link
              to="/my-kpis"
              className="text-sm font-medium text-primary hover:text-deep"
            >
              My KPIs
            </Link>
            {canManage && (
              <Link
                to="/kpi/sales"
                className="text-sm font-medium text-primary hover:text-deep"
              >
                Log Sales KPIs
              </Link>
            )}
            {isAdmin && (
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {summary.map((s) => (
                <KpiCard key={s.department} {...s} />
              ))}
            </div>

            <div className="bg-panel rounded-md p-5 h-80 border border-line">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary}>
                  <XAxis
                    dataKey="department"
                    stroke="#5B6B63"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#5B6B63" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid #E3EAE6",
                      borderRadius: 8,
                    }}
                  />
                  <Bar
                    dataKey="target"
                    name="Target"
                    fill="#DCE7DF"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="achieved"
                    name="Achieved"
                    fill="#087D43"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
