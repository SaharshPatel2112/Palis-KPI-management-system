import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

type Metric = { id: number; name: string; unit: string | null };
type Dept = { id: number; name: string; metrics: Metric[] };
type EmployeeRow = { id: number; name: string; departmentId: number | null };
type Entry = {
  id: number;
  employeeId: number;
  metricId: number;
  period: string;
  target: number;
  achieved: number;
  remarks: string | null;
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// Works for every department. Admin/HR pick a department from the dropdown
// (URL stays in sync, e.g. /kpi/production). A Manager is always locked to
// their own department regardless of what's in the URL — the backend
// enforces that too, this just avoids showing them a confusing dead end.
export default function DepartmentEntryPage() {
  const { department: departmentSlug } = useParams();
  const navigate = useNavigate();
  const { employee, loading: meLoading } = useEmployee();

  const [allDepartments, setAllDepartments] = useState<Dept[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "">("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [period, setPeriod] = useState(currentPeriod());
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const isManager = employee?.role === "MANAGER";
  // Managers can browse every department; only their own is editable.
  const canPickDepartment =
    !!employee && ["ADMIN", "HR", "MANAGER"].includes(employee.role);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await client.get<Dept[]>("/kpi/departments");
        setAllDepartments(data);
      } finally {
        setLoading(false);
      }
    }
    if (employee) load();
  }, [employee]);

  const department = useMemo(() => {
    if (allDepartments.length === 0) return null;
    return (
      allDepartments.find((d) => slugify(d.name) === departmentSlug) ??
      allDepartments[0]
    );
  }, [allDepartments, departmentSlug]);

  // Managers get read-only access to other departments (the backend also
  // rejects cross-department writes) — their own department stays editable.
  const readOnly = !!(
    isManager &&
    department &&
    employee &&
    department.id !== employee.departmentId
  );

  // Keep the URL in sync with whichever department actually resolved —
  // covers landing on a stale/missing slug and a manager's URL always
  // reflecting their real department.
  useEffect(() => {
    if (department && slugify(department.name) !== departmentSlug) {
      navigate(`/kpi/${slugify(department.name)}`, { replace: true });
    }
  }, [department, departmentSlug, navigate]);

  useEffect(() => {
    async function loadEmployees() {
      if (!department) return;
      const { data } = await client.get<EmployeeRow[]>("/employees");
      const scoped = data.filter((e) => e.departmentId === department.id);
      setEmployees(scoped);
      setSelectedEmployeeId((prev) =>
        scoped.some((e) => e.id === prev) ? prev : (scoped[0]?.id ?? ""),
      );
    }
    loadEmployees();
  }, [department]);

  useEffect(() => {
    async function loadEntries() {
      if (!department) return;
      const { data } = await client.get<Entry[]>("/kpi/entries", {
        params: { departmentId: department.id, period },
      });
      setEntries(data);
    }
    loadEntries();
  }, [department, period]);

  const entryFor = useMemo(() => {
    const map = new Map<string, Entry>();
    entries.forEach((e) => map.set(`${e.employeeId}-${e.metricId}`, e));
    return map;
  }, [entries]);

  const selectedEmployee =
    employees.find((e) => e.id === selectedEmployeeId) ?? null;

  async function saveEntry(
    employeeId: number,
    metricId: number,
    target: number,
    achieved: number,
    remarks: string,
  ) {
    if (readOnly) return;
    const key = `${employeeId}-${metricId}`;
    setSavingKey(key);
    try {
      const { data } = await client.post<Entry>("/kpi/entry", {
        employeeId,
        metricId,
        period,
        target,
        achieved,
        remarks: remarks || undefined,
      });
      setEntries((prev) => {
        const rest = prev.filter(
          (e) => !(e.employeeId === employeeId && e.metricId === metricId),
        );
        return [...rest, data];
      });
    } finally {
      setSavingKey(null);
    }
  }

  if (
    !meLoading &&
    employee &&
    !["ADMIN", "HR", "MANAGER"].includes(employee.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!meLoading && isManager && !employee?.departmentId) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader />
        <div className="p-8">
          <p className="text-muted">
            You&apos;re not assigned to a department yet — ask an admin to set
            one from{" "}
            <Link to="/team" className="text-primary font-medium">
              Team
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              {department ? `${department.name} — Log KPIs` : "Log KPIs"}
            </h1>
            <p className="text-sm text-muted mt-1">
              Pick an employee, then enter their numbers for the period.
            </p>
            {readOnly && (
              <p className="mt-2 text-xs font-medium text-warn bg-[#FBF3E4] border border-warn/30 rounded-md px-3 py-2 inline-block">
                Viewing {department?.name} — read-only. You can log KPIs only
                for your own department.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {canPickDepartment && (
              <select
                value={department ? slugify(department.name) : ""}
                onChange={(e) => navigate(`/kpi/${e.target.value}`)}
                className="border border-line rounded-md px-3 py-2 text-sm bg-white"
              >
                {allDepartments.map((d) => (
                  <option key={d.id} value={slugify(d.name)}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
              className="border border-line rounded-md px-3 py-2 text-sm bg-white min-w-[160px]"
              disabled={employees.length === 0}
            >
              {employees.length === 0 && (
                <option value="">No employees here</option>
              )}
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-line rounded-md px-3 py-2 text-sm"
            />
            <Link
              to="/dashboard"
              className="text-sm font-medium text-primary hover:text-deep"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        {loading || !department ? (
          <p className="text-muted">Loading…</p>
        ) : employees.length === 0 ? (
          <p className="text-muted">
            No employees are assigned to {department.name} yet — assign someone
            from{" "}
            <Link to="/team" className="text-primary font-medium">
              Team
            </Link>
            .
          </p>
        ) : !selectedEmployee ? (
          <p className="text-muted">Select an employee above.</p>
        ) : (
          <div className="border border-line rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-panel text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Metric</th>
                  <th className="px-4 py-3 font-medium w-24">Target</th>
                  <th className="px-4 py-3 font-medium w-24">Achieved</th>
                  <th className="px-4 py-3 font-medium">Remarks</th>
                  <th className="px-4 py-3 font-medium w-20" />
                </tr>
              </thead>
              <tbody>
                {department.metrics.map((metric) => {
                  const key = `${selectedEmployee.id}-${metric.id}`;
                  const existing = entryFor.get(key);
                  return (
                    <EntryRow
                      key={key}
                      metricName={metric.name}
                      initialTarget={existing?.target ?? 0}
                      initialAchieved={existing?.achieved ?? 0}
                      initialRemarks={existing?.remarks ?? ""}
                      saving={savingKey === key}
                      readOnly={readOnly}
                      onSave={(target, achieved, remarks) =>
                        saveEntry(
                          selectedEmployee.id,
                          metric.id,
                          target,
                          achieved,
                          remarks,
                        )
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EntryRow({
  metricName,
  initialTarget,
  initialAchieved,
  initialRemarks,
  saving,
  readOnly,
  onSave,
}: {
  metricName: string;
  initialTarget: number;
  initialAchieved: number;
  initialRemarks: string;
  saving: boolean;
  readOnly: boolean;
  onSave: (target: number, achieved: number, remarks: string) => void;
}) {
  const [target, setTarget] = useState(initialTarget);
  const [achieved, setAchieved] = useState(initialAchieved);
  const [remarks, setRemarks] = useState(initialRemarks);

  useEffect(() => {
    setTarget(initialTarget);
    setAchieved(initialAchieved);
    setRemarks(initialRemarks);
  }, [initialTarget, initialAchieved, initialRemarks]);

  return (
    <tr className="border-t border-line align-top">
      <td className="px-4 py-2.5 text-ink whitespace-nowrap">{metricName}</td>
      <td className="px-4 py-2.5">
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          disabled={readOnly}
          className="w-20 border border-line rounded-md px-2 py-1.5 disabled:bg-panel disabled:text-muted"
        />
      </td>
      <td className="px-4 py-2.5">
        <input
          type="number"
          value={achieved}
          onChange={(e) => setAchieved(Number(e.target.value))}
          disabled={readOnly}
          className="w-20 border border-line rounded-md px-2 py-1.5 disabled:bg-panel disabled:text-muted"
        />
      </td>
      <td className="px-4 py-2.5">
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Optional note for the employee"
          disabled={readOnly}
          className="w-full border border-line rounded-md px-2 py-1.5 disabled:bg-panel disabled:text-muted"
        />
      </td>
      <td className="px-4 py-2.5">
        {!readOnly && (
          <button
            onClick={() => onSave(target, achieved, remarks)}
            disabled={saving}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-deep disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </td>
    </tr>
  );
}
