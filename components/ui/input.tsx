import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "glass-input w-full rounded-xl px-3.5 py-2.5 text-[13px]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
