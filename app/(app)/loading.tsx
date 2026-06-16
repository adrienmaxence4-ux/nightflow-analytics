import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-72" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-[300px]" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Skeleton className="h-[260px]" />
            <Skeleton className="h-[260px]" />
          </div>
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    </div>
  );
}
