import type { Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { prisma } from '../config/prisma.js';

export async function syncEmployee(req: Request, res: Response) {
  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) return res.status(401).json({ message: 'Not authenticated' });

    const { name, email } = req.body as { name?: string; email?: string };
    if (!email) return res.status(400).json({ message: 'email is required' });

    const employee = await prisma.employee.upsert({
      where: { clerkUserId },
      update: { name: name ?? undefined, email },
      create: { clerkUserId, name: name ?? email, email, role: 'EMPLOYEE' },
    });

    res.json(employee);
  } catch (err) {
    console.error('syncEmployee error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Returns the signed-in user's own employee record — role, department, etc.
// The frontend uses this to decide what nav links / pages to show.
export async function getMe(req: Request, res: Response) {
  try {
    if (!req.employee) return res.status(403).json({ message: 'No employee profile' });
    res.json(req.employee);
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ADMIN and HR see everyone. MANAGER sees only their own department.
export async function listEmployees(req: Request, res: Response) {
  try {
    if (!req.employee) return res.status(403).json({ message: 'No employee profile' });

    const employees = await prisma.employee.findMany({
      where: req.employee.role === 'MANAGER' ? { departmentId: req.employee.departmentId } : undefined,
      include: { department: true },
    });
    res.json(employees);
  } catch (err) {
    console.error('listEmployees error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function updateEmployee(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { role, departmentId } = req.body as { role?: string; departmentId?: number | null };

    const employee = await prisma.employee.update({
      where: { id },
      data: { role, departmentId },
    });
    res.json(employee);
  } catch (err) {
    console.error('updateEmployee error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}
