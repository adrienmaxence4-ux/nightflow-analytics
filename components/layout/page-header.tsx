export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold">{title}</h2>
        {subtitle && <p className="text-xs text-ink-mut">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
