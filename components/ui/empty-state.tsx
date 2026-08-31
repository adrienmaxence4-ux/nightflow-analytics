import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * L'état vide fait le travail d'onboarding : il dit ce qui manque et propose
 * la seule action qui débloque. Une icône seule avec « Aucune donnée » laisse
 * l'utilisateur sans issue — c'est le moment où il ferme l'app.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-line bg-panel2">
        <Icon className="h-6 w-6 text-accent-text" aria-hidden />
      </span>
      <div className="max-w-[46ch]">
        <h3 className="text-head text-ink">{title}</h3>
        <p className="mt-1 text-body text-ink2">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Même gabarit, pour un échec de chargement : on dit quoi faire ensuite. */
export function ErrorState({
  icon: Icon,
  title = "Chargement impossible",
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-[12px] border border-bad/40 bg-bad-bg">
        <Icon className="h-6 w-6 text-bad" aria-hidden />
      </span>
      <div className="max-w-[46ch]">
        <h3 className="text-head text-ink">{title}</h3>
        <p className="mt-1 text-body text-ink2">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
