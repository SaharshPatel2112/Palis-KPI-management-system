import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { client } from "../api/client";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

type EmployeeProgress = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  target: number;
  achieved: number;
  achievementPercent: number;
};

function progressColor(p: number) {
  if (p >= 90) return "bg-primary";
  if (p >= 70) return "bg-warn";
  return "bg-bad";
}

function progressText(p: number) {
  if (p >= 90) return "text-primary";
  if (p >= 70) return "text-warn";
  return "text-bad";
}

export default function UsersKpisPage() {
  const { employee, loading: meLoading } = useEmployee();
  const navigate = useNavigate();
  const [rows, setRows] = useState<EmployeeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await client.get<EmployeeProgress[]>(
          "/kpi/employee-progress",
        );
        setRows(data);
      } finally {
        setLoading(false);
      }
    }
    if (employee) load();
  }, [employee]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        (r.department ?? "").toLowerCase().includes(needle),
    );
  }, [rows, q]);

  if (!meLoading && employee && !["ADMIN", "HR"].includes(employee.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Employee KPIs</h1>
            <p className="text-sm text-muted mt-1">
              Overall achievement per employee, across every logged period.
              Click a row for the full breakdown.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-primary hover:text-deep"
          >
            Back to dashboard
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or department"
            className="w-full border border-line rounded-lg pl-10 pr-10 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {loading || meLoading ? (
          <p className="text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted">
            {q
              ? "No employees match that search."
              : "No employees have signed in yet."}
          </p>
        ) : (
          <div className="border border-line rounded-xl overflow-hidden overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-panel text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium w-12">#</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium w-64">
                    Progress / 100%
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/users-kpis/${r.id}`)}
                    className="border-t border-line hover:bg-soft/60 cursor-pointer transition"
                  >
                    <td className="px-4 py-3.5 font-mono text-muted">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-ink font-medium">{r.name}</p>
                      <p className="text-xs text-muted">{r.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs bg-panel border border-line rounded px-2 py-1">
                        {r.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {r.department ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-panel rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progressColor(r.achievementPercent)}`}
                            style={{
                              width: `${Math.min(100, r.achievementPercent)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={`font-mono text-sm font-semibold w-12 text-right ${progressText(r.achievementPercent)}`}
                        >
                          {r.achievementPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
