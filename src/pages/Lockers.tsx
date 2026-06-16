import { useEffect, useState } from "react";
import type { LockerPool, LockerSize } from "../../shared/types";
import { useAppStore } from "@/store/appStore";
import { api, SIZE_LABEL, SIZE_DESC, formatMoney } from "@/utils/api";
import PageHeader from "@/components/PageHeader";
import LockerPoolCard from "@/components/LockerPoolCard";
import { Box, Settings, Power, PowerOff, AlertTriangle, Info } from "lucide-react";

export default function Lockers() {
  const stats = useAppStore((s) => s.stats);
  const fetchStats = useAppStore((s) => s.fetchStats);
  const startPolling = useAppStore((s) => s.startPolling);
  const stopPolling = useAppStore((s) => s.stopPolling);

  const [loadingSize, setLoadingSize] = useState<LockerSize | null>(null);

  useEffect(() => {
    fetchStats();
    startPolling();
    return () => stopPolling();
  }, [fetchStats, startPolling, stopPolling]);

  const handleToggleStatus = async (size: LockerSize, currentStatus: string) => {
    setLoadingSize(size);
    try {
      const newStatus = currentStatus === "active" ? "disabled" : "active";
      await api.toggleLockerStatus(size, newStatus);
      await fetchStats();
    } catch (e) {
      console.error(e);
    }
    setLoadingSize(null);
  };

  const activeCount = stats?.lockerPools.filter((p) => p.status === "active").length ?? 0;
  const disabledCount = stats?.lockerPools.filter((p) => p.status === "disabled").length ?? 0;

  return (
    <div className="min-h-screen">
      <PageHeader title="格口管理" subtitle="格口规格与状态管理" />

      <div className="container mx-auto px-4 py-5 space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-industrial-800/60 border border-industrial-700 text-center">
            <p className="text-[10px] text-industrial-400 mb-1">总规格</p>
            <p className="text-xl font-bold font-display text-white">{stats?.lockerPools.length ?? 0}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <p className="text-[10px] text-emerald-400 mb-1">启用中</p>
            <p className="text-xl font-bold font-display text-emerald-400">{activeCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
            <p className="text-[10px] text-rose-400 mb-1">已停用</p>
            <p className="text-xl font-bold font-display text-rose-400">{disabledCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-start gap-2.5">
            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-300 mb-0.5">停用说明</p>
              <p className="text-[11px] text-amber-200/70">
                停用后该规格格口将不再出现在投放推荐中，已占用的格口不受影响，取件核销仍正常进行。
              </p>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">格口规格列表</h2>
          <div className="space-y-3">
            {stats?.lockerPools.map((pool) => (
              <div key={pool.size} className="p-4 rounded-xl bg-industrial-800/60 border border-industrial-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      pool.status === "active"
                        ? pool.size === "S" ? "bg-sky-500/20" : pool.size === "M" ? "bg-indigo-500/20" : "bg-purple-500/20"
                        : "bg-industrial-700"
                    }`}>
                      <Box size={20} className={
                        pool.status === "active"
                          ? pool.size === "S" ? "text-sky-400" : pool.size === "M" ? "text-indigo-400" : "text-purple-400"
                          : "text-industrial-500"
                      } />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{SIZE_LABEL[pool.size]}格口</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          pool.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}>
                          {pool.status === "active" ? "启用中" : "已停用"}
                        </span>
                      </div>
                      <p className="text-[11px] text-industrial-400 mt-0.5">{SIZE_DESC[pool.size]}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                  <div>
                    <p className="text-[10px] text-industrial-500">总数</p>
                    <p className="text-base font-bold text-white">{pool.total}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-industrial-500">可用</p>
                    <p className={`text-base font-bold ${pool.status === "disabled" ? "text-industrial-500" : pool.available <= Math.ceil(pool.total * 0.2) ? "text-rose-400" : "text-emerald-400"}`}>
                      {pool.status === "disabled" ? 0 : pool.available}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-industrial-500">占用</p>
                    <p className="text-base font-bold text-amber-400">{pool.total - pool.available}</p>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-industrial-900/50 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pool.status === "disabled"
                        ? "bg-industrial-600"
                        : pool.available <= Math.ceil(pool.total * 0.2)
                        ? "bg-rose-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: pool.status === "disabled" ? "0%" : `${Math.round((pool.available / pool.total) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-industrial-700">
                  <span className="text-[11px] text-industrial-500">版本号 v{pool.version}</span>
                  <button
                    onClick={() => handleToggleStatus(pool.size, pool.status)}
                    disabled={loadingSize === pool.size}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      pool.status === "active"
                        ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                    } ${loadingSize === pool.size ? "opacity-60" : ""}`}
                  >
                    {pool.status === "active" ? (
                      <>
                        <PowerOff size={14} />
                        停用
                      </>
                    ) : (
                      <>
                        <Power size={14} />
                        恢复
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
