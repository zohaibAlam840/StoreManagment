import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const roles = ["admin", "salesman"] as const;
export type Role = (typeof roles)[number];

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<Role>().notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const approvalStatuses = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof approvalStatuses)[number];

// Generic gate backing every "admin approval required" action (below-cost sale,
// invoice edit/delete, cost edit, stock adjustment, customer rate reduction, ...).
// `payload` holds whatever the pending action needs to complete once approved.
export const approvalRequests = sqliteTable("approval_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  reason: text("reason"),
  requestedBy: integer("requested_by")
    .notNull()
    .references(() => users.id),
  status: text("status").$type<ApprovalStatus>().notNull().default("pending"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category"),
  packingUnit: text("packing_unit"),
  company: text("company"),
  imageUrl: text("image_url"),
  unit: text("unit").notNull().default("pcs"),
  costPrice: real("cost_price").notNull().default(0),
  minSellingPrice: real("min_selling_price").notNull().default(0),
  minStock: real("min_stock").notNull().default(0),
  maxStock: real("max_stock"),
  reorderLevel: real("reorder_level").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  openingBalance: real("opening_balance").notNull().default(0),
  creditLimit: real("credit_limit"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Drives customer-wise rate suggestion during invoicing (requirement #3) and
// the "changing/reducing customer rates" approval gate (requirement #10).
export const customerRates = sqliteTable(
  "customer_rates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    rate: real("rate").notNull(),
    updatedBy: integer("updated_by").references(() => users.id),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("customer_rates_customer_product_idx").on(table.customerId, table.productId)]
);

// "credit" only makes sense as an invoice's overall classification (nothing
// collected yet); the rest are actual tender rails a receipt can be
// collected through.
export const paymentModes = ["cash", "card", "easypaisa", "jazzcash", "bank_transfer", "credit", "adjustment"] as const;
export type PaymentMode = (typeof paymentModes)[number];

export const tenderModes = ["cash", "card", "easypaisa", "jazzcash", "bank_transfer", "adjustment"] as const;
export type TenderMode = (typeof tenderModes)[number];

export const paymentModeLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  card: "Card",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  bank_transfer: "Bank transfer",
  credit: "Credit",
  adjustment: "Adjustment",
};

export const invoiceStatuses = ["draft", "posted", "void"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Nullable: a draft doesn't consume a sequential invoice number until it's
  // finalized, so discarded drafts never leave gaps in the printed sequence.
  number: integer("number").unique(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  paymentMode: text("payment_mode").$type<PaymentMode>().notNull().default("cash"),
  discountAmount: real("discount_amount").notNull().default(0),
  subtotal: real("subtotal").notNull(),
  total: real("total").notNull(),
  status: text("status").$type<InvoiceStatus>().notNull().default("posted"),
  // Holds the in-progress line items while status is "draft" (a draft may
  // have incomplete/changing lines that shouldn't touch invoice_lines or
  // stock until finalized). Unused once posted.
  draftPayload: text("draft_payload", { mode: "json" }),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// costAtSale is captured at sale time so historical gross-profit reports
// never shift retroactively when a product's cost price changes later.
export const invoiceLines = sqliteTable("invoice_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: real("qty").notNull(),
  rate: real("rate").notNull(),
  costAtSale: real("cost_at_sale").notNull(),
});

// A return references the original invoice for traceability, but stands as
// its own document (own number, own lines) rather than mutating the
// original invoice, so the original sale's history stays intact.
export const salesReturns = sqliteTable("sales_returns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: integer("number").notNull().unique(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  reason: text("reason"),
  subtotal: real("subtotal").notNull(),
  total: real("total").notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const salesReturnLines = sqliteTable("sales_return_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  salesReturnId: integer("sales_return_id")
    .notNull()
    .references(() => salesReturns.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: real("qty").notNull(),
  rate: real("rate").notNull(),
  costAtSale: real("cost_at_sale").notNull(),
});

export const stockMovementTypes = ["purchase", "sale", "adjustment", "damage", "return"] as const;
export type StockMovementType = (typeof stockMovementTypes)[number];

// Single append-only source of truth for perpetual inventory. Stock-on-hand
// for a product is always SUM(qty) over this table, never a mutable counter,
// so it can never drift from the sale/purchase/adjustment history.
export const stockLedger = sqliteTable("stock_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  type: text("type").$type<StockMovementType>().notNull(),
  qty: real("qty").notNull(),
  refType: text("ref_type").notNull(),
  refId: integer("ref_id"),
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  // Set when this receipt was collected at the point of sale (requirement
  // #10's Payment/Receipt section on the invoice itself); null for payments
  // recorded later against the customer's running balance in general.
  invoiceId: integer("invoice_id").references(() => invoices.id),
  amount: real("amount").notNull(),
  mode: text("mode").$type<PaymentMode>().notNull().default("cash"),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  openingBalance: real("opening_balance").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const purchaseOrderStatuses = ["pending", "received", "cancelled"] as const;
export type PurchaseOrderStatus = (typeof purchaseOrderStatuses)[number];

export const purchaseOrders = sqliteTable("purchase_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: integer("number").notNull().unique(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  status: text("status").$type<PurchaseOrderStatus>().notNull().default("pending"),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const purchaseOrderLines = sqliteTable("purchase_order_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseOrderId: integer("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: real("qty").notNull(),
  expectedCost: real("expected_cost").notNull(),
});

// Freight/loading/other are captured at the purchase level (not allocated
// per unit) and feed the Net Profit report (Gross Profit minus period
// expenses) in Phase 7, rather than being baked into each product's cost.
export const purchases = sqliteTable("purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: integer("number").notNull().unique(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  subtotal: real("subtotal").notNull(),
  freight: real("freight").notNull().default(0),
  loadingUnloading: real("loading_unloading").notNull().default(0),
  otherExpenses: real("other_expenses").notNull().default(0),
  total: real("total").notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const purchaseLines = sqliteTable("purchase_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  qty: real("qty").notNull(),
  cost: real("cost").notNull(),
});

export const supplierPayments = sqliteTable("supplier_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  amount: real("amount").notNull(),
  mode: text("mode").$type<PaymentMode>().notNull().default("cash"),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Every tender rail a receipt can be collected through, so the cash/bank
// book can show (and be filtered to) any of them — not just "cash".
export const cashModes = tenderModes;
export type CashMode = TenderMode;

export const cashTransactionDirections = ["in", "out"] as const;
export type CashTransactionDirection = (typeof cashTransactionDirections)[number];

// Ad-hoc cash/bank movements not already captured by invoices, customer
// payments, or supplier payments (rent, utilities, owner withdrawals, etc.),
// so the cash book and bank book reports can be a complete picture rather
// than only covering sales/purchases.
export const cashTransactions = sqliteTable("cash_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  direction: text("direction").$type<CashTransactionDirection>().notNull(),
  mode: text("mode").$type<CashMode>().notNull().default("cash"),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  note: text("note"),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Daily cash-drawer reconciliation: system-computed expected cash vs. what
// was actually counted, with the difference recorded rather than silently
// adjusted.
export const cashClosings = sqliteTable("cash_closings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  expectedCash: real("expected_cash").notNull(),
  countedCash: real("counted_cash").notNull(),
  variance: real("variance").notNull(),
  note: text("note"),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Single append-only trail written by every mutating action via lib/audit.ts,
// so coverage is guaranteed rather than left to be added ad hoc per feature.
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: integer("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  before: text("before", { mode: "json" }),
  after: text("after", { mode: "json" }),
  at: integer("at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
