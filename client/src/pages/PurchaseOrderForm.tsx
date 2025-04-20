import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UnitType } from "@shared/schema";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// 자재 단위 목록
const unitTypeOptions = [
  { value: UnitType.M, label: "M" },
  { value: UnitType.EA, label: "EA" },
  { value: UnitType.SET, label: "식" },
  { value: UnitType.GROUP, label: "조" }
];

// 발주 항목 타입
interface PurchaseOrderItem {
  id?: number;
  purchaseOrderId?: number;
  itemId?: number;
  itemName: string;
  specification?: string;
  unitType?: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  notes?: string;
}

// 발주서 타입
interface PurchaseOrder {
  id?: number;
  orderNumber?: string;
  orderDate?: string;
  projectName: string;
  manager: string;
  contactNumber?: string;
  vendorName: string;
  vendorContact?: string;
  vendorEmail?: string;
  notes?: string;
  status?: string;
}

const emptyOrderItem: PurchaseOrderItem = {
  itemName: "",
  specification: "",
  unitType: "EA",
  quantity: 1,
  unitPrice: 0,
  notes: ""
};

export const PurchaseOrderForm = () => {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/purchase-orders/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = params?.id && params.id !== "new";
  const orderId = isEditMode ? parseInt(params?.id as string) : undefined;

  // 상태 관리
  const [order, setOrder] = useState<PurchaseOrder>({
    projectName: "",
    manager: "",
    contactNumber: "",
    vendorName: "",
    vendorContact: "",
    vendorEmail: "",
    notes: ""
  });
  const [items, setItems] = useState<PurchaseOrderItem[]>([{ ...emptyOrderItem }]);
  const [emailTo, setEmailTo] = useState("");

  // 재고 아이템 목록 (자동완성용)
  const { data: inventoryItems } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0]);
      if (!response.ok) {
        throw new Error("Failed to fetch inventory items");
      }
      return response.json();
    }
  });
  
  // 거래업체 목록 조회
  const { data: vendors, isLoading: isLoadingVendors } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0]);
      if (!response.ok) {
        throw new Error("거래업체 목록을 가져오는데 실패했습니다");
      }
      return response.json();
    }
  });

  // 발주서 데이터 조회 (수정 모드)
  const { data: orderData, isLoading: isOrderLoading } = useQuery({
    queryKey: [`/api/purchase-orders/${orderId}`],
    queryFn: async ({ queryKey }) => {
      if (!isEditMode) return null;
      const response = await fetch(queryKey[0]);
      if (!response.ok) {
        throw new Error("Failed to fetch purchase order");
      }
      return response.json();
    },
    enabled: isEditMode
  });

  // 데이터 로드
  useEffect(() => {
    if (orderData && isEditMode) {
      setOrder(orderData.order);
      if (orderData.order.vendorEmail) {
        setEmailTo(orderData.order.vendorEmail);
      }
      if (orderData.items && orderData.items.length > 0) {
        setItems(orderData.items);
      }
    }
  }, [orderData, isEditMode]);

  // 발주서 저장 뮤테이션
  const { mutate: savePurchaseOrder, isPending: isSaving } = useMutation({
    mutationFn: async (data: { order: PurchaseOrder, items: PurchaseOrderItem[] }) => {
      const url = isEditMode ? `/api/purchase-orders/${orderId}` : "/api/purchase-orders";
      const method = isEditMode ? "PUT" : "POST";
      
      return apiRequest(url, {
        method,
        body: data
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "발주서 저장 완료",
        description: isEditMode ? "발주서가 수정되었습니다." : "새 발주서가 생성되었습니다.",
      });
      
      // 편집 모드가 아니면 생성된 발주서 페이지로 이동
      if (!isEditMode && data.order && data.order.id) {
        navigate(`/purchase-orders/${data.order.id}`);
      }
    },
    onError: (error) => {
      toast({
        title: "발주서 저장 실패",
        description: `발주서를 저장하는데 실패했습니다: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // 이메일 발송 뮤테이션
  const { mutate: sendEmail, isPending: isSending } = useMutation({
    mutationFn: async () => {
      if (!isEditMode || !orderId) {
        throw new Error("발주서가 아직 저장되지 않았습니다.");
      }
      
      if (!emailTo) {
        throw new Error("이메일 주소를 입력해 주세요.");
      }
      
      return apiRequest(`/api/purchase-orders/${orderId}/email`, {
        method: "POST",
        body: { email: emailTo }
      });
    },
    onSuccess: () => {
      toast({
        title: "이메일 발송 완료",
        description: "발주서가 이메일로 발송되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "이메일 발송 실패",
        description: `이메일을 발송하는데 실패했습니다: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // 항목 추가
  const addItem = () => {
    setItems([...items, { ...emptyOrderItem }]);
  };

  // 항목 삭제
  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast({
        title: "항목 삭제 실패",
        description: "최소 1개 이상의 항목이 필요합니다.",
        variant: "destructive"
      });
      return;
    }
    
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  // 항목 업데이트
  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 금액 자동 계산
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : Number(newItems[index].quantity);
      const unitPrice = field === 'unitPrice' ? Number(value) : Number(newItems[index].unitPrice);
      newItems[index].amount = quantity * unitPrice;
    }
    
    // 자재 선택 시 자동 채우기
    if (field === 'itemId' && inventoryItems) {
      const selectedItem = inventoryItems.find((item: any) => item.id === Number(value));
      if (selectedItem) {
        newItems[index] = {
          ...newItems[index],
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          specification: selectedItem.specification || "",
          unitType: selectedItem.unitType || "EA",
          unitPrice: selectedItem.unitPrice || 0
        };
        
        // 수량과 단가가 있으면 금액 자동 계산
        if (newItems[index].quantity && newItems[index].unitPrice) {
          newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].unitPrice);
        }
      }
    }
    
    setItems(newItems);
  };

  // 총 금액 계산
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  // 발주서 저장
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!order.projectName || !order.manager || !order.vendorName) {
      toast({
        title: "입력 오류",
        description: "현장명, 담당자, 업체명은 필수 입력 항목입니다.",
        variant: "destructive"
      });
      return;
    }
    
    // 항목 유효성 검사
    const invalidItems = items.filter(item => !item.itemName || !item.quantity);
    if (invalidItems.length > 0) {
      toast({
        title: "항목 입력 오류",
        description: "모든 항목의 품명과 수량을 입력해 주세요.",
        variant: "destructive"
      });
      return;
    }
    
    // 발주서 저장
    savePurchaseOrder({ order, items });
  };

  // PDF 다운로드
  const handleDownloadPdf = () => {
    if (isEditMode && orderId) {
      window.open(`/api/purchase-orders/${orderId}/pdf`, '_blank');
    } else {
      toast({
        title: "PDF 다운로드 실패",
        description: "발주서를 먼저 저장해 주세요.",
        variant: "destructive"
      });
    }
  };

  // 이메일 발송
  const handleSendEmail = () => {
    if (!emailTo) {
      toast({
        title: "이메일 주소 필요",
        description: "이메일 주소를 입력해 주세요.",
        variant: "destructive"
      });
      return;
    }
    
    sendEmail();
  };

  if (isOrderLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="material-icons animate-spin mr-2">refresh</span>
        <span>발주서를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isEditMode ? "발주서 수정" : "새 발주서 작성"}</CardTitle>
            <CardDescription>
              자재 발주서를 작성하고 이메일로 발송합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="projectName">현장명 *</Label>
                <Input
                  id="projectName"
                  value={order.projectName}
                  onChange={(e) => setOrder({ ...order, projectName: e.target.value })}
                  placeholder="현장명을 입력하세요"
                  required
                />
              </div>
              <div>
                <Label htmlFor="orderDate">발주일</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={order.orderDate ? order.orderDate.toString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  onChange={(e) => setOrder({ ...order, orderDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="manager">담당자 *</Label>
                <Input
                  id="manager"
                  value={order.manager}
                  onChange={(e) => setOrder({ ...order, manager: e.target.value })}
                  placeholder="담당자명을 입력하세요"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactNumber">연락처</Label>
                <Input
                  id="contactNumber"
                  value={order.contactNumber || ""}
                  onChange={(e) => setOrder({ ...order, contactNumber: e.target.value })}
                  placeholder="연락처를 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="vendorName">업체명 *</Label>
                {vendors && vendors.length > 0 ? (
                  <Select
                    value={order.vendorName}
                    onValueChange={(value) => {
                      const selectedVendor = vendors.find((v: any) => v.name === value);
                      setOrder({
                        ...order,
                        vendorName: value,
                        vendorContact: selectedVendor?.phone || "",
                        vendorEmail: selectedVendor?.email || ""
                      });
                      if (selectedVendor?.email) {
                        setEmailTo(selectedVendor.email);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="거래업체를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor: any) => (
                        <SelectItem key={vendor.id} value={vendor.name}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="vendorName"
                    value={order.vendorName}
                    onChange={(e) => setOrder({ ...order, vendorName: e.target.value })}
                    placeholder="업체명을 입력하세요"
                    required
                  />
                )}
                {isLoadingVendors && (
                  <div className="text-xs text-gray-500 mt-1">거래업체 목록을 불러오는 중...</div>
                )}
              </div>
              <div>
                <Label htmlFor="vendorContact">업체 연락처</Label>
                <Input
                  id="vendorContact"
                  value={order.vendorContact || ""}
                  onChange={(e) => setOrder({ ...order, vendorContact: e.target.value })}
                  placeholder="업체 연락처를 입력하세요"
                />
              </div>
              <div>
                <Label htmlFor="vendorEmail">업체 이메일</Label>
                <Input
                  id="vendorEmail"
                  type="email"
                  value={order.vendorEmail || ""}
                  onChange={(e) => {
                    setOrder({ ...order, vendorEmail: e.target.value });
                    setEmailTo(e.target.value);
                  }}
                  placeholder="업체 이메일 주소를 입력하세요"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">비고</Label>
                <Textarea
                  id="notes"
                  value={order.notes || ""}
                  onChange={(e) => setOrder({ ...order, notes: e.target.value })}
                  placeholder="추가 메모사항을 입력하세요"
                  rows={2}
                />
              </div>
            </div>

            <div className="mb-2 flex justify-between items-center">
              <h3 className="text-lg font-medium">발주 항목</h3>
              <Button type="button" variant="outline" onClick={addItem}>
                <span className="material-icons mr-1">add</span>
                행 추가
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: "30px" }}>번호</TableHead>
                    <TableHead>품명</TableHead>
                    <TableHead>규격</TableHead>
                    <TableHead style={{ width: "80px" }}>단위</TableHead>
                    <TableHead style={{ width: "100px" }}>수량</TableHead>
                    <TableHead style={{ width: "150px" }}>단가</TableHead>
                    <TableHead style={{ width: "150px" }}>금액</TableHead>
                    <TableHead style={{ width: "60px" }}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.itemName}
                          onChange={(e) => updateItem(index, "itemName", e.target.value)}
                          placeholder="품명"
                          list={`itemsList-${index}`}
                          required
                        />
                        <datalist id={`itemsList-${index}`}>
                          {inventoryItems?.map((invItem: any) => (
                            <option key={invItem.id} value={invItem.name} data-id={invItem.id} />
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.specification || ""}
                          onChange={(e) => updateItem(index, "specification", e.target.value)}
                          placeholder="규격"
                        />
                      </TableCell>
                      <TableCell>
                        <select 
                          className="w-full p-2 border rounded"
                          value={item.unitType || "EA"}
                          onChange={(e) => updateItem(index, "unitType", e.target.value)}
                        >
                          {unitTypeOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                          min="1"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                          min="0"
                          step="100"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.amount ? item.amount.toLocaleString() : "0"}
                      </TableCell>
                      <TableCell>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <span className="material-icons text-red-500">delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-bold">
                      총 합계
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {calculateTotal().toLocaleString()}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6">
            <div className="flex-1 space-y-2">
              {isEditMode && (
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      placeholder="이메일 주소"
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleSendEmail}
                    disabled={isSending || !emailTo}
                  >
                    <span className="material-icons mr-1">email</span>
                    이메일 발송
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleDownloadPdf}
                  >
                    <span className="material-icons mr-1">download</span>
                    PDF 다운로드
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/purchase-orders")}
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="material-icons animate-spin mr-1">refresh</span>
                    저장 중...
                  </>
                ) : (
                  <>
                    <span className="material-icons mr-1">save</span>
                    발주서 저장
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default PurchaseOrderForm;