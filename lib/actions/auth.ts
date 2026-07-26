"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

export type LoginState = { error: string } | undefined;

export async function login(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter a username and password." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));

  if (!user || !user.active) {
    return { error: "Invalid username or password." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid username or password." };
  }

  await createSession({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  await logAudit({
    actorId: user.id,
    action: "user.login",
    entity: "users",
    entityId: user.id,
  });

  redirect("/dashboard");
}
