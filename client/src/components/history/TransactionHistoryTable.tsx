import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Transaction, InventoryItem, Category } from "@shared/schema";
import { format } from "date-fns";

type TransactionHistoryTableProps = {
  searchQuery: string;
  categoryFilter: string;
  typeFilter: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
};

export const TransactionHistoryTable = ({ 
  searchQuery, 
  categoryFilter, 
  typeFilter,
  startDate,
  endDate
}: TransactionHistoryTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, typeFilter, startDate, endDate]);

  // Fetch transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch items for display
  const { data: items = [] } = useQuery<InventoryItem[]>({
    queryKey: ['/api/items'],
  });

  // Fetch categories for display
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Create item map for quick lookups
  const itemMap = new Map<number, InventoryItem>();
  items.forEach(item => itemMap.set(item.id, item));

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const item = itemMap.get(transaction.itemId);
    if (!item) return false;

    // Apply search filter
    const matchesSearch = searchQuery 
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (transaction.project && transaction.project.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    // Apply category filter
    const matchesCategory = categoryFilter === 'all'
      ? true
      : item.categoryId.toString() === categoryFilter;

    // Apply type filter
    const matchesType = typeFilter === 'all'
      ? true
      : transaction.type === typeFilter;

    // Apply date filters
    const transactionDate = new Date(transaction.createdAt);
    const matchesStartDate = startDate
      ? transactionDate >= startDate
      : true;

    const matchesEndDate = endDate
      ? transactionDate <= new Date(endDate.setHours(23, 59, 59, 999))
      : true;

    return matchesSearch && matchesCategory && matchesType && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Paginate transactions
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate total pages
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Handle pagination
  const goToPage = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Get category name by id
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Format date
  const formatDate = (date: Date): string => {
    return format(new Date(date), 'yyyy-MM-dd HH:mm');
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-5 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">입출고 이력</h3>
          <span className="text-sm text-gray-500">총 {filteredTransactions.length}개의 이력</span>
        </div>
      </div>

      {isLoadingTransactions ? (
        <div className="p-8 text-center">
          <p>로딩 중...</p>
        </div>
      ) : paginatedTransactions.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜/시간</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>자재 코드</TableHead>
                <TableHead>자재명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>수량</TableHead>
                <TableHead>프로젝트</TableHead>
                <TableHead>비고</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction) => {
                const item = itemMap.get(transaction.itemId);
                if (!item) return null;

                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.type === 'in' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'in' ? '입고' : '출고'}
                      </span>
                    </TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {getCategoryName(item.categoryId)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.quantity} 개
                    </TableCell>
                    <TableCell>{transaction.project || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transaction.note || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <span className="material-icons text-sm">more_vert</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>작업</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <span className="material-icons text-sm mr-2">visibility</span>
                            상세 보기
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <span className="material-icons text-sm mr-2">print</span>
                            출력
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <p>조건에 맞는 입출고 이력이 없습니다.</p>
        </div>
      )}

      {filteredTransactions.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            전체 <span className="font-medium">{filteredTransactions.length}</span>개 중 <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="material-icons text-sm">chevron_left</span>
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button 
                  key={page}
                  variant={currentPage === page ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => goToPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span className="material-icons text-sm">chevron_right</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryTable;
