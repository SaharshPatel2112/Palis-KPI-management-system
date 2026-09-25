import AppHeader from "../components/AppHeader";
import ProgressSection from "../components/ProgressSection";
import { Link } from "react-router-dom";

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-panel text-ink font-sans pb-20">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-6 md:px-8 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-ink">
              Performance Progress
            </h1>
            <p className="text-[14.5px] text-muted mt-1.5">
              Track target completion and growth deltas across periods.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-primary hover:text-deep transition-colors flex items-center gap-1.5 shrink-0"
          >
            &larr; Back to dashboard
          </Link>
        </div>

        <ProgressSection />
      </main>
    </div>
  );
}
