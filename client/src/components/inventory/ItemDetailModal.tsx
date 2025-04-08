import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InventoryItem, Transaction, Category } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ItemDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  itemId: number | null;
  onEdit: (item: InventoryItem) => void;
};

export const ItemDetailModal = ({ isOpen, onClose, itemId, onEdit }: ItemDetailModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch item details
  const { 
    data: item,
    isLoading: isLoadingItem,
    isError: isItemError
  } = useQuery<InventoryItem>({
    queryKey: ['/api/items', itemId],
    enabled: isOpen && itemId !== null
  });

  // Fetch transactions for the item
  const {
    data: transactions = [],
    isLoading: isLoadingTransactions
  } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/item', itemId],
    enabled: isOpen && itemId !== null
  });

  // Fetch all categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isOpen
  });

  // Delete mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/items/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "자재 삭제 완료",
        description: "자재가 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "자재 삭제 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
    }
  });

  // Get category name by id
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Format date for display - 더 안전한 날짜 처리 방식 적용
  const formatDate = (dateString: Date): string => {
    try {
      const date = new Date(dateString);
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        return "-";
      }
      // YYYY-MM-DD 형식으로 변환
      return date.getFullYear() + "-" + 
        String(date.getMonth() + 1).padStart(2, "0") + "-" + 
        String(date.getDate()).padStart(2, "0");
    } catch (error) {
      return "-";
    }
  };

  if (!isOpen) return null;

  const handleDelete = () => {
    if (itemId && confirm("정말로 이 자재를 삭제하시겠습니까?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>자재 상세 정보</DialogTitle>
        </DialogHeader>

        {isLoadingItem ? (
          <div className="p-8 text-center">
            <p>로딩 중...</p>
          </div>
        ) : isItemError ? (
          <div className="p-8 text-center text-red-600">
            <p>자재 정보를 불러오는 중 오류가 발생했습니다.</p>
          </div>
        ) : item ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">자재 코드</label>
                    <p className="font-medium">{item.code}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">카테고리</label>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {getCategoryName(item.categoryId)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">자재명</label>
                    <p className="font-medium">{item.name}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">상세 규격</label>
                    <p>{item.specification || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">현재 수량</label>
                    <p className={item.currentQuantity < item.minimumQuantity ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                      {item.currentQuantity} 개
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">최소 수량</label>
                    <p>{item.minimumQuantity} 개</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">위치</label>
                    <p>{item.location || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">단가</label>
                    <p>{item.unitPrice ? `₩${Number(item.unitPrice).toLocaleString()}` : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">등록일</label>
                    <p>{formatDate(item.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">최종 업데이트</label>
                    <p>{formatDate(item.updatedAt)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">비고</label>
                    <p className="text-sm text-gray-500">{item.notes || '-'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">재고 변동 내역</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium">최근 입출고</p>
                  </div>
                  
                  {isLoadingTransactions ? (
                    <div className="p-4 text-center">
                      <p className="text-sm">로딩 중...</p>
                    </div>
                  ) : transactions.length > 0 ? (
                    <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                      {transactions.slice(0, 5).map((transaction) => (
                        <li key={transaction.id} className="p-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <span className={`material-icons text-${transaction.type === 'in' ? 'green-600' : 'red-600'} text-sm mr-2`}>
                                {transaction.type === 'in' ? 'add_circle' : 'remove_circle'}
                              </span>
                              <div>
                                <p className="text-sm font-medium">
                                  {transaction.type === 'in' ? '입고' : '출고'}: {transaction.quantity}개
                                </p>
                                <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                              </div>
                            </div>
                            <p className="text-xs">{transaction.project || '-'}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p className="text-sm">입출고 내역이 없습니다.</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <Button className="w-full">입출고 전체 내역</Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-100">
          <div className="flex space-x-2">
            <Button 
              variant="destructive" 
              className="flex items-center"
              onClick={handleDelete}
              disabled={!item || deleteItemMutation.isPending}
            >
              <span className="material-icons text-sm mr-1">delete</span>
              삭제
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-600"
            >
              <span className="material-icons text-sm mr-1">qr_code_2</span>
              QR코드
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              취소
            </Button>
            <Button 
              className="flex items-center" 
              onClick={() => item && onEdit(item)}
              disabled={!item}
            >
              <span className="material-icons text-sm mr-1">edit</span>
              수정
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailModal;
