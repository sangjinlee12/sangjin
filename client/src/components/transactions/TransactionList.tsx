import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Transaction, InventoryItem, Category } from "@shared/schema";
import { format } from "date-fns";

type TransactionListProps = {
  type: 'in' | 'out';
  onTransactionClick: (item: InventoryItem) => void;
};

export const TransactionList = ({ type, onTransactionClick }: TransactionListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Filter transactions by type
  const filteredTransactions = transactions
    .filter(transaction => transaction.type === type)
    .filter(transaction => {
      if (!searchQuery) return true;
      
      const item = items.find(item => item.id === transaction.itemId);
      if (!item) return false;
      
      const search = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        item.code.toLowerCase().includes(search) ||
        (transaction.project && transaction.project.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  // Get item by id
  const getItem = (itemId: number): InventoryItem | undefined => {
    return items.find(item => item.id === itemId);
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
    <div>
      <div className="mb-4 flex">
        <div className="relative flex-grow">
          <Input
            placeholder="자재명, 코드 또는 프로젝트로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <span className="material-icons absolute left-3 top-2 text-gray-400">search</span>
        </div>
      </div>

      {isLoadingTransactions ? (
        <div className="p-8 text-center">
          <p>로딩 중...</p>
        </div>
      ) : paginatedTransactions.length > 0 ? (
        <div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜/시간</TableHead>
                  <TableHead>자재 코드</TableHead>
                  <TableHead>자재명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>수량</TableHead>
                  <TableHead>프로젝트</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => {
                  const item = getItem(transaction.itemId);
                  if (!item) return null;

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.createdAt)}
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
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onTransactionClick(item)}
                        >
                          <span className="material-icons text-sm">visibility</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
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
      ) : (
        <div className="p-8 text-center text-gray-500 border rounded-md">
          <p>등록된 {type === 'in' ? '입고' : '출고'} 이력이 없습니다.</p>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
