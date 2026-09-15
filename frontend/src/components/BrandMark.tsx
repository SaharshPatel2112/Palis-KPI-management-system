import { Link } from 'react-router-dom';

// Small clickable brand mark used in headers of pages inside the app
// (Dashboard, Team, Sales entry) so there's always a way back to "/".
export default function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0">
      <div className="bg-primary rounded-lg px-2 py-1">
        <span className="font-bold text-white text-xs">P</span>
      </div>
      <span className="font-bold text-sm text-ink hidden sm:inline">PALIS KPI</span>
    </Link>
  );
}
