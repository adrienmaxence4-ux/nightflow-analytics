import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-neon-cyan to-neon-cyansoft text-night-950 shadow-glow hover:-translate-y-0.5 hover:brightness-110",
        pink: "bg-gradient-to-r from-neon-pink to-neon-violet text-white shadow-glow-pink hover:-translate-y-0.5 hover:brightness-110",
        ghost:
          "border border-glass-border bg-glass text-ink-dim hover:border-glass-hi hover:text-white hover:shadow-glow",
        outline:
          "border border-glass-hi bg-transparent text-ink hover:bg-glass-2",
      },
      size: {
        sm: "h-9 px-3.5 text-xs",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
