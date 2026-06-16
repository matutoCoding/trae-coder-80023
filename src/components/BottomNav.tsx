import { NavLink } from "react-router-dom";
import { LayoutDashboard, Package, Receipt, Calculator, ScanLine } from "lucide-react";

const tabs = [
  { path: "/", icon: LayoutDashboard, label: "首页" },
  { path: "/delivery", icon: Package, label: "投放" },
  { path: "/verify", icon: ScanLine, label: "核销" },
  { path: "/pricing", icon: Calculator, label: "计费" },
  { path: "/bills", icon: Receipt, label: "账单" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-industrial-700 bg-industrial-900/95 backdrop-blur-sm">
      <div className="container mx-auto max-w-[480px] flex items-stretch">
        {tabs.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                isActive ? "text-primary-400" : "text-industrial-400 hover:text-industrial-200"
              }`
            }
          >
            <Icon size={22} strokeWidth={1.8} />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
