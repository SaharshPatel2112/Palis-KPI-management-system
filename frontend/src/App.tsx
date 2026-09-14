import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import TeamPage from './pages/TeamPage';
import SalesEntryPage from './pages/SalesEntryPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import { attachAuthToken } from './api/client';

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
              <Navigate to="/" replace />
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
              <Navigate to="/" replace />
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
          <>
            <SignedIn>
              <Dashboard />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/team"
        element={
          <>
            <SignedIn>
              <TeamPage />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/kpi/sales"
        element={
          <>
            <SignedIn>
              <SalesEntryPage />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
