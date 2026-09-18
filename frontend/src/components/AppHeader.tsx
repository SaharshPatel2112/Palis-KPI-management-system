import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

// Shared top bar for every signed-in page (Dashboard, Team, Sales entry, …).
// The logo always links back to the public homepage — that was missing
// before, so there was no way out of the app shell except typing a URL.
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
      <div className="px-16 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-primary rounded-lg px-2.5 py-1.5">
            <span className="font-bold text-white text-sm">P</span>
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="font-bold text-sm text-ink">PALIS KPI Management</p>
            <p className="font-mono text-[11px] tracking-wider text-muted">
              PALIS ECO VEHICLES
            </p>
          </div>
        </Link>
        <UserButton
          afterSignOutUrl="/"
          appearance={{ variables: { colorPrimary: "#087D43" } }}
        />
      </div>
    </header>
  );
}
