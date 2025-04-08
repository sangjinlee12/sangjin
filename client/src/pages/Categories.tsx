import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Category } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "카테고리명은 필수 입력 항목입니다."),
  description: z.string().optional(),
  color: z.string().regex(/^#([0-9A-F]{6})$/i, "올바른 색상 코드를 입력하세요 (예: #0062FF)").default("#0062FF"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Categories() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#0062FF",
    },
  });

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  // Create mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      toast({
        title: "카테고리 생성 완료",
        description: "새 카테고리가 성공적으로 생성되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "카테고리 생성 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
      return apiRequest('PUT', `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "카테고리 수정 완료",
        description: "카테고리가 성공적으로 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsOpen(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "카테고리 수정 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "카테고리 삭제 완료",
        description: "카테고리가 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    },
    onError: (error) => {
      toast({
        title: "카테고리 삭제 실패",
        description: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: FormValues) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      color: category.color || "#0062FF",
    });
    setIsOpen(true);
  };

  const handleDelete = (category: Category) => {
    if (confirm(`정말로 "${category.name}" 카테고리를 삭제하시겠습니까?`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleOpenDialog = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      description: "",
      color: "#0062FF",
    });
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingCategory(null);
    form.reset();
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>카테고리 관리</CardTitle>
          <CardDescription>
            자재 카테고리를 관리하고 새로운 카테고리를 추가하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>로딩 중...</p>
            </div>
          ) : categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>색상</TableHead>
                  <TableHead>카테고리명</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: category.color || "#0062FF" }} 
                      />
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(category)}
                        className="mr-1"
                      >
                        <span className="material-icons text-sm">edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(category)}
                      >
                        <span className="material-icons text-sm text-red-600">delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>등록된 카테고리가 없습니다. 새 카테고리를 추가해주세요.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleOpenDialog}>
            <span className="material-icons text-sm mr-2">add</span>
            새 카테고리 추가
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "카테고리 수정" : "새 카테고리 추가"}</DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "카테고리 정보를 수정하세요." 
                : "새로운 카테고리의 정보를 입력하세요."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리명 <span className="text-red-600">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="예: 케이블 종류" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="카테고리에 대한 설명을 입력하세요."
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>색상</FormLabel>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        {...field}
                        className="w-10 h-10 border-0 p-0 rounded"
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      <FormControl>
                        <Input {...field} placeholder="#0062FF" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCloseDialog}
                  className="mr-2"
                >
                  취소
                </Button>
                <Button 
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                >
                  {editingCategory ? "수정" : "추가"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
