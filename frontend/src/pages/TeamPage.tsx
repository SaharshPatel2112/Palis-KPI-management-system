import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
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

// Mirrors the backend's ASSIGNABLE_ROLES — what each viewer's role dropdown
// is allowed to offer as a new value.
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
  // HR's own department dropdown never offers HR or Accounts as a target.
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
      <div className="p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Team</h1>
            <p className="text-sm text-muted mt-1">{scopeNote}</p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-primary hover:text-deep"
          >
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted">No one has signed in yet.</p>
        ) : (
          <div className="border border-line rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-panel text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
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
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-3 text-ink">{r.name}</td>
                      <td className="px-4 py-3 text-muted">{r.email}</td>
                      <td className="px-4 py-3">
                        {roleEditable ? (
                          <select
                            value={r.role}
                            disabled={savingId === r.id}
                            onChange={(e) =>
                              updateRow(r.id, { role: e.target.value })
                            }
                            className="border border-line rounded-md px-2 py-1.5 bg-white"
                          >
                            {assignableRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-muted">{r.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
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
                            className="border border-line rounded-md px-2 py-1.5 bg-white"
                          >
                            <option value="">— none —</option>
                            {assignableDepartments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-muted">
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
        )}
      </div>
    </div>
  );
}
