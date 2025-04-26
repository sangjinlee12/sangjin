import { db } from "./db";
import { vendors } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Vendor, InsertVendor } from "@shared/schema";

// Vendor methods - 직접 데이터베이스 쿼리 사용
export async function getAllVendors(): Promise<Vendor[]> {
  try {
    return await db.select().from(vendors);
  } catch (error) {
    console.error("getAllVendors 오류:", error);
    throw new Error("거래업체 목록을 가져오는데 실패했습니다.");
  }
}

export async function getVendorById(id: number): Promise<Vendor | undefined> {
  try {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  } catch (error) {
    console.error(`getVendorById(${id}) 오류:`, error);
    throw new Error("거래업체 정보를 가져오는데 실패했습니다.");
  }
}

export async function getVendorByName(name: string): Promise<Vendor | undefined> {
  try {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.name, name));
    return vendor || undefined;
  } catch (error) {
    console.error(`getVendorByName(${name}) 오류:`, error);
    throw new Error("거래업체 정보를 가져오는데 실패했습니다.");
  }
}

export async function createVendor(insertVendor: InsertVendor): Promise<Vendor> {
  try {
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
  } catch (error) {
    console.error("createVendor 오류:", error);
    throw new Error("거래업체 생성에 실패했습니다.");
  }
}

export async function updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined> {
  try {
    const [vendor] = await db
      .update(vendors)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(vendors.id, id))
      .returning();
    return vendor || undefined;
  } catch (error) {
    console.error(`updateVendor(${id}) 오류:`, error);
    throw new Error("거래업체 정보 업데이트에 실패했습니다.");
  }
}

export async function deleteVendor(id: number): Promise<boolean> {
  try {
    const result = await db
      .delete(vendors)
      .where(eq(vendors.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    console.error(`deleteVendor(${id}) 오류:`, error);
    throw new Error("거래업체 삭제에 실패했습니다.");
  }
}