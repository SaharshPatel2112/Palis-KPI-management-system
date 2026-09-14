import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { client } from '../api/client';

export type Employee = {
  id: number;
  clerkUserId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';
  departmentId: number | null;
};

// Syncs the signed-in Clerk user into our Employee table (idempotent — safe
// to call on every page), then fetches their role/department. Used to decide
// what nav links and pages a given user should see.
export function useEmployee() {
  const { user, isLoaded } = useUser();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        await client.post('/employees/sync', {
          name: user.fullName,
          email: user.primaryEmailAddress?.emailAddress,
        });
        const { data } = await client.get<Employee>('/employees/me');
        setEmployee(data);
      } catch {
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    }
    if (isLoaded && user) load();
  }, [isLoaded, user]);

  return { employee, loading };
}
