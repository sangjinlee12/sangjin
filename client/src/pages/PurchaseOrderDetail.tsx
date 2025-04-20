import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PurchaseOrderStatus } from "@shared/schema";

// 발주서 상태에 따른 배지 색상
const statusColorMap: Record<string, string> = {
  [PurchaseOrderStatus.DRAFT]: "bg-gray-200 text-gray-800",
  [PurchaseOrderStatus.PENDING]: "bg-blue-100 text-blue-800",
  [PurchaseOrderStatus.APPROVED]: "bg-green-100 text-green-800",
  [PurchaseOrderStatus.ORDERED]: "bg-purple-100 text-purple-800",
  [PurchaseOrderStatus.RECEIVED]: "bg-teal-100 text-teal-800",
  [PurchaseOrderStatus.CANCELED]: "bg-red-100 text-red-800"
};

// 발주서 상태 한글 표시
const statusKorean: Record<string, string> = {
  [PurchaseOrderStatus.DRAFT]: "작성 중",
  [PurchaseOrderStatus.PENDING]: "승인 대기",
  [PurchaseOrderStatus.APPROVED]: "승인됨",
  [PurchaseOrderStatus.ORDERED]: "주문됨",
  [PurchaseOrderStatus.RECEIVED]: "수령됨",
  [PurchaseOrderStatus.CANCELED]: "취소됨"
};

export const PurchaseOrderDetail = () => {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/purchase-orders/:id");
  const orderId = parseInt(params?.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailTo, setEmailTo] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // 발주서 데이터 조회
  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/purchase-orders/${orderId}`],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0]);
      if (!response.ok) {
        throw new Error("Failed to fetch purchase order");
      }
      return response.json();
    },
    enabled: !!orderId
  });

  // 이메일 전송
  const { mutate: sendEmail, isPending: isSending } = useMutation({
    mutationFn: async () => {
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
      setShowEmailDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/purchase-orders/${orderId}`] });
    },
    onError: (error) => {
      toast({
        title: "이메일 발송 실패",
        description: `이메일을 발송하는데 실패했습니다: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // 발주서 삭제
  const { mutate: deleteOrder, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/purchase-orders/${orderId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "발주서 삭제 완료",
        description: "발주서가 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      navigate("/purchase-orders");
    },
    onError: (error) => {
      toast({
        title: "발주서 삭제 실패",
        description: `발주서를 삭제하는데 실패했습니다: ${error.message}`,
        variant: "destructive"
      });
      setShowDeleteConfirm(false);
    }
  });

  // 상태 변경
  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest(`/api/purchase-orders/${orderId}`, {
        method: "PUT",
        body: { order: { status } }
      });
    },
    onSuccess: () => {
      toast({
        title: "상태 변경 완료",
        description: "발주서 상태가 변경되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/purchase-orders/${orderId}`] });
    },
    onError: (error) => {
      toast({
        title: "상태 변경 실패",
        description: `상태를 변경하는데 실패했습니다: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // PDF 다운로드
  const handleDownloadPdf = () => {
    window.open(`/api/purchase-orders/${orderId}/pdf`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="material-icons animate-spin mr-2">refresh</span>
        <span>발주서를 불러오는 중...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-500">
        <span className="material-icons text-3xl mb-2">error</span>
        <p className="mb-4">발주서를 불러오는데 실패했습니다</p>
        <Button onClick={() => navigate("/purchase-orders")}>
          발주서 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const { order, items } = data;
  const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

  // 이메일 필드 초기화
  if (order.vendorEmail && !emailTo) {
    setEmailTo(order.vendorEmail);
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle>발주서 상세</CardTitle>
              <Badge variant="outline" className={statusColorMap[order.status]}>
                {statusKorean[order.status]}
              </Badge>
            </div>
            <CardDescription>
              발주번호: {order.orderNumber}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/purchase-orders")}>
              <span className="material-icons mr-1">arrow_back</span>
              목록으로
            </Button>
            <Button variant="outline" onClick={() => navigate(`/purchase-orders/${orderId}/edit`)}>
              <span className="material-icons mr-1">edit</span>
              수정
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-1">현장명</h4>
              <p>{order.projectName}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-1">발주일</h4>
              <p>{order.orderDate ? format(new Date(order.orderDate), 'yyyy-MM-dd') : '-'}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-1">담당자</h4>
              <p>{order.manager}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-1">연락처</h4>
              <p>{order.contactNumber || '-'}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-1">업체명</h4>
              <p>{order.vendorName}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 mb-1">업체 연락처</h4>
              <p>{order.vendorContact || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-medium text-sm text-gray-500 mb-1">업체 이메일</h4>
              <p>{order.vendorEmail || '-'}</p>
            </div>
            {order.notes && (
              <div className="md:col-span-2">
                <h4 className="font-medium text-sm text-gray-500 mb-1">비고</h4>
                <p>{order.notes}</p>
              </div>
            )}
          </div>

          <h3 className="text-lg font-medium mb-2">발주 항목</h3>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>{item.specification || '-'}</TableCell>
                    <TableCell>{item.unitType || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{Number(item.unitPrice).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(item.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={6} className="text-right font-bold">
                    총 합계
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {totalAmount.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={() => updateStatus(PurchaseOrderStatus.PENDING)}
                disabled={isUpdating || order.status === PurchaseOrderStatus.PENDING}
              >
                <span className="material-icons mr-1">hourglass_empty</span>
                승인 대기
              </Button>
              <Button 
                variant="outline" 
                onClick={() => updateStatus(PurchaseOrderStatus.APPROVED)}
                disabled={isUpdating || order.status === PurchaseOrderStatus.APPROVED}
              >
                <span className="material-icons mr-1">check_circle</span>
                승인
              </Button>
              <Button 
                variant="outline" 
                onClick={() => updateStatus(PurchaseOrderStatus.ORDERED)}
                disabled={isUpdating || order.status === PurchaseOrderStatus.ORDERED}
              >
                <span className="material-icons mr-1">shopping_cart</span>
                주문 완료
              </Button>
              <Button 
                variant="outline" 
                onClick={() => updateStatus(PurchaseOrderStatus.RECEIVED)}
                disabled={isUpdating || order.status === PurchaseOrderStatus.RECEIVED}
              >
                <span className="material-icons mr-1">inventory</span>
                수령 완료
              </Button>
              <Button 
                variant="outline" 
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => updateStatus(PurchaseOrderStatus.CANCELED)}
                disabled={isUpdating || order.status === PurchaseOrderStatus.CANCELED}
              >
                <span className="material-icons mr-1">cancel</span>
                주문 취소
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline"
              onClick={handleDownloadPdf}
            >
              <span className="material-icons mr-1">download</span>
              PDF 다운로드
            </Button>
            <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <span className="material-icons mr-1">email</span>
                  이메일 발송
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>발주서 이메일 발송</DialogTitle>
                  <DialogDescription>
                    발주서를 PDF로 첨부하여 이메일로 발송합니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    받는 사람 이메일
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    placeholder="example@example.com"
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-500">
                    업체 이메일 주소를 입력하세요. PDF 발주서가 첨부파일로 전송됩니다.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowEmailDialog(false)}>
                    취소
                  </Button>
                  <Button 
                    onClick={() => sendEmail()}
                    disabled={isSending || !emailTo}
                  >
                    {isSending ? (
                      <>
                        <span className="material-icons animate-spin mr-1">refresh</span>
                        전송 중...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-1">send</span>
                        이메일 전송
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <span className="material-icons mr-1">delete</span>
                  삭제
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>발주서 삭제</DialogTitle>
                  <DialogDescription>
                    정말로 이 발주서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                    취소
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteOrder()}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="material-icons animate-spin mr-1">refresh</span>
                        삭제 중...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-1">delete</span>
                        삭제 확인
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PurchaseOrderDetail;