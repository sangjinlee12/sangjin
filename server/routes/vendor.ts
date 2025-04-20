import { Request, Response } from "express";
import { Express } from "express";
import { storage } from "../storage";
import { insertVendorSchema } from "@shared/schema";
import { z } from "zod";

export function registerVendorRoutes(app: Express) {
  // GET /api/vendors - 모든 거래업체 조회
  app.get("/api/vendors", async (_req: Request, res: Response) => {
    try {
      const vendors = await storage.getAllVendors();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "거래업체 목록을 가져오는데 실패했습니다." });
    }
  });

  // GET /api/vendors/:id - 특정 거래업체 조회
  app.get("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "유효하지 않은 거래업체 ID입니다." });
      }

      const vendor = await storage.getVendorById(id);
      if (!vendor) {
        return res.status(404).json({ error: "거래업체를 찾을 수 없습니다." });
      }

      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ error: "거래업체 정보를 가져오는데 실패했습니다." });
    }
  });

  // POST /api/vendors - 새 거래업체 생성
  app.post("/api/vendors", async (req: Request, res: Response) => {
    try {
      const validatedData = insertVendorSchema.parse(req.body);
      
      // 동일한 이름의 거래업체가 이미 있는지 확인
      const existingVendor = await storage.getVendorByName(validatedData.name);
      if (existingVendor) {
        return res.status(400).json({ error: "이미 동일한 이름의 거래업체가 존재합니다." });
      }
      
      const vendor = await storage.createVendor(validatedData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "잘못된 거래업체 데이터입니다.", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "거래업체 생성에 실패했습니다." });
    }
  });

  // PUT /api/vendors/:id - 거래업체 정보 수정
  app.put("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "유효하지 않은 거래업체 ID입니다." });
      }

      // 기존 거래업체가 존재하는지 확인
      const existingVendor = await storage.getVendorById(id);
      if (!existingVendor) {
        return res.status(404).json({ error: "거래업체를 찾을 수 없습니다." });
      }

      // 이름 변경 시 중복 이름 확인
      if (req.body.name && req.body.name !== existingVendor.name) {
        const nameExistsVendor = await storage.getVendorByName(req.body.name);
        if (nameExistsVendor && nameExistsVendor.id !== id) {
          return res.status(400).json({ error: "이미 동일한 이름의 거래업체가 존재합니다." });
        }
      }

      // 업데이트 데이터 검증
      const validatedData = insertVendorSchema.partial().parse(req.body);
      
      const updatedVendor = await storage.updateVendor(id, validatedData);
      res.json(updatedVendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "잘못된 거래업체 데이터입니다.", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "거래업체 정보 수정에 실패했습니다." });
    }
  });

  // DELETE /api/vendors/:id - 거래업체 삭제
  app.delete("/api/vendors/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "유효하지 않은 거래업체 ID입니다." });
      }

      // 기존 거래업체가 존재하는지 확인
      const existingVendor = await storage.getVendorById(id);
      if (!existingVendor) {
        return res.status(404).json({ error: "거래업체를 찾을 수 없습니다." });
      }
      
      // TODO: 거래업체가 발주서에서 사용되고 있는지 확인하는 로직 추가 필요

      const deleted = await storage.deleteVendor(id);
      if (!deleted) {
        return res.status(400).json({ error: "거래업체 삭제에 실패했습니다." });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ error: "거래업체 삭제에 실패했습니다." });
    }
  });

  // GET /api/company - 회사 정보 조회 (고정된 정보)
  app.get("/api/company", async (_req: Request, res: Response) => {
    try {
      // shared/schema.ts에 정의된 COMPANY_INFO 사용
      const { COMPANY_INFO } = await import("@shared/schema");
      res.json(COMPANY_INFO);
    } catch (error) {
      console.error("Error fetching company info:", error);
      res.status(500).json({ error: "회사 정보를 가져오는데 실패했습니다." });
    }
  });
}