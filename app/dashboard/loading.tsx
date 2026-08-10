import { StatCardsSkeleton, TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={5} cols={3} />
    </div>
  );
}
