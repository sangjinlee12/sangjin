import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { generatePurchaseOrderPDF } from "./services/pdf";
import { sendPurchaseOrderEmail } from "./services/email";
import { 
  insertCategorySchema, 
  insertInventoryItemSchema, 
  insertTransactionSchema,
  insertPurchaseOrderSchema,
  insertPurchaseOrderItemSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import * as fs from 'fs';
import * as path from 'path';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Categories API
  app.get("/api/categories", async (_req: Request, res: Response) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const validatedData = insertCategorySchema.partial().parse(req.body);
      const updatedCategory = await storage.updateCategory(id, validatedData);

      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const deleted = await storage.deleteCategory(id);
      if (!deleted) {
        return res.status(400).json({ message: "Category is in use or not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Inventory Items API
  app.get("/api/items", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getAllInventoryItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.get("/api/items/low-stock", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.get("/api/items/category/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const items = await storage.getInventoryItemsByCategory(categoryId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items by category" });
    }
  });

  app.get("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      const item = await storage.getInventoryItemById(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  app.post("/api/items", async (req: Request, res: Response) => {
    try {
      // unitPrice가 숫자 형태가 아니라면 삭제하여 스키마에서 처리하도록 함
      const data = { ...req.body };
      if (data.unitPrice !== undefined && typeof data.unitPrice !== 'number') {
        delete data.unitPrice;
      }
      
      const validatedData = insertInventoryItemSchema.parse(data);
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Item creation error:", error);
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.put("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      // unitPrice가 숫자 형태가 아니라면 삭제하여 스키마에서 처리하도록 함
      const data = { ...req.body };
      if (data.unitPrice !== undefined && typeof data.unitPrice !== 'number') {
        delete data.unitPrice;
      }

      const validatedData = insertInventoryItemSchema.partial().parse(data);
      const updatedItem = await storage.updateInventoryItem(id, validatedData);

      if (!updatedItem) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Item update error:", error);
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      const deleted = await storage.deleteInventoryItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Transactions API
  app.get("/api/transactions", async (_req: Request, res: Response) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/item/:itemId", async (req: Request, res: Response) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }

      const transactions = await storage.getTransactionsByItemId(itemId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch item transactions" });
    }
  });

  app.post("/api/transactions", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Dashboard API
  app.get("/api/dashboard", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Excel Import API
  app.post("/api/excel/import", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Excel file contains no data" });
      }

      const imported = {
        total: data.length,
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process each row
      for (const row of data) {
        try {
          // Validate required fields
          const requiredFields = ["name", "categoryId", "currentQuantity", "minimumQuantity"];
          const missingFields = requiredFields.filter(field => !(field in row));
          
          if (missingFields.length > 0) {
            imported.failed++;
            imported.errors.push(`Row missing required fields: ${missingFields.join(", ")}`);
            continue;
          }

          // Try to create the item
          const itemData = {
            name: String(row.name),
            categoryId: Number(row.categoryId),
            specification: row.specification ? String(row.specification) : undefined,
            currentQuantity: Number(row.currentQuantity),
            minimumQuantity: Number(row.minimumQuantity),
            location: row.location ? String(row.location) : undefined,
            unitPrice: row.unitPrice !== undefined ? row.unitPrice : undefined, // 타입 변환 없이 그대로 전달
            notes: row.notes ? String(row.notes) : undefined
          };

          await storage.createInventoryItem(itemData);
          imported.success++;
        } catch (error) {
          imported.failed++;
          imported.errors.push(`Error importing row: ${(error as Error).message}`);
        }
      }

      res.status(200).json({
        message: `Import completed: ${imported.success} items imported successfully, ${imported.failed} items failed`,
        details: imported
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to import Excel file" });
    }
  });

  // 발주서 API
  // 모든 발주서 가져오기
  app.get("/api/purchase-orders", async (_req: Request, res: Response) => {
    try {
      const orders = await storage.getAllPurchaseOrders();
      res.json(orders);
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
      res.status(500).json({ message: "발주서 목록을 불러오는데 실패했습니다." });
    }
  });

  // 특정 발주서 조회
  app.get("/api/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 발주서 ID입니다." });
      }

      const order = await storage.getPurchaseOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "발주서를 찾을 수 없습니다." });
      }

      const items = await storage.getPurchaseOrderItems(id);
      res.json({ order, items });
    } catch (error) {
      console.error("Failed to fetch purchase order:", error);
      res.status(500).json({ message: "발주서를 불러오는데 실패했습니다." });
    }
  });

  // 새 발주서 생성
  app.post("/api/purchase-orders", async (req: Request, res: Response) => {
    try {
      // 발주서 데이터 검증
      const orderData = insertPurchaseOrderSchema.parse(req.body.order);
      const orderItems = req.body.items || [];
      
      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return res.status(400).json({ message: "발주 항목이 없습니다." });
      }

      // 발주서 생성
      const newOrder = await storage.createPurchaseOrder(orderData);
      
      // 발주 항목 생성
      const createdItems = [];
      for (const item of orderItems) {
        const itemData = {
          ...item,
          purchaseOrderId: newOrder.id,
          // amount는 자동 계산되므로 생략
        };
        
        // 단가와 수량으로 금액 계산
        if (itemData.unitPrice && itemData.quantity) {
          const unitPrice = typeof itemData.unitPrice === 'string' 
            ? parseFloat(itemData.unitPrice) 
            : itemData.unitPrice;
            
          itemData.amount = unitPrice * itemData.quantity;
        }
        
        const validatedItemData = insertPurchaseOrderItemSchema.parse(itemData);
        const newItem = await storage.createPurchaseOrderItem(validatedItemData);
        createdItems.push(newItem);
      }
      
      res.status(201).json({ 
        order: newOrder, 
        items: createdItems,
        message: "발주서가 성공적으로, 생성되었습니다." 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Failed to create purchase order:", error);
      res.status(500).json({ message: "발주서를 생성하는데 실패했습니다." });
    }
  });

  // 발주서 수정
  app.put("/api/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 발주서 ID입니다." });
      }

      const order = await storage.getPurchaseOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "발주서를 찾을 수 없습니다." });
      }

      // 발주서 데이터 검증
      const orderData = insertPurchaseOrderSchema.partial().parse(req.body.order);
      
      // 발주서 업데이트
      const updatedOrder = await storage.updatePurchaseOrder(id, orderData);
      
      // 발주 항목 업데이트 (선택적)
      if (req.body.items && Array.isArray(req.body.items)) {
        // 기존 항목 정보 가져오기
        const existingItems = await storage.getPurchaseOrderItems(id);
        const existingItemMap = new Map(existingItems.map(item => [item.id, item]));
        
        // 업데이트된 항목 정보
        const updatedItems = [];
        
        // 제출된 각 항목 처리
        for (const item of req.body.items) {
          if (item.id && existingItemMap.has(item.id)) {
            // 기존 항목 업데이트
            const itemData = {
              ...item,
              purchaseOrderId: id,
            };
            
            // 단가와 수량으로 금액 계산
            if (itemData.unitPrice && itemData.quantity) {
              const unitPrice = typeof itemData.unitPrice === 'string' 
                ? parseFloat(itemData.unitPrice) 
                : itemData.unitPrice;
                
              itemData.amount = unitPrice * itemData.quantity;
            }
            
            const validatedItemData = insertPurchaseOrderItemSchema.partial().parse(itemData);
            const updatedItem = await storage.updatePurchaseOrderItem(item.id, validatedItemData);
            if (updatedItem) updatedItems.push(updatedItem);
            
            // 처리된 항목 제거
            existingItemMap.delete(item.id);
          } else {
            // 새 항목 추가
            const itemData = {
              ...item,
              purchaseOrderId: id,
            };
            
            // 단가와 수량으로 금액 계산
            if (itemData.unitPrice && itemData.quantity) {
              const unitPrice = typeof itemData.unitPrice === 'string' 
                ? parseFloat(itemData.unitPrice) 
                : itemData.unitPrice;
                
              itemData.amount = unitPrice * itemData.quantity;
            }
            
            const validatedItemData = insertPurchaseOrderItemSchema.parse(itemData);
            const newItem = await storage.createPurchaseOrderItem(validatedItemData);
            updatedItems.push(newItem);
          }
        }
        
        // 남아있는 항목은 삭제 (프론트엔드에서 삭제된 항목)
        for (const itemId of existingItemMap.keys()) {
          await storage.deletePurchaseOrderItem(itemId);
        }
        
        res.json({
          order: updatedOrder,
          items: updatedItems,
          message: "발주서가 성공적으로 업데이트되었습니다."
        });
      } else {
        res.json({
          order: updatedOrder,
          message: "발주서가 성공적으로 업데이트되었습니다."
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Failed to update purchase order:", error);
      res.status(500).json({ message: "발주서를 업데이트하는데 실패했습니다." });
    }
  });

  // 발주서 삭제
  app.delete("/api/purchase-orders/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 발주서 ID입니다." });
      }

      // 먼저 해당 발주서의 모든 항목 삭제
      const items = await storage.getPurchaseOrderItems(id);
      for (const item of items) {
        await storage.deletePurchaseOrderItem(item.id);
      }

      // 발주서 삭제
      const deleted = await storage.deletePurchaseOrder(id);
      if (!deleted) {
        return res.status(404).json({ message: "발주서를 찾을 수 없습니다." });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete purchase order:", error);
      res.status(500).json({ message: "발주서를 삭제하는데 실패했습니다." });
    }
  });

  // 발주서 PDF 생성
  app.get("/api/purchase-orders/:id/pdf", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 발주서 ID입니다." });
      }

      const order = await storage.getPurchaseOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "발주서를 찾을 수 없습니다." });
      }

      const items = await storage.getPurchaseOrderItems(id);
      
      // PDF 생성
      const pdfPath = await generatePurchaseOrderPDF(order, items);
      
      // PDF 파일 경로 저장
      await storage.updatePurchaseOrder(id, { pdfPath });
      
      // 파일이 있는지 확인
      if (!fs.existsSync(pdfPath)) {
        return res.status(500).json({ message: "PDF 파일을 생성하는데 실패했습니다." });
      }
      
      // 파일명 생성
      const fileName = path.basename(pdfPath);
      
      // 파일 전송
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      res.status(500).json({ message: "PDF를 생성하는데 실패했습니다." });
    }
  });

  // 발주서 이메일 발송
  app.post("/api/purchase-orders/:id/email", async (req: Request, res: Response) => {
    try {
      // 발주서 확인
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "유효하지 않은 발주서 ID입니다." });
      }

      const order = await storage.getPurchaseOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "발주서를 찾을 수 없습니다." });
      }

      // 이메일 주소 확인
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "이메일 주소가 필요합니다." });
      }

      // PDF 경로 확인
      if (!order.pdfPath || !fs.existsSync(order.pdfPath)) {
        // PDF가 없으면 먼저 생성
        const items = await storage.getPurchaseOrderItems(id);
        const pdfPath = await generatePurchaseOrderPDF(order, items);
        await storage.updatePurchaseOrder(id, { pdfPath });
      }

      // 이메일 전송
      const emailSent = await sendPurchaseOrderEmail({
        to: email,
        projectName: order.projectName,
        pdfPath: order.pdfPath as string,
        orderNumber: order.orderNumber
      });

      if (!emailSent) {
        return res.status(500).json({ message: "이메일 전송에 실패했습니다." });
      }

      // 이메일 전송 기록 업데이트
      await storage.updatePurchaseOrder(id, { 
        emailSent: true, 
        emailSentAt: new Date(),
        vendorEmail: email 
      });

      res.json({ message: "이메일이 성공적으로 전송되었습니다." });
    } catch (error) {
      console.error("Failed to send email:", error);
      res.status(500).json({ message: "이메일 전송에 실패했습니다." });
    }
  });

  // Excel Export API
  app.get("/api/excel/export", async (_req: Request, res: Response) => {
    try {
      const items = await storage.getAllInventoryItems();
      const categories = await storage.getAllCategories();
      
      // Create a category lookup map
      const categoryMap = new Map();
      categories.forEach(category => {
        categoryMap.set(category.id, category.name);
      });
      
      // Transform data for export
      const exportData = items.map(item => ({
        'Code': item.code,
        'Name': item.name,
        'Category': categoryMap.get(item.categoryId) || 'Unknown',
        'Specification': item.specification || '',
        'Current Quantity': item.currentQuantity,
        'Minimum Quantity': item.minimumQuantity,
        'Location': item.location || '',
        'Unit Price': item.unitPrice || '',
        'Notes': item.notes || '',
        'Created At': item.createdAt.toISOString().split('T')[0],
        'Updated At': item.updatedAt.toISOString().split('T')[0]
      }));
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // Set response headers for file download
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send the file
      res.send(Buffer.from(excelBuffer));
    } catch (error) {
      res.status(500).json({ message: "Failed to export inventory to Excel" });
    }
  });

  // Template Excel Export API
  app.get("/api/excel/template", async (_req: Request, res: Response) => {
    try {
      const categories = await storage.getAllCategories();
      
      // Create a template with sample data
      const templateData = [
        {
          'name': '자재명',
          'categoryId': 'Categories: ' + categories.map(c => `${c.id}=${c.name}`).join(', '),
          'specification': '상세 규격',
          'currentQuantity': '초기 수량',
          'minimumQuantity': '최소 수량',
          'location': '위치',
          'unitPrice': '단가',
          'notes': '비고'
        },
        {
          'name': 'UTP 케이블 Cat.6',
          'categoryId': 1,
          'specification': '길이: 100m, 색상: 회색',
          'currentQuantity': 20,
          'minimumQuantity': 10,
          'location': 'A-15-3',
          'unitPrice': 45000,
          'notes': '최소 주문 수량: 10개'
        }
      ];
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // Set response headers for file download
      res.setHeader('Content-Disposition', 'attachment; filename=inventory_template.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send the file
      res.send(Buffer.from(excelBuffer));
    } catch (error) {
      res.status(500).json({ message: "Failed to generate template" });
    }
  });

  return httpServer;
}
