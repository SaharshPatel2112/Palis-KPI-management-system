import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { getAuth } from "@clerk/express"; // or '@clerk/clerk-sdk-node'

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clerkUserId = getAuth(req).userId;

    if (!clerkUserId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const employee = await prisma.employee.findUnique({
      where: { clerkUserId },
    });
    if (!employee) {
      return res.status(403).json({
        message: "No employee profile yet — call /api/employees/sync first",
      });
    }

    if (roles.length > 0 && !roles.includes(employee.role)) {
      return res
        .status(403)
        .json({ message: "Not authorized for this action" });
    }

    req.employee = employee;
    next();
  };
}
