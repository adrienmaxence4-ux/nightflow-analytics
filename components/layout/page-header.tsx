/**
 * En-tête de section. Le titre de page vit dans le Topbar ; celui-ci ouvre
 * une section à l'intérieur de la page, d'où le niveau h2 et la taille head.
 */
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
      <div className="min-w-0">
        <h2 className="text-head">{title}</h2>
        {subtitle && <p className="mt-1 text-label text-ink-mut">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
