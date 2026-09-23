import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

// Shared top bar for every signed-in page (Dashboard, Team, Sales entry, …).
export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-line">
      <div className="px-6 md:px-16 h-[76px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <img
            src="/logo.png"
            alt="PALIS Eco Vehicles"
            className="h-14 md:h-15 object-contain"
          />
          <div className="leading-tight border-l border-line pl-2 ml-1 hidden sm:block">
            <p className="font-medium text-[18px] text-ink">KPI Management</p>
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
