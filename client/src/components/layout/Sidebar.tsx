import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

type SidebarItemProps = {
  to: string;
  icon: string;
  label: string;
  active: boolean;
};

const SidebarItem = ({ to, icon, label, active }: SidebarItemProps) => {
  return (
    <li>
      <Link href={to}>
        <a className={cn(
          "flex items-center py-3 px-4 hover:bg-light",
          active && "border-l-4 border-primary bg-blue-50 text-primary"
        )}>
          <span className="material-icons mr-3">{icon}</span>
          <span>{label}</span>
        </a>
      </Link>
    </li>
  );
};

export const Sidebar = () => {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-lg hidden md:block">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">자재 재고관리</h1>
        <p className="text-sm text-gray-500">통신·전기 자재 시스템</p>
      </div>
      
      <nav className="mt-4">
        <ul>
          <SidebarItem to="/" icon="dashboard" label="대시보드" active={location === "/"} />
          <SidebarItem to="/inventory" icon="inventory" label="재고 관리" active={location === "/inventory"} />
          <SidebarItem to="/categories" icon="category" label="카테고리 관리" active={location === "/categories"} />
          <SidebarItem to="/transactions" icon="import_export" label="입/출고 관리" active={location === "/transactions"} />
          <SidebarItem to="/history" icon="history" label="이력 조회" active={location === "/history"} />
          <SidebarItem to="/excel-upload" icon="upload_file" label="엑셀 일괄 업로드" active={location === "/excel-upload"} />
          <SidebarItem to="/settings" icon="settings" label="설정" active={location === "/settings"} />
        </ul>
      </nav>
      
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="material-icons">person</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">관리자</p>
            <p className="text-xs text-gray-500">admin@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
