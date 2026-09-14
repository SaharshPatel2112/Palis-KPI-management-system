import type { Employee } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      employee?: Employee;
    }
  }
}

export {};
