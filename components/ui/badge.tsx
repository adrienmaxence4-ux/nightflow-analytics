import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1 text-[15px] font-bold",
  {
    variants: {
      variant: {
        good: "bg-good-bg text-good",
        bad: "bg-bad-bg text-bad",
        warn: "bg-warn-bg text-warn",
        cool: "bg-cool-bg text-cool",
        neutral: "bg-panel2 text-ink3",
        accent: "bg-accent text-accent-ink",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
