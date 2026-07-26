import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getSessionPayload, type SessionPayload } from "./session";

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSessionPayload();
  if (!session) {
    redirect("/login");
  }
  return session;
});

// Optional variant for places that should degrade gracefully (e.g. nav)
// instead of forcing a redirect.
export const getOptionalSession = cache(async () => {
  return getSessionPayload();
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      active: users.active,
    })
    .from(users)
    .where(eq(users.id, session.userId));

  if (!user || !user.active) {
    redirect("/login");
  }
  return user;
});

export function requireAdmin(session: SessionPayload) {
  if (session.role !== "admin") {
    throw new Error("Admin approval required for this action");
  }
}
