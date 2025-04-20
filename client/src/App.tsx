import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Categories from "@/pages/Categories";
import Transactions from "@/pages/Transactions";
import History from "@/pages/History";
import ExcelUpload from "@/pages/ExcelUpload";
import Settings from "@/pages/Settings";
import PurchaseOrders from "@/pages/PurchaseOrders";
import PurchaseOrderForm from "@/pages/PurchaseOrderForm";
import PurchaseOrderDetail from "@/pages/PurchaseOrderDetail";
import Vendors from "@/pages/Vendors";
import EmailTest from "@/pages/EmailTest";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/categories" component={Categories} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/history" component={History} />
          <Route path="/purchase-orders" component={PurchaseOrders} />
          <Route path="/purchase-orders/new" component={PurchaseOrderForm} />
          <Route path="/purchase-orders/:id/edit">
            {(params) => <PurchaseOrderForm />}
          </Route>
          <Route path="/purchase-orders/:id">
            {(params) => <PurchaseOrderDetail />}
          </Route>
          <Route path="/excel-upload" component={ExcelUpload} />
          <Route path="/vendors" component={Vendors} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </QueryClientProvider>
  );
}

export default App;
