import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { getAuth } from "@clerk/express";

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      const clerkUserId = auth?.userId;

      if (!clerkUserId) {
        return res
          .status(401)
          .json({ message: "Not authenticated with Clerk" });
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

      // Pass the verified employee profile to the controller
      req.employee = employee;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      res
        .status(500)
        .json({ message: "Internal server error during authentication" });
    }
  };
}
