function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Bar className="h-6 w-56" />
      <div>
        <Bar className="mb-1 h-4 w-20" />
        <Bar className="h-10 w-full" />
      </div>
      <div>
        <Bar className="mb-1 h-4 w-24" />
        <Bar className="h-10 w-full" />
      </div>
      <Bar className="h-32 w-full" />
    </div>
  );
}
