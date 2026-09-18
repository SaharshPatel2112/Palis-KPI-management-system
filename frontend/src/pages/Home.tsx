import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Factory,
  Wrench,
  ShoppingCart,
  Users,
  Wallet,
  Building2,
  BarChart3,
  Target,
  ShieldCheck,
  Lock,
  RefreshCw,
  FileClock,
  UserCog,
  User,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { client } from "../api/client";

// Illustrative fallbacks — only used for signed-out visitors. Anyone signed
// in sees live numbers from Postgres, scoped to their role.
const heroChartData = [
  { m: "Apr", target: 180, achieved: 162 },
  { m: "May", target: 195, achieved: 178 },
  { m: "Jun", target: 205, achieved: 192 },
  { m: "Jul", target: 210, achieved: 201 },
];

const deptPerformanceFallback = [
  { department: "Production", value: 94 },
  { department: "Sales", value: 91 },
  { department: "HR", value: 89 },
  { department: "Service", value: 86 },
];

const monthlyTrendFallback = [
  { month: "Jan", score: 79 },
  { month: "Feb", score: 81 },
  { month: "Mar", score: 84 },
  { month: "Apr", score: 85 },
  { month: "May", score: 87 },
  { month: "Jun", score: 88 },
];

type TrendPoint = {
  period: string;
  target: number;
  achieved: number;
  achievementPercent: number;
};
type SummaryPoint = {
  department: string;
  target: number;
  achieved: number;
  achievementPercent: number;
};
type BreakdownMetric = {
  id: number;
  name: string;
  unit: string | null;
  target: number;
  achieved: number;
  achievementPercent: number;
};
type BreakdownDept = {
  id: number;
  name: string;
  target: number;
  achieved: number;
  achievementPercent: number;
  metrics: BreakdownMetric[];
};

type LiveData = {
  trend: TrendPoint[];
  summary: SummaryPoint[];
  breakdown: BreakdownDept[];
};

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: 1 });
const monthName = (p: string) =>
  new Date(`${p}-02`).toLocaleString("en-US", { month: "short" });

function HomeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-line rounded-lg shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-semibold text-ink mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p
          key={String(p.dataKey)}
          className="font-mono text-muted flex items-center gap-1.5"
        >
          <span
            className="w-2 h-2 rounded-sm inline-block shrink-0"
            style={{ background: p.fill || p.stroke }}
          />
          {p.name}:{" "}
          <span className="text-ink font-semibold">{fmt(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

const DEPARTMENTS_META = [
  {
    name: "Sales",
    icon: TrendingUp,
    desc: "Leads, calls, orders, and revenue against monthly targets.",
    metrics: [
      { label: "Orders Closed", value: "142" },
      { label: "Revenue", value: "₹18.4L" },
    ],
  },
  {
    name: "Production",
    icon: Factory,
    desc: "Output volume, quality, and on-time delivery.",
    metrics: [
      { label: "Units Produced", value: "3,860" },
      { label: "On-time Delivery", value: "96%" },
    ],
  },
  {
    name: "Service",
    icon: Wrench,
    desc: "Complaint resolution and response times.",
    metrics: [
      { label: "Complaints Closed", value: "211" },
      { label: "Avg Response", value: "4.2 hrs" },
    ],
  },
  {
    name: "Purchase",
    icon: ShoppingCart,
    desc: "Cost savings, supplier performance, PO completion.",
    metrics: [
      { label: "Cost Savings", value: "₹6.1L" },
      { label: "PO Completion", value: "93%" },
    ],
  },
  {
    name: "HR",
    icon: Users,
    desc: "Attendance, hiring, and retention.",
    metrics: [
      { label: "Attendance", value: "95%" },
      { label: "Retention", value: "91%" },
    ],
  },
  {
    name: "Accounts",
    icon: Wallet,
    desc: "Collections, payments, and outstanding balances.",
    metrics: [
      { label: "Collections", value: "₹22.7L" },
      { label: "Outstanding", value: "₹3.2L" },
    ],
  },
];

const steps = [
  {
    title: "Set Target",
    desc: "Define department and employee targets at the start of each cycle.",
  },
  {
    title: "Track Performance",
    desc: "Record daily, weekly and monthly achievements as work happens.",
  },
  {
    title: "Analyze Results",
    desc: "Compare targets with actual performance across every department.",
  },
  {
    title: "Improve Performance",
    desc: "Identify gaps early and take corrective action before they compound.",
  },
];

const features = [
  {
    icon: Lock,
    title: "Role-based access",
    desc: "Admin, HR, Manager, and Employee each see exactly what they should.",
  },
  {
    icon: RefreshCw,
    title: "Live data",
    desc: "Every dashboard reads directly from Postgres — no stale exports.",
  },
  {
    icon: Building2,
    title: "Department scoping",
    desc: "Managers and employees see only their own department's numbers.",
  },
  {
    icon: FileClock,
    title: "Timestamped records",
    desc: "Every KPI entry is tied to a period, an employee, and a timestamp.",
  },
];

const roles = [
  {
    icon: ShieldCheck,
    title: "Admin",
    desc: "Full access across every department. Can assign roles and departments.",
  },
  {
    icon: Users,
    title: "HR",
    desc: "Company-wide visibility. Manages employee records across departments.",
  },
  {
    icon: UserCog,
    title: "Manager",
    desc: "Logs and reviews KPIs for their own department's team.",
  },
  {
    icon: User,
    title: "Employee",
    desc: "Views their own targets, achievements, and manager remarks.",
  },
];

export default function Home() {
  const [live, setLive] = useState<LiveData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [trend, summary, breakdown] = await Promise.all([
          client.get<TrendPoint[]>("/kpi/growth-trend", {
            params: { months: 6 },
          }),
          client.get<SummaryPoint[]>("/kpi/dashboard-summary"),
          client.get<BreakdownDept[]>("/kpi/department-breakdown"),
        ]);
        if (!cancelled) {
          setLive({
            trend: trend.data,
            summary: summary.data,
            breakdown: breakdown.data,
          });
        }
      } catch {
        // Signed out or API unreachable — illustrative fallbacks stay.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- derived real data ----------------------------------------------
  const overall = useMemo(() => {
    if (!live || live.summary.length === 0) return null;
    const target = live.summary.reduce((s, d) => s + d.target, 0);
    const achieved = live.summary.reduce((s, d) => s + d.achieved, 0);
    return {
      target,
      achieved,
      pct: target > 0 ? Math.round((achieved / target) * 100) : 0,
      depts: live.summary.length,
      metrics: live.breakdown.reduce((s, d) => s + d.metrics.length, 0),
    };
  }, [live]);

  const delta = useMemo(() => {
    if (!live || live.trend.length < 2) return null;
    const [prev, last] = live.trend.slice(-2);
    return last.achievementPercent - prev.achievementPercent;
  }, [live]);

  const chartData =
    live && live.trend.length > 0
      ? live.trend.map((t) => ({
          m: monthName(t.period),
          target: t.target,
          achieved: t.achieved,
        }))
      : heroChartData;

  const perfData =
    live && live.summary.length > 0
      ? live.summary.map((s) => ({
          department: s.department,
          value: s.achievementPercent,
        }))
      : deptPerformanceFallback;

  const trendLine =
    live && live.trend.length > 0
      ? live.trend.map((t) => ({
          month: monthName(t.period),
          score: t.achievementPercent,
        }))
      : monthlyTrendFallback;

  const deptCards = useMemo(
    () =>
      DEPARTMENTS_META.map((meta) => {
        const real = live?.breakdown.find((d) => d.name === meta.name);
        return {
          ...meta,
          perf: real ? real.achievementPercent : null,
          metrics: real
            ? real.metrics.slice(0, 2).map((m) => ({
                label: m.name,
                value: fmt(m.achieved),
              }))
            : meta.metrics,
        };
      }),
    [live],
  );

  const heroStat = (name: string, fallback: number) => {
    const d = live?.summary.find((s) => s.department === name);
    return d ? d.achievementPercent : fallback;
  };

  const overviewStats = [
    {
      label: "Departments tracked",
      value: String(live?.summary.length ?? 6),
      icon: Building2,
      desc: "Sales, Production, Service, Purchase, HR, Accounts — all in one system.",
    },
    {
      label: "Overall achievement",
      value: String(overall?.pct ?? 88),
      suffix: "%",
      icon: BarChart3,
      desc: "Total achieved vs total target, this reporting period.",
    },
    {
      label: "KPIs monitored",
      value: String(overall?.metrics ?? 24),
      icon: Target,
      desc: "Each department tracks its own set of metrics.",
    },
    {
      label: "Roles supported",
      value: "4",
      icon: ShieldCheck,
      desc: "Admin, HR, Manager, and Employee access levels.",
    },
  ];

  const overallStatus =
    overall == null
      ? "text-primary"
      : overall.pct >= 90
        ? "text-primary"
        : overall.pct >= 70
          ? "text-warn"
          : "text-bad";

  return (
    <div className="bg-white text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-line">
        <div className="px-16 h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg px-2.5 py-1.5">
              <span className="font-bold text-white text-sm">P</span>
            </div>
            <div className="leading-tight">
              <p className="font-bold text-[15px] text-ink">
                PALIS KPI Management
              </p>
              <p className="font-mono text-[11px] tracking-wider text-muted">
                PALIS ECO VEHICLES
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-[14.5px] font-medium">
            <a
              href="#departments"
              className="px-4 py-2 rounded-lg hover:bg-soft hover:text-deep"
            >
              Departments
            </a>
            <a
              href="#analytics"
              className="px-4 py-2 rounded-lg hover:bg-soft hover:text-deep"
            >
              Analytics
            </a>
            <a
              href="#how-it-works"
              className="px-4 py-2 rounded-lg hover:bg-soft hover:text-deep"
            >
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link
                to="/sign-in"
                className="hidden sm:inline-block px-4 py-2 rounded-lg border border-line text-[14.5px] font-medium text-deep hover:border-primary hover:bg-soft"
              >
                Login
              </Link>
              <Link
                to="/sign-up"
                className="px-4 py-2.5 rounded-lg bg-primary text-white text-[14.5px] font-semibold hover:bg-deep"
              >
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{ variables: { colorPrimary: "#087D43" } }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Dashboard"
                    href="/dashboard"
                    labelIcon={<LayoutDashboard size={15} />}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        className="pt-20 pb-16"
        style={{
          backgroundImage:
            "radial-gradient(1100px 480px at 78% -10%, rgba(72,184,63,0.10), transparent 60%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 font-mono text-xs text-deep bg-soft border border-primary/20 px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              {live ? "Live performance tracking" : "Performance tracking"}
            </span>
            <h1 className="text-4xl md:text-[44px] leading-tight text-ink max-w-lg">
              Every department&apos;s targets and results, in one dashboard.
            </h1>
            <p className="text-lg font-semibold text-primary mt-4">
              Built for PALIS Eco Vehicles.
            </p>
            <p className="text-muted mt-3.5 max-w-md leading-relaxed">
              Sales, Production, Service, Purchase, HR, and Accounts — target vs
              achieved, updated as your teams log their numbers. Role-based
              access keeps each department seeing only what&apos;s theirs.
            </p>
            <div className="flex gap-3.5 mt-8 flex-wrap">
              <SignedOut>
                <Link
                  to="/sign-in"
                  className="px-6 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-deep shadow-lg shadow-primary/25"
                >
                  Sign in
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="px-6 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-deep shadow-lg shadow-primary/25"
                >
                  Go to Dashboard
                </Link>
              </SignedIn>
              <a
                href="#analytics"
                className="px-6 py-3 rounded-lg border border-line text-deep font-semibold text-sm hover:border-primary hover:bg-soft"
              >
                See live analytics
              </a>
            </div>

            {/* OVERALL KPI RATING */}
            {overall && (
              <div className="mt-9 inline-flex items-center gap-6 bg-white border border-line rounded-2xl shadow-sm px-6 py-5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted mb-1.5">
                    Overall KPI rating
                  </p>
                  <p
                    className={`font-mono text-5xl font-semibold leading-none ${overallStatus}`}
                  >
                    {overall.pct}
                    <span className="text-2xl">%</span>
                  </p>
                </div>
                <div className="border-l border-line pl-6 space-y-1.5 text-xs">
                  <p className="text-muted">
                    {overall.depts} departments · {overall.metrics} KPIs
                  </p>
                  <p className="text-muted font-mono">
                    {fmt(overall.achieved)} / {fmt(overall.target)}
                  </p>
                  {delta !== null && (
                    <p
                      className={`font-semibold flex items-center gap-1 ${
                        delta >= 0 ? "text-primary" : "text-bad"
                      }`}
                    >
                      {delta >= 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}
                      {Math.abs(delta)}% vs last month
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative bg-white border border-line rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-line">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-line" />
                <span className="w-2 h-2 rounded-full bg-line" />
                <span className="w-2 h-2 rounded-full bg-line" />
              </div>
              <span className="font-mono text-xs text-muted">
                overview.dashboard{live ? " · live" : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="bg-panel border border-line rounded-lg px-3.5 py-3">
                <p className="text-[11.5px] text-muted mb-1.5">Sales</p>
                <p className="font-mono text-xl font-semibold text-ink">
                  {heroStat("Sales", 91)}
                  <span className="text-secondary text-xs ml-1">%</span>
                </p>
              </div>
              <div className="bg-panel border border-line rounded-lg px-3.5 py-3">
                <p className="text-[11.5px] text-muted mb-1.5">Production</p>
                <p className="font-mono text-xl font-semibold text-ink">
                  {heroStat("Production", 94)}
                  <span className="text-secondary text-xs ml-1">%</span>
                </p>
              </div>
            </div>
            <div className="bg-panel border border-line rounded-lg p-3.5">
              <p className="text-[11.5px] text-muted mb-2">
                Target vs Achieved
              </p>
              <div style={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <Bar
                      dataKey="target"
                      fill="#DCE7DF"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="achieved"
                      fill="#087D43"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {overall && (
              <div className="absolute -right-3.5 top-9 bg-primary text-white font-mono text-xs px-3 py-2 rounded-lg shadow-lg shadow-primary/35">
                {overall.pct}% overall
              </div>
            )}
          </div>
        </div>
      </section>

      {/* OVERVIEW STATS */}
      <section className="py-20 bg-panel">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="max-w-xl mb-11 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl text-ink">
                Where the business stands today
              </h2>
              <p className="text-muted mt-2.5">
                {live
                  ? "Live figures, pulled straight from the KPI database."
                  : "Illustrative figures — sign in to see your live numbers."}
              </p>
            </div>
            {live && (
              <span className="shrink-0 font-mono text-[11px] text-primary bg-soft border border-primary/20 px-3 py-1.5 rounded-full">
                ● LIVE
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {overviewStats.map((s: any) => (
              <div
                key={s.label}
                className="bg-white border border-line rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-primary mb-4">
                  <s.icon size={20} />
                </div>
                <p className="text-[13.5px] text-muted font-medium">
                  {s.label}
                </p>
                <p className="font-mono text-3xl font-semibold text-ink mt-1.5">
                  {s.value}
                  {s.suffix && (
                    <span className="text-secondary text-sm ml-1">
                      {s.suffix}
                    </span>
                  )}
                </p>
                <p className="text-[13.5px] text-muted mt-3 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEPARTMENTS */}
      <section className="py-20 bg-white scroll-mt-24" id="departments">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="max-w-xl mb-11">
            <h2 className="text-3xl text-ink">Six departments, one system</h2>
            <p className="text-muted mt-2.5">
              Each department&apos;s KPIs, targets, and achievements — scoped by
              role.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {deptCards.map((d) => (
              <div
                key={d.name}
                className="bg-white border border-line border-l-4 border-l-primary rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-soft flex items-center justify-center text-deep">
                    <d.icon size={22} />
                  </div>
                  {d.perf !== null ? (
                    <span
                      className={`font-mono text-xs font-semibold px-3 py-1.5 rounded-full ${
                        d.perf >= 90
                          ? "bg-soft text-primary"
                          : d.perf >= 70
                            ? "bg-[#FBF3E4] text-warn"
                            : "bg-badBg text-bad"
                      }`}
                    >
                      {d.perf}% avg
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-semibold text-primary bg-soft px-3 py-1.5 rounded-full">
                      —
                    </span>
                  )}
                </div>
                <h3 className="text-lg text-ink mt-4">{d.name}</h3>
                <p className="text-[13.5px] text-muted mt-1.5">{d.desc}</p>
                <div className="grid grid-cols-2 gap-2.5 mt-5">
                  {d.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="bg-panel border border-line rounded-lg px-3 py-2.5"
                    >
                      <p className="text-[11.5px] text-muted truncate">
                        {m.label}
                      </p>
                      <p className="font-mono text-base font-semibold text-ink mt-0.5">
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section className="py-20 bg-panel scroll-mt-24" id="analytics">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="max-w-xl mb-11">
            <h2 className="text-3xl text-ink">
              Analytics that update as you go
            </h2>
            <p className="text-muted mt-2.5">
              Same charts your dashboard shows, scoped to what you have access
              to.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-5">
            <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
              <h4 className="text-base text-ink mb-5">
                Department Performance
              </h4>
              <div style={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={perfData}
                    layout="vertical"
                    margin={{ left: 12, right: 28 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#E3EAE6"
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      stroke="#5B6B63"
                      tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                      axisLine={{ stroke: "#E3EAE6" }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="department"
                      stroke="#5B6B63"
                      tick={{ fontSize: 12 }}
                      width={92}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<HomeTooltip />}
                      cursor={{ fill: "#F1FAF4" }}
                    />
                    <Bar
                      dataKey="value"
                      name="Achievement %"
                      radius={[0, 5, 5, 0]}
                      barSize={16}
                      fill="#48B83F"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
              <h4 className="text-base text-ink mb-5">Monthly KPI Trend</h4>
              <div style={{ height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendLine}
                    margin={{ top: 4, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E3EAE6"
                    />
                    <XAxis
                      dataKey="month"
                      stroke="#5B6B63"
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: "#E3EAE6" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#5B6B63"
                      tick={{ fontSize: 12, fontFamily: "IBM Plex Mono" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<HomeTooltip />}
                      cursor={{ stroke: "#E3EAE6" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Achievement %"
                      stroke="#087D43"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: "#fff",
                        stroke: "#087D43",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-baseline mb-5">
              <h4 className="text-base text-ink">Target vs Achieved</h4>
              <div className="flex gap-4 text-[12.5px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ background: "#DCE7DF" }}
                  />
                  Target
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block bg-primary" />
                  Achieved
                </span>
              </div>
            </div>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E3EAE6"
                  />
                  <XAxis
                    dataKey="m"
                    stroke="#5B6B63"
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: "#E3EAE6" }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#5B6B63"
                    tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<HomeTooltip />}
                    cursor={{ fill: "#F1FAF4" }}
                  />
                  <Bar
                    dataKey="target"
                    name="Target"
                    fill="#DCE7DF"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="achieved"
                    name="Achieved"
                    fill="#087D43"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-white scroll-mt-24" id="how-it-works">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="max-w-xl mx-auto text-center mb-14">
            <h2 className="text-3xl text-ink">How PALIS KPI Works</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-9">
            {steps.map((s, i) => (
              <div key={s.title}>
                <div className="flex items-center gap-3 mb-3.5">
                  <p className="font-mono text-sm text-secondary font-semibold shrink-0">
                    0{i + 1}
                  </p>
                  {i < steps.length - 1 && (
                    <span className="hidden md:block flex-1 border-t border-dashed border-line" />
                  )}
                </div>
                <h3 className="text-base text-ink mb-2">{s.title}</h3>
                <p className="text-[13.5px] text-muted leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-panel">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-line rounded-2xl p-6"
              >
                <div className="w-9 h-9 rounded-lg bg-soft text-primary flex items-center justify-center mb-4">
                  <f.icon size={18} />
                </div>
                <h4 className="text-[15px] text-ink mb-1.5">{f.title}</h4>
                <p className="text-[13px] text-muted leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANAGEMENT INSIGHT CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div
            className="rounded-[28px] p-10 md:p-16 grid md:grid-cols-2 gap-12 items-center text-white"
            style={{
              background:
                "linear-gradient(155deg, #075C35 0%, #087D43 60%, #48B83F 130%)",
            }}
          >
            <div>
              <h2 className="text-white text-[30px] max-w-md">
                Built for management visibility, not just data entry.
              </h2>
              <p className="text-white/85 mt-4 max-w-md text-[15.5px] leading-relaxed">
                See exactly where each department stands without waiting for a
                monthly report — pulled straight from the same data your teams
                are logging every day.
              </p>
              <Link
                to="/dashboard"
                className="inline-block mt-6 px-6 py-3 rounded-lg bg-white text-deep font-semibold text-sm shadow-lg hover:bg-soft"
              >
                Go to Dashboard
              </Link>
            </div>
            <div className="bg-white/[0.08] border border-white/[0.18] rounded-[18px] p-6">
              {perfData.map((d) => (
                <div
                  key={d.department}
                  className="flex justify-between items-center py-3 border-b border-white/[0.14] last:border-0"
                >
                  <span className="text-sm text-white/85">{d.department}</span>
                  <div className="flex-1 mx-4 h-1.5 bg-white/[0.18] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${Math.min(100, d.value)}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm font-semibold w-11 text-right">
                    {d.value}%
                  </span>
                </div>
              ))}
              {overall && (
                <div className="mt-4 pt-4 border-t border-dashed border-white/30 flex justify-between items-baseline">
                  <span className="text-[13.5px] text-white/80">Overall</span>
                  <span className="font-mono text-3xl font-semibold">
                    {overall.pct}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="py-20 bg-panel">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="max-w-xl mb-11">
            <h2 className="text-3xl text-ink">Access matches responsibility</h2>
            <p className="text-muted mt-2.5">
              Four roles, each seeing exactly what their job needs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {roles.map((r) => (
              <div
                key={r.title}
                className="bg-white border border-line rounded-2xl p-5"
              >
                <div className="w-10 h-10 rounded-lg bg-soft text-deep flex items-center justify-center mb-4">
                  <r.icon size={20} />
                </div>
                <h4 className="text-[14.5px] text-ink">{r.title}</h4>
                <p className="text-[12.5px] text-muted mt-1.5 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink text-white/70 pt-14 pb-7">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-[1.4fr_1fr_1fr] gap-10 pb-9 border-b border-white/[0.12]">
            <div>
              <div className="flex items-center gap-3 mb-3.5">
                <div className="bg-white rounded-lg px-2.5 py-1.5">
                  <span className="font-bold text-deep text-sm">P</span>
                </div>
                <span className="text-white font-semibold text-[15px]">
                  PALIS KPI Management System
                </span>
              </div>
              <p className="text-[13.5px] text-white/55 max-w-xs leading-relaxed">
                Performance &amp; productivity management platform for PALIS Eco
                Vehicles.
              </p>
            </div>
            <div>
              <h5 className="text-white text-[13px] font-semibold tracking-wide mb-4">
                Platform
              </h5>
              <div className="flex flex-col">
                <a
                  href="#departments"
                  className="text-[13.5px] text-white/65 hover:text-white py-1.5"
                >
                  Departments
                </a>
                <a
                  href="#analytics"
                  className="text-[13.5px] text-white/65 hover:text-white py-1.5"
                >
                  Analytics
                </a>
                <Link
                  to="/dashboard"
                  className="text-[13.5px] text-white/65 hover:text-white py-1.5"
                >
                  Dashboard
                </Link>
              </div>
            </div>
            <div>
              <h5 className="text-white text-[13px] font-semibold tracking-wide mb-4">
                Account
              </h5>
              <div className="flex flex-col">
                <Link
                  to="/sign-in"
                  className="text-[13.5px] text-white/65 hover:text-white py-1.5"
                >
                  Login
                </Link>
                <Link
                  to="/sign-up"
                  className="text-[13.5px] text-white/65 hover:text-white py-1.5"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-between items-center pt-6 text-xs text-white/45 gap-2.5">
            <span>© 2026 PALIS Eco Vehicles. All rights reserved.</span>
            <span>Internal use only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
