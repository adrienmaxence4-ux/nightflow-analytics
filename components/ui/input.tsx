import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full min-h-[56px] rounded-[12px] border border-line bg-panel2 px-4 text-[18px] text-ink outline-none transition duration-base ease-out placeholder:text-ink3 focus-visible:border-accent aria-[invalid=true]:border-bad",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
