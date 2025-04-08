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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertInventoryItemSchema, InventoryItem, Category } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create a form schema based on the inventory item schema
const formSchema = z.object({
  name: z.string().min(1, "자재명은 필수 입력 항목입니다."),
  categoryId: z.coerce.number().min(1, "카테고리를 선택해주세요."),
  specification: z.string().optional(),
  currentQuantity: z.coerce.number().min(0, "수량은 0 이상이어야 합니다."),
  minimumQuantity: z.coerce.number().min(0, "최소 수량은 0 이상이어야 합니다."),
  location: z.string().optional(),
  unitPrice: z.coerce.number().min(0, "단가는 0 이상이어야 합니다.").optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type NewItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit: InventoryItem | null;
};

export const NewItemModal = ({ isOpen, onClose, itemToEdit }: NewItemModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!itemToEdit;
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isOpen
  });

  // Create form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      categoryId: 0,
      specification: "",
      currentQuantity: 0,
      minimumQuantity: 0,
      location: "",
      unitPrice: "",
      notes: "",
    },
  });

  // Set default values when editing
  useEffect(() => {
    if (itemToEdit) {
      form.reset({
        name: itemToEdit.name,
        categoryId: itemToEdit.categoryId,
        specification: itemToEdit.specification || "",
        currentQuantity: itemToEdit.currentQuantity,
        minimumQuantity: itemToEdit.minimumQuantity,
        location: itemToEdit.location || "",
        unitPrice: itemToEdit.unitPrice as number | undefined || "",
        notes: itemToEdit.notes || "",
      });
    } else {
      form.reset({
        name: "",
        categoryId: 0,
        specification: "",
        currentQuantity: 0,
        minimumQuantity: 0,
        location: "",
        unitPrice: "",
        notes: "",
      });
    }
  }, [itemToEdit, form]);

  // Create mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest('POST', '/api/items', data);
    },
    onSuccess: () => {
      toast({
        title: "자재 등록 완료",
        description: "새 자재가 성공적으로 등록되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "자재 등록 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
      return apiRequest('PUT', `/api/items/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "자재 수정 완료",
        description: "자재 정보가 성공적으로 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      if (itemToEdit) {
        queryClient.invalidateQueries({ queryKey: ['/api/items', itemToEdit.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "자재 수정 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: FormValues) => {
    // Process empty string to undefined for optional numeric field
    const processedData = {
      ...data,
      unitPrice: data.unitPrice === '' ? undefined : data.unitPrice,
    };

    if (isEditMode && itemToEdit) {
      updateItemMutation.mutate({ id: itemToEdit.id, data: processedData });
    } else {
      createItemMutation.mutate(processedData);
    }
  };

  const handleCancel = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "자재 정보 수정" : "신규 자재 등록"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div>
                <FormField
                  control={form.control}
                  name="code"
                  render={() => (
                    <FormItem>
                      <FormLabel>자재 코드</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="자동 생성" 
                          value={itemToEdit?.code || "자동 생성"} 
                          disabled 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>카테고리 <span className="text-red-600">*</span></FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>자재명 <span className="text-red-600">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="specification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상세 규격</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={2}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="currentQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현재 수량 <span className="text-red-600">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="minimumQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>최소 수량 <span className="text-red-600">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>위치</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>단가</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="number" 
                          min="0"
                          value={field.value === undefined ? "" : field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비고</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={2}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end items-center p-6 border-t border-gray-200 bg-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="mr-2"
              >
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
              >
                {isEditMode ? "수정" : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewItemModal;
