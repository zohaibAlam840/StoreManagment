import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { customers } from "@/lib/db/schema";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS = ["name", "phone", "address", "openingBalance", "creditLimit"] as const;

export async function GET() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can export customers" }, { status: 403 });
  }

  const rows = await db.select().from(customers);
  const lines = [
    COLUMNS.join(","),
    ...rows.map((c) => COLUMNS.map((col) => csvEscape(c[col as keyof typeof c])).join(",")),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
