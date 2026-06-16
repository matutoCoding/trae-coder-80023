import { useEffect, useState, useMemo } from "react";
import type { Bill, BillDetail, DeliveryRecord } from "../../shared/types";
import { useAppStore } from "@/store/appStore";
import { api, SIZE_LABEL, formatDateTime, formatMoney, maskPhone } from "@/utils/api";
import PageHeader from "@/components/PageHeader";
import { Receipt, ChevronRight, Package, User, Clock, CheckCircle, Filter, Calendar, CreditCard, ChevronDown, ChevronUp, AlertCircle, X } from "lucide-react";

type BillStatusFilter = "all" | "settled" | "unsettled";

export default function Bills() {
  const bills = useAppStore((s) => s.bills);
  const fetchBills = useAppStore((s) => s.fetchBills);
  const fetchDeliveries = useAppStore((s) => s.fetchDeliveries);

  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<BillStatusFilter>("all");
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [billDetail, setBillDetail] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [couriers, setCouriers] = useState<{ id: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const availableMonths = useMemo(() => {
    const months = new Set(bills.map((b) => b.period));
    return Array.from(months).sort().reverse();
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (monthFilter !== "all" && b.period !== monthFilter) return false;
      if (courierFilter !== "all" && b.courierId !== courierFilter) return false;
      if (statusFilter === "settled" && !b.settled) return false;
      if (statusFilter === "unsettled" && b.settled) return false;
      return true;
    });
  }, [bills, monthFilter, courierFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = filteredBills.length;
    const settled = filteredBills.filter((b) => b.settled).length;
    const unsettled = total - settled;
    const totalAmount = filteredBills.reduce((s, b) => s + b.totalFee, 0);
    const unsettledAmount = filteredBills.filter((b) => !b.settled).reduce((s, b) => s + b.totalFee, 0);
    return { total, settled, unsettled, totalAmount, unsettledAmount };
  }, [filteredBills]);

  useEffect(() => {
    fetchBills();
    fetchDeliveries();
    api.getCouriers().then(setCouriers).catch(() => {});
  }, [fetchBills, fetchDeliveries]);

  const openBill = async (id: string) => {
    setSelectedBillId(id);
    setLoading(true);
    try {
      const detail = await api.getBill(id);
      setBillDetail(detail);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const closeBill = () => {
    setSelectedBillId(null);
    setBillDetail(null);
  };

  const handleSettle = async () => {
    if (!selectedBillId) return;
    setSettling(true);
    try {
      const res = await api.settleBill(selectedBillId);
      if (res.success && res.bill) {
        setBillDetail({ ...billDetail!, settled: true, settledAt: res.bill.settledAt });
        await fetchBills();
      }
    } catch (e) {
      console.error(e);
    }
    setSettling(false);
  };

  const resetFilters = () => {
    setMonthFilter("all");
    setCourierFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="账单结算" subtitle="月度账单与费用结算" />

      <div className="container mx-auto px-4 py-5 space-y-4">
        {!selectedBillId && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary-600/20 to-primary-800/10 border border-primary-500/30">
                <p className="text-[11px] text-primary-300 mb-1">账单总数</p>
                <p className="text-2xl font-bold font-display text-white">{summary.total}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-800/10 border border-amber-500/30">
                <p className="text-[11px] text-amber-300 mb-1">待结算</p>
                <p className="text-2xl font-bold font-display text-amber-400">{summary.unsettled}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-industrial-800/60 border border-industrial-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-primary-400" />
                  <span className="text-sm font-semibold text-white">费用汇总</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-industrial-400 mb-0.5">总金额</p>
                  <p className="text-lg font-bold font-display text-white">{formatMoney(summary.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-industrial-400 mb-0.5">待结算金额</p>
                  <p className="text-lg font-bold font-display text-amber-400">{formatMoney(summary.unsettledAmount)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-industrial-800/60 border border-industrial-700"
            >
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-industrial-400" />
                <span className="text-sm text-white">筛选条件</span>
              </div>
              <div className="flex items-center gap-2">
                {(monthFilter !== "all" || courierFilter !== "all" || statusFilter !== "all") && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                    已筛选
                  </span>
                )}
                {showFilters ? <ChevronUp size={16} className="text-industrial-400" /> : <ChevronDown size={16} className="text-industrial-400" />}
              </div>
            </button>

            {showFilters && (
              <div className="p-4 rounded-xl bg-industrial-800/40 border border-industrial-700 space-y-3">
                <div>
                  <label className="text-xs text-industrial-400 mb-1.5 block">月份</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setMonthFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        monthFilter === "all" ? "bg-primary-600 text-white" : "bg-industrial-700 text-industrial-300"
                      }`}
                    >
                      全部
                    </button>
                    {availableMonths.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMonthFilter(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          monthFilter === m ? "bg-primary-600 text-white" : "bg-industrial-700 text-industrial-300"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-industrial-400 mb-1.5 block">快递员</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setCourierFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        courierFilter === "all" ? "bg-primary-600 text-white" : "bg-industrial-700 text-industrial-300"
                      }`}
                    >
                      全部
                    </button>
                    {couriers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCourierFilter(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          courierFilter === c.id ? "bg-primary-600 text-white" : "bg-industrial-700 text-industrial-300"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-industrial-400 mb-1.5 block">状态</label>
                  <div className="flex gap-1.5">
                    {(["all", "unsettled", "settled"] as BillStatusFilter[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          statusFilter === s ? "bg-primary-600 text-white" : "bg-industrial-700 text-industrial-300"
                        }`}
                      >
                        {s === "all" ? "全部" : s === "settled" ? "已结算" : "待结算"}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={resetFilters}
                  className="w-full py-2 text-xs text-industrial-400 hover:text-white transition"
                >
                  重置筛选
                </button>
              </div>
            )}

            {filteredBills.length === 0 ? (
              <div className="p-10 text-center rounded-xl bg-industrial-800/50 border border-industrial-700">
                <Receipt size={36} className="mx-auto mb-2 text-industrial-500" />
                <p className="text-sm text-industrial-400">暂无账单</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredBills.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => openBill(b.id)}
                    className="w-full p-4 rounded-xl bg-industrial-800/60 border border-industrial-700 hover:border-primary-500/50 transition text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                          <Receipt size={18} className="text-primary-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{b.courierName}</p>
                          <p className="text-[11px] text-industrial-400 flex items-center gap-1">
                            <Calendar size={10} />
                            {b.period}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          b.settled ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {b.settled ? "已结算" : "待结算"}
                        </span>
                        <ChevronRight size={16} className="text-industrial-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-industrial-500">投放</p>
                        <p className="text-white font-medium">{b.totalDeliveries}件</p>
                      </div>
                      <div>
                        <p className="text-industrial-500">已取件</p>
                        <p className="text-emerald-400 font-medium">{b.pickedUpCount}件</p>
                      </div>
                      <div className="text-right">
                        <p className="text-industrial-500">总费用</p>
                        <p className="text-amber-400 font-bold">{formatMoney(b.totalFee)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selectedBillId && billDetail && (
          <div>
            <button onClick={closeBill} className="text-xs text-primary-400 mb-3 flex items-center gap-1">
              <ChevronRight size={12} className="rotate-180" />
              返回账单列表
            </button>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-600/20 to-primary-800/10 border border-primary-500/30 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-base font-bold text-white">{billDetail.courierName}</p>
                  <p className="text-xs text-primary-300">{billDetail.period} 账单</p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                  billDetail.settled ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {billDetail.settled ? "已结算" : "待结算"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-primary-300 mb-1">投放总件</p>
                  <p className="text-xl font-bold font-display text-white">{billDetail.totalDeliveries}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-300 mb-1">在途件</p>
                  <p className="text-xl font-bold font-display text-amber-400">{billDetail.inTransitCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-300 mb-1">已取件</p>
                  <p className="text-xl font-bold font-display text-emerald-400">{billDetail.pickedUpCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-300 mb-1">总费用</p>
                  <p className="text-xl font-bold font-display text-white">{formatMoney(billDetail.totalFee)}</p>
                </div>
              </div>
              {billDetail.settledAt && (
                <p className="text-[11px] text-primary-300/70 mt-3 pt-3 border-t border-primary-500/20">
                  结算时间：{formatDateTime(billDetail.settledAt)}
                </p>
              )}
            </div>

            {!billDetail.settled && (
              <button
                onClick={handleSettle}
                disabled={settling}
                className="w-full mb-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold disabled:opacity-60 active:scale-[0.98] transition shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                {settling ? "结算中..." : "确认结算"}
              </button>
            )}

            <div className="mb-3">
              <h3 className="text-sm font-semibold text-white mb-2">费用明细</h3>
              <p className="text-[11px] text-industrial-400">共 {billDetail.details?.length ?? 0} 条记录</p>
            </div>

            <div className="space-y-2.5">
              {billDetail.details?.map((d: DeliveryRecord) => (
                <div key={d.id} className="p-3.5 rounded-xl bg-industrial-800/60 border border-industrial-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        d.status === "in_transit" ? "bg-amber-500/15" : "bg-emerald-500/15"
                      }`}>
                        <Package size={14} className={d.status === "in_transit" ? "text-amber-400" : "text-emerald-400"} />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-semibold text-white">{d.trackingNo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-industrial-400">{SIZE_LABEL[d.lockerSize]} · {d.lockerNo}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            d.status === "in_transit" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {d.status === "in_transit" ? "在途" : "已取件"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-industrial-400">{d.totalDays}天</p>
                      <p className="text-sm font-bold text-amber-400">{formatMoney(d.totalFee)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-industrial-400 pt-2 border-t border-industrial-700">
                    <span className="flex items-center gap-1">
                      <User size={10} />
                      {maskPhone(d.recipientPhone)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      投放: {formatDateTime(d.deliveryTime)}
                    </span>
                    {d.pickupTime && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle size={10} />
                        取件: {formatDateTime(d.pickupTime)}
                      </span>
                    )}
                  </div>

                  {d.tierDetails.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-industrial-700/50">
                      <p className="text-[10px] text-industrial-500 mb-1">费用来源</p>
                      <div className="space-y-0.5">
                        {d.tierDetails.map((t) => (
                          <div key={t.tierId} className="flex justify-between text-[10px]">
                            <span className="text-industrial-400">{t.tierLabel} × {t.days}天</span>
                            <span className="text-industrial-300">{formatMoney(t.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
