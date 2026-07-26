import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentUser();
  if (admin.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const [user] = await db.select().from(users).where(eq(users.id, Number(id)));
  if (!user) notFound();

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Reset password — {user.name}
      </h1>
      <ResetPasswordForm userId={user.id} />
    </div>
  );
}
