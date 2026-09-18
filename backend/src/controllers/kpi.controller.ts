import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";

const upsertKpiEntrySchema = z.object({
  employeeId: z.number().int().positive(),
  metricId: z.number().int().positive(),
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "period must be in YYYY-MM format"),
  target: z.number().min(0),
  achieved: z.number().min(0),
  remarks: z.string().max(500).optional(),
});

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const scopedToOwnDept =
      req.employee.role === "MANAGER" || req.employee.role === "EMPLOYEE";
    if (scopedToOwnDept && !req.employee.departmentId) {
      return res.json([]);
    }

    const entries = await prisma.kpiEntry.findMany({
      where: scopedToOwnDept
        ? { metric: { departmentId: req.employee.departmentId! } }
        : undefined,
      include: { metric: { include: { department: true } } },
    });

    const summary = new Map<string, { target: number; achieved: number }>();
    for (const entry of entries) {
      const deptName = entry.metric.department.name;
      const current = summary.get(deptName) ?? { target: 0, achieved: 0 };
      current.target += entry.target;
      current.achieved += entry.achieved;
      summary.set(deptName, current);
    }

    const result = Array.from(summary.entries()).map(
      ([department, { target, achieved }]) => ({
        department,
        target,
        achieved,
        achievementPercent:
          target > 0 ? Math.round((achieved / target) * 100) : 0,
      }),
    );

    res.json(result);
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMyKpis(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const entries = await prisma.kpiEntry.findMany({
      where: { employeeId: req.employee.id },
      include: { metric: true },
      orderBy: { period: "desc" },
    });
    res.json(entries);
  } catch (err) {
    console.error("getMyKpis error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// List KPI entries for filtering/reporting. ADMIN/HR/MANAGER can pass any
// departmentId (or none, for "all departments") — MANAGER gets read-only
// access to every department so they can review and export reports; actual
// writes are still blocked in upsertKpiEntry, and CSV upload is ADMIN-only.
// Supports either a single `period` (used by the entry screen) or a
// `from`/`to` range (used by the reports page) — periods are "YYYY-MM"
// strings, which sort correctly with plain string comparison.
export async function listKpiEntries(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const { departmentId, period, from, to, employeeId } = req.query as {
      departmentId?: string;
      period?: string;
      from?: string;
      to?: string;
      employeeId?: string;
    };

    const effectiveDepartmentId = departmentId
      ? Number(departmentId)
      : undefined;

    const periodFilter: { equals?: string; gte?: string; lte?: string } = {};
    if (period) periodFilter.equals = period;
    if (from) periodFilter.gte = from;
    if (to) periodFilter.lte = to;

    const entries = await prisma.kpiEntry.findMany({
      where: {
        ...(effectiveDepartmentId
          ? { metric: { departmentId: effectiveDepartmentId } }
          : {}),
        ...(Object.keys(periodFilter).length ? { period: periodFilter } : {}),
        ...(employeeId ? { employeeId: Number(employeeId) } : {}),
      },
      include: { employee: true, metric: { include: { department: true } } },
      orderBy: [{ period: "desc" }, { employeeId: "asc" }, { metricId: "asc" }],
    });
    res.json(entries);
  } catch (err) {
    console.error("listKpiEntries error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function upsertKpiEntry(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const parsed = upsertKpiEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid request", issues: parsed.error.issues });
    }
    const { employeeId, metricId, period, target, achieved, remarks } =
      parsed.data;

    if (req.employee.role !== "ADMIN") {
      const targetEmployee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (
        !targetEmployee ||
        targetEmployee.departmentId !== req.employee.departmentId
      ) {
        return res
          .status(403)
          .json({ message: "Can't log KPIs outside your own department" });
      }
    }

    const entry = await prisma.kpiEntry.upsert({
      where: { employeeId_metricId_period: { employeeId, metricId, period } },
      update: { target, achieved, remarks },
      create: { employeeId, metricId, period, target, achieved, remarks },
    });
    res.json(entry);
  } catch (err) {
    console.error("upsertKpiEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listDepartments(_req: Request, res: Response) {
  try {
    const departments = await prisma.department.findMany({
      include: { metrics: true },
    });
    res.json(departments);
  } catch (err) {
    console.error("listDepartments error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ---------------------------------------------------------------------------
// CSV bulk upload
// Expected columns (header row required):
//   department,employee,metric,period,target,achieved,remarks
// - `department` and `metric` are matched by name (case-insensitive).
// - `employee` is matched by email (preferred) or by name within the dept.
// - `period` must be YYYY-MM. `remarks` is optional.
// Same scoping rules as upsertKpiEntry: non-ADMIN callers can only write to
// their own department, and row-level failures are collected, not fatal.
// ---------------------------------------------------------------------------

function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const uploadCsvSchema = z.object({ csv: z.string().min(1) });

export async function uploadKpiCsv(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const parsed = uploadCsvSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid request", issues: parsed.error.issues });
    }

    const grid = parseCsvGrid(parsed.data.csv);
    if (grid.length < 2) {
      return res
        .status(400)
        .json({ message: "CSV needs a header row plus at least one data row" });
    }

    const header = grid[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);
    const required = [
      "department",
      "employee",
      "metric",
      "period",
      "target",
      "achieved",
    ];
    const missing = required.filter((r) => col(r) === -1);
    if (missing.length > 0) {
      return res.status(400).json({
        message: `CSV is missing required column(s): ${missing.join(", ")}`,
      });
    }
    const remarksCol = col("remarks");

    const [departments, employees] = await Promise.all([
      prisma.department.findMany({ include: { metrics: true } }),
      prisma.employee.findMany(),
    ]);
    const deptByName = new Map(
      departments.map((d) => [d.name.toLowerCase(), d]),
    );
    const empByEmail = new Map(
      employees.map((e) => [e.email.toLowerCase(), e]),
    );

    const callerDeptId = req.employee.departmentId;
    const scopedToOwnDept = req.employee.role !== "ADMIN";
    const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

    let updated = 0;
    const errors: { row: number; message: string }[] = [];
    const dataRows = grid.slice(1);

    for (let i = 0; i < dataRows.length; i++) {
      const rowNo = i + 2; // 1-based, +1 for header
      const cells = dataRows[i];
      const get = (name: string) => {
        const c = col(name);
        return (cells[c] ?? "").trim();
      };

      const deptName = get("department");
      const empKey = get("employee");
      const metricName = get("metric");
      const period = get("period");
      const targetStr = get("target");
      const achievedStr = get("achieved");
      const remarks = remarksCol >= 0 ? (cells[remarksCol] ?? "").trim() : "";

      if (!deptName || !empKey || !metricName || !period) {
        errors.push({
          row: rowNo,
          message: "Missing required value(s) in row",
        });
        continue;
      }
      const dept = deptByName.get(deptName.toLowerCase());
      if (!dept) {
        errors.push({
          row: rowNo,
          message: `Unknown department "${deptName}"`,
        });
        continue;
      }
      if (scopedToOwnDept && dept.id !== callerDeptId) {
        errors.push({
          row: rowNo,
          message: `Department "${dept.name}" is outside your scope`,
        });
        continue;
      }
      const metric = dept.metrics.find(
        (m) => m.name.toLowerCase() === metricName.toLowerCase(),
      );
      if (!metric) {
        errors.push({
          row: rowNo,
          message: `Metric "${metricName}" not found in ${dept.name}`,
        });
        continue;
      }
      const employee =
        empByEmail.get(empKey.toLowerCase()) ??
        employees.find(
          (e) =>
            e.departmentId === dept.id &&
            e.name.toLowerCase() === empKey.toLowerCase(),
        );
      if (!employee) {
        errors.push({
          row: rowNo,
          message: `Employee "${empKey}" not found — use their email, or exact name in ${dept.name}`,
        });
        continue;
      }
      if (scopedToOwnDept && employee.departmentId !== callerDeptId) {
        errors.push({
          row: rowNo,
          message: `Employee "${empKey}" is not in your department`,
        });
        continue;
      }
      if (!periodRe.test(period)) {
        errors.push({
          row: rowNo,
          message: `Period "${period}" must be YYYY-MM`,
        });
        continue;
      }
      const target = Number(targetStr);
      const achieved = Number(achievedStr);
      if (!Number.isFinite(target) || target < 0) {
        errors.push({
          row: rowNo,
          message: `Target "${targetStr}" is not a valid number`,
        });
        continue;
      }
      if (!Number.isFinite(achieved) || achieved < 0) {
        errors.push({
          row: rowNo,
          message: `Achieved "${achievedStr}" is not a valid number`,
        });
        continue;
      }

      await prisma.kpiEntry.upsert({
        where: {
          employeeId_metricId_period: {
            employeeId: employee.id,
            metricId: metric.id,
            period,
          },
        },
        update: { target, achieved, remarks: remarks || null },
        create: {
          employeeId: employee.id,
          metricId: metric.id,
          period,
          target,
          achieved,
          remarks: remarks || null,
        },
      });
      updated++;
    }

    res.json({ updated, errors });
  } catch (err) {
    console.error("uploadKpiCsv error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Monthly target/achieved totals for the last N periods, scoped like the
// dashboard summary. Feeds the live charts on Home and Dashboard.
export async function getGrowthTrend(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);
    const scopedToOwnDept =
      req.employee.role === "MANAGER" || req.employee.role === "EMPLOYEE";
    if (scopedToOwnDept && !req.employee.departmentId) {
      return res.json([]);
    }

    const entries = await prisma.kpiEntry.findMany({
      where: scopedToOwnDept
        ? { metric: { departmentId: req.employee.departmentId! } }
        : undefined,
      include: { metric: true },
    });

    const byPeriod = new Map<string, { target: number; achieved: number }>();
    for (const entry of entries) {
      const cur = byPeriod.get(entry.period) ?? { target: 0, achieved: 0 };
      cur.target += entry.target;
      cur.achieved += entry.achieved;
      byPeriod.set(entry.period, cur);
    }

    const periods = Array.from(byPeriod.keys()).sort().slice(-months);
    res.json(
      periods.map((p) => {
        const { target, achieved } = byPeriod.get(p)!;
        return {
          period: p,
          target,
          achieved,
          achievementPercent:
            target > 0 ? Math.round((achieved / target) * 100) : 0,
        };
      }),
    );
  } catch (err) {
    console.error("getGrowthTrend error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Per-department, per-metric breakdown for the dashboard charts. Aggregates
// target/achieved across all employees of each metric, scoped like the
// dashboard summary. Each metric keeps its own unit, so the UI charts
// achievement % (unit-agnostic) and shows raw target/achieved alongside.
export async function getDepartmentBreakdown(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const scopedToOwnDept =
      req.employee.role === "MANAGER" || req.employee.role === "EMPLOYEE";
    if (scopedToOwnDept && !req.employee.departmentId) {
      return res.json([]);
    }

    const entries = await prisma.kpiEntry.findMany({
      where: scopedToOwnDept
        ? { metric: { departmentId: req.employee.departmentId! } }
        : undefined,
      include: { metric: { include: { department: true } } },
    });

    const deptMap = new Map<
      number,
      {
        id: number;
        name: string;
        target: number;
        achieved: number;
        metrics: Map<
          number,
          {
            id: number;
            name: string;
            unit: string | null;
            target: number;
            achieved: number;
          }
        >;
      }
    >();

    for (const entry of entries) {
      const dept = entry.metric.department;
      let d = deptMap.get(dept.id);
      if (!d) {
        d = {
          id: dept.id,
          name: dept.name,
          target: 0,
          achieved: 0,
          metrics: new Map(),
        };
        deptMap.set(dept.id, d);
      }
      d.target += entry.target;
      d.achieved += entry.achieved;

      let m = d.metrics.get(entry.metricId);
      if (!m) {
        m = {
          id: entry.metricId,
          name: entry.metric.name,
          unit: entry.metric.unit,
          target: 0,
          achieved: 0,
        };
        d.metrics.set(entry.metricId, m);
      }
      m.target += entry.target;
      m.achieved += entry.achieved;
    }

    const pct = (t: number, a: number) =>
      t > 0 ? Math.round((a / t) * 100) : 0;

    res.json(
      Array.from(deptMap.values()).map((d) => ({
        id: d.id,
        name: d.name,
        target: d.target,
        achieved: d.achieved,
        achievementPercent: pct(d.target, d.achieved),
        metrics: Array.from(d.metrics.values()).map((m) => ({
          ...m,
          achievementPercent: pct(m.target, m.achieved),
        })),
      })),
    );
  } catch (err) {
    console.error("getDepartmentBreakdown error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Per-employee overall achievement across every logged period — feeds the
// Users' KPI directory (Admin/HR). Sorted best-first.
export async function getEmployeeProgress(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const employees = await prisma.employee.findMany({
      include: { department: true, entries: true },
    });

    const result = employees.map((e) => {
      const target = e.entries.reduce((s, x) => s + x.target, 0);
      const achieved = e.entries.reduce((s, x) => s + x.achieved, 0);
      return {
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.role,
        department: e.department?.name ?? null,
        target,
        achieved,
        achievementPercent:
          target > 0 ? Math.round((achieved / target) * 100) : 0,
      };
    });

    result.sort((a, b) => b.achievementPercent - a.achievementPercent);
    res.json(result);
  } catch (err) {
    console.error("getEmployeeProgress error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
