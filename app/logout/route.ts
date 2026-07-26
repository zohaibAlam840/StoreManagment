import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth/session";

export async function POST() {
  await deleteSession();
  redirect("/login");
}
