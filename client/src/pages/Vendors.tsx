import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 거래업체 스키마 및 타입 정의
const vendorSchema = z.object({
  name: z.string().min(1, "거래업체명은 필수 입력 항목입니다."),
  contactName: z.string().optional(),
  email: z.string().email("유효한 이메일 주소를 입력해주세요.").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

function Vendors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 상태 관리
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  
  // 거래업체 목록 조회
  const {
    data: vendors,
    isLoading: isLoadingVendors,
    error: vendorsError,
  } = useQuery({
    queryKey: ["/api/vendors"],
  });
  
  // 거래업체 생성
  const createMutation = useMutation({
    mutationFn: (data: VendorFormValues) => 
      apiRequest("/api/vendors", { method: "POST", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "거래업체 생성 완료",
        description: "새로운 거래업체가 생성되었습니다.",
      });
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "거래업체 생성 실패",
        description: error.message || "거래업체 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
  
  // 거래업체 수정
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: VendorFormValues }) =>
      apiRequest(`/api/vendors/${id}`, { method: "PUT", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setIsUpdateDialogOpen(false);
      toast({
        title: "거래업체 정보 수정 완료",
        description: "거래업체 정보가 업데이트되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "거래업체 정보 수정 실패",
        description: error.message || "거래업체 정보 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
  
  // 거래업체 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "거래업체 삭제 완료",
        description: "거래업체가 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "거래업체 삭제 실패",
        description: error.message || "거래업체 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
  
  // 거래업체 생성 폼
  const createForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });
  
  // 거래업체 수정 폼
  const updateForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });
  
  // 수정 다이얼로그 열기 및 폼 초기값 설정
  const handleEditVendor = (vendor: any) => {
    setSelectedVendor(vendor);
    updateForm.reset({
      name: vendor.name || "",
      contactName: vendor.contactName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
    });
    setIsUpdateDialogOpen(true);
  };
  
  // 거래업체 생성 제출 핸들러
  const onCreateSubmit = (data: VendorFormValues) => {
    createMutation.mutate(data);
  };
  
  // 거래업체 수정 제출 핸들러
  const onUpdateSubmit = (data: VendorFormValues) => {
    if (selectedVendor) {
      updateMutation.mutate({ id: selectedVendor.id, data });
    }
  };
  
  // 거래업체 삭제 핸들러
  const handleDeleteVendor = (id: number) => {
    deleteMutation.mutate(id);
  };
  
  // 새 거래업체 다이얼로그 닫기 시 폼 초기화
  useEffect(() => {
    if (!isCreateDialogOpen) {
      createForm.reset();
    }
  }, [isCreateDialogOpen, createForm]);
  
  // 로딩 중 상태 처리
  if (isLoadingVendors) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>거래업체 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  // 에러 상태 처리
  if (vendorsError) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center text-red-500">
          <p>거래업체 정보를 불러오는데 실패했습니다.</p>
          <p className="text-sm mt-2">
            {(vendorsError as Error).message || "알 수 없는 오류가 발생했습니다."}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Building className="mr-2 h-6 w-6" />
            거래업체 관리
          </CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                신규 거래업체 등록
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>신규 거래업체 등록</DialogTitle>
                <DialogDescription>
                  새로운 거래업체 정보를 입력해주세요. 별표(*) 표시는 필수 입력 항목입니다.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>거래업체명 *</FormLabel>
                        <FormControl>
                          <Input placeholder="거래업체 이름" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>담당자명</FormLabel>
                          <FormControl>
                            <Input placeholder="담당자 이름" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>연락처</FormLabel>
                          <FormControl>
                            <Input placeholder="전화번호" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="example@example.com" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>주소</FormLabel>
                        <FormControl>
                          <Input placeholder="주소" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>비고</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="추가 정보를 입력하세요" 
                            {...field} 
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "처리 중..." : "저장"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {vendors && vendors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>거래업체명</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor: any) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.contactName || "-"}</TableCell>
                    <TableCell>{vendor.phone || "-"}</TableCell>
                    <TableCell>{vendor.email || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditVendor(vendor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>거래업체 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                정말로 이 거래업체를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteVendor(vendor.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 bg-muted rounded-md">
              <p className="text-muted-foreground mb-4">등록된 거래업체가 없습니다.</p>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                신규 거래업체 등록
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 거래업체 수정 다이얼로그 */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>거래업체 정보 수정</DialogTitle>
            <DialogDescription>
              거래업체 정보를 수정합니다. 별표(*) 표시는 필수 입력 항목입니다.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
              <FormField
                control={updateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>거래업체명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="거래업체 이름" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={updateForm.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>담당자명</FormLabel>
                      <FormControl>
                        <Input placeholder="담당자 이름" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={updateForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>연락처</FormLabel>
                      <FormControl>
                        <Input placeholder="전화번호" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={updateForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="example@example.com" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={updateForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소</FormLabel>
                    <FormControl>
                      <Input placeholder="주소" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={updateForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비고</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="추가 정보를 입력하세요" 
                        {...field} 
                        rows={3}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsUpdateDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "처리 중..." : "저장"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Vendors;