import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import LockerPoolCard from "@/components/LockerPoolCard";
import { Package, Clock, DollarSign, Boxes, ArrowRight, Plus, ScanLine, Calculator, Receipt, Settings, BarChart3 } from "lucide-react";
import { formatMoney } from "@/utils/api";

export default function Home() {
  const navigate = useNavigate();
  const stats = useAppStore((s) => s.stats);
  const fetchStats = useAppStore((s) => s.fetchStats);
  const fetchDeliveries = useAppStore((s) => s.fetchDeliveries);
  const startPolling = useAppStore((s) => s.startPolling);
  const stopPolling = useAppStore((s) => s.stopPolling);

  useEffect(() => {
    fetchStats();
    fetchDeliveries();
    startPolling();
    return () => stopPolling();
  }, [fetchStats, fetchDeliveries, startPolling, stopPolling]);

  const shortcuts = [
    { label: "快速投放", icon: Plus, path: "/delivery", color: "bg-primary-600" },
    { label: "取件核销", icon: ScanLine, path: "/verify", color: "bg-emerald-600" },
    { label: "阶梯计费", icon: Calculator, path: "/pricing", color: "bg-amber-600" },
    { label: "账单查询", icon: Receipt, path: "/bills", color: "bg-purple-600" },
    { label: "运营看板", icon: BarChart3, path: "/ops", color: "bg-cyan-600" },
  ];

  return (
    <div className="min-h-screen">
      <PageHeader title="快递柜投放管理" subtitle="网点A区 · 实时数据" />

      <div className="container mx-auto px-4 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="今日投放"
            value={stats?.todayDeliveries ?? 0}
            icon={Package}
            color="blue"
            suffix="件"
          />
          <StatCard
            label="在途滞留"
            value={stats?.inTransitCount ?? 0}
            icon={Clock}
            color="amber"
            suffix="件"
          />
          <StatCard
            label="待收费用"
            value={formatMoney(stats?.pendingFees ?? 0)}
            icon={DollarSign}
            color="rose"
          />
          <StatCard
            label="格口总数"
            value={stats?.totalCapacity ?? 0}
            icon={Boxes}
            color="green"
            suffix="个"
          />
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">格口余量</h2>
            <button
              onClick={() => navigate("/lockers")}
              className="flex items-center gap-1 text-[11px] text-primary-400 hover:text-primary-300"
            >
              <Settings size={12} />
              管理
            </button>
          </div>
          <div className="space-y-3">
            {stats?.lockerPools.map((pool) => (
              <LockerPoolCard key={pool.size} pool={pool} />
            ))}
            {!stats && (
              <div className="grid grid-cols-1 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-industrial-800 animate-pulse" />
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">快捷操作</h2>
          <div className="grid grid-cols-5 gap-3">
            {shortcuts.map(({ label, icon: Icon, path, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-industrial-800/60 border border-industrial-700 hover:bg-industrial-800 transition-all active:scale-95"
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
                <span className="text-[11px] text-industrial-300 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={() => navigate("/delivery")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg hover:shadow-primary-500/25 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
              <Plus size={22} />
            </div>
            <div className="text-left">
              <p className="font-semibold">开始投放快递</p>
              <p className="text-xs text-white/70">选择格口并录入快递信息</p>
            </div>
          </div>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
