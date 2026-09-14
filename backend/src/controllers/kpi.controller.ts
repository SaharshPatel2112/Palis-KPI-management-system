import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    if (!req.employee) return res.status(403).json({ message: 'No employee profile' });

    const scopedToOwnDept = req.employee.role === 'MANAGER' || req.employee.role === 'EMPLOYEE';
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

    const result = Array.from(summary.entries()).map(([department, { target, achieved }]) => ({
      department,
      target,
      achieved,
      achievementPercent: target > 0 ? Math.round((achieved / target) * 100) : 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('getDashboardSummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function getMyKpis(req: Request, res: Response) {
  try {
    if (!req.employee) return res.status(403).json({ message: 'No employee profile' });

    const entries = await prisma.kpiEntry.findMany({
      where: { employeeId: req.employee.id },
      include: { metric: true },
      orderBy: { period: 'desc' },
    });
    res.json(entries);
  } catch (err) {
    console.error('getMyKpis error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// List KPI entries for a department + period, so the entry screen can show
// existing values. ADMIN/HR can pass any departmentId; MANAGER is always
// locked to their own department, regardless of what's passed in.
export async function listKpiEntries(req: Request, res: Response) {
  try {
    if (!req.employee) return res.status(403).json({ message: 'No employee profile' });

    const { departmentId, period } = req.query as { departmentId?: string; period?: string };

    const scopedToOwnDept = req.employee.role === 'MANAGER';
    const effectiveDepartmentId = scopedToOwnDept
      ? req.employee.departmentId
      : departmentId
      ? Number(departmentId)
      : undefined;

    if (scopedToOwnDept && !effectiveDepartmentId) return res.json([]);

    const entries = await prisma.kpiEntry.findMany({
      where: {
        ...(effectiveDepartmentId ? { metric: { departmentId: effectiveDepartmentId } } : {}),
        ...(period ? { period } : {}),
      },
      include: { employee: true, metric: true },
      orderBy: [{ employeeId: 'asc' }, { metricId: 'asc' }],
    });
    res.json(entries);
  } catch (err) {
    console.error('listKpiEntries error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function upsertKpiEntry(req: Request, res: Response) {
  try {
    if (!req.employee) return res.status(403).json({ message: 'No employee profile' });

    const { employeeId, metricId, period, target, achieved, remarks } = req.body as {
      employeeId: number;
      metricId: number;
      period: string;
      target: number;
      achieved: number;
      remarks?: string;
    };

    if (req.employee.role !== 'ADMIN') {
      const targetEmployee = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!targetEmployee || targetEmployee.departmentId !== req.employee.departmentId) {
        return res.status(403).json({ message: "Can't log KPIs outside your own department" });
      }
    }

    const entry = await prisma.kpiEntry.upsert({
      where: { employeeId_metricId_period: { employeeId, metricId, period } },
      update: { target, achieved, remarks },
      create: { employeeId, metricId, period, target, achieved, remarks },
    });
    res.json(entry);
  } catch (err) {
    console.error('upsertKpiEntry error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function listDepartments(_req: Request, res: Response) {
  try {
    const departments = await prisma.department.findMany({ include: { metrics: true } });
    res.json(departments);
  } catch (err) {
    console.error('listDepartments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}
