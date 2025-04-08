import { 
  users, categories, inventoryItems, transactions, 
  type User, type InsertUser,
  type Category, type InsertCategory, 
  type InventoryItem, type InsertInventoryItem,
  type Transaction, type InsertTransaction
} from "@shared/schema";

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
  
  // Dashboard methods
  getDashboardStats(): Promise<{
    totalItems: number;
    lowStockItems: number;
    monthlyInflow: number;
    monthlyOutflow: number;
    categoryDistribution: {category: string, count: number}[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private items: Map<number, InventoryItem>;
  private itemTransactions: Map<number, Transaction>;
  
  private userIdCounter: number;
  private categoryIdCounter: number;
  private itemIdCounter: number;
  private transactionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.items = new Map();
    this.itemTransactions = new Map();
    
    this.userIdCounter = 1;
    this.categoryIdCounter = 1;
    this.itemIdCounter = 1;
    this.transactionIdCounter = 1;
    
    // Initialize with default categories
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: "케이블 종류", description: "각종 케이블 자재", color: "#0062FF" },
      { name: "등기구 종류", description: "조명 및 전기 등기구", color: "#24A148" },
      { name: "통신자재 종류", description: "통신 관련 자재", color: "#8A3FFC" },
      { name: "공구 종류", description: "작업용 공구", color: "#FF832B" }
    ];

    defaultCategories.forEach(category => {
      this.createCategory(category);
    });
  }

  private generateItemCode(categoryPrefix: string): string {
    const categories: Record<string, string> = {
      "케이블 종류": "C",
      "등기구 종류": "L",
      "통신자재 종류": "T",
      "공구 종류": "P"
    };
    
    const prefix = categories[categoryPrefix] || "X";
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
        type: "in",
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
          type: quantityDiff > 0 ? "in" : "out",
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
      const quantityChange = insertTransaction.type === "in" 
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
      .filter(transaction => transaction.type === "in")
      .length;
    
    const monthlyOutflow = monthlyTransactions
      .filter(transaction => transaction.type === "out")
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

export const storage = new MemStorage();
