import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { navForRole } from "@/lib/nav";
import { navIcons } from "@/lib/nav-icons";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const nav = navForRole(user.role);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-zinc-200 md:bg-white dark:md:border-zinc-800 dark:md:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {user.name}
          </p>
          <p className="text-xs capitalize text-zinc-500">{user.role}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {nav.map((item) => {
            const Icon = navIcons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <Icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action="/logout" method="post" className="border-t border-zinc-200 p-2 dark:border-zinc-800">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Log out
          </button>
        </form>
      </aside>

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 pb-20 sm:p-6 md:pb-6">
        {children}
      </main>

      <MobileBottomNav nav={nav} userName={user.name} userRole={user.role} />
    </div>
  );
}
