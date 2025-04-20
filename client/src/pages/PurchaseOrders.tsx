import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "wouter";
import { PurchaseOrderStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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

export const PurchaseOrdersPage = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // 발주서 목록 조회
  const { data: purchaseOrders, isLoading, isError } = useQuery({
    queryKey: ["/api/purchase-orders"],
    queryFn: async ({ queryKey }) => {
      const response = await fetch(queryKey[0]);
      if (!response.ok) {
        throw new Error("Failed to fetch purchase orders");
      }
      return response.json();
    }
  });

  // 검색 필터링
  const filteredOrders = purchaseOrders?.filter(order => 
    order.projectName.includes(searchQuery) || 
    order.orderNumber.includes(searchQuery) ||
    order.vendorName.includes(searchQuery)
  ) || [];

  return (
    <div>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>발주서 관리</CardTitle>
            <CardDescription>
              자재 발주서를 작성하고 관리합니다.
            </CardDescription>
          </div>
          <Link href="/purchase-orders/new">
            <Button>
              <span className="material-icons mr-2">add</span>
              새 발주서 작성
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder="발주서 검색 (현장명, 발주번호, 업체명)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <span className="material-icons absolute left-3 top-2 text-gray-400">search</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-4">
              <span className="material-icons animate-spin">refresh</span>
              <span className="ml-2">불러오는 중...</span>
            </div>
          ) : isError ? (
            <div className="flex justify-center p-4 text-red-500">
              <span className="material-icons mr-2">error</span>
              <span>발주서를 불러오는데 실패했습니다.</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              {searchQuery ? (
                <div>
                  <p className="text-lg font-semibold">검색 결과가 없습니다.</p>
                  <p className="text-sm">검색어를 변경하거나 새 발주서를 작성해 보세요.</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold">등록된 발주서가 없습니다.</p>
                  <p className="text-sm">새 발주서를 작성해 보세요.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>발주번호</TableHead>
                    <TableHead>발주일</TableHead>
                    <TableHead>현장명</TableHead>
                    <TableHead>공급업체</TableHead>
                    <TableHead className="text-center">상태</TableHead>
                    <TableHead className="text-right">총액</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        {order.orderDate && format(new Date(order.orderDate), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell>{order.projectName}</TableCell>
                      <TableCell>{order.vendorName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={statusColorMap[order.status]}>
                          {statusKorean[order.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {order.totalAmount ? `${Number(order.totalAmount).toLocaleString()}원` : ""}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Link href={`/purchase-orders/${order.id}`}>
                            <Button variant="outline" size="sm">
                              <span className="material-icons text-sm">visibility</span>
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              window.open(`/api/purchase-orders/${order.id}/pdf`, '_blank');
                            }}
                          >
                            <span className="material-icons text-sm">picture_as_pdf</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrdersPage;