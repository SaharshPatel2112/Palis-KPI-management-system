import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { client } from "../api/client";
import AppHeader from "../components/AppHeader";
import { useEmployee } from "../hooks/useEmployee";

type Dept = { id: number; name: string };
type EmployeeRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  departmentId: number | null;
};

const ALL_ROLES = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"];

const ASSIGNABLE_ROLES: Record<string, string[]> = {
  ADMIN: ALL_ROLES,
  MANAGER: ["HR", "EMPLOYEE"],
  HR: ["EMPLOYEE"],
};

const HR_RESTRICTED_DEPARTMENTS = ["HR", "Accounts"];
const HR_RESTRICTED_ROLES = ["ADMIN", "MANAGER"];

export default function TeamPage() {
  const { employee, loading: meLoading } = useEmployee();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [empRes, deptRes] = await Promise.all([
          client.get<EmployeeRow[]>("/employees"),
          client.get<Dept[]>("/kpi/departments"),
        ]);
        setRows(empRes.data);
        setDepartments(deptRes.data);
      } finally {
        setLoading(false);
      }
    }
    if (employee) load();
  }, [employee]);

  async function updateRow(
    id: number,
    patch: { role?: string; departmentId?: number | null },
  ) {
    setSavingId(id);
    try {
      const { data } = await client.patch<EmployeeRow>(
        `/employees/${id}`,
        patch,
      );
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  if (
    !meLoading &&
    employee &&
    !["ADMIN", "MANAGER", "HR"].includes(employee.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  const myRole = employee?.role ?? "EMPLOYEE";
  const isHR = myRole === "HR";
  const assignableRoles = ASSIGNABLE_ROLES[myRole] ?? [];
  const assignableDepartments = departments.filter(
    (d) => !(isHR && HR_RESTRICTED_DEPARTMENTS.includes(d.name)),
  );

  const scopeNote =
    myRole === "ADMIN"
      ? "Full access — assign any role or department."
      : myRole === "MANAGER"
        ? "You can assign the HR or Employee role, in any department."
        : myRole === "HR"
          ? "You can assign the Employee role, in any department except HR and Accounts. Admin and Manager accounts aren't editable from here."
          : "";

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Team</h1>
            <p className="text-sm text-muted mt-1 max-w-2xl">{scopeNote}</p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-primary hover:text-deep shrink-0 transition-colors"
          >
            &larr; Back to dashboard
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6 w-full sm:max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email"
            className="w-full border border-line rounded-lg pl-10 pr-10 py-2.5 text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <span className="text-muted animate-pulse">Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-panel border border-line rounded-lg p-8 text-center text-muted">
            {q
              ? "No employees match that search."
              : "No one has signed in yet."}
          </div>
        ) : (
          <div className="border border-line rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-panel text-left text-muted border-b border-line">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium w-48">Role</th>
                    <th className="px-4 py-3 font-medium w-56">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((r) => {
                    const currentDept = departments.find(
                      (d) => d.id === r.departmentId,
                    );
                    const hrBlockedRow =
                      isHR && HR_RESTRICTED_ROLES.includes(r.role);
                    const hrBlockedDept =
                      isHR &&
                      currentDept &&
                      HR_RESTRICTED_DEPARTMENTS.includes(currentDept.name);

                    const roleEditable =
                      !hrBlockedRow && assignableRoles.includes(r.role);
                    const deptEditable = !hrBlockedRow && !hrBlockedDept;

                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-panel/30 transition-colors"
                      >
                        <td className="px-4 py-3.5 text-ink font-medium">
                          {r.name}
                        </td>
                        <td className="px-4 py-3.5 text-muted">{r.email}</td>
                        <td className="px-4 py-3.5">
                          {roleEditable ? (
                            <select
                              value={r.role}
                              disabled={savingId === r.id}
                              onChange={(e) =>
                                updateRow(r.id, { role: e.target.value })
                              }
                              className="w-full border border-line rounded-md px-2 py-1.5 bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow disabled:opacity-50"
                            >
                              {assignableRoles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-block px-2 py-1.5 text-muted bg-panel rounded border border-transparent">
                              {r.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {deptEditable ? (
                            <select
                              value={r.departmentId ?? ""}
                              disabled={savingId === r.id}
                              onChange={(e) =>
                                updateRow(r.id, {
                                  departmentId: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                })
                              }
                              className="w-full border border-line rounded-md px-2 py-1.5 bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow disabled:opacity-50"
                            >
                              <option value="">— none —</option>
                              {assignableDepartments.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-block px-2 py-1.5 text-muted">
                              {currentDept?.name ?? "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
