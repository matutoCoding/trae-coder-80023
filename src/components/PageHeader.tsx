import type { ReactNode } from "react";
import { useAppStore } from "@/store/appStore";
import { User } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function PageHeader({ title, subtitle, right }: Props) {
  const courier = useAppStore((s) => s.courier);
  return (
    <header className="sticky top-0 z-40 bg-industrial-900/95 backdrop-blur-sm border-b border-industrial-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white font-display">{title}</h1>
          {subtitle && <p className="text-xs text-industrial-400 mt-0.5">{subtitle}</p>}
        </div>
        {right || (
          <div className="flex items-center gap-2 bg-industrial-800 px-3 py-1.5 rounded-full">
            <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <span className="text-xs text-industrial-200 font-medium">{courier.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
