import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { insertVendorSchema, COMPANY_INFO } from "@shared/schema";
import { z } from "zod";

export function registerVendorRoutes(app: Express) {
  // 거래업체 API
  app.get("/api/vendors", async (_req: Request, res: Response) => {
    try {
      const vendors = await storage.getAllVendors();
      res.json(vendors);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      res.status(500).json({ message: "거래업체 목록을 불러오는데 실패했습니다." });
    }
  });

  app.get("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 거래업체 ID입니다." });
      }

      const vendor = await storage.getVendorById(id);
      if (!vendor) {
        return res.status(404).json({ message: "거래업체를 찾을 수 없습니다." });
      }

      res.json(vendor);
    } catch (error) {
      console.error("Failed to fetch vendor:", error);
      res.status(500).json({ message: "거래업체 정보를 불러오는데 실패했습니다." });
    }
  });

  app.post("/api/vendors", async (req: Request, res: Response) => {
    try {
      const vendorData = insertVendorSchema.parse(req.body);
      const existingVendor = await storage.getVendorByName(vendorData.name);
      
      if (existingVendor) {
        return res.status(400).json({ message: "이미 존재하는 거래업체 이름입니다." });
      }
      
      const newVendor = await storage.createVendor(vendorData);
      res.status(201).json(newVendor);
    } catch (error) {
      console.error("Failed to create vendor:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "유효하지 않은 거래업체 데이터입니다.", errors: error.errors });
      }
      res.status(500).json({ message: "거래업체 생성에 실패했습니다." });
    }
  });

  app.put("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 거래업체 ID입니다." });
      }
      
      const vendorData = insertVendorSchema.partial().parse(req.body);
      
      // 이름이 변경된 경우 중복 체크
      if (vendorData.name) {
        const existingVendor = await storage.getVendorByName(vendorData.name);
        if (existingVendor && existingVendor.id !== id) {
          return res.status(400).json({ message: "이미 존재하는 거래업체 이름입니다." });
        }
      }
      
      const updatedVendor = await storage.updateVendor(id, vendorData);
      if (!updatedVendor) {
        return res.status(404).json({ message: "거래업체를 찾을 수 없습니다." });
      }
      
      res.json(updatedVendor);
    } catch (error) {
      console.error("Failed to update vendor:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "유효하지 않은 거래업체 데이터입니다.", errors: error.errors });
      }
      res.status(500).json({ message: "거래업체 수정에 실패했습니다." });
    }
  });

  app.delete("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 거래업체 ID입니다." });
      }
      
      const success = await storage.deleteVendor(id);
      if (!success) {
        return res.status(404).json({ message: "거래업체를 찾을 수 없습니다." });
      }
      
      res.status(200).json({ message: "거래업체가 성공적으로 삭제되었습니다." });
    } catch (error) {
      console.error("Failed to delete vendor:", error);
      res.status(500).json({ message: "거래업체 삭제에 실패했습니다." });
    }
  });
  
  // 회사 정보 API
  app.get("/api/company", async (_req: Request, res: Response) => {
    try {
      res.json(COMPANY_INFO);
    } catch (error) {
      console.error("Failed to fetch company info:", error);
      res.status(500).json({ message: "회사 정보를 불러오는데 실패했습니다." });
    }
  });
}