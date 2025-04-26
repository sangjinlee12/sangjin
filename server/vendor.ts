import { db } from "./db";
import { vendors } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Vendor, InsertVendor } from "@shared/schema";

// Vendor methods
export async function getAllVendors(): Promise<Vendor[]> {
  return await db.select().from(vendors);
}

export async function getVendorById(id: number): Promise<Vendor | undefined> {
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
  return vendor || undefined;
}

export async function getVendorByName(name: string): Promise<Vendor | undefined> {
  const [vendor] = await db.select().from(vendors).where(eq(vendors.name, name));
  return vendor || undefined;
}

export async function createVendor(insertVendor: InsertVendor): Promise<Vendor> {
  const now = new Date();
  const [vendor] = await db
    .insert(vendors)
    .values({
      ...insertVendor,
      createdAt: now,
      updatedAt: now
    })
    .returning();
  return vendor;
}

export async function updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined> {
  const [vendor] = await db
    .update(vendors)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(vendors.id, id))
    .returning();
  return vendor || undefined;
}

export async function deleteVendor(id: number): Promise<boolean> {
  const result = await db
    .delete(vendors)
    .where(eq(vendors.id, id));
  return result.rowCount > 0;
}