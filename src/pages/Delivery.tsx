import { useEffect, useState, useMemo } from "react";
import type { LockerSize, DeliveryRecord, CalculateFeeResponse, PackageSize } from "../../shared/types";
import { PACKAGE_SIZE_MAP, PACKAGE_SIZE_LABEL, PACKAGE_SIZE_DESC, isSizeMismatch } from "../../shared/types";
import { useAppStore } from "@/store/appStore";
import { api, SIZE_LABEL, SIZE_DESC, formatDateTime, formatMoney, maskPhone } from "@/utils/api";
import PageHeader from "@/components/PageHeader";
import LockerPoolCard from "@/components/LockerPoolCard";
import { Plus, X, Package, Phone, Calendar, CheckCircle, Clock, AlertCircle, Copy, Key, Sparkles, Ruler } from "lucide-react";

export default function Delivery() {
  const stats = useAppStore((s) => s.stats);
  const deliveries = useAppStore((s) => s.deliveries);
  const lockerVersions = useAppStore((s) => s.lockerVersions);
  const courier = useAppStore((s) => s.courier);
  const fetchStats = useAppStore((s) => s.fetchStats);
  const fetchDeliveries = useAppStore((s) => s.fetchDeliveries);
  const startPolling = useAppStore((s) => s.startPolling);
  const stopPolling = useAppStore((s) => s.stopPolling);

  const [showModal, setShowModal] = useState(false);
  const [packageSize, setPackageSize] = useState<PackageSize>("medium");
  const [selectedSize, setSelectedSize] = useState<LockerSize>("M");
  const [trackingNo, setTrackingNo] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [expectedDays, setExpectedDays] = useState(1);
  const [feePreview, setFeePreview] = useState<CalculateFeeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successRecord, setSuccessRecord] = useState<DeliveryRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const recommendedSize = useMemo(() => PACKAGE_SIZE_MAP[packageSize], [packageSize]);
  const mismatchWarning = useMemo(() => {
    if (!packageSize) return null;
    return isSizeMismatch(packageSize, selectedSize) ? "包裹尺寸偏大，当前格口可能放不下，建议选择推荐规格" : null;
  }, [packageSize, selectedSize]);

  useEffect(() => {
    fetchStats();
    fetchDeliveries();
    startPolling();
    return () => stopPolling();
  }, [fetchStats, fetchDeliveries, startPolling, stopPolling]);

  useEffect(() => {
    if (showModal) {
      api.calculateFee({ size: selectedSize, days: expectedDays }).then(setFeePreview).catch(() => {});
    }
  }, [showModal, selectedSize, expectedDays]);

  useEffect(() => {
    if (packageSize) {
      setSelectedSize(recommendedSize);
    }
  }, [packageSize, recommendedSize]);

  const openModal = () => {
    setPackageSize("medium");
    setSelectedSize("M");
    setTrackingNo("");
    setRecipientPhone("");
    setExpectedDays(1);
    setError("");
    setSuccessRecord(null);
    setShowModal(true);
  };

  const openModalWithSize = (size: LockerSize) => {
    const pkgMap: Record<LockerSize, PackageSize> = { S: "small", M: "medium", L: "large" };
    setPackageSize(pkgMap[size]);
    setSelectedSize(size);
    setTrackingNo("");
    setRecipientPhone("");
    setExpectedDays(1);
    setError("");
    setSuccessRecord(null);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!trackingNo.trim()) return setError("请输入快递单号");
    if (!/^1\d{10}$/.test(recipientPhone)) return setError("请输入正确的手机号");
    if (isSizeMismatch(packageSize, selectedSize)) return setError("格口规格与包裹尺寸不匹配，请选择推荐规格或更大的格口");

    setLoading(true);
    setError("");

    let attempts = 0;
    while (attempts < 3) {
      try {
        const currentVersions =
          attempts === 0
            ? lockerVersions
            : (await api.getLockers()).reduce(
                (acc, p) => ({ ...acc, [p.size]: p.version }),
                {} as Record<LockerSize, number>
              );

        const res = await api.createDelivery({
          trackingNo: trackingNo.trim(),
          courierId: courier.id,
          courierName: courier.name,
          lockerSize: selectedSize,
          packageSize,
          recipientPhone,
          expectedDays,
          version: currentVersions,
        });

        if (res.success && res.record) {
          setSuccessRecord(res.record);
          await fetchStats();
          await fetchDeliveries();
          setLoading(false);
          return;
        }

        if (res.conflict) {
          attempts++;
          if (attempts >= 3) {
            setError(res.message || "投放失败，请重试");
            break;
          }
          await fetchStats();
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        setError(res.message || "投放失败");
        break;
      } catch (e: any) {
        if (e?.conflict) {
          attempts++;
          if (attempts >= 3) {
            setError(e.message || "并发冲突，请重试");
            break;
          }
          await fetchStats();
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        setError(e?.message || "网络错误");
        break;
      }
    }
    setLoading(false);
  };

  const handleCopyCode = () => {
    if (successRecord) {
      navigator.clipboard.writeText(successRecord.pickupCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inTransitList = deliveries.filter((d) => d.status === "in_transit");

  return (
    <div className="min-h-screen">
      <PageHeader title="投放管理" subtitle="选择格口投放快递" />

      <div className="container mx-auto px-4 py-5 space-y-5">
        <button
          onClick={openModal}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold shadow-lg hover:shadow-primary-500/25 transition-all active:scale-[0.99]"
        >
          <Plus size={20} />
          新增投放
        </button>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">选择格口规格</h2>
          <div className="space-y-3">
            {stats?.lockerPools.map((pool) => (
              <button
                key={pool.size}
                onClick={() => openModalWithSize(pool.size)}
                className="w-full text-left"
              >
                <LockerPoolCard pool={pool} />
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">在途快递 ({inTransitList.length})</h2>
            <span className="text-[11px] text-industrial-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              自动刷新
            </span>
          </div>
          {inTransitList.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-industrial-800/50 border border-industrial-700">
              <Package size={36} className="mx-auto mb-2 text-industrial-500" />
              <p className="text-sm text-industrial-400">暂无在途快递</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inTransitList.map((d) => (
                <div key={d.id} className="p-4 rounded-xl bg-industrial-800/60 border border-industrial-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary-600/20 flex items-center justify-center">
                        <Package size={18} className="text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{d.trackingNo}</p>
                        <p className="text-[11px] text-industrial-400">{SIZE_LABEL[d.lockerSize]} · {d.lockerNo}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      <Clock size={10} />
                      {d.totalDays}天
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1.5 text-industrial-400">
                      <Phone size={12} />
                      {maskPhone(d.recipientPhone)}
                    </div>
                    <div className="flex items-center gap-1.5 text-industrial-400">
                      <Calendar size={12} />
                      {formatDateTime(d.deliveryTime)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-industrial-700">
                    <div className="flex items-center gap-1.5">
                      <Key size={14} className="text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400 tracking-widest">{d.pickupCode}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-industrial-400">当前费用</p>
                      <p className="text-sm font-bold text-amber-400">{formatMoney(d.totalFee)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => !successRecord && setShowModal(false)}>
          <div
            className="w-full max-w-[480px] bg-industrial-900 rounded-t-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-5 py-4 bg-industrial-900 border-b border-industrial-800 z-10">
              <h3 className="font-bold text-white">{successRecord ? "投放成功" : "新增投放"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-industrial-800 text-industrial-400">
                <X size={20} />
              </button>
            </div>

            {successRecord ? (
              <div className="p-5">
                <div className="flex flex-col items-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-float">
                    <CheckCircle size={36} className="text-emerald-400" />
                  </div>
                  <p className="text-lg font-bold text-white mb-1">投放成功</p>
                  <p className="text-sm text-industrial-400">格口 {successRecord.lockerNo} 已锁定</p>
                </div>

                <div className="p-4 rounded-xl bg-industrial-800/60 border border-industrial-700 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-industrial-400">取件码</span>
                    <button onClick={handleCopyCode} className="flex items-center gap-1.5 text-xs text-primary-400">
                      <Copy size={14} />
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  <p className="text-4xl font-bold font-display text-emerald-400 tracking-[0.3em] text-center py-2">
                    {successRecord.pickupCode}
                  </p>
                </div>

                <div className="space-y-2.5 text-sm mb-5">
                  <div className="flex justify-between"><span className="text-industrial-400">快递单号</span><span className="text-white">{successRecord.trackingNo}</span></div>
                  <div className="flex justify-between"><span className="text-industrial-400">格口位置</span><span className="text-white">{SIZE_LABEL[successRecord.lockerSize]} {successRecord.lockerNo}</span></div>
                  <div className="flex justify-between"><span className="text-industrial-400">联系电话</span><span className="text-white">{maskPhone(successRecord.recipientPhone)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-industrial-700"><span className="text-industrial-400">预计费用</span><span className="text-amber-400 font-bold">{formatMoney(successRecord.totalFee)}</span></div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3.5 rounded-xl bg-primary-600 text-white font-semibold active:scale-[0.98] transition"
                >
                  完成
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-industrial-400 mb-2 block">包裹大小</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["small", "medium", "large"] as PackageSize[]).map((ps) => (
                      <button
                        key={ps}
                        onClick={() => setPackageSize(ps)}
                        className={`p-3 rounded-xl border-2 transition text-center ${
                          packageSize === ps
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-industrial-700 bg-industrial-800/50 hover:border-industrial-600"
                        }`}
                      >
                        <Ruler size={16} className={`mx-auto mb-1 ${packageSize === ps ? "text-amber-400" : "text-industrial-500"}`} />
                        <p className="text-sm font-bold text-white">{PACKAGE_SIZE_LABEL[ps]}</p>
                        <p className="text-[10px] text-industrial-400 mt-0.5">{PACKAGE_SIZE_DESC[ps]}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-industrial-400">格口规格</label>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <Sparkles size={12} className="text-emerald-400" />
                      <span className="text-[11px] text-emerald-400">推荐 {SIZE_LABEL[recommendedSize]}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["S", "M", "L"] as LockerSize[]).map((s) => {
                      const pool = stats?.lockerPools.find((p) => p.size === s);
                      const isRecommended = s === recommendedSize;
                      const isTooSmall = isSizeMismatch(packageSize, s);
                      return (
                        <button
                          key={s}
                          onClick={() => setSelectedSize(s)}
                          disabled={pool && pool.available <= 0}
                          className={`relative p-3 rounded-xl border-2 transition text-center ${
                            selectedSize === s
                              ? isTooSmall
                                ? "border-rose-500 bg-rose-500/10"
                                : "border-primary-500 bg-primary-500/10"
                              : isTooSmall
                              ? "border-industrial-700 bg-industrial-800/30 opacity-50"
                              : "border-industrial-700 bg-industrial-800/50 hover:border-industrial-600"
                          } ${pool && pool.available <= 0 ? "cursor-not-allowed" : ""}`}
                        >
                          {isRecommended && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Sparkles size={10} className="text-white" />
                            </span>
                          )}
                          <p className="text-sm font-bold text-white">{SIZE_LABEL[s]}</p>
                          <p className="text-[10px] text-industrial-400 mt-0.5">{SIZE_DESC[s]}</p>
                          <p className="text-[11px] text-primary-400 mt-1">余{pool?.available ?? 0}</p>
                        </button>
                      );
                    })}
                  </div>
                  {mismatchWarning && (
                    <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
                      <AlertCircle size={14} className="text-rose-400 shrink-0" />
                      <p className="text-[11px] text-rose-300">{mismatchWarning}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-industrial-400 mb-2 block">快递单号</label>
                  <input
                    type="text"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value.toUpperCase())}
                    placeholder="请输入快递单号"
                    className="w-full px-4 py-3 rounded-xl bg-industrial-800 border border-industrial-700 text-white placeholder-industrial-500 focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs text-industrial-400 mb-2 block">收件人手机号</label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="11位手机号"
                    className="w-full px-4 py-3 rounded-xl bg-industrial-800 border border-industrial-700 text-white placeholder-industrial-500 focus:border-primary-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs text-industrial-400 mb-2 block">预计存放天数</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpectedDays((d) => Math.max(1, d - 1))}
                      className="w-11 h-11 rounded-xl bg-industrial-800 border border-industrial-700 text-white font-bold text-lg active:bg-industrial-700"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold font-display text-white">{expectedDays}</span>
                      <span className="text-sm text-industrial-400 ml-1">天</span>
                    </div>
                    <button
                      onClick={() => setExpectedDays((d) => Math.min(30, d + 1))}
                      className="w-11 h-11 rounded-xl bg-industrial-800 border border-industrial-700 text-white font-bold text-lg active:bg-industrial-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[1, 3, 7, 14].map((d) => (
                      <button
                        key={d}
                        onClick={() => setExpectedDays(d)}
                        className={`flex-1 py-1.5 text-xs rounded-lg transition ${
                          expectedDays === d ? "bg-primary-600 text-white" : "bg-industrial-800 text-industrial-400"
                        }`}
                      >
                        {d}天
                      </button>
                    ))}
                  </div>
                </div>

                {feePreview && (
                  <div className="p-4 rounded-xl bg-industrial-800/60 border border-industrial-700">
                    <p className="text-xs text-industrial-400 mb-2">费用预览 · {SIZE_LABEL[selectedSize]}</p>
                    <div className="space-y-1.5 mb-2">
                      {feePreview.tierDetails.map((t) => (
                        <div key={t.tierId} className="flex justify-between text-xs">
                          <span className="text-industrial-300">{t.tierLabel} × {t.days}天</span>
                          <span className="text-industrial-300">¥{t.unitPrice.toFixed(2)}/天 = {formatMoney(t.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-2 border-t border-industrial-700">
                      <span className="text-sm font-medium text-white">合计</span>
                      <span className="text-lg font-bold text-amber-400">{formatMoney(feePreview.totalFee)}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <AlertCircle size={16} className="text-rose-400 shrink-0" />
                    <p className="text-sm text-rose-300">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading || !!mismatchWarning}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold disabled:opacity-60 active:scale-[0.98] transition shadow-lg"
                >
                  {loading ? "投放中..." : mismatchWarning ? "请调整格口规格" : "确认投放"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
