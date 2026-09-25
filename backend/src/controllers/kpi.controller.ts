import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";

const PERIOD_RE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

const upsertKpiEntrySchema = z.object({
  employeeId: z.number().int().positive(),
  metricId: z.number().int().positive(),
  period: z
    .string()
    .regex(PERIOD_RE, "period must be YYYY, YYYY-MM, or YYYY-MM-DD"),
  target: z.number().min(0),
  achieved: z.number().min(0),
  remarks: z.string().max(500).optional(),
});

/**
 * Helper function to calculate summarized KPI performance metrics
 * for a specific period (monthly, yearly, etc.) and optional department scope.
 */
async function fetchSummaryForPeriod(period: string, scopedDeptId?: number) {
  const [allDepartments, entries] = await Promise.all([
    prisma.department.findMany({ orderBy: { id: "asc" } }),
    prisma.kpiEntry.findMany({
      where: {
        ...(scopedDeptId ? { metric: { departmentId: scopedDeptId } } : {}),
        period: { startsWith: period },
      },
      include: { metric: { include: { department: true } } },
    }),
  ]);

  const targetDeptIds = scopedDeptId
    ? [scopedDeptId]
    : allDepartments.map((d) => d.id);

  const summary = new Map<
    string,
    {
      empPcts: Map<number, number[]>;
      metricTotals: Map<
        number,
        { name: string; target: number; achieved: number; count: number }
      >;
    }
  >();

  for (const dept of allDepartments) {
    if (targetDeptIds.includes(dept.id)) {
      summary.set(dept.name, { empPcts: new Map(), metricTotals: new Map() });
    }
  }

  for (const entry of entries) {
    const deptName = entry.metric.department.name;
    let current = summary.get(deptName);
    if (!current) {
      current = { empPcts: new Map(), metricTotals: new Map() };
      summary.set(deptName, current);
    }

    let mTotal = current.metricTotals.get(entry.metricId);
    if (!mTotal) {
      mTotal = { name: entry.metric.name, target: 0, achieved: 0, count: 0 };
      current.metricTotals.set(entry.metricId, mTotal);
    }
    mTotal.target += entry.target;
    mTotal.achieved += entry.achieved;
    mTotal.count += 1;

    const p = entry.target > 0 ? (entry.achieved / entry.target) * 100 : 0;
    let empList = current.empPcts.get(entry.employeeId);
    if (!empList) {
      empList = [];
      current.empPcts.set(entry.employeeId, empList);
    }
    empList.push(p);
  }

  const deptResults = Array.from(summary.entries()).map(
    ([department, data]) => {
      let sumOfEmpAvgs = 0;
      for (const pcts of data.empPcts.values()) {
        sumOfEmpAvgs += pcts.reduce((a, b) => a + b, 0) / pcts.length;
      }
      const achievementPercent =
        data.empPcts.size > 0
          ? Math.round(sumOfEmpAvgs / data.empPcts.size)
          : 0;

      let adjustedTarget = 0;
      let adjustedAchieved = 0;

      const metrics = Array.from(data.metricTotals.values()).map((m) => {
        const isPct = m.name.includes("(%)");
        const t = isPct && m.count > 0 ? m.target / m.count : m.target;
        const a = isPct && m.count > 0 ? m.achieved / m.count : m.achieved;
        adjustedTarget += t;
        adjustedAchieved += a;

        return {
          name: m.name,
          target: Number(t.toFixed(2)),
          achieved: Number(a.toFixed(2)),
          achievementPercent: t > 0 ? Math.round((a / t) * 100) : 0,
        };
      });

      return {
        department,
        target: Number(adjustedTarget.toFixed(2)),
        achieved: Number(adjustedAchieved.toFixed(2)),
        achievementPercent,
        metrics,
      };
    },
  );

  const overallTarget = deptResults.reduce((acc, d) => acc + d.target, 0);
  const overallAchieved = deptResults.reduce((acc, d) => acc + d.achieved, 0);
  const overallAchievementPercent =
    overallTarget > 0 ? Math.round((overallAchieved / overallTarget) * 100) : 0;

  return {
    departments: deptResults,
    overall: {
      target: Number(overallTarget.toFixed(2)),
      achieved: Number(overallAchieved.toFixed(2)),
      achievementPercent: overallAchievementPercent,
    },
  };
}

export async function getProgressData(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const { basePeriod, comparePeriod, all } = req.query as {
      basePeriod?: string;
      comparePeriod?: string;
      all?: string;
    };

    if (!basePeriod || !comparePeriod) {
      return res
        .status(400)
        .json({ message: "basePeriod and comparePeriod are required" });
    }

    const isCompanyWide =
      all === "true" ||
      req.employee.role === "ADMIN" ||
      req.employee.role === "HR";
    const scopedDeptId = !isCompanyWide
      ? (req.employee.departmentId ?? undefined)
      : undefined;

    const [baseData, compareData] = await Promise.all([
      fetchSummaryForPeriod(basePeriod, scopedDeptId),
      fetchSummaryForPeriod(comparePeriod, scopedDeptId),
    ]);

    const overallDelta =
      compareData.overall.achievementPercent -
      baseData.overall.achievementPercent;

    const deptMap = new Map<string, any>();
    for (const d of baseData.departments) {
      deptMap.set(d.department, {
        department: d.department,
        base: d,
        compare: null,
      });
    }
    for (const d of compareData.departments) {
      const existing = deptMap.get(d.department);
      if (existing) {
        existing.compare = d;
      } else {
        deptMap.set(d.department, {
          department: d.department,
          base: {
            department: d.department,
            target: 0,
            achieved: 0,
            achievementPercent: 0,
            metrics: [],
          },
          compare: d,
        });
      }
    }

    const departments = Array.from(deptMap.values()).map((entry) => {
      const base = entry.base || {
        target: 0,
        achieved: 0,
        achievementPercent: 0,
        metrics: [],
      };
      const compare = entry.compare || {
        target: 0,
        achieved: 0,
        achievementPercent: 0,
        metrics: [],
      };
      const delta = compare.achievementPercent - base.achievementPercent;

      const metricMap = new Map<string, any>();
      for (const m of base.metrics || []) {
        metricMap.set(m.name, { name: m.name, base: m, compare: null });
      }
      for (const m of compare.metrics || []) {
        if (metricMap.has(m.name)) {
          metricMap.get(m.name)!.compare = m;
        } else {
          metricMap.set(m.name, {
            name: m.name,
            base: { target: 0, achieved: 0, achievementPercent: 0 },
            compare: m,
          });
        }
      }

      const mergedMetrics = Array.from(metricMap.values()).map((m) => {
        const b = m.base || { target: 0, achieved: 0, achievementPercent: 0 };
        const c = m.compare || {
          target: 0,
          achieved: 0,
          achievementPercent: 0,
        };
        return {
          name: m.name,
          base: b,
          compare: c,
          delta: c.achievementPercent - b.achievementPercent,
        };
      });

      return {
        department: entry.department,
        base: {
          target: base.target,
          achieved: base.achieved,
          achievementPercent: base.achievementPercent,
        },
        compare: {
          target: compare.target,
          achieved: compare.achieved,
          achievementPercent: compare.achievementPercent,
        },
        delta,
        status: delta > 0 ? "increase" : delta < 0 ? "decrease" : "same",
        metrics: mergedMetrics,
      };
    });

    res.json({
      basePeriod,
      comparePeriod,
      overall: {
        base: baseData.overall,
        compare: compareData.overall,
        delta: overallDelta,
        status:
          overallDelta > 0
            ? "increase"
            : overallDelta < 0
              ? "decrease"
              : "same",
      },
      departments,
    });
  } catch (err) {
    console.error("getProgressData error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const { period, from, to, all } = req.query as {
      period?: string;
      from?: string;
      to?: string;
      all?: string;
    };

    // all=true allows company-wide view on public/homepage overviews
    const isCompanyWide = all === "true";
    const scopedToOwnDept =
      !isCompanyWide &&
      (req.employee.role === "MANAGER" || req.employee.role === "EMPLOYEE");

    if (scopedToOwnDept && !req.employee.departmentId) {
      return res.json([]);
    }

    const periodFilter: { startsWith?: string; gte?: string; lte?: string } =
      {};
    if (period) periodFilter.startsWith = period;
    if (from) periodFilter.gte = from;
    if (to) periodFilter.lte = to;

    const [allDepartments, entries] = await Promise.all([
      prisma.department.findMany({ orderBy: { id: "asc" } }),
      prisma.kpiEntry.findMany({
        where: {
          ...(scopedToOwnDept
            ? { metric: { departmentId: req.employee.departmentId! } }
            : {}),
          ...(Object.keys(periodFilter).length ? { period: periodFilter } : {}),
        },
        include: { metric: { include: { department: true } } },
      }),
    ]);

    const targetDeptIds =
      scopedToOwnDept && req.employee.departmentId
        ? [req.employee.departmentId]
        : allDepartments.map((d) => d.id);

    const summary = new Map<
      string,
      {
        empPcts: Map<number, number[]>;
        metricTotals: Map<
          number,
          { name: string; target: number; achieved: number; count: number }
        >;
      }
    >();

    for (const dept of allDepartments) {
      if (targetDeptIds.includes(dept.id)) {
        summary.set(dept.name, { empPcts: new Map(), metricTotals: new Map() });
      }
    }

    for (const entry of entries) {
      const deptName = entry.metric.department.name;
      let current = summary.get(deptName);
      if (!current) {
        current = { empPcts: new Map(), metricTotals: new Map() };
        summary.set(deptName, current);
      }

      let mTotal = current.metricTotals.get(entry.metricId);
      if (!mTotal) {
        mTotal = { name: entry.metric.name, target: 0, achieved: 0, count: 0 };
        current.metricTotals.set(entry.metricId, mTotal);
      }
      mTotal.target += entry.target;
      mTotal.achieved += entry.achieved;
      mTotal.count += 1;

      const p = entry.target > 0 ? (entry.achieved / entry.target) * 100 : 0;
      let empList = current.empPcts.get(entry.employeeId);
      if (!empList) {
        empList = [];
        current.empPcts.set(entry.employeeId, empList);
      }
      empList.push(p);
    }

    const result = Array.from(summary.entries()).map(([department, data]) => {
      let sumOfEmpAvgs = 0;
      for (const pcts of data.empPcts.values()) {
        sumOfEmpAvgs += pcts.reduce((a, b) => a + b, 0) / pcts.length;
      }
      const achievementPercent =
        data.empPcts.size > 0
          ? Math.round(sumOfEmpAvgs / data.empPcts.size)
          : 0;

      let adjustedTarget = 0;
      let adjustedAchieved = 0;
      for (const m of data.metricTotals.values()) {
        const isPct = m.name.includes("(%)");
        adjustedTarget += isPct && m.count > 0 ? m.target / m.count : m.target;
        adjustedAchieved +=
          isPct && m.count > 0 ? m.achieved / m.count : m.achieved;
      }

      return {
        department,
        target: Number(adjustedTarget.toFixed(2)),
        achieved: Number(adjustedAchieved.toFixed(2)),
        achievementPercent,
      };
    });

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

    const periodFilter: { startsWith?: string; gte?: string; lte?: string } =
      {};
    if (period) periodFilter.startsWith = period;
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
    const periodRe = PERIOD_RE;

    let updated = 0;
    const errors: { row: number; message: string }[] = [];
    const dataRows = grid.slice(1);

    for (let i = 0; i < dataRows.length; i++) {
      const rowNo = i + 2;
      const cells = dataRows[i];
      const get = (name: string) => {
        const c = col(name);
        return (cells[c] ?? "").trim();
      };

      const deptName = get("department");
      const empKey = get("employee");
      const metricName = get("metric");
      let period = get("period");
      const targetStr = get("target");
      const achievedStr = get("achieved");
      const remarks = remarksCol >= 0 ? (cells[remarksCol] ?? "").trim() : "";

      const ddMMyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
      const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;

      if (ddMMyyyy.test(period)) {
        period = period.replace(ddMMyyyy, "$3-$2-$1");
      } else if (mdy.test(period)) {
        const match = period.match(mdy)!;
        const m = match[1].padStart(2, "0");
        const d = match[2].padStart(2, "0");
        let y = match[3];
        if (y.length === 2) y = (Number(y) < 50 ? "20" : "19") + y;
        period = `${y}-${m}-${d}`;
      }

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
          message: `Period "${period}" must be YYYY, YYYY-MM, or YYYY-MM-DD`,
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

export async function getGrowthTrend(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const granularity =
      req.query.granularity === "daily" || req.query.granularity === "yearly"
        ? req.query.granularity
        : "monthly";
    const maxPeriods = granularity === "yearly" ? 12 : 24;
    const fallback = granularity === "yearly" ? 5 : 6;
    const count = Math.min(
      Math.max(Number(req.query.months) || fallback, 1),
      maxPeriods,
    );
    const bucket = (p: string) =>
      granularity === "yearly"
        ? p.slice(0, 4)
        : granularity === "daily"
          ? p
          : p.slice(0, 7);

    const { period, from, to, all } = req.query as {
      period?: string;
      from?: string;
      to?: string;
      all?: string;
    };

    const isCompanyWide = all === "true";
    const scopedToOwnDept =
      !isCompanyWide &&
      (req.employee.role === "MANAGER" || req.employee.role === "EMPLOYEE");

    if (scopedToOwnDept && !req.employee.departmentId) {
      return res.json([]);
    }

    let ltePeriod: string | undefined = undefined;
    if (to) {
      ltePeriod = to;
    } else if (period) {
      ltePeriod = period.length === 4 ? `${period}-12-31` : `${period}-31`;
    }

    const entries = await prisma.kpiEntry.findMany({
      where: {
        ...(scopedToOwnDept
          ? { metric: { departmentId: req.employee.departmentId! } }
          : {}),
        ...(ltePeriod ? { period: { lte: ltePeriod } } : {}),
      },
      include: { metric: true },
    });

    const byPeriod = new Map<
      string,
      {
        pcts: number[];
        metricTotals: Map<
          number,
          { name: string; t: number; a: number; c: number }
        >;
      }
    >();

    for (const entry of entries) {
      const key = bucket(entry.period);
      let cur = byPeriod.get(key);
      if (!cur) {
        cur = { pcts: [], metricTotals: new Map() };
        byPeriod.set(key, cur);
      }

      let mt = cur.metricTotals.get(entry.metricId);
      if (!mt) {
        mt = { name: entry.metric.name, t: 0, a: 0, c: 0 };
        cur.metricTotals.set(entry.metricId, mt);
      }
      mt.t += entry.target;
      mt.a += entry.achieved;
      mt.c += 1;

      const p = entry.target > 0 ? (entry.achieved / entry.target) * 100 : 0;
      cur.pcts.push(p);
    }

    const periods = Array.from(byPeriod.keys()).sort().slice(-count);
    res.json(
      periods.map((p) => {
        const cur = byPeriod.get(p)!;

        let target = 0;
        let achieved = 0;
        for (const mt of cur.metricTotals.values()) {
          const isPct = mt.name.includes("(%)");
          target += isPct && mt.c > 0 ? mt.t / mt.c : mt.t;
          achieved += isPct && mt.c > 0 ? mt.a / mt.c : mt.a;
        }

        const achievementPercent =
          cur.pcts.length > 0
            ? Math.round(cur.pcts.reduce((a, b) => a + b, 0) / cur.pcts.length)
            : 0;

        return {
          period: p,
          target: Number(target.toFixed(2)),
          achieved: Number(achieved.toFixed(2)),
          achievementPercent,
        };
      }),
    );
  } catch (err) {
    console.error("getGrowthTrend error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getDepartmentBreakdown(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const { period, from, to, all } = req.query as {
      period?: string;
      from?: string;
      to?: string;
      all?: string;
    };

    const isCompanyWide = all === "true";
    const scopedToOwnDept =
      !isCompanyWide &&
      (req.employee.role === "MANAGER" || req.employee.role === "EMPLOYEE");

    if (scopedToOwnDept && !req.employee.departmentId) {
      return res.json([]);
    }

    const periodFilter: { startsWith?: string; gte?: string; lte?: string } =
      {};
    if (period) periodFilter.startsWith = period;
    if (from) periodFilter.gte = from;
    if (to) periodFilter.lte = to;

    const [allDepartments, entries] = await Promise.all([
      prisma.department.findMany({
        include: { metrics: true },
        orderBy: { id: "asc" },
      }),
      prisma.kpiEntry.findMany({
        where: {
          ...(scopedToOwnDept
            ? { metric: { departmentId: req.employee.departmentId! } }
            : {}),
          ...(Object.keys(periodFilter).length ? { period: periodFilter } : {}),
        },
        include: { metric: { include: { department: true } } },
      }),
    ]);

    const targetDeptIds =
      scopedToOwnDept && req.employee.departmentId
        ? [req.employee.departmentId]
        : allDepartments.map((d) => d.id);

    const deptMap = new Map<
      number,
      {
        id: number;
        name: string;
        empPcts: Map<number, number[]>;
        metrics: Map<
          number,
          {
            id: number;
            name: string;
            unit: string | null;
            target: number;
            achieved: number;
            pcts: number[];
            count: number;
          }
        >;
      }
    >();

    for (const dept of allDepartments) {
      if (targetDeptIds.includes(dept.id)) {
        deptMap.set(dept.id, {
          id: dept.id,
          name: dept.name,
          empPcts: new Map(),
          metrics: new Map(
            dept.metrics.map((m) => [
              m.id,
              {
                id: m.id,
                name: m.name,
                unit: m.unit,
                target: 0,
                achieved: 0,
                pcts: [],
                count: 0,
              },
            ]),
          ),
        });
      }
    }

    for (const entry of entries) {
      const d = deptMap.get(entry.metric.departmentId);
      if (!d) continue;

      const p = entry.target > 0 ? (entry.achieved / entry.target) * 100 : 0;

      let empList = d.empPcts.get(entry.employeeId);
      if (!empList) {
        empList = [];
        d.empPcts.set(entry.employeeId, empList);
      }
      empList.push(p);

      let m = d.metrics.get(entry.metricId);
      if (!m) {
        m = {
          id: entry.metricId,
          name: entry.metric.name,
          unit: entry.metric.unit,
          target: 0,
          achieved: 0,
          pcts: [],
          count: 0,
        };
        d.metrics.set(entry.metricId, m);
      }
      m.target += entry.target;
      m.achieved += entry.achieved;
      m.pcts.push(p);
      m.count += 1;
    }

    res.json(
      Array.from(deptMap.values()).map((d) => {
        let sumOfEmpAvgs = 0;
        for (const pcts of d.empPcts.values()) {
          sumOfEmpAvgs += pcts.reduce((a, b) => a + b, 0) / pcts.length;
        }
        const achievementPercent =
          d.empPcts.size > 0 ? Math.round(sumOfEmpAvgs / d.empPcts.size) : 0;

        const metrics = Array.from(d.metrics.values()).map((m) => {
          const isPct = m.name.includes("(%)");
          const finalTarget =
            isPct && m.count > 0 ? m.target / m.count : m.target;
          const finalAchieved =
            isPct && m.count > 0 ? m.achieved / m.count : m.achieved;

          return {
            id: m.id,
            name: m.name,
            unit: m.unit,
            target: Number(finalTarget.toFixed(2)),
            achieved: Number(finalAchieved.toFixed(2)),
            achievementPercent:
              m.pcts.length > 0
                ? Math.round(m.pcts.reduce((a, b) => a + b, 0) / m.pcts.length)
                : 0,
          };
        });

        const deptTarget = metrics.reduce((acc, m) => acc + m.target, 0);
        const deptAchieved = metrics.reduce((acc, m) => acc + m.achieved, 0);

        return {
          id: d.id,
          name: d.name,
          target: Number(deptTarget.toFixed(2)),
          achieved: Number(deptAchieved.toFixed(2)),
          achievementPercent,
          metrics,
        };
      }),
    );
  } catch (err) {
    console.error("getDepartmentBreakdown error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getEmployeeProgress(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const employees = await prisma.employee.findMany({
      include: { department: true, entries: { include: { metric: true } } },
    });

    const result = employees.map((e) => {
      const metricGroups = new Map<
        number,
        { name: string; target: number; achieved: number; count: number }
      >();

      for (const x of e.entries) {
        let mg = metricGroups.get(x.metricId);
        if (!mg) {
          mg = { name: x.metric.name, target: 0, achieved: 0, count: 0 };
          metricGroups.set(x.metricId, mg);
        }
        mg.target += x.target;
        mg.achieved += x.achieved;
        mg.count += 1;
      }

      let target = 0;
      let achieved = 0;
      for (const mg of metricGroups.values()) {
        const isPct = mg.name.includes("(%)");
        target += isPct && mg.count > 0 ? mg.target / mg.count : mg.target;
        achieved +=
          isPct && mg.count > 0 ? mg.achieved / mg.count : mg.achieved;
      }

      const pcts = e.entries.map((x) =>
        x.target > 0 ? (x.achieved / x.target) * 100 : 0,
      );
      const achievementPercent =
        pcts.length > 0
          ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
          : 0;

      return {
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.role,
        department: e.department?.name ?? null,
        target: Number(target.toFixed(2)),
        achieved: Number(achieved.toFixed(2)),
        achievementPercent,
      };
    });

    result.sort((a, b) => b.achievementPercent - a.achievementPercent);
    res.json(result);
  } catch (err) {
    console.error("getEmployeeProgress error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
