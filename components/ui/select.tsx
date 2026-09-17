import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Texte affiché tant qu'aucune option n'est choisie (valeur ""). */
  placeholder?: string;
};

/**
 * `<select>` natif habillé comme `<Input>` : même hauteur, même bordure, même
 * anneau de focus, chevron identique quel que soit l'OS. Vide, il se lit
 * comme un placeholder (ink3), pas comme une valeur.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, placeholder, value, children, ...props }, ref) => (
    <span className="relative block">
      <select
        ref={ref}
        value={value}
        data-empty={value === "" || value === undefined}
        className={cn(
          "w-full min-h-[56px] appearance-none rounded-[12px] border border-line bg-panel2 py-3 pl-4 pr-11 text-[18px] text-ink outline-none transition duration-base ease-out data-[empty=true]:text-ink3 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel aria-[invalid=true]:border-bad disabled:opacity-60",
          className
        )}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink3"
      />
    </span>
  )
);
Select.displayName = "Select";
