type OverviewCardProps = {
  label: string;
  value: string;
  color: 'secondary' | 'error' | 'tertiary' | 'primary';
};

const colorMap: Record<OverviewCardProps['color'], string> = {
  secondary: 'text-secondary',
  error: 'text-error',
  tertiary: 'text-on-surface',
  primary: 'text-primary',
};

export function OverviewCard({ label, value, color }: OverviewCardProps) {
  return (
    <div className="glass-card rounded-[24px] p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.25em] text-on-surface-variant">{label}</span>
      </div>
      <p className={`mt-4 text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}
