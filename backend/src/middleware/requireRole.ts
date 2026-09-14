import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

// Looks up the local Employee row for the signed-in Clerk user and attaches
// it to req.employee. Pass one or more roles to also enforce authorization;
// call it with no args to just require "some authenticated employee".
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const employee = await prisma.employee.findUnique({ where: { clerkUserId } });
    if (!employee) {
      return res.status(403).json({ message: 'No employee profile yet — call /api/employees/sync first' });
    }

    if (roles.length > 0 && !roles.includes(employee.role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }

    req.employee = employee;
    next();
  };
}
