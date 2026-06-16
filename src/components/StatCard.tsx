import { type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "amber" | "green" | "rose";
  suffix?: string;
}

const colorMap = {
  blue: "from-blue-600/20 to-blue-800/10 border-blue-500/30 text-blue-400",
  amber: "from-amber-600/20 to-amber-800/10 border-amber-500/30 text-amber-400",
  green: "from-emerald-600/20 to-emerald-800/10 border-emerald-500/30 text-emerald-400",
  rose: "from-rose-600/20 to-rose-800/10 border-rose-500/30 text-rose-400",
};

export default function StatCard({ label, value, icon: Icon, color = "blue", suffix }: Props) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colorMap[color]} border p-4 transition-transform hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">{label}</p>
          <p className="text-2xl font-bold font-display">
            {value}
            {suffix && <span className="text-sm font-normal ml-1 opacity-70">{suffix}</span>}
          </p>
        </div>
        <Icon size={22} className="opacity-70" />
      </div>
      <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-current opacity-5" />
    </div>
  );
}
