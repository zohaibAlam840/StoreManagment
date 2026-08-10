import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Tone = "accent" | "neutral" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent-soft-foreground",
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-zinc-500">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon size={16} />
          </span>
        )}
      </div>
      <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {content}
    </Link>
  );
}
