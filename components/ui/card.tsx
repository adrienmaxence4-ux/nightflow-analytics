"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={
        hover
          ? { y: -4, boxShadow: "0 24px 60px -22px rgba(61,242,255,0.45)" }
          : undefined
      }
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("glass-card", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-[15px] font-bold text-ink", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
