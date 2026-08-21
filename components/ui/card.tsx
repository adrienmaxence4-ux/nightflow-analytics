import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Carte cliquable : bordure + lueur au survol, enfoncement à l'appui. */
  hover?: boolean;
}

/**
 * Le survol passe par CSS (.surface-interactive) et non par framer-motion.
 * Une grille de 4 KPI qui se soulèvent chacun de 4px produit du bruit, et
 * `motion.div` remonte à chaque rendu du parent — l'animation d'entrée se
 * rejouait donc à chaque changement de période.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(hover ? "surface-interactive" : "surface", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 p-5 pb-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-head text-ink", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-label text-ink-mut", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
