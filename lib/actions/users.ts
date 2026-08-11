"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { users, type Role } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";

export type CreateUserState = { error: string } | undefined;

// Admin is the master user (requirement #14) — only an admin can reach this
// page at all (see app/dashboard/users), so there's no separate approval gate.
export async function createUser(
  _state: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const admin = await getCurrentUser();
  if (admin.role !== "admin") return { error: "Only an admin can create users" };

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "salesman") as Role;

  if (!username || !password || !name) {
    return { error: "Username, name, and password are all required" };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const [existing] = await db.select().from(users).where(eq(users.username, username));
  if (existing) {
    return { error: `Username "${username}" is already taken` };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(users)
    .values({ username, passwordHash, name, role, active: true })
    .returning({ id: users.id, username: users.username, name: users.name, role: users.role });

  await logAudit({
    actorId: admin.id,
    action: "user.create",
    entity: "users",
    entityId: created.id,
    after: created,
  });

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}

export async function setUserActive(id: number, active: boolean) {
  const admin = await getCurrentUser();
  if (admin.role !== "admin") throw new Error("Only an admin can manage users");
  if (id === admin.id && !active) throw new Error("You can't deactivate your own account");

  const [before] = await db
    .select({ id: users.id, username: users.username, role: users.role, active: users.active })
    .from(users)
    .where(eq(users.id, id));
  const [after] = await db
    .update(users)
    .set({ active })
    .where(eq(users.id, id))
    .returning({ id: users.id, username: users.username, role: users.role, active: users.active });

  await logAudit({
    actorId: admin.id,
    action: active ? "user.activate" : "user.deactivate",
    entity: "users",
    entityId: id,
    before,
    after,
  });

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}

export type ResetPasswordState = { error: string } | undefined;

export async function resetPassword(
  id: number,
  _state: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const admin = await getCurrentUser();
  if (admin.role !== "admin") return { error: "Only an admin can reset passwords" };

  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));

  await logAudit({
    actorId: admin.id,
    action: "user.reset_password",
    entity: "users",
    entityId: id,
  });

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}
