import { useEffect, useState } from "react";
import type { Bill, DeliveryRecord } from "../../shared/types";
import { useAppStore } from "@/store/appStore";
import { api, SIZE_LABEL, formatDateTime, formatMoney, maskPhone } from "@/utils/api";
import PageHeader from "@/components/PageHeader";
import { Receipt, ChevronRight, Package, User, Clock, CheckCircle, Filter } from "lucide-react";

export default function Bills() {
  const bills = useAppStore((s) => s.bills);
  const deliveries = useAppStore((s) => s.deliveries);
  const fetchBills = useAppStore((s) => s.fetchBills);
  const fetchDeliveries = useAppStore((s) => s.fetchDeliveries);

  const [activeTab, setActiveTab] = useState<"bills" | "details">("details");
  const [filter, setFilter] = useState<"all" | "in_transit" | "picked_up">("all");
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [billDetails, setBillDetails] = useState<(Bill & { details: DeliveryRecord[] }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBills();
    fetchDeliveries();
  }, [fetchBills, fetchDeliveries]);

  const openBill = async (id: string) => {
    setSelectedBill(id);
    setLoading(true);
    try {
      const detail = await api.getBill(id);
      setBillDetails(detail);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const totalFeeAll = filteredDeliveries.reduce((s, d) => s + d.totalFee, 0);

  return (
    <div className="min-h-screen">
      <PageHeader title="账单查询" subtitle="投放记录与费用汇总" />

      <div className="container mx-auto px-4 py-5 space-y-4">
        <div className="flex p-1 rounded-xl bg-industrial-800">
          <button
            onClick={() => { setActiveTab("details"); setSelectedBill(null); setBillDetails(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "details" ? "bg-industrial-600 text-white" : "text-industrial-400"
            }`}
          >
            投放明细
          </button>
          <button
            onClick={() => setActiveTab("bills")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "bills" ? "bg-industrial-600 text-white" : "text-industrial-400"
            }`}
          >
            账单汇总
          </button>
        </div>

        {activeTab === "details" && (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-industrial-800/60 border border-industrial-700 text-center">
                <p className="text-[10px] text-industrial-400 mb-1">总投放</p>
                <p className="text-lg font-bold text-white font-display">{filteredDeliveries.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                <p className="text-[10px] text-amber-400 mb-1">在途</p>
                <p className="text-lg font-bold text-amber-400 font-display">
                  {filteredDeliveries.filter((d) => d.status === "in_transit").length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
                <p className="text-[10px] text-rose-400 mb-1">总费用</p>
                <p className="text-lg font-bold text-rose-400 font-display">{formatMoney(totalFeeAll)}</p>
              </div>
            </div>

            <div className="flex gap-1.5">
              {(["all", "in_transit", "picked_up"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    filter === f ? "bg-primary-600 text-white" : "bg-industrial-800 text-industrial-400 hover:text-white"
                  }`}
                >
                  {f === "all" && <Filter size={12} />}
                  {f === "all" ? "全部" : f === "in_transit" ? "在途" : "已取件"}
                </button>
              ))}
            </div>

            {filteredDeliveries.length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-industrial-800/50 border border-industrial-700">
                <Receipt size={36} className="mx-auto mb-2 text-industrial-500" />
                <p className="text-sm text-industrial-400">暂无投放记录</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredDeliveries.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-industrial-800/60 border border-industrial-700">
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          d.status === "in_transit" ? "bg-amber-500/15" : "bg-emerald-500/15"
                        }`}>
                          <Package size={16} className={d.status === "in_transit" ? "text-amber-400" : "text-emerald-400"} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white font-mono">{d.trackingNo}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-industrial-400">{SIZE_LABEL[d.lockerSize]} · {d.lockerNo}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              d.status === "in_transit" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                            }`}>
                              {d.status === "in_transit" ? "在途" : "已取件"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-industrial-400">{d.totalDays}天</p>
                        <p className="text-base font-bold text-amber-400">{formatMoney(d.totalFee)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-industrial-400">
                      <span className="flex items-center gap-1"><User size={11} />{d.courierName}</span>
                      <span className="flex items-center gap-1"><Clock size={11} />{formatDateTime(d.deliveryTime)}</span>
                      {d.pickupTime && (
                        <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-400" />{formatDateTime(d.pickupTime)}</span>
                      )}
                    </div>

                    {d.tierDetails.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-industrial-700 space-y-1">
                        {d.tierDetails.map((t) => (
                          <div key={t.tierId} className="flex justify-between text-[11px]">
                            <span className="text-industrial-500">{t.tierLabel} × {t.days}天</span>
                            <span className="text-industrial-400">{formatMoney(t.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "bills" && (
          <>
            {bills.length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-industrial-800/50 border border-industrial-700">
                <Receipt size={36} className="mx-auto mb-2 text-industrial-500" />
                <p className="text-sm text-industrial-400">暂无账单</p>
              </div>
            ) : selectedBill ? (
              <div>
                <button
                  onClick={() => { setSelectedBill(null); setBillDetails(null); }}
                  className="text-xs text-primary-400 mb-3"
                >
                  ← 返回账单列表
                </button>
                {billDetails && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary-600/20 to-primary-800/10 border border-primary-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-white">{billDetails.courierName} · {billDetails.period}</p>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${billDetails.settled ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {billDetails.settled ? "已结算" : "待结算"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <p className="text-[10px] text-primary-300">投放件数</p>
                          <p className="text-xl font-bold text-white font-display">{billDetails.totalDeliveries}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-primary-300">总费用</p>
                          <p className="text-xl font-bold text-amber-400 font-display">{formatMoney(billDetails.totalFee)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {billDetails.details?.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-industrial-800/60 border border-industrial-700">
                          <div>
                            <p className="text-xs font-semibold text-white font-mono">{d.trackingNo}</p>
                            <p className="text-[10px] text-industrial-400 mt-0.5">{maskPhone(d.recipientPhone)} · {SIZE_LABEL[d.lockerSize]} · {d.totalDays}天</p>
                          </div>
                          <span className="text-sm font-bold text-amber-400">{formatMoney(d.totalFee)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {bills.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => openBill(b.id)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-industrial-800/60 border border-industrial-700 hover:border-primary-500/50 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                        <Receipt size={18} className="text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{b.courierName}</p>
                        <p className="text-[11px] text-industrial-400">{b.period} · {b.totalDeliveries}件</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-amber-400">{formatMoney(b.totalFee)}</span>
                      <ChevronRight size={18} className="text-industrial-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
