import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  toggleSidebar: () => void;
};

const pageNames: Record<string, string> = {
  "/": "대시보드",
  "/inventory": "재고 관리",
  "/categories": "카테고리 관리",
  "/transactions": "입/출고 관리",
  "/history": "이력 조회",
  "/excel-upload": "엑셀 일괄 업로드",
  "/settings": "설정"
};

export const Header = ({ toggleSidebar }: HeaderProps) => {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-4" 
            onClick={toggleSidebar}
          >
            <span className="material-icons">menu</span>
          </Button>
          <h2 className="text-lg font-semibold">{pageNames[location] || "페이지"}</h2>
        </div>
        
        <div className="flex items-center">
          <form onSubmit={handleSearch} className="relative mr-3">
            <Input
              type="text"
              placeholder="자재 검색..."
              className="py-2 pl-10 pr-4 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="material-icons absolute left-3 top-2 text-gray-500">search</span>
          </form>
          
          <div className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <span className="material-icons">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
