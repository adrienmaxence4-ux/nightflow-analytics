import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Libellé + contrôle + aide ou erreur, câblés pour l'accessibilité : le
 * contrôle reçoit `id`, `aria-invalid` et `aria-describedby` vers l'aide ou
 * l'erreur, qui restent hors du `<label>` pour ne pas polluer son nom.
 * Le contrôle est un `<Input>`, un `<Select>` ou tout élément acceptant ces
 * attributs.
 */
export function Field({
  id,
  label,
  hint,
  error,
  labelEnd,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  /** Élément aligné à droite du libellé (lien « Mot de passe oublié ? »). */
  labelEnd?: React.ReactNode;
  className?: string;
  children: React.ReactElement;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div className={cn("block", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label text-ink2">
          {label}
        </label>
        {labelEnd}
      </div>
      {React.cloneElement(children, {
        id,
        "aria-invalid": !!error,
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-label font-medium text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-label font-normal text-ink3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
