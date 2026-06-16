import type { LockerPool } from "../../shared/types";
import { Box, Ban } from "lucide-react";
import { SIZE_LABEL, SIZE_DESC } from "@/utils/api";

const sizeColors: Record<string, { bg: string; ring: string; text: string }> = {
  S: { bg: "from-sky-600/30 to-sky-800/20", ring: "ring-sky-500/40", text: "text-sky-400" },
  M: { bg: "from-indigo-600/30 to-indigo-800/20", ring: "ring-indigo-500/40", text: "text-indigo-400" },
  L: { bg: "from-purple-600/30 to-purple-800/20", ring: "ring-purple-500/40", text: "text-purple-400" },
};

export default function LockerPoolCard({ pool, compact = false }: { pool: LockerPool; compact?: boolean }) {
  const c = sizeColors[pool.size];
  const percent = Math.round((pool.available / pool.total) * 100);
  const low = pool.available <= Math.ceil(pool.total * 0.2);
  const disabled = pool.status === "disabled";

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${disabled ? "from-industrial-700/30 to-industrial-800/20" : c.bg} ring-1 ${disabled ? "ring-industrial-600/40" : c.ring} p-4 transition-all ${disabled ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg bg-industrial-900/60 flex items-center justify-center ${disabled ? "text-industrial-500" : c.text}`}>
            {disabled ? <Ban size={18} /> : <Box size={18} />}
          </div>
          <div>
            <p className={`font-semibold ${disabled ? "text-industrial-400" : c.text}`}>{SIZE_LABEL[pool.size]}格口</p>
            {!compact && <p className="text-[11px] text-industrial-400">{SIZE_DESC[pool.size]}</p>}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          disabled ? "bg-industrial-600/50 text-industrial-400" :
          low ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
        }`}>
          {disabled ? "已停用" : low ? "紧张" : "充足"}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-3xl font-bold font-display ${disabled ? "text-industrial-500" : "text-white"}`}>
          {disabled ? 0 : pool.available}
        </span>
        <span className="text-sm text-industrial-400">/ {pool.total} 可用</span>
      </div>

      <div className="w-full h-1.5 bg-industrial-900/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            disabled ? "bg-industrial-600" : low ? "bg-rose-500" : "bg-emerald-500"
          }`}
          style={{ width: disabled ? "0%" : `${percent}%` }}
        />
      </div>
      {!compact && <p className="text-[10px] text-industrial-500 mt-2">v{pool.version} · 实时同步</p>}
    </div>
  );
}
