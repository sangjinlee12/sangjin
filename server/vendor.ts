import type { Vendor, InsertVendor } from "@shared/schema";
import { storage } from "./storage";

// Vendor methods
export async function getAllVendors(): Promise<Vendor[]> {
  return await storage.getAllVendors();
}

export async function getVendorById(id: number): Promise<Vendor | undefined> {
  return await storage.getVendorById(id);
}

export async function getVendorByName(name: string): Promise<Vendor | undefined> {
  return await storage.getVendorByName(name);
}

export async function createVendor(insertVendor: InsertVendor): Promise<Vendor> {
  return await storage.createVendor(insertVendor);
}

export async function updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined> {
  return await storage.updateVendor(id, data);
}

export async function deleteVendor(id: number): Promise<boolean> {
  return await storage.deleteVendor(id);
}