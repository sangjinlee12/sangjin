import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { insertCategorySchema, insertInventoryItemSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

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
