import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InventoryItem } from "@shared/schema";

type LowStockItemProps = {
  item: InventoryItem;
  categoryName: string;
  onClick: (item: InventoryItem) => void;
};

const LowStockItem = ({ item, categoryName, onClick }: LowStockItemProps) => {
  return (
    <li className="p-4 hover:bg-gray-100 cursor-pointer" onClick={() => onClick(item)}>
      <div className="flex justify-between">
        <div>
          <h4 className="font-medium">{item.name}</h4>
          <p className="text-xs text-gray-500 mt-1">{categoryName}</p>
        </div>
        <div className="text-right">
          <span className="text-red-600 font-medium">{item.currentQuantity}개</span>
          <p className="text-xs text-gray-500 mt-1">최소: {item.minimumQuantity}개</p>
        </div>
      </div>
    </li>
  );
};

type LowStockAlertProps = {
  onItemClick: (item: InventoryItem) => void;
};

export const LowStockAlert = ({ onItemClick }: LowStockAlertProps) => {
  // Fetch low stock items
  const { data: lowStockItems = [] } = useQuery<InventoryItem[]>({ 
    queryKey: ['/api/items/low-stock']
  });
  
  // Fetch categories for display names
  const { data: categories = [] } = useQuery({ 
    queryKey: ['/api/categories']
  });
  
  // Create a lookup map for category names
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-5 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">부족 재고 알림</h3>
          <Badge variant="destructive">{lowStockItems.length}개</Badge>
        </div>
      </div>
      <div className="p-0 overflow-y-auto max-h-60">
        {lowStockItems.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {lowStockItems.map((item) => (
              <LowStockItem 
                key={item.id}
                item={item}
                categoryName={categoryMap.get(item.categoryId) || "알 수 없음"}
                onClick={onItemClick}
              />
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500">
            부족 재고가 없습니다.
          </div>
        )}
      </div>
      <div className="p-4 border-t border-gray-200">
        <Link href="/inventory?filter=low-stock">
          <Button variant="outline" className="w-full">
            모든 부족 재고 보기
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default LowStockAlert;
