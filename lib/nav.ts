import type { Role } from "@/lib/db/schema";

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

// Every module from the build plan gets an entry here as soon as it exists,
// even as a placeholder page, so role-based visibility (requirement #14) is
// decided in one place instead of scattered per-page checks.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "salesman"] },
  { href: "/dashboard/invoices", label: "Sales Invoice", roles: ["admin", "salesman"] },
  { href: "/dashboard/customers", label: "Customers", roles: ["admin", "salesman"] },
  { href: "/dashboard/products", label: "Products", roles: ["admin"] },
  { href: "/dashboard/inventory", label: "Inventory", roles: ["admin"] },
  { href: "/dashboard/purchases", label: "Purchases", roles: ["admin"] },
  { href: "/dashboard/cash", label: "Cash Management", roles: ["admin"] },
  { href: "/dashboard/reports", label: "Reports", roles: ["admin"] },
  { href: "/dashboard/approvals", label: "Approvals", roles: ["admin"] },
  { href: "/dashboard/users", label: "Users", roles: ["admin"] },
  { href: "/dashboard/audit", label: "Audit Log", roles: ["admin"] },
  { href: "/dashboard/backup", label: "Backup", roles: ["admin"] },
];

export function navForRole(role: Role) {
  return navItems.filter((item) => item.roles.includes(role));
}
