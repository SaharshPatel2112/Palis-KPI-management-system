import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";

const syncEmployeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email(),
});

const updateEmployeeSchema = z.object({
  role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
  departmentId: z.number().int().positive().nullable().optional(),
});

export async function syncEmployee(req: Request, res: Response) {
  try {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId)
      return res.status(401).json({ message: "Not authenticated" });

    const parsed = syncEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid request", issues: parsed.error.issues });
    }
    const { name, email } = parsed.data;

    const employee = await prisma.employee.upsert({
      where: { clerkUserId },
      update: { name: name ?? undefined, email },
      create: { clerkUserId, name: name ?? email, email, role: "EMPLOYEE" },
    });

    res.json(employee);
  } catch (err) {
    console.error("syncEmployee error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });
    res.json(req.employee);
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function listEmployees(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });
    const employees = await prisma.employee.findMany({
      include: { department: true },
    });
    res.json(employees);
  } catch (err) {
    console.error("listEmployees error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Who can assign which role. ADMIN is unrestricted; MANAGER can grant HR or
// EMPLOYEE (not ADMIN, not MANAGER); HR can only grant EMPLOYEE.
const ASSIGNABLE_ROLES: Record<string, string[]> = {
  ADMIN: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  MANAGER: ["HR", "EMPLOYEE"],
  HR: ["EMPLOYEE"],
};

// HR is walled off from these departments entirely, and from Admin/Manager
// accounts entirely — can't view-edit either field on those rows, not just
// restricted in what value to set.
const HR_RESTRICTED_DEPARTMENTS = ["HR", "Accounts"];
const HR_RESTRICTED_ROLES = ["ADMIN", "MANAGER"];

export async function updateEmployee(req: Request, res: Response) {
  try {
    if (!req.employee)
      return res.status(403).json({ message: "No employee profile" });

    const id = Number(req.params.id);
    const parsed = updateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid request", issues: parsed.error.issues });
    }
    const { role, departmentId } = parsed.data;
    const callerRole = req.employee.role;

    if (callerRole === "HR") {
      const target = await prisma.employee.findUnique({
        where: { id },
        include: { department: true },
      });
      if (!target)
        return res.status(404).json({ message: "Employee not found" });

      if (HR_RESTRICTED_ROLES.includes(target.role)) {
        return res
          .status(403)
          .json({ message: "HR cannot modify Admin or Manager accounts" });
      }
      if (
        target.department &&
        HR_RESTRICTED_DEPARTMENTS.includes(target.department.name)
      ) {
        return res
          .status(403)
          .json({
            message: `HR cannot modify employees in ${target.department.name}`,
          });
      }
    }

    if (role !== undefined) {
      const allowed = ASSIGNABLE_ROLES[callerRole] ?? [];
      if (!allowed.includes(role)) {
        return res
          .status(403)
          .json({ message: `${callerRole} cannot assign the ${role} role` });
      }
    }

    if (
      departmentId !== undefined &&
      departmentId !== null &&
      callerRole === "HR"
    ) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (dept && HR_RESTRICTED_DEPARTMENTS.includes(dept.name)) {
        return res
          .status(403)
          .json({ message: `HR cannot assign the ${dept.name} department` });
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: { role, departmentId },
    });
    res.json(employee);
  } catch (err) {
    console.error("updateEmployee error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
