import { useState } from "react";
import type { DeliveryRecord } from "../../shared/types";
import { api, SIZE_LABEL, formatDateTime, formatMoney, maskPhone } from "@/utils/api";
import { useAppStore } from "@/store/appStore";
import PageHeader from "@/components/PageHeader";
import { ScanLine, Search, CheckCircle, AlertCircle, X, Package, Clock, Key, User, Receipt } from "lucide-react";

export default function Verify() {
  const fetchStats = useAppStore((s) => s.fetchStats);
  const fetchDeliveries = useAppStore((s) => s.fetchDeliveries);

  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [record, setRecord] = useState<DeliveryRecord | null>(null);
  const [verified, setVerified] = useState(false);

  const handleSearch = async () => {
    if (code.length < 4) {
      setError("请输入有效的取件码");
      return;
    }
    setError("");
    setSearching(true);
    try {
      const res = await api.findByPickupCode(code);
      if (res.success && res.record) {
        setRecord(res.record);
      } else {
        setError(res.message || "未找到该取件码对应的快递");
        setRecord(null);
      }
    } catch (e: any) {
      setError(e?.message || "查询失败");
      setRecord(null);
    }
    setSearching(false);
  };

  const handleVerify = async () => {
    if (!record) return;
    setVerifying(true);
    try {
      const res = await api.verifyPickup(record.pickupCode);
      if (res.success && res.record) {
        setRecord(res.record);
        setVerified(true);
        await fetchStats();
        await fetchDeliveries();
      } else {
        setError(res.message || "核销失败");
      }
    } catch (e: any) {
      setError(e?.message || "核销失败");
    }
    setVerifying(false);
  };

  const reset = () => {
    setCode("");
    setRecord(null);
    setError("");
    setVerified(false);
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="取件核销" subtitle="输入或扫描取件码完成核销" />

      <div className="container mx-auto px-4 py-5 space-y-5">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-industrial-800 to-industrial-900 border border-industrial-700 card-glow">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <ScanLine size={32} className="text-emerald-400" />
            </div>
          </div>

          <label className="text-xs text-industrial-400 mb-2 block">取件码</label>
          <div className="relative mb-4">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 8));
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="请输入6-8位取件码"
              className="w-full px-4 py-4 pr-14 text-center text-2xl font-bold font-display tracking-[0.3em] rounded-xl bg-industrial-900 border-2 border-industrial-600 text-white placeholder-industrial-500 focus:border-primary-500 focus:outline-none transition"
            />
            {code && (
              <button
                onClick={() => setCode("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-industrial-400 hover:text-white hover:bg-industrial-700"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSearch}
              disabled={!code || searching}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-industrial-700 text-white font-medium hover:bg-industrial-600 disabled:opacity-50 transition active:scale-[0.98]"
            >
              <Search size={18} />
              查询
            </button>
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-industrial-800 border border-industrial-600 text-industrial-300 font-medium hover:bg-industrial-700 transition active:scale-[0.98]"
            >
              重置
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-industrial-500">
            <ScanLine size={12} />
            支持扫码枪快速输入
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <AlertCircle size={20} className="text-rose-400 shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {record && (
          <div className={`p-5 rounded-2xl border ${verified ? "bg-emerald-500/5 border-emerald-500/30" : "bg-industrial-800/60 border-industrial-700"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Package size={18} className="text-primary-400" />
                快递信息
              </h3>
              <span
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                  verified
                    ? "bg-emerald-500/20 text-emerald-400"
                    : record.status === "in_transit"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-industrial-600 text-industrial-300"
                }`}
              >
                {verified ? "已取件" : record.status === "in_transit" ? "待取件" : "已完成"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-industrial-400">快递单号</span>
                <span className="text-sm text-white font-mono">{record.trackingNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-industrial-400">格口位置</span>
                <span className="text-sm text-white">{SIZE_LABEL[record.lockerSize]} · {record.lockerNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-industrial-400 flex items-center gap-1"><User size={12} />收件人</span>
                <span className="text-sm text-white">{maskPhone(record.recipientPhone)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-industrial-400 flex items-center gap-1"><Clock size={12} />投放时间</span>
                <span className="text-sm text-white">{formatDateTime(record.deliveryTime)}</span>
              </div>
              {record.pickupTime && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-industrial-400 flex items-center gap-1"><CheckCircle size={12} />取件时间</span>
                  <span className="text-sm text-emerald-400">{formatDateTime(record.pickupTime)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-industrial-400 flex items-center gap-1"><Key size={12} />取件码</span>
                <span className="text-sm font-bold text-emerald-400 tracking-widest">{record.pickupCode}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-industrial-700">
              <p className="text-xs text-industrial-400 mb-2 flex items-center gap-1"><Receipt size={12} />费用明细</p>
              <div className="space-y-1.5 mb-3">
                {record.tierDetails.map((t) => (
                  <div key={t.tierId} className="flex justify-between text-xs">
                    <span className="text-industrial-300">{t.tierLabel} × {t.days}天</span>
                    <span className="text-industrial-300">{formatMoney(t.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-industrial-700">
                <span className="text-sm font-medium text-white">存放 {record.totalDays} 天合计</span>
                <span className="text-xl font-bold text-amber-400">{formatMoney(record.totalFee)}</span>
              </div>
            </div>

            {!verified && record.status === "in_transit" && (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold disabled:opacity-60 active:scale-[0.98] transition shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                {verifying ? "核销中..." : "确认核销取件"}
              </button>
            )}

            {verified && (
              <div className="flex items-center justify-center gap-2 mt-4 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 font-medium">
                <CheckCircle size={18} />
                核销成功，格口已释放
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
