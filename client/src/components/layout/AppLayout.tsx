import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type AppLayoutProps = {
  children: React.ReactNode;
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        >
          <div 
            className="absolute top-0 left-0 w-64 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}
      
      {/* Desktop sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-100">
          {children}
        </main>
        
        <footer className="py-4 px-6 border-t border-gray-200 bg-white">
          <div className="text-center text-gray-600 text-sm">
            <p>&copy; 2025 주식회사 에스에스전력.</p>
            <p>All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
