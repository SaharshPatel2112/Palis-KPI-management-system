import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-8">
      <div className="max-w-sm text-center">
        <h2 className="text-xl font-semibold text-ink mb-2">Reset your password</h2>
        <p className="text-sm text-muted mb-6">
          Self-serve reset isn&apos;t wired up yet — that's a small follow-up task. For now, contact
          your admin to reset your account.
        </p>
        <Link to="/sign-in" className="text-primary font-medium text-sm">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
