import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md",
    "font-bold transition duration-base ease-out",
    // Le focus vient de la règle globale :focus-visible — pas de ring local
    // à 40% d'opacité, invisible sur fond nuit.
    "disabled:pointer-events-none disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow hover:brightness-110 hover:shadow-[0_0_32px_rgba(61,242,255,0.5)] active:translate-y-px active:brightness-95",
        pink: "bg-gradient-to-r from-neon-pink to-neon-violet text-white shadow-glow-pink hover:brightness-110 active:translate-y-px active:brightness-95",
        ghost:
          "border border-glass-border bg-glass text-ink-dim hover:border-glass-hi hover:bg-glass-2 hover:text-white active:translate-y-px",
        outline:
          "border border-glass-hi bg-transparent text-ink hover:bg-glass-2 active:translate-y-px",
        danger:
          "border border-neon-pink/40 bg-neon-pink/10 text-neon-pinksoft hover:border-neon-pink hover:bg-neon-pink/16 hover:text-white active:translate-y-px",
      },
      size: {
        // sm fait 40px : sous la cible tactile de 44px, on élargit donc la
        // zone cliquable de 4px tout autour avec un pseudo-élément.
        sm: "h-10 px-3 text-label after:absolute after:-inset-1 after:rounded-[inherit] after:content-['']",
        md: "h-11 px-5 text-body font-bold",
        lg: "h-12 px-6 text-head",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Affiche un spinner et neutralise le bouton sans changer sa largeur. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/* Le libellé garde sa place pendant le chargement : sans ça le bouton
          se rétracte et la barre d'outils saute. */}
      <span
        className={cn(
          "inline-flex items-center gap-2",
          loading && "invisible"
        )}
      >
        {children}
      </span>
      {loading && (
        <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />
      )}
    </button>
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
