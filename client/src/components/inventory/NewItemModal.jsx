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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UnitType } from "../../lib/unitTypes.js";

// Create a form schema based on the inventory item schema
const formSchema = z.object({
  name: z.string().min(1, "자재명은 필수 입력 항목입니다."),
  categoryId: z.coerce.number().min(1, "카테고리를 선택해주세요."),
  specification: z.string().optional().nullable(),
  unitType: z.string().optional().nullable(), // 자재 단위 타입 (M, EA, 식, 조)
  currentQuantity: z.coerce.number().min(0, "수량은 0 이상이어야 합니다."),
  minimumQuantity: z.coerce.number().min(0, "최소 수량은 0 이상이어야 합니다."),
  location: z.string().optional().nullable(),
  unitPrice: z.coerce.number().min(0, "단가는 0 이상이어야 합니다.").optional().nullable(),
  notes: z.string().optional().nullable(),
});

const NewItemModal = ({ isOpen, onClose, itemToEdit }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!itemToEdit;
  
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    enabled: isOpen
  });

  // Create form with react-hook-form
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      categoryId: categories && categories.length > 0 ? categories[0].id : 1,
      specification: "",
      unitType: UnitType.M, // 기본값을 M(미터)로 설정
      currentQuantity: 0,
      minimumQuantity: 0,
      location: "",
      unitPrice: null,
      notes: "",
    },
  });

  // Set default values when editing
  useEffect(() => {
    if (itemToEdit) {
      // 수정 모드일 때
      const unitPrice = typeof itemToEdit.unitPrice === 'number' ? itemToEdit.unitPrice : null;
      
      form.reset({
        name: itemToEdit.name,
        categoryId: itemToEdit.categoryId,
        specification: itemToEdit.specification || "",
        unitType: itemToEdit.unitType || UnitType.M,
        currentQuantity: itemToEdit.currentQuantity,
        minimumQuantity: itemToEdit.minimumQuantity,
        location: itemToEdit.location || "",
        unitPrice: unitPrice,
        notes: itemToEdit.notes || "",
      });
    } else if (categories.length > 0) {
      // 생성 모드일 때
      form.reset({
        name: "",
        categoryId: categories[0].id,
        specification: "",
        unitType: UnitType.M,
        currentQuantity: 0,
        minimumQuantity: 0,
        location: "",
        unitPrice: null,
        notes: "",
      });
    }
  }, [itemToEdit, form, categories]);

  // Create mutation
  const createItemMutation = useMutation({
    mutationFn: async (data) => {
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
    mutationFn: async ({ id, data }) => {
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

  const onSubmit = (data) => {
    // 데이터 전처리
    const processedData = {
      ...data,
      // null, 빈 문자열, undefined를 모두 적절하게 처리
      specification: data.specification || undefined,
      unitType: data.unitType || undefined,
      location: data.location || undefined,
      // unitPrice - 값이 있으면 그대로 전달, 비어있으면 undefined
      unitPrice: data.unitPrice !== null && data.unitPrice !== undefined ? data.unitPrice : undefined,
      notes: data.notes || undefined,
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
                <div className="space-y-2">
                  <div className="font-medium text-sm">자재 코드</div>
                  <Input 
                    placeholder="자동 생성" 
                    value={itemToEdit?.code || "자동 생성"} 
                    disabled 
                    className="bg-gray-100"
                  />
                </div>
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
                  name="unitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>단위</FormLabel>
                      <Select
                        value={field.value || UnitType.M}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="단위 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={UnitType.M}>미터(M)</SelectItem>
                          <SelectItem value={UnitType.EA}>개수(EA)</SelectItem>
                          <SelectItem value={UnitType.SET}>한 세트(식)</SelectItem>
                          <SelectItem value={UnitType.GROUP}>한 그룹(조)</SelectItem>
                        </SelectContent>
                      </Select>
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
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>단가</FormLabel>
                      <FormControl>
                        <Input 
                          {...rest}
                          onChange={(e) => {
                            const val = e.target.value;
                            onChange(val === "" ? null : Number(val));
                          }}
                          type="number" 
                          min="0"
                          value={value === null ? "" : value}
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