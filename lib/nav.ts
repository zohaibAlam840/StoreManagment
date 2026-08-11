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
  // Rendered as an indented group under the parent in the desktop sidebar.
  // Each child is filtered by its own `roles` just like a top-level item.
  children?: NavItem[];
};

// Every module from the build plan gets an entry here as soon as it exists,
// even as a placeholder page, so role-based visibility (requirement #14) is
// decided in one place instead of scattered per-page checks.
//
// "Sale Invoice" links straight to the new-invoice screen (not a list) —
// creating a sale is the thing this gets clicked to do, every time; the
// invoice history itself lives under Reports and inside this group.
export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "salesman"], icon: "home", mobilePrimary: true },
  {
    href: "/dashboard/invoices/new",
    label: "Sale Invoice",
    roles: ["admin", "salesman"],
    icon: "receipt",
    mobilePrimary: true,
    children: [
      { href: "/dashboard/invoices/new", label: "New Invoice", roles: ["admin", "salesman"], icon: "receipt" },
      { href: "/dashboard/invoices", label: "Invoice History", roles: ["admin", "salesman"], icon: "receipt" },
      { href: "/dashboard/returns", label: "Sales Returns", roles: ["admin", "salesman"], icon: "rotateCcw" },
      { href: "/dashboard/purchases/new", label: "Purchase Invoice", roles: ["admin"], icon: "truck" },
      { href: "/dashboard/purchases", label: "Purchase History", roles: ["admin"], icon: "truck" },
      { href: "/dashboard/purchases/orders", label: "Purchase Orders", roles: ["admin"], icon: "clipboardList" },
    ],
  },
  { href: "/dashboard/cash/transactions/new", label: "Expenses", roles: ["admin"], icon: "banknote" },
  { href: "/dashboard/inventory", label: "Inventory", roles: ["admin"], icon: "boxes", mobilePrimary: true },
  { href: "/dashboard/cash", label: "Cash/Bank", roles: ["admin"], icon: "wallet" },
  { href: "/dashboard/products", label: "Product", roles: ["admin"], icon: "package" },
  { href: "/dashboard/customers", label: "Customer", roles: ["admin", "salesman"], icon: "users", mobilePrimary: true },
  { href: "/dashboard/purchases/suppliers", label: "Supplier", roles: ["admin"], icon: "building2" },
  { href: "/dashboard/reports", label: "Reports", roles: ["admin"], icon: "barChart" },
  { href: "/dashboard/users", label: "User", roles: ["admin"], icon: "userCog" },
  { href: "/dashboard/approvals", label: "Approval", roles: ["admin"], icon: "checkSquare" },
  { href: "/dashboard/audit", label: "Audit Trail", roles: ["admin"], icon: "history" },
  { href: "/dashboard/backup", label: "Backups", roles: ["admin"], icon: "databaseBackup" },
];

function filterForRole(items: NavItem[], role: Role): NavItem[] {
  return items
    .filter((item) => item.roles.includes(role))
    .map((item) => (item.children ? { ...item, children: filterForRole(item.children, role) } : item));
}

export function navForRole(role: Role) {
  return filterForRole(navItems, role);
}

// Mobile has no room for nested groups — the bottom bar's "More" sheet
// needs one flat list, so a parent's children ride alongside it instead of
// nesting, otherwise they'd be unreachable on a phone.
export function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => (item.children ? [item, ...item.children] : [item]));
}

// Several sibling routes are literal path prefixes of each other now that
// invoices/purchases each have both a list and a "new" page (e.g.
// "/dashboard/invoices" is a prefix of "/dashboard/invoices/new"). A naive
// `pathname.startsWith(item.href)` check would highlight both at once, so
// instead every href in the tree competes and the longest (most specific)
// match wins — exactly one leaf is "the" active item for any given path.
export function getActiveHref(pathname: string, items: NavItem[]): string | null {
  const allHrefs: string[] = [];
  function collect(list: NavItem[]) {
    for (const item of list) {
      allHrefs.push(item.href);
      if (item.children) collect(item.children);
    }
  }
  collect(items);

  let best: string | null = null;
  for (const href of allHrefs) {
    const matches = pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) {
      best = href;
    }
  }
  return best;
}
