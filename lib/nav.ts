import type { Role } from "@/lib/db/schema";
import type { NavIconName } from "@/lib/nav-icons";

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  icon: NavIconName;
  // Shown directly in the mobile bottom bar; everything else lives in the
  // "More" sheet. Keep this to ~4 items so the bar doesn't get cramped.
  mobilePrimary?: boolean;
};

// Every module from the build plan gets an entry here as soon as it exists,
// even as a placeholder page, so role-based visibility (requirement #14) is
// decided in one place instead of scattered per-page checks.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "salesman"], icon: "home", mobilePrimary: true },
  { href: "/dashboard/invoices", label: "Sales Invoice", roles: ["admin", "salesman"], icon: "receipt", mobilePrimary: true },
  { href: "/dashboard/returns", label: "Sales Returns", roles: ["admin", "salesman"], icon: "rotateCcw" },
  { href: "/dashboard/customers", label: "Customers", roles: ["admin", "salesman"], icon: "users", mobilePrimary: true },
  { href: "/dashboard/products", label: "Products", roles: ["admin"], icon: "package" },
  { href: "/dashboard/inventory", label: "Inventory", roles: ["admin"], icon: "boxes", mobilePrimary: true },
  { href: "/dashboard/purchases", label: "Purchases", roles: ["admin"], icon: "truck" },
  { href: "/dashboard/cash", label: "Cash Management", roles: ["admin"], icon: "wallet" },
  { href: "/dashboard/reports", label: "Reports", roles: ["admin"], icon: "barChart" },
  { href: "/dashboard/approvals", label: "Approvals", roles: ["admin"], icon: "checkSquare" },
  { href: "/dashboard/users", label: "Users", roles: ["admin"], icon: "userCog" },
  { href: "/dashboard/audit", label: "Audit Log", roles: ["admin"], icon: "history" },
  { href: "/dashboard/backup", label: "Backup", roles: ["admin"], icon: "databaseBackup" },
];

export function navForRole(role: Role) {
  return navItems.filter((item) => item.roles.includes(role));
}
