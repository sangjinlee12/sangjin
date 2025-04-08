import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Category, InventoryItem, Transaction } from "@shared/schema";
import { exportInventoryToExcel, exportTransactionHistoryToExcel } from "@/lib/excel";
import { useToast } from "@/hooks/use-toast";

export const ExcelExportSection = () => {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Fetch data for export
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });
  
  const { data: items = [] } = useQuery<InventoryItem[]>({
    queryKey: ['/api/items']
  });
  
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions']
  });

  const handleExportInventory = async () => {
    try {
      setIsExporting(true);
      
      // Option 1: Using our frontend utility
      await exportInventoryToExcel(items, categories, {
        categoryFilter,
        includeTransactions
      });
      
      // Option 2: Using the backend endpoint
      // const params = new URLSearchParams();
      // if (categoryFilter) params.append('category', categoryFilter);
      // if (includeTransactions) params.append('transactions', 'true');
      // window.location.href = `/api/excel/export?${params.toString()}`;
      
      toast({
        title: "내보내기 완료",
        description: "재고 데이터가 성공적으로 내보내기되었습니다."
      });
    } catch (error) {
      toast({
        title: "내보내기 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTransactions = async () => {
    try {
      setIsExporting(true);
      
      // Export transaction history
      await exportTransactionHistoryToExcel(transactions, items, categories);
      
      toast({
        title: "내보내기 완료",
        description: "입출고 이력이 성공적으로 내보내기되었습니다."
      });
    } catch (error) {
      toast({
        title: "내보내기 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>재고 데이터 내보내기</CardTitle>
          <CardDescription>
            현재 재고 데이터를 엑셀 파일로 내보내기합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>카테고리 필터</Label>
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="모든 카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">모든 카테고리</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeTransactions" 
              checked={includeTransactions}
              onCheckedChange={(checked) => 
                setIncludeTransactions(checked as boolean)
              }
            />
            <Label htmlFor="includeTransactions">
              입출고 이력 포함
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleExportInventory}
            disabled={isExporting}
            className="w-full flex items-center"
          >
            {isExporting ? (
              <>
                <span className="material-icons text-sm mr-2 animate-spin">sync</span>
                내보내기 중...
              </>
            ) : (
              <>
                <span className="material-icons text-sm mr-2">file_download</span>
                재고 데이터 내보내기
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>입출고 이력 내보내기</CardTitle>
          <CardDescription>
            자재 입출고 이력을 엑셀 파일로 내보내기합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            모든 입출고 이력을 포함한 상세 보고서를 생성합니다. 
            더 세부적인 필터링이 필요한 경우 이력 조회 페이지에서 가능합니다.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleExportTransactions}
            disabled={isExporting}
            className="w-full flex items-center"
          >
            {isExporting ? (
              <>
                <span className="material-icons text-sm mr-2 animate-spin">sync</span>
                내보내기 중...
              </>
            ) : (
              <>
                <span className="material-icons text-sm mr-2">file_download</span>
                입출고 이력 내보내기
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ExcelExportSection;
