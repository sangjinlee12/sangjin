import { 
  users, categories, inventoryItems, transactions, 
  purchaseOrders, purchaseOrderItems, vendors,
  type User, type InsertUser,
  type Category, type InsertCategory, 
  type InventoryItem, type InsertInventoryItem,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type Vendor, type InsertVendor,
  PurchaseOrderStatus,
  type Transaction, type InsertTransaction,
  TransactionType, UnitType
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Category methods
  getAllCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Inventory item methods
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemById(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemByCode(code: string): Promise<InventoryItem | undefined>;
  getInventoryItemsByCategory(categoryId: number): Promise<InventoryItem[]>;
  getLowStockItems(): Promise<InventoryItem[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;

  // Transaction methods
  getAllTransactions(): Promise<Transaction[]>;
  getTransactionsByItemId(itemId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Vendor methods
  getAllVendors(): Promise<Vendor[]>;
  getVendorById(id: number): Promise<Vendor | undefined>;
  getVendorByName(name: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;
  
  // Purchase order methods
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrderById(id: number): Promise<PurchaseOrder | undefined>;
  getPurchaseOrderByOrderNumber(orderNumber: string): Promise<PurchaseOrder | undefined>;
  getPurchaseOrdersByStatus(status: PurchaseOrderStatus): Promise<PurchaseOrder[]>;
  createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: number): Promise<boolean>;
  
  // Purchase order items methods
  getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItem(id: number, data: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem | undefined>;
  deletePurchaseOrderItem(id: number): Promise<boolean>;
  
  // Dashboard methods
  getDashboardStats(): Promise<{
    totalItems: number;
    lowStockItems: number;
    monthlyInflow: number;
    monthlyOutflow: number;
    categoryDistribution: {category: string, count: number}[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory || undefined;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    return result.length > 0;
  }

  // Inventory item methods
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems);
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item || undefined;
  }

  async getInventoryItemByCode(code: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.code, code));
    return item || undefined;
  }

  async getInventoryItemsByCategory(categoryId: number): Promise<InventoryItem[]> {
    return await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.categoryId, categoryId));
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return await db
      .select()
      .from(inventoryItems)
      .where(sql`${inventoryItems.currentQuantity} < ${inventoryItems.minimumQuantity}`);
  }

  private async generateItemCode(categoryPrefix: string): Promise<string> {
    // 현재 연도
    const currentYear = new Date().getFullYear();
    
    // 현재 카테고리의 최신 코드 찾기
    const query = sql`
      SELECT code FROM ${inventoryItems}
      WHERE code LIKE ${categoryPrefix + '-' + currentYear + '-%'}
      ORDER BY code DESC
      LIMIT 1
    `;
    
    const result = await db.execute(query);
    const rows = result.rows;
    
    let nextNumber = 1;
    if (rows.length > 0) {
      const lastCode = rows[0].code as string;
      const lastNumber = parseInt(lastCode.split('-')[2]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    // 상품 코드 형식: C-2023-0001 (카테고리 첫 글자-연도-일련번호)
    return `${categoryPrefix}-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  }

  async createInventoryItem(insertItem: InsertInventoryItem): Promise<InventoryItem> {
    // 카테고리 정보 가져오기
    const category = await this.getCategoryById(insertItem.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    
    // 카테고리 이름의 첫 글자를 가져와 코드 접두사로 사용
    const categoryPrefix = category.name.charAt(0).toUpperCase();
    
    // 자재 코드 생성
    const code = await this.generateItemCode(categoryPrefix);
    
    // 현재 날짜
    const now = new Date();
    
    // 모든 필수 필드가 있고 null이 필요한 곳에 명시적으로 null 설정
    const itemToInsert = {
      name: insertItem.name,
      categoryId: insertItem.categoryId,
      code: code,
      specification: insertItem.specification || null,
      unitType: insertItem.unitType || null,
      currentQuantity: insertItem.currentQuantity || 0,
      minimumQuantity: insertItem.minimumQuantity || 0,
      location: insertItem.location || null,
      unitPrice: insertItem.unitPrice ? String(insertItem.unitPrice) : null, // 숫자를 문자열로 변환
      notes: insertItem.notes || null,
      createdAt: now,
      updatedAt: now
    };
    
    // Drizzle ORM을 사용해 데이터베이스에 삽입
    const [item] = await db
      .insert(inventoryItems)
      .values(itemToInsert)
      .returning();
    
    // 초기 재고 트랜잭션 생성 (초기 수량이 0보다 크면)
    const initialQuantity = insertItem.currentQuantity || 0;
    if (initialQuantity > 0) {
      await this.createTransaction({
        itemId: item.id,
        type: "in",
        quantity: initialQuantity,
        project: "초기 등록",
        note: "자재 최초 등록"
      });
    }
    
    return item;
  }

  async updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    // 업데이트할 때 updatedAt 필드를 현재 시간으로 설정
    const now = new Date();
    
    // 타입 호환성을 위해 데이터 변환
    const updateData: any = {
      updatedAt: now
    };
    
    // 각 필드에 대해 타입 호환성 확보
    if (data.name !== undefined) updateData.name = data.name;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.specification !== undefined) updateData.specification = data.specification || null;
    if (data.unitType !== undefined) updateData.unitType = data.unitType || null;
    if (data.currentQuantity !== undefined) updateData.currentQuantity = data.currentQuantity;
    if (data.minimumQuantity !== undefined) updateData.minimumQuantity = data.minimumQuantity;
    if (data.location !== undefined) updateData.location = data.location || null;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice ? String(data.unitPrice) : null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    
    const [updatedItem] = await db
      .update(inventoryItems)
      .set(updateData)
      .where(eq(inventoryItems.id, id))
      .returning();
    
    return updatedItem || undefined;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db
      .delete(inventoryItems)
      .where(eq(inventoryItems.id, id))
      .returning({ id: inventoryItems.id });
    
    return result.length > 0;
  }

  // Transaction methods
  async getAllTransactions(): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByItemId(itemId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.itemId, itemId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    // 트랜잭션 생성 - null 처리를 명시적으로 해줌
    const transactionToInsert = {
      itemId: insertTransaction.itemId,
      type: insertTransaction.type,
      quantity: insertTransaction.quantity,
      project: insertTransaction.project || null,
      note: insertTransaction.note || null
    };
    
    // 트랜잭션 생성
    const [transaction] = await db
      .insert(transactions)
      .values(transactionToInsert)
      .returning();
    
    // 재고 아이템 가져오기
    const item = await this.getInventoryItemById(insertTransaction.itemId);
    if (!item) {
      throw new Error("Item not found");
    }
    
    // 재고 수량 업데이트
    const newQuantity = insertTransaction.type === "in"
      ? item.currentQuantity + insertTransaction.quantity
      : item.currentQuantity - insertTransaction.quantity;
    
    // 재고 아이템 업데이트
    await this.updateInventoryItem(item.id, { currentQuantity: newQuantity });
    
    return transaction;
  }

  // Vendor methods
  async getAllVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVendorById(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async getVendorByName(name: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.name, name));
    return vendor || undefined;
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
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

  async updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined> {
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

  async deleteVendor(id: number): Promise<boolean> {
    const result = await db
      .delete(vendors)
      .where(eq(vendors.id, id));
    return result.rowCount > 0;
  }

  // Purchase Order methods
  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrderById(id: number): Promise<PurchaseOrder | undefined> {
    const [purchaseOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));
    return purchaseOrder || undefined;
  }

  async getPurchaseOrderByOrderNumber(orderNumber: string): Promise<PurchaseOrder | undefined> {
    const [purchaseOrder] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.orderNumber, orderNumber));
    return purchaseOrder || undefined;
  }

  async getPurchaseOrdersByStatus(status: PurchaseOrderStatus): Promise<PurchaseOrder[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, status))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  private async generateOrderNumber(): Promise<string> {
    // 현재 연도와 월
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // 현재 월의 최신 주문번호 찾기
    const prefix = `PO-${year}${month}-`;
    
    const query = sql`
      SELECT order_number FROM ${purchaseOrders}
      WHERE order_number LIKE ${prefix + '%'}
      ORDER BY order_number DESC
      LIMIT 1
    `;
    
    const result = await db.execute(query);
    const rows = result.rows;
    
    let nextNumber = 1;
    if (rows.length > 0) {
      const lastOrderNumber = rows[0].order_number as string;
      const lastNumber = parseInt(lastOrderNumber.split('-')[2]);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    // 주문번호 형식: PO-YYYYMM-0001 (PO-연월-일련번호)
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  async createPurchaseOrder(insertPurchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    // 주문번호 생성
    const orderNumber = await this.generateOrderNumber();
    
    // 현재 날짜
    const now = new Date();
    
    // 기본값 설정
    const purchaseOrderToInsert = {
      orderNumber,
      status: insertPurchaseOrder.status || "draft",
      vendorName: insertPurchaseOrder.vendorName,
      vendorContact: insertPurchaseOrder.vendorContact || null,
      expectedDeliveryDate: insertPurchaseOrder.expectedDeliveryDate || null,
      notes: insertPurchaseOrder.notes || null,
      totalAmount: insertPurchaseOrder.totalAmount || "0",
      createdAt: now,
      updatedAt: now,
      projectName: insertPurchaseOrder.projectName,
      manager: insertPurchaseOrder.manager,
      vendorEmail: insertPurchaseOrder.vendorEmail || null,
      emailSent: insertPurchaseOrder.emailSent || false,
      emailSentAt: insertPurchaseOrder.emailSentAt || null,
      pdfPath: insertPurchaseOrder.pdfPath || null
    };
    
    // 구매 주문 생성
    const [purchaseOrder] = await db
      .insert(purchaseOrders)
      .values(purchaseOrderToInsert)
      .returning();
    
    return purchaseOrder;
  }

  async updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    // 현재 날짜
    const now = new Date();
    
    // 업데이트 데이터 준비
    const updateData: any = {
      updatedAt: now
    };
    
    // 각 필드에 대해 타입 호환성 확보
    if (data.status !== undefined) updateData.status = data.status;
    if (data.vendorName !== undefined) updateData.vendorName = data.vendorName;
    if (data.vendorContact !== undefined) updateData.vendorContact = data.vendorContact || null;
    if (data.expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = data.expectedDeliveryDate || null;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount || "0";
    if (data.projectName !== undefined) updateData.projectName = data.projectName;
    if (data.manager !== undefined) updateData.manager = data.manager;
    if (data.vendorEmail !== undefined) updateData.vendorEmail = data.vendorEmail || null;
    if (data.emailSent !== undefined) updateData.emailSent = data.emailSent;
    if (data.emailSentAt !== undefined) updateData.emailSentAt = data.emailSentAt || null;
    if (data.pdfPath !== undefined) updateData.pdfPath = data.pdfPath || null;
    
    // 구매 주문 업데이트
    const [purchaseOrder] = await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, id))
      .returning();
    
    return purchaseOrder || undefined;
  }

  async deletePurchaseOrder(id: number): Promise<boolean> {
    // 먼저 관련된 주문 아이템들을 모두 삭제
    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));
    
    // 그 다음 주문 삭제
    const result = await db
      .delete(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .returning({ id: purchaseOrders.id });
    
    return result.length > 0;
  }

  // Purchase Order Item methods
  async getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
    return await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
  }

  async createPurchaseOrderItem(insertItem: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    // 구매 주문 아이템 생성
    const itemToInsert = {
      purchaseOrderId: insertItem.purchaseOrderId,
      itemName: insertItem.itemName,
      specification: insertItem.specification || null,
      unitType: insertItem.unitType || null,
      quantity: insertItem.quantity,
      unitPrice: insertItem.unitPrice || "0",
      amount: insertItem.amount || "0",
      notes: insertItem.notes || null
    };
    
    const [purchaseOrderItem] = await db
      .insert(purchaseOrderItems)
      .values(itemToInsert)
      .returning();
    
    // 주문 총액 업데이트
    await this.updatePurchaseOrderTotal(insertItem.purchaseOrderId);
    
    return purchaseOrderItem;
  }

  async updatePurchaseOrderItem(id: number, data: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem | undefined> {
    // 업데이트 데이터 준비
    const updateData: any = {};
    
    // 각 필드에 대해 타입 호환성 확보
    if (data.itemName !== undefined) updateData.itemName = data.itemName;
    if (data.specification !== undefined) updateData.specification = data.specification || null;
    if (data.unitType !== undefined) updateData.unitType = data.unitType || null;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice || "0";
    if (data.amount !== undefined) updateData.amount = data.amount || "0";
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    
    // 주문 아이템 가져오기
    const [currentItem] = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, id));
    
    if (!currentItem) return undefined;
    
    // 주문 아이템 업데이트
    const [updatedItem] = await db
      .update(purchaseOrderItems)
      .set(updateData)
      .where(eq(purchaseOrderItems.id, id))
      .returning();
    
    // 주문 총액 업데이트
    await this.updatePurchaseOrderTotal(currentItem.purchaseOrderId);
    
    return updatedItem || undefined;
  }

  async deletePurchaseOrderItem(id: number): Promise<boolean> {
    // 주문 아이템 가져오기
    const [item] = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, id));
    
    if (!item) return false;
    
    // 주문 아이템 삭제
    const result = await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, id))
      .returning({ id: purchaseOrderItems.id });
    
    // 주문 총액 업데이트
    await this.updatePurchaseOrderTotal(item.purchaseOrderId);
    
    return result.length > 0;
  }

  private async updatePurchaseOrderTotal(purchaseOrderId: number): Promise<void> {
    // 주문에 속한 모든 아이템의 금액을 합산
    const items = await this.getPurchaseOrderItems(purchaseOrderId);
    
    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += parseFloat(item.amount);
    });
    
    // 주문 업데이트
    await db
      .update(purchaseOrders)
      .set({ totalAmount: totalAmount.toString() })
      .where(eq(purchaseOrders.id, purchaseOrderId));
  }

  // Dashboard methods
  async getDashboardStats(): Promise<{
    totalItems: number;
    lowStockItems: number;
    monthlyInflow: number;
    monthlyOutflow: number;
    categoryDistribution: {category: string, count: number}[];
  }> {
    // 총 아이템 수
    const totalItemsResult = await db.select({ count: sql`count(*)` }).from(inventoryItems);
    const totalItems = Number(totalItemsResult[0].count) || 0;
    
    // 재고 부족 아이템 수
    const lowStockItemsResult = await db
      .select({ count: sql`count(*)` })
      .from(inventoryItems)
      .where(sql`${inventoryItems.currentQuantity} < ${inventoryItems.minimumQuantity}`);
    const lowStockItems = Number(lowStockItemsResult[0].count) || 0;
    
    // 이번 달의 첫날과 마지막 날
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // 월간 입고량
    const monthlyInflowResult = await db
      .select({
        sum: sql`COALESCE(sum(${transactions.quantity}), 0)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "in"),
          gte(transactions.createdAt, startOfMonth),
          lte(transactions.createdAt, endOfMonth)
        )
      );
    const monthlyInflow = Number(monthlyInflowResult[0].sum) || 0;
    
    // 월간 출고량
    const monthlyOutflowResult = await db
      .select({
        sum: sql`COALESCE(sum(${transactions.quantity}), 0)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "out"),
          gte(transactions.createdAt, startOfMonth),
          lte(transactions.createdAt, endOfMonth)
        )
      );
    const monthlyOutflow = Number(monthlyOutflowResult[0].sum) || 0;
    
    // 카테고리 분포
    const categoryDistributionResult = await db
      .select({
        categoryId: inventoryItems.categoryId,
        count: sql`count(*)`
      })
      .from(inventoryItems)
      .groupBy(inventoryItems.categoryId);
    
    // 카테고리 이름 가져오기
    const categoryDistribution = await Promise.all(
      categoryDistributionResult.map(async (row) => {
        const category = await this.getCategoryById(Number(row.categoryId));
        return {
          category: category ? category.name : "Unknown",
          count: Number(row.count)
        };
      })
    );
    
    return {
      totalItems,
      lowStockItems,
      monthlyInflow,
      monthlyOutflow,
      categoryDistribution
    };
  }
}

// 임시로 MemStorage를 사용하여 문제를 해결
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private items: Map<number, InventoryItem>;
  private itemTransactions: Map<number, Transaction>;
  private vendors: Map<number, Vendor>;
  private purchaseOrders: Map<number, PurchaseOrder>;
  private purchaseOrderItems: Map<number, PurchaseOrderItem>;
  
  private userIdCounter: number;
  private categoryIdCounter: number;
  private itemIdCounter: number;
  private transactionIdCounter: number;
  private vendorIdCounter: number;
  private purchaseOrderIdCounter: number;
  private purchaseOrderItemIdCounter: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.items = new Map();
    this.itemTransactions = new Map();
    this.vendors = new Map();
    this.purchaseOrders = new Map();
    this.purchaseOrderItems = new Map();
    
    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.itemIdCounter = 1;
    this.transactionIdCounter = 1;
    this.vendorIdCounter = 1;
    this.purchaseOrderIdCounter = 1;
    this.purchaseOrderItemIdCounter = 1;
    
    // Initialize with default categories
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: "전기케이블류", description: "전기 공사에 사용되는 케이블 자재", color: "#0062FF" },
      { name: "통신케이블류", description: "통신 공사에 사용되는 케이블 자재", color: "#24A148" },
      { name: "등기구류", description: "조명 및 전기 등기구", color: "#8A3FFC" },
      { name: "통신자재류", description: "통신 관련 자재", color: "#FF832B" }
    ];

    defaultCategories.forEach(category => {
      this.createCategory(category);
    });
  }

  private generateItemCode(categoryPrefix: string): string {
    const categoryMap: Record<string, string> = {
      "전기케이블류": "전",
      "통신케이블류": "통",
      "등기구류": "등",
      "통신자재류": "자"
    };
    
    const prefix = categoryMap[categoryPrefix] || "기타";
    const year = new Date().getFullYear();
    const number = String(this.itemIdCounter).padStart(4, '0');
    
    return `${prefix}-${year}-${number}`;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Category methods
  async getAllCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find(
      (category) => category.name === name
    );
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const category: Category = { ...insertCategory, id };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // Check if category is in use by any item
    const itemsWithCategory = Array.from(this.items.values()).filter(
      (item) => item.categoryId === id
    );
    
    if (itemsWithCategory.length > 0) {
      return false;
    }
    
    return this.categories.delete(id);
  }

  // Inventory item methods
  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return Array.from(this.items.values());
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | undefined> {
    return this.items.get(id);
  }

  async getInventoryItemByCode(code: string): Promise<InventoryItem | undefined> {
    return Array.from(this.items.values()).find(
      (item) => item.code === code
    );
  }

  async getInventoryItemsByCategory(categoryId: number): Promise<InventoryItem[]> {
    return Array.from(this.items.values()).filter(
      (item) => item.categoryId === categoryId
    );
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return Array.from(this.items.values()).filter(
      (item) => item.currentQuantity < item.minimumQuantity
    );
  }

  async createInventoryItem(insertItem: InsertInventoryItem): Promise<InventoryItem> {
    const id = this.itemIdCounter++;
    
    // Get category to generate code
    const category = this.categories.get(insertItem.categoryId);
    const categoryName = category?.name || "기타";
    
    // Generate code
    const code = this.generateItemCode(categoryName);
    
    // Create item with timestamps
    const now = new Date();
    const item: InventoryItem = { 
      ...insertItem, 
      id, 
      code,
      createdAt: now,
      updatedAt: now
    };
    
    this.items.set(id, item);
    
    // If initial quantity is set, create an inflow transaction
    if (insertItem.currentQuantity > 0) {
      await this.createTransaction({
        itemId: id,
        type: TransactionType.IN,
        quantity: insertItem.currentQuantity,
        project: "초기 등록",
        note: "자재 최초 등록"
      });
    }
    
    return item;
  }

  async updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    
    // Handle quantity change by creating a transaction
    if (data.currentQuantity !== undefined && data.currentQuantity !== item.currentQuantity) {
      const quantityDiff = (data.currentQuantity - item.currentQuantity);
      
      if (quantityDiff !== 0) {
        await this.createTransaction({
          itemId: id,
          type: quantityDiff > 0 ? TransactionType.IN : TransactionType.OUT,
          quantity: Math.abs(quantityDiff),
          project: "재고 수정",
          note: "관리자에 의한 수량 조정"
        });
      }
    }
    
    const updatedItem = { 
      ...item, 
      ...data,
      updatedAt: new Date()
    };
    
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    return this.items.delete(id);
  }

  // Transaction methods
  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.itemTransactions.values());
  }

  async getTransactionsByItemId(itemId: number): Promise<Transaction[]> {
    return Array.from(this.itemTransactions.values())
      .filter(transaction => transaction.itemId === itemId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by date desc
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      createdAt: new Date() 
    };
    
    this.itemTransactions.set(id, transaction);
    
    // Update item quantity
    const item = this.items.get(insertTransaction.itemId);
    if (item) {
      const quantityChange = insertTransaction.type === TransactionType.IN
        ? insertTransaction.quantity 
        : -insertTransaction.quantity;
      
      const updatedQuantity = Math.max(0, item.currentQuantity + quantityChange);
      
      this.items.set(item.id, {
        ...item,
        currentQuantity: updatedQuantity,
        updatedAt: new Date()
      });
    }
    
    return transaction;
  }

  // Vendor methods
  async getAllVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendorById(id: number): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async getVendorByName(name: string): Promise<Vendor | undefined> {
    return Array.from(this.vendors.values()).find(
      vendor => vendor.name === name
    );
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const id = this.vendorIdCounter++;
    const vendor: Vendor = {
      ...insertVendor,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vendors.set(id, vendor);
    return vendor;
  }

  async updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;

    const updatedVendor = {
      ...vendor,
      ...data,
      updatedAt: new Date()
    };
    this.vendors.set(id, updatedVendor);
    return updatedVendor;
  }

  async deleteVendor(id: number): Promise<boolean> {
    // Check if vendor is used in purchase orders
    const ordersWithVendor = Array.from(this.purchaseOrders.values()).filter(
      order => order.vendorId === id
    );
    
    if (ordersWithVendor.length > 0) {
      return false;
    }
    
    return this.vendors.delete(id);
  }

  // Purchase order methods
  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values());
  }

  async getPurchaseOrderById(id: number): Promise<PurchaseOrder | undefined> {
    return this.purchaseOrders.get(id);
  }

  async getPurchaseOrderByOrderNumber(orderNumber: string): Promise<PurchaseOrder | undefined> {
    return Array.from(this.purchaseOrders.values()).find(
      order => order.orderNumber === orderNumber
    );
  }

  async getPurchaseOrdersByStatus(status: PurchaseOrderStatus): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values()).filter(
      order => order.status === status
    );
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const baseNumber = `PO-${year}${month}${day}`;
    const existingOrders = Array.from(this.purchaseOrders.values())
      .filter(order => order.orderNumber.startsWith(baseNumber));
    
    const sequence = (existingOrders.length + 1).toString().padStart(3, '0');
    return `${baseNumber}-${sequence}`;
  }

  async createPurchaseOrder(insertOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const id = this.purchaseOrderIdCounter++;
    const orderNumber = await this.generateOrderNumber();
    
    const order: PurchaseOrder = {
      ...insertOrder,
      id,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalAmount: 0, // Will be updated when items are added
      status: insertOrder.status || PurchaseOrderStatus.DRAFT
    };
    
    this.purchaseOrders.set(id, order);
    return order;
  }

  async updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const order = this.purchaseOrders.get(id);
    if (!order) return undefined;

    const updatedOrder = {
      ...order,
      ...data,
      updatedAt: new Date()
    };
    
    this.purchaseOrders.set(id, updatedOrder);
    return updatedOrder;
  }

  async deletePurchaseOrder(id: number): Promise<boolean> {
    // Delete associated items first
    const orderItems = Array.from(this.purchaseOrderItems.values())
      .filter(item => item.purchaseOrderId === id);
    
    orderItems.forEach(item => {
      this.purchaseOrderItems.delete(item.id);
    });
    
    return this.purchaseOrders.delete(id);
  }

  // Purchase order items methods
  async getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
    return Array.from(this.purchaseOrderItems.values())
      .filter(item => item.purchaseOrderId === purchaseOrderId);
  }

  async createPurchaseOrderItem(insertItem: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const id = this.purchaseOrderItemIdCounter++;
    
    const item: PurchaseOrderItem = {
      ...insertItem,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalPrice: insertItem.quantity * insertItem.unitPrice
    };
    
    this.purchaseOrderItems.set(id, item);
    
    // Update purchase order total
    await this.updatePurchaseOrderTotal(insertItem.purchaseOrderId);
    
    return item;
  }

  async updatePurchaseOrderItem(id: number, data: Partial<InsertPurchaseOrderItem>): Promise<PurchaseOrderItem | undefined> {
    const item = this.purchaseOrderItems.get(id);
    if (!item) return undefined;
    
    // Calculate new total price if quantity or unit price changed
    let totalPrice = item.totalPrice;
    if (data.quantity !== undefined || data.unitPrice !== undefined) {
      const quantity = data.quantity !== undefined ? data.quantity : item.quantity;
      const unitPrice = data.unitPrice !== undefined ? data.unitPrice : item.unitPrice;
      totalPrice = quantity * unitPrice;
    }
    
    const updatedItem = {
      ...item,
      ...data,
      totalPrice,
      updatedAt: new Date()
    };
    
    this.purchaseOrderItems.set(id, updatedItem);
    
    // Update purchase order total
    await this.updatePurchaseOrderTotal(item.purchaseOrderId);
    
    return updatedItem;
  }

  async deletePurchaseOrderItem(id: number): Promise<boolean> {
    const item = this.purchaseOrderItems.get(id);
    if (!item) return false;
    
    const result = this.purchaseOrderItems.delete(id);
    
    // Update purchase order total
    if (result) {
      await this.updatePurchaseOrderTotal(item.purchaseOrderId);
    }
    
    return result;
  }

  private async updatePurchaseOrderTotal(purchaseOrderId: number): Promise<void> {
    const order = this.purchaseOrders.get(purchaseOrderId);
    if (!order) return;
    
    const items = await this.getPurchaseOrderItems(purchaseOrderId);
    const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    this.purchaseOrders.set(purchaseOrderId, {
      ...order,
      totalAmount: total,
      updatedAt: new Date()
    });
  }

  // Dashboard methods
  async getDashboardStats(): Promise<{
    totalItems: number;
    lowStockItems: number;
    monthlyInflow: number;
    monthlyOutflow: number;
    categoryDistribution: {category: string, count: number}[];
  }> {
    const items = Array.from(this.items.values());
    const transactions = Array.from(this.itemTransactions.values());
    const categories = Array.from(this.categories.values());
    
    // Calculate stats
    const totalItems = items.length;
    const lowStockItems = items.filter(
      item => item.currentQuantity < item.minimumQuantity
    ).length;
    
    // Calculate monthly transactions
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = transactions.filter(
      transaction => transaction.createdAt >= firstDayOfMonth
    );
    
    const monthlyInflow = monthlyTransactions
      .filter(transaction => transaction.type === TransactionType.IN)
      .length;
    
    const monthlyOutflow = monthlyTransactions
      .filter(transaction => transaction.type === TransactionType.OUT)
      .length;
    
    // Calculate category distribution
    const categoryMap = new Map<number, number>();
    
    items.forEach(item => {
      const count = categoryMap.get(item.categoryId) || 0;
      categoryMap.set(item.categoryId, count + 1);
    });
    
    const categoryDistribution = categories.map(category => ({
      category: category.name,
      count: categoryMap.get(category.id) || 0
    }));
    
    return {
      totalItems,
      lowStockItems,
      monthlyInflow,
      monthlyOutflow,
      categoryDistribution
    };
  }
}

// SQL 데이터베이스 스토리지 사용
export const storage = new DatabaseStorage();