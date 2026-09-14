import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden md:flex relative flex-col justify-between p-14 text-white overflow-hidden bg-gradient-to-br from-deep via-primary to-secondary">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white rounded-lg px-2.5 py-1.5 shadow">
            <span className="font-bold text-deep text-sm">P</span>
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sm">PALIS KPI MANAGEMENT SYSTEM</p>
            <p className="font-mono text-[11px] tracking-wider text-white/65">PALIS ECO VEHICLES</p>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight mb-4">
            Track performance across every department, in one place.
          </h1>
          <p className="text-white/80 text-[15px]">
            Sales, production, service, purchase, HR, and accounts — targets vs achievements,
            updated in real time.
          </p>
        </div>
        <div />
      </div>

      {/* Form panel — Clerk's real widget: password, Google, whatever's enabled */}
      <div className="flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 flex items-center gap-3">
            <div className="bg-primary rounded-lg px-2.5 py-1.5">
              <span className="font-bold text-white text-sm">P</span>
            </div>
            <p className="font-bold text-sm text-ink">PALIS KPI MANAGEMENT SYSTEM</p>
          </div>

          <SignIn
            afterSignInUrl="/"
            signUpUrl="/sign-up"
            appearance={{
              variables: {
                colorPrimary: '#087D43',
                colorBackground: '#FFFFFF',
                colorText: '#171717',
                colorTextSecondary: '#5B6B63',
                colorInputBackground: '#FFFFFF',
                colorInputText: '#171717',
                borderRadius: '0.5rem',
                fontFamily: '"IBM Plex Sans", sans-serif',
                spacingUnit: '1.15rem',
              },
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-none w-full',
                headerTitle: 'text-2xl font-semibold text-ink',
                headerSubtitle: 'text-muted',
                formButtonPrimary: 'bg-primary hover:bg-deep text-sm normal-case',
                footerActionLink: 'text-primary hover:text-deep',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
