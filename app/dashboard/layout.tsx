import { getCurrentUser } from "@/lib/auth/dal";
import { navForRole } from "@/lib/nav";
import { Sidebar } from "@/components/Sidebar";
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
      <Sidebar nav={nav} userName={user.name} userRole={user.role} />

      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 pb-20 sm:p-6 md:pb-6">
        {children}
      </main>

      <MobileBottomNav nav={nav} userName={user.name} userRole={user.role} />
    </div>
  );
}
