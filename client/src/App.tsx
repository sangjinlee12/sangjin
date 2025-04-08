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
          <Route path="/excel-upload" component={ExcelUpload} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </QueryClientProvider>
  );
}

export default App;
