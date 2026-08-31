import { cn } from "@/lib/utils";

/** Squelette de chargement — fond --panel2, sans effet de brillance animé. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-[12px] bg-panel2", className)} />;
}
