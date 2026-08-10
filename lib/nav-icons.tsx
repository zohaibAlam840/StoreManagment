import {
  Home,
  Receipt,
  Users,
  Package,
  Boxes,
  Truck,
  Wallet,
  BarChart3,
  CheckSquare,
  UserCog,
  History,
  DatabaseBackup,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

// Icon *components* can't be passed as props from a Server Component to a
// Client Component (they're functions, not serializable RSC data) — so
// lib/nav.ts stores a string key instead, and both the server-rendered
// sidebar and the client-rendered MobileBottomNav import this map directly
// and do their own lookup.
export const navIcons = {
  home: Home,
  receipt: Receipt,
  users: Users,
  package: Package,
  boxes: Boxes,
  truck: Truck,
  wallet: Wallet,
  barChart: BarChart3,
  checkSquare: CheckSquare,
  userCog: UserCog,
  history: History,
  databaseBackup: DatabaseBackup,
  rotateCcw: RotateCcw,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof navIcons;
