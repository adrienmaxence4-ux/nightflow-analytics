import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-[12px]",
    "font-bold transition duration-base ease-out",
    "disabled:pointer-events-none disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:brightness-95 active:brightness-90",
        outline: "border border-line bg-transparent text-ink hover:border-accent",
        ghost: "border border-line bg-panel2 text-ink2 hover:text-ink",
        danger: "border border-bad/40 bg-bad-bg text-bad hover:border-bad",
      },
      size: {
        sm: "min-h-tap px-4 text-label",
        md: "min-h-tap px-5 text-[17px]",
        lg: "min-h-[56px] px-7 text-[18px]",
        icon: "h-tap w-tap",
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
      <span className={cn("inline-flex items-center gap-2.5", loading && "invisible")}>
        {children}
      </span>
      {loading && <Loader2 className="absolute h-5 w-5 animate-spin" aria-hidden />}
    </button>
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
