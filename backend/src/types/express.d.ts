import type { Employee } from "@prisma/client";
import type { AuthObject } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      // Populated by clerkMiddleware(); declared explicitly so tsc picks it
      // up even when @clerk/express's own augmentation isn't loaded.
      auth?: AuthObject;
      // Attached by requireRole() after looking up the Employee row.
      employee?: Employee;
    }
  }
}

export {};
