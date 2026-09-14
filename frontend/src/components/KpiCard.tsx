type KpiCardProps = {
  department: string;
  target: number;
  achieved: number;
  achievementPercent: number;
};

export default function KpiCard({ department, target, achieved, achievementPercent }: KpiCardProps) {
  const status: 'good' | 'warn' | 'bad' =
    achievementPercent >= 90 ? 'good' : achievementPercent >= 70 ? 'warn' : 'bad';

  const borderClass = { good: 'border-primary', warn: 'border-warn', bad: 'border-bad' }[status];
  const textClass = { good: 'text-primary', warn: 'text-warn', bad: 'text-bad' }[status];

  return (
    <div className={`bg-panel rounded-md border-l-4 pl-4 py-4 pr-5 ${borderClass}`}>
      <p className="text-sm text-muted mb-1">{department}</p>
      <p className={`font-mono text-3xl font-semibold ${textClass}`}>{achievementPercent}%</p>
      <div className="mt-2 text-xs text-muted font-mono">
        {achieved} / {target}
      </div>
    </div>
  );
}
