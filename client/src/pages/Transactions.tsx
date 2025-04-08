import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { InventoryItem } from "@shared/schema";
import TransactionModal from "@/components/transactions/TransactionModal";
import TransactionList from "@/components/transactions/TransactionList";

export default function Transactions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Fetch inventory items
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['/api/items']
  });

  const handleOpenModal = (type: 'in' | 'out', item?: InventoryItem) => {
    setTransactionType(type);
    setSelectedItem(item || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>입/출고 관리</CardTitle>
          <CardDescription>
            자재의 입고 및 출고를 관리하세요. 모든 재고 변동은 여기서 기록됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="in" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="in" className="flex items-center">
                <span className="material-icons text-sm mr-2">add_circle</span>
                입고 관리
              </TabsTrigger>
              <TabsTrigger value="out" className="flex items-center">
                <span className="material-icons text-sm mr-2">remove_circle</span>
                출고 관리
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="in">
              <div className="flex justify-end mb-4">
                <Button onClick={() => handleOpenModal('in')}>
                  <span className="material-icons text-sm mr-2">add</span>
                  신규 입고 등록
                </Button>
              </div>
              
              <TransactionList 
                type="in" 
                onTransactionClick={(item) => handleOpenModal('in', item)}
              />
            </TabsContent>
            
            <TabsContent value="out">
              <div className="flex justify-end mb-4">
                <Button onClick={() => handleOpenModal('out')}>
                  <span className="material-icons text-sm mr-2">remove</span>
                  신규 출고 등록
                </Button>
              </div>
              
              <TransactionList 
                type="out" 
                onTransactionClick={(item) => handleOpenModal('out', item)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        type={transactionType}
        selectedItem={selectedItem}
        allItems={items}
        isLoading={isLoading}
      />
    </div>
  );
}
