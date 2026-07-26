import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db/client";
import { users } from "../lib/db/schema";

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  const [existing] = await db.select().from(users).where(eq(users.username, username));
  if (existing) {
    console.log(`User "${username}" already exists, skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    username,
    passwordHash,
    name,
    role: "admin",
    active: true,
  });

  console.log(`Created admin user "${username}" with password "${password}".`);
  console.log("Change this password once you add user management in Phase 1.");
}

main();
