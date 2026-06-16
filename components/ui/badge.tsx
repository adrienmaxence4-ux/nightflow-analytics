import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
  {
    variants: {
      variant: {
        cyan: "bg-neon-cyan/12 text-neon-cyan",
        pink: "bg-neon-pink/12 text-neon-pinksoft",
        violet: "bg-neon-violet/15 text-neon-violet",
        lime: "bg-neon-lime/12 text-neon-lime",
        amber: "bg-neon-amber/12 text-neon-amber",
        critical: "border border-neon-pink/40 bg-neon-pink/10 text-neon-pinksoft",
        warning: "border border-neon-amber/40 bg-neon-amber/10 text-neon-amber",
        positive: "border border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
        info: "border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyansoft",
      },
    },
    defaultVariants: { variant: "cyan" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
