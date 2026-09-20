import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { client } from "../api/client";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

type Dept = { id: number; name: string };
type ReportRow = {
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

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const today = () => isoDate(new Date());

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
};

function pct(target: number, achieved: number) {
  return target > 0 ? Math.round((achieved / target) * 100) : 0;
}

function downloadCsv(rows: ReportRow[]) {
  const header = [
    "Period",
    "Department",
    "Employee",
    "Metric",
    "Target",
    "Achieved",
    "Achievement %",
    "Remarks",
  ];
  const lines = rows.map((r) => [
    r.period,
    r.metric.department.name,
    r.employee.name,
    r.metric.name,
    r.target,
    r.achieved,
    pct(r.target, r.achieved),
    r.remarks ?? "",
  ]);
  const csv = [header, ...lines]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kpi-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { employee, loading: meLoading } = useEmployee();
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [departmentId, setDepartmentId] = useState<number | "">("");

  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = employee?.role === "MANAGER";

  useEffect(() => {
    async function load() {
      const { data } = await client.get<Dept[]>("/kpi/departments");
      setDepartments(data);
      if (isManager && employee?.departmentId) {
        setDepartmentId(employee.departmentId);
      }
    }
    if (employee) load();
  }, [employee, isManager]);

  useEffect(() => {
    async function loadRows() {
      setLoading(true);
      try {
        const { data } = await client.get<ReportRow[]>("/kpi/entries", {
          params: { departmentId: departmentId || undefined, from, to },
        });
        setRows(data);
      } finally {
        setLoading(false);
      }
    }
    if (employee) loadRows();
  }, [employee, departmentId, from, to]);

  const totals = useMemo(() => {
    const t = rows.reduce((sum, r) => sum + r.target, 0);
    const a = rows.reduce((sum, r) => sum + r.achieved, 0);
    const avg = rows.length
      ? Math.round(
          rows.reduce((s, r) => s + pct(r.target, r.achieved), 0) / rows.length,
        )
      : 0;
    return { target: t, achieved: a, pct: avg };
  }, [rows]);

  if (
    !meLoading &&
    employee &&
    !["ADMIN", "HR", "MANAGER"].includes(employee.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Reports</h1>
            <p className="text-sm text-muted mt-1">
              Filter by department and date range, then export. Managers can
              review every department; only their own is editable.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-primary hover:text-deep shrink-0"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-xs text-muted mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) =>
                setDepartmentId(e.target.value ? Number(e.target.value) : "")
              }
              className="border border-line rounded-md px-3 py-2 text-sm bg-white min-w-[160px]"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">From date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-line rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">To date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-line rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => downloadCsv(rows)}
            disabled={rows.length === 0}
            className="px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:bg-deep disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted">No entries match these filters.</p>
        ) : (
          <>
            <div className="flex gap-6 mb-4 text-sm flex-wrap">
              <span className="text-muted">
                Rows:{" "}
                <span className="text-ink font-medium">{rows.length}</span>
              </span>
              <span className="text-muted">
                Total target:{" "}
                <span className="text-ink font-medium font-mono">
                  {totals.target}
                </span>
              </span>
              <span className="text-muted">
                Total achieved:{" "}
                <span className="text-ink font-medium font-mono">
                  {totals.achieved}
                </span>
              </span>
              <span className="text-muted">
                Overall KPI Ranking:{" "}
                <span className="text-primary font-semibold font-mono">
                  {totals.pct}%
                </span>
              </span>
            </div>
            <div className="border border-line rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-panel text-left text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Period</th>
                    <th className="px-4 py-2.5 font-medium">Department</th>
                    <th className="px-4 py-2.5 font-medium">Employee</th>
                    <th className="px-4 py-2.5 font-medium">Metric</th>
                    <th className="px-4 py-2.5 font-medium">Target</th>
                    <th className="px-4 py-2.5 font-medium">Achieved</th>
                    <th className="px-4 py-2.5 font-medium">%</th>
                    <th className="px-4 py-2.5 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-2 font-mono text-muted">
                        {r.period}
                      </td>
                      <td className="px-4 py-2 text-ink">
                        {r.metric.department.name}
                      </td>
                      <td className="px-4 py-2 text-ink">{r.employee.name}</td>
                      <td className="px-4 py-2 text-muted">{r.metric.name}</td>
                      <td className="px-4 py-2 font-mono text-muted">
                        {r.target}
                      </td>
                      <td className="px-4 py-2 font-mono text-ink">
                        {r.achieved}
                      </td>
                      <td className="px-4 py-2 font-mono font-semibold text-primary">
                        {pct(r.target, r.achieved)}%
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {r.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
