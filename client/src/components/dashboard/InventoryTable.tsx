import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { InventoryItem, Category } from "@shared/schema";

type InventoryTableProps = {
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onViewItem: (item: InventoryItem) => void;
};

export const InventoryTable = ({
  onAddItem, 
  onEditItem, 
  onDeleteItem, 
  onViewItem
}: InventoryTableProps) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch inventory items
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

  // Get category badge color
  const getCategoryBadgeClass = (categoryName: string): string => {
    const colorMap: Record<string, string> = {
      "케이블 종류": "bg-blue-100 text-blue-800",
      "등기구 종류": "bg-green-100 text-green-800",
      "통신자재 종류": "bg-purple-100 text-purple-800",
      "공구 종류": "bg-orange-100 text-orange-800"
    };
    
    return colorMap[categoryName] || "bg-gray-100 text-gray-800";
  };

  // Filter items by selected category
  const filteredItems = categoryFilter
    ? items.filter(item => {
        const categoryName = getCategoryName(item.categoryId);
        return categoryFilter === "all" || categoryName === categoryFilter;
      })
    : items;

  // Paginate items
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate total pages
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Handle pagination
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toISOString().split('T')[0];
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <div className="flex flex-wrap justify-between items-center">
          <h3 className="font-semibold">최근 등록 자재</h3>
          
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <div className="relative">
              <select 
                className="appearance-none bg-gray-100 border border-gray-200 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-primary"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">모든 카테고리</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <span className="material-icons absolute right-2 top-2 text-gray-500 text-sm pointer-events-none">
                expand_more
              </span>
            </div>
            
            <Button 
              onClick={onAddItem}
              className="flex items-center"
            >
              <span className="material-icons text-sm mr-1">add</span>
              신규 자재 등록
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {isLoadingItems ? (
          <div className="p-8 text-center">
            <p>로딩 중...</p>
          </div>
        ) : paginatedItems.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  코드
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  자재명
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  카테고리
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  현재 수량
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  최소 수량
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  위치
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                  최종 업데이트
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedItems.map((item) => {
                const categoryName = getCategoryName(item.categoryId);
                const isLowStock = item.currentQuantity < item.minimumQuantity;
                
                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => onViewItem(item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">{item.code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.specification && (
                        <div className="text-xs text-gray-500">{item.specification}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadgeClass(categoryName)}`}>
                        {categoryName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={isLowStock ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                        {item.currentQuantity} 개
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.minimumQuantity} 개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        className="text-primary hover:text-blue-800 mr-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(item);
                        }}
                      >
                        <span className="material-icons text-sm">edit</span>
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item);
                        }}
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            자재가 없습니다. 새 자재를 등록해주세요.
          </div>
        )}
      </div>
      
      {paginatedItems.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            전체 <span className="font-medium">{filteredItems.length}</span>개 중 <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className="p-2 rounded-md border border-gray-200 hover:bg-gray-100 disabled:opacity-50" 
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <span className="material-icons text-sm">chevron_left</span>
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button 
                  key={page}
                  className={`w-8 h-8 rounded-md ${currentPage === page ? 'bg-primary text-white' : 'hover:bg-gray-100'} flex items-center justify-center`}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              );
            })}
            
            <button 
              className="p-2 rounded-md border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              <span className="material-icons text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
