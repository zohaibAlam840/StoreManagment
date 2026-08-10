"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { navIcons } from "@/lib/nav-icons";

export function Sidebar({
  nav,
  userName,
  userRole,
}: {
  nav: NavItem[];
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:border-r md:border-zinc-200/70 md:bg-white dark:md:border-zinc-800 dark:md:bg-zinc-950">
      <div className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs text-accent-foreground">
          W
        </span>
        Wholesale POS
      </div>
      <div className="flex items-center gap-3 border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{userName}</p>
          <p className="text-xs capitalize text-zinc-500">{userRole}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {nav.map((item) => {
          const Icon = navIcons[item.icon];
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-soft text-accent-soft-foreground"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              <Icon size={18} className="shrink-0" strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action="/logout" method="post" className="border-t border-zinc-200/70 p-2 dark:border-zinc-800">
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}
