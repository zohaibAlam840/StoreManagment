import { StatCardsSkeleton, CardGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-6 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <StatCardsSkeleton count={3} />
      <CardGridSkeleton count={4} />
    </div>
  );
}
