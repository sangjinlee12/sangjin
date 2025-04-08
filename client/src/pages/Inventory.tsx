import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryItem, Category } from "@shared/schema";
import InventoryTable from "@/components/dashboard/InventoryTable";
import ItemDetailModal from "@/components/inventory/ItemDetailModal.jsx";
import NewItemModal from "@/components/inventory/NewItemModal.jsx";

export default function Inventory() {
  const [location, setLocation] = useLocation();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  // Get URL params for filters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    const filterParam = searchParams.get('filter');
    
    if (filterParam === 'low-stock') {
      setStockFilter('low');
    }
  }, [location]);

  // Fetch all items
  const { data: items = [], isLoading: isLoadingItems } = useQuery<InventoryItem[]>({
    queryKey: ['/api/items']
  });

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  // Get category name by id
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery 
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.specification && item.specification.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    
    const matchesCategory = categoryFilter === 'all'
      ? true
      : getCategoryName(item.categoryId) === categoryFilter;
    
    const matchesStock = stockFilter === 'all'
      ? true
      : stockFilter === 'low'
        ? item.currentQuantity < item.minimumQuantity
        : stockFilter === 'normal'
          ? item.currentQuantity >= item.minimumQuantity
          : true;
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setIsDetailModalOpen(true);
  };

  const handleAddItem = () => {
    setItemToEdit(null);
    setIsNewItemModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsNewItemModalOpen(true);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedItemId(null);
  };

  const handleCloseNewItemModal = () => {
    setIsNewItemModalOpen(false);
    setItemToEdit(null);
  };
  
  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStockFilter("all");
    setLocation("/inventory");
  };

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>재고 관리</CardTitle>
          <CardDescription>
            모든 자재 목록을 확인하고 관리하세요. 재고 현황에 따라 필터링할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                자재 검색
              </label>
              <div className="relative">
                <Input
                  placeholder="자재명, 코드 또는 규격으로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <span className="material-icons absolute left-3 top-2 text-gray-400">search</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                카테고리 필터
              </label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="모든 카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 카테고리</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                재고 상태
              </label>
              <Select
                value={stockFilter}
                onValueChange={setStockFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="모든 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="low">부족 재고</SelectItem>
                  <SelectItem value="normal">정상 재고</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={clearFilters}>
            필터 초기화
          </Button>
          <Button onClick={handleAddItem}>
            <span className="material-icons text-sm mr-2">add</span>
            신규 자재 등록
          </Button>
        </CardFooter>
      </Card>
      
      <InventoryTable
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onViewItem={handleItemClick}
      />

      {/* Modals */}
      <ItemDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        itemId={selectedItemId}
        onEdit={handleEditItem}
      />

      <NewItemModal
        isOpen={isNewItemModalOpen}
        onClose={handleCloseNewItemModal}
        itemToEdit={itemToEdit}
      />
    </div>
  );
}
