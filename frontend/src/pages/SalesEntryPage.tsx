import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { client } from '../api/client';
import { useEmployee } from '../hooks/useEmployee';

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
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function SalesEntryPage() {
  const { employee, loading: meLoading } = useEmployee();
  const [department, setDepartment] = useState<Dept | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [period, setPeriod] = useState(currentPeriod());
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [deptRes, empRes] = await Promise.all([
          client.get<Dept[]>('/kpi/departments'),
          client.get<EmployeeRow[]>('/employees'),
        ]);
        const sales = deptRes.data.find((d) => d.name === 'Sales') ?? null;
        setDepartment(sales);
        setEmployees(sales ? empRes.data.filter((e) => e.departmentId === sales.id) : []);
      } finally {
        setLoading(false);
      }
    }
    if (employee) load();
  }, [employee]);

  useEffect(() => {
    async function loadEntries() {
      if (!department) return;
      const { data } = await client.get<Entry[]>('/kpi/entries', {
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

  async function saveEntry(employeeId: number, metricId: number, target: number, achieved: number) {
    const key = `${employeeId}-${metricId}`;
    setSavingKey(key);
    try {
      const { data } = await client.post<Entry>('/kpi/entry', {
        employeeId,
        metricId,
        period,
        target,
        achieved,
      });
      setEntries((prev) => {
        const rest = prev.filter((e) => !(e.employeeId === employeeId && e.metricId === metricId));
        return [...rest, data];
      });
    } finally {
      setSavingKey(null);
    }
  }

  if (!meLoading && employee && !['ADMIN', 'HR', 'MANAGER'].includes(employee.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Sales — Log KPIs</h1>
          <p className="text-sm text-muted mt-1">Enter target and achieved per employee, per metric.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-line rounded-md px-3 py-2 text-sm"
          />
          <Link to="/dashboard" className="text-sm font-medium text-primary">
            Back to dashboard
          </Link>
        </div>
      </div>

      {loading || !department ? (
        <p className="text-muted">Loading…</p>
      ) : employees.length === 0 ? (
        <p className="text-muted">
          No employees are assigned to Sales yet — assign someone from{' '}
          <Link to="/team" className="text-primary font-medium">
            Team
          </Link>
          .
        </p>
      ) : (
        <div className="border border-line rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-panel text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Metric</th>
                <th className="px-4 py-3 font-medium w-28">Target</th>
                <th className="px-4 py-3 font-medium w-28">Achieved</th>
                <th className="px-4 py-3 font-medium w-20" />
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) =>
                department.metrics.map((metric) => {
                  const key = `${emp.id}-${metric.id}`;
                  const existing = entryFor.get(key);
                  return (
                    <EntryRow
                      key={key}
                      employeeName={emp.name}
                      metricName={metric.name}
                      initialTarget={existing?.target ?? 0}
                      initialAchieved={existing?.achieved ?? 0}
                      saving={savingKey === key}
                      onSave={(target, achieved) => saveEntry(emp.id, metric.id, target, achieved)}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EntryRow({
  employeeName,
  metricName,
  initialTarget,
  initialAchieved,
  saving,
  onSave,
}: {
  employeeName: string;
  metricName: string;
  initialTarget: number;
  initialAchieved: number;
  saving: boolean;
  onSave: (target: number, achieved: number) => void;
}) {
  const [target, setTarget] = useState(initialTarget);
  const [achieved, setAchieved] = useState(initialAchieved);

  return (
    <tr className="border-t border-line">
      <td className="px-4 py-2.5 text-ink">{employeeName}</td>
      <td className="px-4 py-2.5 text-muted">{metricName}</td>
      <td className="px-4 py-2.5">
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="w-24 border border-line rounded-md px-2 py-1.5"
        />
      </td>
      <td className="px-4 py-2.5">
        <input
          type="number"
          value={achieved}
          onChange={(e) => setAchieved(Number(e.target.value))}
          className="w-24 border border-line rounded-md px-2 py-1.5"
        />
      </td>
      <td className="px-4 py-2.5">
        <button
          onClick={() => onSave(target, achieved)}
          disabled={saving}
          className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-deep disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </td>
    </tr>
  );
}
