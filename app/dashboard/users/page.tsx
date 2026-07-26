import Link from "next/link";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { redirect } from "next/navigation";
import { setUserActive } from "@/lib/actions/users";
import { UserForm } from "@/components/UserForm";

export default async function UsersPage() {
  const current = await getCurrentUser();
  if (current.role !== "admin") redirect("/dashboard");

  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      active: users.active,
    })
    .from(users);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Users
        </h1>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2">Name</th>
              <th className="py-2">Username</th>
              <th className="py-2">Role</th>
              <th className="py-2">Active</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{u.name}</td>
                <td className="py-2">{u.username}</td>
                <td className="py-2 capitalize">{u.role}</td>
                <td className="py-2">{u.active ? "Yes" : "No"}</td>
                <td className="py-2 flex gap-3">
                  <Link href={`/dashboard/users/${u.id}/reset-password`} className="text-zinc-600 underline dark:text-zinc-400">
                    Reset password
                  </Link>
                  {u.id !== current.id && (
                    <form action={setUserActive.bind(null, u.id, !u.active)}>
                      <button type="submit" className={u.active ? "text-red-600 underline" : "text-emerald-600 underline"}>
                        {u.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Add user
        </h2>
        <UserForm />
      </div>
    </div>
  );
}
