import type { ReactNode } from "react";
import { useEffect } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useAuth,
} from "@clerk/clerk-react";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import TeamPage from "./pages/TeamPage";
import CsvUploadPage from "./pages/CsvUploadPage";
import UsersKpisPage from "./pages/UsersKpisPage";
import EmployeeKpiDetailPage from "./pages/EmployeeKpiDetailPage";
import ReportsPage from "./pages/ReportsPage";
import MyKpisPage from "./pages/MyKpisPage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import { attachAuthToken } from "./api/client";

// The public homepage lives at "/" and stays reachable for every role,
// signed in or not. App pages are wrapped in Protected, which bounces
// guests to Clerk's sign-in screen.
function Protected({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-2 p-8">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="text-xl font-semibold text-ink">Page not found</h1>
      <Link to="/" className="text-sm font-medium text-primary hover:text-deep">
        Back to home
      </Link>
    </div>
  );
}

export default function App() {
  const { getToken } = useAuth();

  useEffect(() => {
    attachAuthToken(() => getToken());
  }, [getToken]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/sign-in/*"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <SignInPage />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/sign-up/*"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <SignUpPage />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/my-kpis"
        element={
          <Protected>
            <MyKpisPage />
          </Protected>
        }
      />
      <Route
        path="/reports"
        element={
          <Protected>
            <ReportsPage />
          </Protected>
        }
      />
      <Route
        path="/team"
        element={
          <Protected>
            <TeamPage />
          </Protected>
        }
      />
      <Route
        path="/upload-csv"
        element={
          <Protected>
            <CsvUploadPage />
          </Protected>
        }
      />
      <Route
        path="/users-kpis"
        element={
          <Protected>
            <UsersKpisPage />
          </Protected>
        }
      />
      <Route
        path="/users-kpis/:employeeId"
        element={
          <Protected>
            <EmployeeKpiDetailPage />
          </Protected>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
