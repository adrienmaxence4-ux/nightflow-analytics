import { cn } from "@/lib/utils";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-glass-border bg-glass-2",
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}
