import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import StatCard from "@/components/dashboard/StatCard";
import CategoryDistribution from "@/components/dashboard/CategoryDistribution";
import LowStockAlert from "@/components/dashboard/LowStockAlert";
import InventoryTable from "@/components/dashboard/InventoryTable";
import ItemDetailModal from "@/components/inventory/ItemDetailModal.jsx";
import NewItemModal from "@/components/inventory/NewItemModal.jsx";
import { InventoryItem } from "@shared/schema";

export default function Dashboard() {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['/api/dashboard'],
  });

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setIsDetailModalOpen(true);
  };

  const handleAddItem = () => {
    setItemToEdit(null);
    setIsNewItemModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsNewItemModalOpen(true);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedItemId(null);
  };

  const handleCloseNewItemModal = () => {
    setIsNewItemModalOpen(false);
    setItemToEdit(null);
  };

  return (
    <div>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="총 재고 품목"
          value={isLoading ? 0 : dashboardStats?.totalItems || 0}
          change={{ value: "15개 증가", positive: true }}
          icon="inventory_2"
          iconColor="primary"
        />
        <StatCard
          title="부족 재고"
          value={isLoading ? 0 : dashboardStats?.lowStockItems || 0}
          change={{ value: "5개 증가", positive: false }}
          icon="warning"
          iconColor="yellow-500"
        />
        <StatCard
          title="이번 달 입고"
          value={isLoading ? 0 : dashboardStats?.monthlyInflow || 0}
          change={{ value: "12% 증가", positive: true }}
          icon="add_box"
          iconColor="green-600"
        />
        <StatCard
          title="이번 달 출고"
          value={isLoading ? 0 : dashboardStats?.monthlyOutflow || 0}
          change={{ value: "5% 감소", positive: false }}
          icon="outbox"
          iconColor="primary"
        />
      </div>

      {/* Categories & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <CategoryDistribution
          data={isLoading ? [] : dashboardStats?.categoryDistribution || []}
        />
        <LowStockAlert onItemClick={handleItemClick} />
      </div>

      {/* Inventory Table */}
      <div className="grid grid-cols-1 gap-6">
        <InventoryTable
          onAddItem={handleAddItem}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          onViewItem={handleItemClick}
        />
      </div>

      {/* Modals */}
      <ItemDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        itemId={selectedItemId}
        onEdit={handleEditItem}
      />

      <NewItemModal
        isOpen={isNewItemModalOpen}
        onClose={handleCloseNewItemModal}
        itemToEdit={itemToEdit}
      />
    </div>
  );
}
