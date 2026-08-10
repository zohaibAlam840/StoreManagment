"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X, LogOut } from "lucide-react";
import type { NavItem } from "@/lib/nav";
import { navIcons } from "@/lib/nav-icons";

export function MobileBottomNav({
  nav,
  userName,
  userRole,
}: {
  nav: NavItem[];
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = nav.filter((item) => item.mobilePrimary).slice(0, 4);
  const overflow = nav.filter((item) => !primary.includes(item));

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      {moreOpen && (
        <div className="no-print fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{userName}</p>
                <p className="text-xs capitalize text-zinc-500">{userRole}</p>
              </div>
              <button
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="grid grid-cols-3 gap-1 p-3">
              {overflow.map((item) => {
                const Icon = navIcons[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs font-medium ${
                      isActive(item.href)
                        ? "bg-accent-soft text-accent-soft-foreground"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <form action="/logout" method="post" className="border-t border-zinc-100 p-3 dark:border-zinc-900">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600"
              >
                <LogOut size={18} />
                Log out
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex items-stretch justify-around">
          {primary.map((item) => {
            const Icon = navIcons[item.icon];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-accent" : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className="max-w-[4.5rem] truncate">{item.label}</span>
              </Link>
            );
          })}
          {overflow.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              <MoreHorizontal size={22} />
              <span>More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
