import { pgTable, text, serial, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
});

// Category schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color").default("#0062FF"),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  description: true,
  color: true,
});

// Inventory item schema
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  specification: text("specification"),
  unitType: text("unit_type"), // 자재 형식: M, EA, 식, 조 등
  currentQuantity: integer("current_quantity").notNull().default(0),
  minimumQuantity: integer("minimum_quantity").notNull().default(0),
  location: text("location"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 기본 스키마 생성 후 unitPrice 필드에 대한 명시적 타입 처리
const baseSchema = createInsertSchema(inventoryItems)
  .omit({ id: true, code: true, createdAt: true, updatedAt: true });

// unitPrice 필드가 문자열이나 숫자 모두 허용하도록 수정된 스키마
export const insertInventoryItemSchema = baseSchema.extend({
  unitPrice: z.union([z.number(), z.string(), z.null()]).optional()
});

// Transaction schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  type: text("type").notNull(), // "in" or "out"
  quantity: integer("quantity").notNull(),
  project: text("project"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true, createdAt: true });

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Category type with color mapping
export const categoryColorMap: Record<string, string> = {
  "케이블 종류": "blue",
  "등기구 종류": "green",
  "통신자재 종류": "purple",
  "공구 종류": "orange"
};

// Define the transaction type enum
export const TransactionType = {
  IN: "in",
  OUT: "out",
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

// 자재 단위 타입 정의
export const UnitType = {
  M: "M",      // 미터
  EA: "EA",    // 개수(Each)
  SET: "식",    // 한 세트
  GROUP: "조", // 한 그룹
} as const;

export type UnitType = typeof UnitType[keyof typeof UnitType];
