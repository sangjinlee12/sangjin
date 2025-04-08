import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryItem, Category, insertTransactionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schema for transaction
const transactionFormSchema = z.object({
  itemId: z.coerce.number().min(1, "자재를 선택해주세요."),
  quantity: z.coerce.number().min(1, "수량은 1 이상이어야 합니다."),
  project: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof transactionFormSchema>;

type TransactionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'in' | 'out';
  selectedItem: InventoryItem | null;
  allItems: InventoryItem[];
  isLoading: boolean;
};

export const TransactionModal = ({ 
  isOpen, 
  onClose, 
  type, 
  selectedItem,
  allItems,
  isLoading
}: TransactionModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch categories for display
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isOpen
  });
  
  // Create form
  const form = useForm<FormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      itemId: selectedItem?.id || 0,
      quantity: 1,
      project: "",
      note: ""
    }
  });
  
  // Update form when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      form.setValue("itemId", selectedItem.id);
    }
  }, [selectedItem, form]);
  
  // Get category name by id
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown";
  };
  
  // Transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: FormValues & { type: 'in' | 'out' }) => {
      return apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      toast({
        title: type === 'in' ? "입고 완료" : "출고 완료",
        description: `자재가 성공적으로 ${type === 'in' ? '입고' : '출고'}되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: type === 'in' ? "입고 실패" : "출고 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
    }
  });
  
  // Validate quantity for outflow
  const validateOutflowQuantity = (itemId: number, quantity: number): boolean => {
    if (type !== 'out') return true;
    
    const item = allItems.find(item => item.id === itemId);
    if (!item) return false;
    
    return item.currentQuantity >= quantity;
  };
  
  const onSubmit = (data: FormValues) => {
    // Validate outflow quantity
    if (type === 'out' && !validateOutflowQuantity(data.itemId, data.quantity)) {
      toast({
        title: "출고 수량 오류",
        description: "출고 수량이 현재 재고보다 많습니다.",
        variant: "destructive"
      });
      return;
    }
    
    createTransactionMutation.mutate({
      ...data,
      type
    });
  };
  
  // Get selected item details
  const currentItemId = form.watch("itemId");
  const currentItem = allItems.find(item => item.id === Number(currentItemId));
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'in' ? '자재 입고 등록' : '자재 출고 등록'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>자재 선택 <span className="text-red-600">*</span></FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={field.onChange}
                    disabled={!!selectedItem}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="자재를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="loading" disabled>자재 목록 로딩 중...</SelectItem>
                      ) : allItems.length > 0 ? (
                        allItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            [{item.code}] {item.name} ({getCategoryName(item.categoryId)})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty" disabled>등록된 자재가 없습니다</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {currentItem && (
              <div className="p-3 bg-gray-100 rounded-md text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">현재 재고:</span>
                  <span className={currentItem.currentQuantity < currentItem.minimumQuantity ? "text-red-600 font-medium" : ""}>
                    {currentItem.currentQuantity} 개
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">최소 재고:</span>
                  <span>{currentItem.minimumQuantity} 개</span>
                </div>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>수량 <span className="text-red-600">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min="1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="project"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>프로젝트</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={type === 'in' ? "구매처 또는 프로젝트" : "사용 프로젝트"}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비고</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="추가 정보 입력"
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mr-2"
              >
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createTransactionMutation.isPending}
                className={type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                <span className="material-icons text-sm mr-2">
                  {type === 'in' ? 'add_circle' : 'remove_circle'}
                </span>
                {type === 'in' ? '입고 등록' : '출고 등록'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionModal;
