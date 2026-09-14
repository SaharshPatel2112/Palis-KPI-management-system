import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
} from 'lucide-react';

// All figures on this page are illustrative — the real dashboard at
// /dashboard reads live numbers from Postgres, scoped to your role.

const heroChartData = [
  { m: 'Apr', target: 180, achieved: 162 },
  { m: 'May', target: 195, achieved: 178 },
  { m: 'Jun', target: 205, achieved: 192 },
  { m: 'Jul', target: 210, achieved: 201 },
];

const overviewStats = [
  { label: 'Departments tracked', value: '6', suffix: '', icon: Building2, desc: 'Sales, Production, Service, Purchase, HR, Accounts — all in one system.' },
  { label: 'Avg. achievement', value: '88', suffix: '%', icon: BarChart3, desc: 'Across all departments, this reporting period.' },
  { label: 'KPIs monitored', value: '24', suffix: '+', icon: Target, desc: 'Each department tracks its own set of metrics.' },
  { label: 'Roles supported', value: '4', suffix: '', icon: ShieldCheck, desc: 'Admin, HR, Manager, and Employee access levels.' },
];

const departments = [
  {
    name: 'Sales',
    icon: TrendingUp,
    perf: 91,
    desc: 'Leads, calls, orders, and revenue against monthly targets.',
    metrics: [
      { label: 'Orders Closed', value: '142' },
      { label: 'Revenue', value: '₹18.4L' },
    ],
  },
  {
    name: 'Production',
    icon: Factory,
    perf: 94,
    desc: 'Output volume, quality, and on-time delivery.',
    metrics: [
      { label: 'Units Produced', value: '3,860' },
      { label: 'On-time Delivery', value: '96%' },
    ],
  },
  {
    name: 'Service',
    icon: Wrench,
    perf: 86,
    desc: 'Complaint resolution and response times.',
    metrics: [
      { label: 'Complaints Closed', value: '211' },
      { label: 'Avg Response', value: '4.2 hrs' },
    ],
  },
  {
    name: 'Purchase',
    icon: ShoppingCart,
    perf: 88,
    desc: 'Cost savings, supplier performance, PO completion.',
    metrics: [
      { label: 'Cost Savings', value: '₹6.1L' },
      { label: 'PO Completion', value: '93%' },
    ],
  },
  {
    name: 'HR',
    icon: Users,
    perf: 89,
    desc: 'Attendance, hiring, and retention.',
    metrics: [
      { label: 'Attendance', value: '95%' },
      { label: 'Retention', value: '91%' },
    ],
  },
  {
    name: 'Accounts',
    icon: Wallet,
    perf: 85,
    desc: 'Collections, payments, and outstanding balances.',
    metrics: [
      { label: 'Collections', value: '₹22.7L' },
      { label: 'Outstanding', value: '₹3.2L' },
    ],
  },
];

const deptPerformance = [
  { department: 'Production', value: 94 },
  { department: 'Sales', value: 91 },
  { department: 'HR', value: 89 },
  { department: 'Service', value: 86 },
];

const monthlyTrend = [
  { month: 'Jan', score: 79 },
  { month: 'Feb', score: 81 },
  { month: 'Mar', score: 84 },
  { month: 'Apr', score: 85 },
  { month: 'May', score: 87 },
  { month: 'Jun', score: 88 },
];

const steps = [
  { title: 'Set Target', desc: 'Define department and employee targets at the start of each cycle.' },
  { title: 'Track Performance', desc: 'Record daily, weekly and monthly achievements as work happens.' },
  { title: 'Analyze Results', desc: 'Compare targets with actual performance across every department.' },
  { title: 'Improve Performance', desc: 'Identify gaps early and take corrective action before they compound.' },
];

const features = [
  { icon: Lock, title: 'Role-based access', desc: 'Admin, HR, Manager, and Employee each see exactly what they should.' },
  { icon: RefreshCw, title: 'Live data', desc: 'Every dashboard reads directly from Postgres — no stale exports.' },
  { icon: Building2, title: 'Department scoping', desc: "Managers and employees see only their own department's numbers." },
  { icon: FileClock, title: 'Timestamped records', desc: 'Every KPI entry is tied to a period, an employee, and a timestamp.' },
];

const roles = [
  { icon: ShieldCheck, title: 'Admin', desc: 'Full access across every department. Can assign roles and departments.' },
  { icon: Users, title: 'HR', desc: 'Company-wide visibility. Manages employee records across departments.' },
  { icon: UserCog, title: 'Manager', desc: "Logs and reviews KPIs for their own department's team." },
  { icon: User, title: 'Employee', desc: 'Views their own targets, achievements, and manager remarks.' },
];

export default function Home() {
  return (
    <div className="bg-white text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-6 md:px-8 h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg px-2.5 py-1.5">
              <span className="font-bold text-white text-sm">P</span>
            </div>
            <div className="leading-tight">
              <p className="font-bold text-[15px] text-ink">PALIS KPI Management</p>
              <p className="font-mono text-[11px] tracking-wider text-muted">PALIS ECO VEHICLES</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-[14.5px] font-medium">
            <a href="#departments" className="px-4 py-2 rounded-lg hover:bg-soft hover:text-deep">Departments</a>
            <a href="#analytics" className="px-4 py-2 rounded-lg hover:bg-soft hover:text-deep">Analytics</a>
            <a href="#how-it-works" className="px-4 py-2 rounded-lg hover:bg-soft hover:text-deep">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <SignedOut>
              <Link to="/sign-in" className="hidden sm:inline-block px-4 py-2 rounded-lg border border-line text-[14.5px] font-medium text-deep hover:border-primary hover:bg-soft">
                Login
              </Link>
              <Link to="/sign-up" className="px-4 py-2.5 rounded-lg bg-primary text-white text-[14.5px] font-semibold hover:bg-deep">
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{ variables: { colorPrimary: '#087D43' } }}
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
        className="pt-20 pb-24"
        style={{ backgroundImage: 'radial-gradient(1100px 480px at 78% -10%, rgba(72,184,63,0.10), transparent 60%)' }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-8 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center gap-2 font-mono text-xs text-deep bg-soft border border-primary/20 px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Live performance tracking
            </span>
            <h1 className="text-4xl md:text-[44px] leading-tight text-ink max-w-lg">
              Every department&apos;s targets and results, in one dashboard.
            </h1>
            <p className="text-lg font-semibold text-primary mt-4">Built for PALIS Eco Vehicles.</p>
            <p className="text-muted mt-3.5 max-w-md leading-relaxed">
              Sales, Production, Service, Purchase, HR, and Accounts — target vs achieved,
              updated as your teams log their numbers. Role-based access keeps each
              department seeing only what&apos;s theirs.
            </p>
            <div className="flex gap-3.5 mt-8 flex-wrap">
              <SignedOut>
                <Link to="/sign-in" className="px-6 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-deep shadow-lg shadow-primary/25">
                  Sign in
                </Link>
              </SignedOut>
              <SignedIn>
                <Link to="/dashboard" className="px-6 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-deep shadow-lg shadow-primary/25">
                  Go to Dashboard
                </Link>
              </SignedIn>
              <a href="#how-it-works" className="px-6 py-3 rounded-lg border border-line text-deep font-semibold text-sm hover:border-primary hover:bg-soft">
                See how it works
              </a>
            </div>
          </div>

          <div className="relative bg-white border border-line rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-line">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-line" />
                <span className="w-2 h-2 rounded-full bg-line" />
                <span className="w-2 h-2 rounded-full bg-line" />
              </div>
              <span className="font-mono text-xs text-muted">overview.dashboard</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              <div className="bg-panel border border-line rounded-lg px-3.5 py-3">
                <p className="text-[11.5px] text-muted mb-1.5">Sales</p>
                <p className="font-mono text-xl font-semibold text-ink">
                  91<span className="text-secondary text-xs ml-1">%</span>
                </p>
              </div>
              <div className="bg-panel border border-line rounded-lg px-3.5 py-3">
                <p className="text-[11.5px] text-muted mb-1.5">Production</p>
                <p className="font-mono text-xl font-semibold text-ink">
                  94<span className="text-secondary text-xs ml-1">%</span>
                </p>
              </div>
            </div>
            <div className="bg-panel border border-line rounded-lg p-3.5">
              <p className="text-[11.5px] text-muted mb-2">Target vs Achieved</p>
              <div style={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heroChartData}>
                    <Bar dataKey="target" fill="#DCE7DF" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="achieved" fill="#087D43" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="absolute -right-3.5 top-9 bg-primary text-white font-mono text-xs px-3 py-2 rounded-lg shadow-lg shadow-primary/35">
              +12% this month
            </div>
          </div>
        </div>
      </section>

      {/* OVERVIEW STATS */}
      <section className="py-20 bg-panel">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="max-w-xl mb-11">
            <h2 className="text-3xl text-ink">Where the business stands today</h2>
            <p className="text-muted mt-2.5">
              Illustrative figures — your real dashboard reads live from Postgres.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {overviewStats.map((s) => (
              <div key={s.label} className="bg-white border border-line rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
                <div className="w-10 h-10 rounded-lg bg-soft flex items-center justify-center text-primary mb-4">
                  <s.icon size={20} />
                </div>
                <p className="text-[13.5px] text-muted font-medium">{s.label}</p>
                <p className="font-mono text-3xl font-semibold text-ink mt-1.5">
                  {s.value}
                  <span className="text-secondary text-sm ml-1">{s.suffix}</span>
                </p>
                <p className="text-[13.5px] text-muted mt-3 leading-relaxed">{s.desc}</p>
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
              Each department&apos;s KPIs, targets, and achievements — scoped by role.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {departments.map((d) => (
              <div key={d.name} className="bg-white border border-line border-l-4 border-l-primary rounded-2xl p-7 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-soft flex items-center justify-center text-deep">
                    <d.icon size={22} />
                  </div>
                  <span className="font-mono text-xs font-semibold text-primary bg-soft px-3 py-1.5 rounded-full">
                    {d.perf}% avg
                  </span>
                </div>
                <h3 className="text-lg text-ink mt-4">{d.name}</h3>
                <p className="text-[13.5px] text-muted mt-1.5">{d.desc}</p>
                <div className="grid grid-cols-2 gap-2.5 mt-5">
                  {d.metrics.map((m) => (
                    <div key={m.label} className="bg-panel border border-line rounded-lg px-3 py-2.5">
                      <p className="text-[11.5px] text-muted">{m.label}</p>
                      <p className="font-mono text-base font-semibold text-ink mt-0.5">{m.value}</p>
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
            <h2 className="text-3xl text-ink">Analytics that update as you go</h2>
            <p className="text-muted mt-2.5">Same charts your dashboard shows, scoped to what you have access to.</p>
          </div>

          <div className="grid md:grid-cols-[1.2fr_1fr] gap-5 mb-5">
            <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-baseline mb-5">
                <h4 className="text-base text-ink">Target vs Achieved</h4>
                <div className="flex gap-4 text-[12.5px] text-muted">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#DCE7DF' }} />Target</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-primary" />Achieved</span>
                </div>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={heroChartData}>
                    <XAxis dataKey="m" stroke="#5B6B63" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#5B6B63" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E3EAE6', borderRadius: 8 }} />
                    <Bar dataKey="target" fill="#DCE7DF" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="achieved" fill="#087D43" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
              <h4 className="text-base text-ink mb-5">Department Performance</h4>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptPerformance} layout="vertical" margin={{ left: 12 }}>
                    <XAxis type="number" domain={[0, 100]} stroke="#5B6B63" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="department" stroke="#5B6B63" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E3EAE6', borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#48B83F" radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl p-6 shadow-sm">
            <h4 className="text-base text-ink mb-5">Monthly KPI Trend</h4>
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <XAxis dataKey="month" stroke="#5B6B63" tick={{ fontSize: 12 }} />
                  <YAxis domain={[70, 100]} stroke="#5B6B63" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E3EAE6', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="score" stroke="#087D43" strokeWidth={2.5} dot={{ r: 4, fill: '#fff', stroke: '#087D43', strokeWidth: 2 }} />
                </LineChart>
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
                  <p className="font-mono text-sm text-secondary font-semibold shrink-0">0{i + 1}</p>
                  {i < steps.length - 1 && (
                    <span className="hidden md:block flex-1 border-t border-dashed border-line" />
                  )}
                </div>
                <h3 className="text-base text-ink mb-2">{s.title}</h3>
                <p className="text-[13.5px] text-muted leading-relaxed">{s.desc}</p>
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
              <div key={f.title} className="bg-white border border-line rounded-2xl p-6">
                <div className="w-9 h-9 rounded-lg bg-soft text-primary flex items-center justify-center mb-4">
                  <f.icon size={18} />
                </div>
                <h4 className="text-[15px] text-ink mb-1.5">{f.title}</h4>
                <p className="text-[13px] text-muted leading-relaxed">{f.desc}</p>
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
            style={{ background: 'linear-gradient(155deg, #075C35 0%, #087D43 60%, #48B83F 130%)' }}
          >
            <div>
              <h2 className="text-white text-[30px] max-w-md">Built for management visibility, not just data entry.</h2>
              <p className="text-white/85 mt-4 max-w-md text-[15.5px] leading-relaxed">
                See exactly where each department stands without waiting for a monthly report —
                pulled straight from the same data your teams are logging every day.
              </p>
              <Link to="/dashboard" className="inline-block mt-6 px-6 py-3 rounded-lg bg-white text-deep font-semibold text-sm shadow-lg hover:bg-soft">
                Go to Dashboard
              </Link>
            </div>
            <div className="bg-white/[0.08] border border-white/[0.18] rounded-[18px] p-6">
              {deptPerformance.map((d) => (
                <div key={d.department} className="flex justify-between items-center py-3 border-b border-white/[0.14] last:border-0">
                  <span className="text-sm text-white/85">{d.department}</span>
                  <div className="flex-1 mx-4 h-1.5 bg-white/[0.18] rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${d.value}%` }} />
                  </div>
                  <span className="font-mono text-sm font-semibold w-11 text-right">{d.value}%</span>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-dashed border-white/30 flex justify-between items-baseline">
                <span className="text-[13.5px] text-white/80">Overall</span>
                <span className="font-mono text-3xl font-semibold">90%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="py-20 bg-panel">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="max-w-xl mb-11">
            <h2 className="text-3xl text-ink">Access matches responsibility</h2>
            <p className="text-muted mt-2.5">Four roles, each seeing exactly what their job needs.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {roles.map((r) => (
              <div key={r.title} className="bg-white border border-line rounded-2xl p-5">
                <div className="w-10 h-10 rounded-lg bg-soft text-deep flex items-center justify-center mb-4">
                  <r.icon size={20} />
                </div>
                <h4 className="text-[14.5px] text-ink">{r.title}</h4>
                <p className="text-[12.5px] text-muted mt-1.5 leading-relaxed">{r.desc}</p>
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
                <span className="text-white font-semibold text-[15px]">PALIS KPI Management System</span>
              </div>
              <p className="text-[13.5px] text-white/55 max-w-xs leading-relaxed">
                Performance &amp; productivity management platform for PALIS Eco Vehicles.
              </p>
            </div>
            <div>
              <h5 className="text-white text-[13px] font-semibold tracking-wide mb-4">Platform</h5>
              <div className="flex flex-col">
                <a href="#departments" className="text-[13.5px] text-white/65 hover:text-white py-1.5">Departments</a>
                <a href="#analytics" className="text-[13.5px] text-white/65 hover:text-white py-1.5">Analytics</a>
                <Link to="/dashboard" className="text-[13.5px] text-white/65 hover:text-white py-1.5">Dashboard</Link>
              </div>
            </div>
            <div>
              <h5 className="text-white text-[13px] font-semibold tracking-wide mb-4">Account</h5>
              <div className="flex flex-col">
                <Link to="/sign-in" className="text-[13.5px] text-white/65 hover:text-white py-1.5">Login</Link>
                <Link to="/sign-up" className="text-[13.5px] text-white/65 hover:text-white py-1.5">Sign up</Link>
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
