// Shared building blocks for route-level loading.tsx files. Kept as plain
// server-renderable markup (no "use client") since Next.js renders these
// instantly while the real page's data fetch is still in flight.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Bar className="h-6 w-40" />
      <Bar className="h-8 w-28" />
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="py-2">
                <Bar className="h-4 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-zinc-100 dark:border-zinc-900">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="py-3">
                  <Bar className="h-4 w-full max-w-[9rem]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ListPageSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div>
      <PageHeaderSkeleton />
      <TableSkeleton rows={rows} cols={cols} />
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <Bar className="mb-3 h-4 w-24" />
          <Bar className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Bar className="h-6 w-48" />
      <Bar className="h-4 w-64" />
      <Bar className="h-4 w-56" />
      <div className="mt-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <TableSkeleton rows={4} cols={4} />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <Bar className="mb-3 h-5 w-32" />
          <Bar className="mb-2 h-4 w-20" />
          <Bar className="mb-2 h-4 w-20" />
          <Bar className="h-5 w-28" />
        </div>
      ))}
    </div>
  );
}
