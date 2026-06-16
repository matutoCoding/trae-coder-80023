import { useEffect, useState, useMemo } from "react";
import type {
  LockerSize,
  DeliveryRecord,
  PackageSize,
  BatchDeliveryResultItem,
  PricingTier,
  TierDetail,
} from "../../shared/types";
import {
  recommendAvailableLockerSize,
  getPackageSize,
  PACKAGE_SIZE_LABEL,
  PACKAGE_SIZE_DESC,
  isSizeMismatch,
} from "../../shared/types";
import { useAppStore } from "@/store/appStore";
import {
  api,
  SIZE_LABEL,
  SIZE_DESC,
  formatDateTime,
  formatMoney,
  maskPhone,
  calculateFeeLocal,
} from "@/utils/api";
import PageHeader from "@/components/PageHeader";
import LockerPoolCard from "@/components/LockerPoolCard";
import {
  Plus, X, Package, Phone, Calendar, CheckCircle, Clock, AlertCircle, Copy, Key, Sparkles, Ruler, Layers, Trash2, ChevronDown, ChevronUp, Upload, Wand2, Download, Users } from "lucide-react";

interface BatchItemForm {
  id: string;
  trackingNo: string;
  recipientPhone: string;
  length: number;
  width: number;
  height: number;
  expectedDays: number;
  parseError?: string;
}

function createEmptyBatchItem(): BatchItemForm {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    trackingNo: "",
    recipientPhone: "",
    length: 0,
    width: 0,
    height: 0,
    expectedDays: 1,
  };
}

function parsePastedLine(
  line: string,
  defaultDays: number
): { ok: boolean; item?: BatchItemForm; error?: string } {
  const trimmed = line.trim();
  if (!trimmed) return { ok: false };
  const parts = trimmed.split(/[\t,，\s]+/).filter(Boolean);
  if (parts.length < 5) {
    return { ok: false, error: `字段不足（需要单号+手机+长+宽+高，实际${parts.length}个字段）` };
  }
  const [trackingNo, recipientPhone, l, w, h, daysStr] = parts;
  const length = Number(l);
  const width = Number(w);
  const height = Number(h);
  const expectedDays = daysStr ? Number(daysStr) : defaultDays;
  if (!trackingNo) return { ok: false, error: "快递单号为空" };
  if (!/^1\d{10}$/.test(recipientPhone || "")) return { ok: false, error: "手机号格式错误" };
  if (!Number.isFinite(length) || length <= 0) return { ok: false, error: "长度无效" };
  if (!Number.isFinite(width) || width <= 0) return { ok: false, error: "宽度无效" };
  if (!Number.isFinite(height) || height <= 0) return { ok: false, error: "高度无效" };
  return {
    ok: true,
    item: {
      ...createEmptyBatchItem(),
      trackingNo: trackingNo.toUpperCase(),
      recipientPhone,
      length,
      width,
      height,
      expectedDays: Number.isFinite(expectedDays) && expectedDays > 0 ? expectedDays : defaultDays,
    },
  };
}

export default function Delivery() {
  const stats = useAppStore((s) => s.stats);
  const deliveries = useAppStore((s) => s.deliveries);
  const lockerVersions = useAppStore((s) => s.lockerVersions);
  const courier = useAppStore((s) => s.courier);
  const setCourier = useAppStore((s) => s.setCourier);
  const fetchStats = useAppStore((s) => s.fetchStats);
  const fetchDeliveries = useAppStore((s) => s.fetchDeliveries);
  const fetchPricing = useAppStore((s) => s.fetchPricing);
  const pricingTiers = useAppStore((s) => s.pricingTiers);
  const startPolling = useAppStore((s) => s.startPolling);
  const stopPolling = useAppStore((s) => s.stopPolling);
  const couriers = useAppStore((s) => s.couriers);
  const fetchCouriers = useAppStore((s) => s.fetchCouriers);

  const [mode, setMode] = useState<"single" | "batch">("single");
  const [showModal, setShowModal] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [length, setLength] = useState(20);
  const [width, setWidth] = useState(15);
  const [height, setHeight] = useState(10);
  const [selectedSize, setSelectedSize] = useState<LockerSize>("M");
  const [upgradedHint, setUpgradedHint] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [expectedDays, setExpectedDays] = useState(1);
  const [feePreview, setFeePreview] = useState<{ tierDetails: TierDetail[]; totalFee: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successRecord, setSuccessRecord] = useState<DeliveryRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const [batchItems, setBatchItems] = useState<BatchItemForm[]>([]);
  const [batchResult, setBatchResult] = useState<BatchDeliveryResultItem[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [expandedBatchIndex, setExpandedBatchIndex] = useState<number | null>(null);
  const [batchCourierId, setBatchCourierId] = useState(courier.id);
  const [batchDefaultDays, setBatchDefaultDays] = useState(1);

  useEffect(() => {
    fetchStats();
    fetchDeliveries();
    fetchPricing();
    fetchCouriers();
    startPolling();
    return () => stopPolling();
  }, [fetchStats, fetchDeliveries, fetchPricing, fetchCouriers, startPolling, stopPolling]);

  useEffect(() => {
    setBatchCourierId(courier.id);
  }, [courier.id]);

  const { recommendedSize, isUpgraded } = useMemo(() => {
    if (!stats?.lockerPools || length <= 0 || width <= 0 || height <= 0) {
      return { recommendedSize: "M" as LockerSize, isUpgraded: false };
    }
    const { size, upgraded } = recommendAvailableLockerSize(
      { length, width, height },
      stats.lockerPools
    );
    return { recommendedSize: size, isUpgraded: upgraded };
  }, [length, width, height, stats?.lockerPools]);

  const packageSize: PackageSize = useMemo(() => {
    if (length <= 0 || width <= 0 || height <= 0) return "medium";
    return getPackageSize({ length, width, height });
  }, [length, width, height]);

  const mismatchWarning = useMemo(() => {
    return isSizeMismatch(packageSize, selectedSize)
      ? "包裹尺寸偏大，当前格口可能放不下"
      : null;
  }, [packageSize, selectedSize]);

  useEffect(() => {
    if (mode === "single" && recommendedSize) {
      setSelectedSize(recommendedSize);
      setUpgradedHint(isUpgraded);
    }
  }, [recommendedSize, isUpgraded, mode]);

  useEffect(() => {
    if (pricingTiers && pricingTiers.length > 0 && selectedSize && expectedDays > 0) {
      const p = calculateFeeLocal(pricingTiers, selectedSize, expectedDays);
      setFeePreview(p);
    }
  }, [pricingTiers, selectedSize, expectedDays]);

  const openSingleModal = () => {
    setMode("single");
    setLength(20);
    setWidth(15);
    setHeight(10);
    setTrackingNo("");
    setRecipientPhone("");
    setExpectedDays(1);
    setError("");
    setSuccessRecord(null);
    setShowModal(true);
  };

  const openBatchModal = () => {
    setMode("batch");
    setBatchItems([createEmptyBatchItem(), createEmptyBatchItem()]);
    setBatchResult(null);
    setBatchError("");
    setExpandedBatchIndex(null);
    setShowPaste(false);
    setPasteText("");
    setBatchDefaultDays(1);
    setShowModal(true);
  };

  const openModalWithSize = (size: LockerSize) => {
    if (stats?.lockerPools.find((p) => p.size === size)?.status === "disabled") return;
    setMode("single");
    const dimMap: Record<LockerSize, { l: number; w: number; h: number }> = {
      S: { l: 15, w: 10, h: 8 },
      M: { l: 30, w: 20, h: 15 },
      L: { l: 50, w: 40, h: 30 },
    };
    const d = dimMap[size];
    setLength(d.l);
    setWidth(d.w);
    setHeight(d.h);
    setSelectedSize(size);
    setTrackingNo("");
    setRecipientPhone("");
    setExpectedDays(1);
    setError("");
    setSuccessRecord(null);
    setShowModal(true);
  };

  const handleSingleSubmit = async () => {
    if (!trackingNo.trim()) return setError("请输入快递单号");
    if (!/^1\d{10}$/.test(recipientPhone)) return setError("请输入正确的手机号");
    if (length <= 0 || width <= 0 || height <= 0) return setError("请输入有效的长宽高");
    if (isSizeMismatch(packageSize, selectedSize))
      return setError("格口规格与包裹尺寸不匹配");

    const pool = stats?.lockerPools.find((p) => p.size === selectedSize);
    if (pool?.status === "disabled") return setError("该格口规格已停用");

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

  const addBatchItem = () => {
    setBatchItems((prev) => [...prev, createEmptyBatchItem()]);
  };

  const removeBatchItem = (id: string) => {
    if (batchItems.length <= 1) return;
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateBatchItem = (id: string, field: keyof BatchItemForm, value: string | number) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const applyBatchDays = (days: number) => {
    setBatchDefaultDays(days);
    setBatchItems((prev) => prev.map((it) => ({ ...it, expectedDays: days })));
  };

  const getBatchItemRecommended = (item: BatchItemForm) => {
    if (!stats?.lockerPools || item.length <= 0 || item.width <= 0 || item.height <= 0) {
      return { size: "M" as LockerSize, upgraded: false };
    }
    return recommendAvailableLockerSize(
      { length: item.length, width: item.width, height: item.height },
      stats.lockerPools
    );
  };

  const handlePasteParse = () => {
    const lines = pasteText.split(/\r?\n/);
    const parsed: BatchItemForm[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const r = parsePastedLine(line, batchDefaultDays);
      if (r.ok && r.item) {
        parsed.push(r.item);
      } else if (r.error) {
        parsed.push({
          ...createEmptyBatchItem(),
          trackingNo: line.trim().split(/[\t,，\s]+/)[0] || `第${i + 1}行`,
          parseError: `第${i + 1}行: ${r.error || "格式错误"}`,
          expectedDays: batchDefaultDays,
        });
      }
    }
    if (parsed.length > 0) {
      setBatchItems(parsed);
    }
    setShowPaste(false);
    setPasteText("");
  };

  const handleBatchSubmit = async () => {
    const validItems = batchItems.filter(
      (item) =>
        !item.parseError &&
        item.trackingNo.trim() &&
        /^1\d{10}$/.test(item.recipientPhone) &&
        item.length > 0 &&
        item.width > 0 &&
        item.height > 0
    );

    if (validItems.length === 0) {
      setBatchError("请至少录入一件完整的快递信息");
      return;
    }

    const cur = couriers.find((c) => c.id === batchCourierId) || courier;

    setBatchLoading(true);
    setBatchError("");
    setBatchResult(null);

    try {
      const res = await api.batchDelivery({
        courierId: cur.id,
        courierName: cur.name,
        items: validItems.map((item) => ({
          trackingNo: item.trackingNo,
          recipientPhone: item.recipientPhone,
          length: Number(item.length),
          width: Number(item.width),
          height: Number(item.height),
          expectedDays: Number(item.expectedDays),
        })),
        version: lockerVersions,
      });

      setBatchResult(res.results);
      await fetchStats();
      await fetchDeliveries();
    } catch (e: any) {
      setBatchError(e?.message || "批量投放失败");
    }
    setBatchLoading(false);
  };

  const inTransitList = deliveries.filter((d) => d.status === "in_transit");

  const batchStats = useMemo(() => {
    if (!batchResult) return null;
    const success = batchResult.filter((r) => r.success).length;
    const fail = batchResult.filter((r) => !r.success).length;
    return { success, fail, total: batchResult.length };
  }, [batchResult]);

  const batchFeePreview = useMemo(() => {
    if (!pricingTiers || pricingTiers.length === 0) return null;
    let total = 0;
    for (const it of batchItems) {
      if (!it.parseError && it.length > 0 && it.width > 0 && it.height > 0) {
        const { size } = getBatchItemRecommended(it);
        total += calculateFeeLocal(pricingTiers, size, Math.max(1, it.expectedDays)).totalFee;
      }
    }
    return total;
  }, [batchItems, pricingTiers, stats?.lockerPools]);

  return (
    <div className="min-h-screen">
      <PageHeader title="投放管理" subtitle="选择格口投放快递" />

      <div className="container mx-auto px-4 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openSingleModal}
            className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-semibold shadow-lg hover:shadow-primary-500/25 transition-all active:scale-[0.99]"
          >
            <Plus size={24} />
            <span>单件投放</span>
            <span className="text-[10px] font-normal opacity-80">录入长宽高自动推荐</span>
          </button>
          <button
            onClick={openBatchModal}
            className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-[0.99]"
          >
            <Layers size={24} />
            <span>批量录入</span>
            <span className="text-[10px] font-normal opacity-80">支持粘贴导入、批量设置</span>
          </button>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-white mb-3">格口余量</h2>
          <div className="space-y-3">
            {stats?.lockerPools.map((pool) => (
              <button
                key={pool.size}
                onClick={() => openModalWithSize(pool.size)}
                disabled={pool.status === "disabled"}
                className={`w-full text-left ${pool.status === "disabled" ? "cursor-not-allowed" : ""}`}
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
                      <p className="text-[11px] text-industrial-400">
                        {SIZE_LABEL[d.lockerSize]} · {d.lockerNo}</p>
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
                    <span className="text-sm font-bold text-emerald-400 tracking-widest">
                      {d.pickupCode}
                    </span>
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

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => !successRecord && !batchResult && setShowModal(false)}
        >
          <div
            className="w-full max-w-[480px] bg-industrial-900 rounded-t-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-5 py-4 bg-industrial-900 border-b border-industrial-800 z-10">
              <div className="flex items-center gap-2">
              {mode === "batch" ? (
                <Layers size={18} className="text-indigo-400" />
              ) : (
                <Plus size={18} className="text-primary-400" />
              )}
              <h3 className="font-bold text-white">
                {successRecord
                  ? "投放成功"
                  : batchResult
                  ? "批量投放结果"
                  : mode === "batch"
                  ? "批量录入投放"
                  : "新增投放"}
              </h3>
            </div>
            <button
              onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-industrial-800 text-industrial-400">
              <X size={20} />
            </button>
          </div>

          {mode === "single" && successRecord ? (
            <div className="p-5">
              <div className="flex flex-col items-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
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
                <div className="flex justify-between">
                  <span className="text-industrial-400">快递单号</span>
                  <span className="text-white">{successRecord.trackingNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-industrial-400">格口位置</span>
                  <span className="text-white">
                    {SIZE_LABEL[successRecord.lockerSize]} {successRecord.lockerNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-industrial-400">联系电话</span>
                  <span className="text-white">{maskPhone(successRecord.recipientPhone)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-industrial-700">
                  <span className="text-industrial-400">费用明细</span>
                  <span className="text-industrial-200 text-xs">
                    {successRecord.tierDetails.map((t) => `${t.tierLabel}×${t.days}`).join(" + ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-industrial-400">预计费用</span>
                  <span className="text-amber-400 font-bold">{formatMoney(successRecord.totalFee)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3.5 rounded-xl bg-primary-600 text-white font-semibold active:scale-[0.98] transition"
              >
                完成
              </button>
            </div>
          ) : mode === "single" ? (
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-industrial-400">包裹尺寸 (cm)</label>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <Sparkles size={12} className="text-emerald-400" />
                    <span className="text-[11px] text-emerald-400">
                      推荐 {SIZE_LABEL[recommendedSize]}
                      {isUpgraded && " (升级)"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-industrial-500 mb-1 block">长</label>
                    <input
                      type="number"
                      min={0}
                      value={length}
                      onChange={(e) => setLength(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-lg bg-industrial-800 border border-industrial-700 text-white text-sm text-center focus:border-primary-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-industrial-500 mb-1 block">宽</label>
                    <input
                      type="number"
                      min={0}
                      value={width}
                      onChange={(e) => setWidth(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-lg bg-industrial-800 border border-industrial-700 text-white text-sm text-center focus:border-primary-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-industrial-500 mb-1 block">高</label>
                    <input
                      type="number"
                      min={0}
                      value={height}
                      onChange={(e) => setHeight(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 rounded-lg bg-industrial-800 border border-industrial-700 text-white text-sm text-center focus:border-primary-500 focus:outline-none transition"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-industrial-500 mt-1.5">
                  <Ruler size={10} className="inline mr-1" />
                  {PACKAGE_SIZE_LABEL[packageSize]} · {PACKAGE_SIZE_DESC[packageSize]}
                  {upgradedHint && (
                    <span className="ml-2 text-amber-400">· 原规格停用/无余量，已自动升级</span>
                  )}
                </p>
              </div>

              <div>
                <label className="text-xs text-industrial-400 mb-2 block">格口规格</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["S", "M", "L"] as LockerSize[]).map((s) => {
                    const pool = stats?.lockerPools.find((p) => p.size === s);
                    const isRecommended = s === recommendedSize;
                    const isTooSmall = isSizeMismatch(packageSize, s);
                    const isDisabled = pool?.status === "disabled";
                    return (
                      <button
                      key={s}
                      onClick={() => !isDisabled && setSelectedSize(s)}
                      disabled={isDisabled}
                      className={`relative p-3 rounded-xl border-2 transition text-center ${
                        selectedSize === s
                          ? isTooSmall
                            ? "border-rose-500 bg-rose-500/10"
                            : "border-primary-500 bg-primary-500/10"
                          : isTooSmall || isDisabled
                          ? "border-industrial-700 bg-industrial-800/30 opacity-50"
                          : "border-industrial-700 bg-industrial-800/50 hover:border-industrial-600"
                      } ${isDisabled ? "cursor-not-allowed" : ""}`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Sparkles size={10} className="text-white" />
                        </span>
                      )}
                      <p className="text-sm font-bold text-white">{SIZE_LABEL[s]}</p>
                      <p className="text-[10px] text-industrial-400 mt-0.5">{SIZE_DESC[s]}</p>
                      <p className="text-[11px] text-primary-400 mt-1">
                        {isDisabled ? "已停用" : `余${pool?.available ?? 0}`}
                      </p>
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
              <p className="text-xs text-industrial-400 mb-2">
              费用预览 · {SIZE_LABEL[selectedSize]} · 预计存放 {expectedDays} 天
            </p>
              <div className="space-y-1.5 mb-2">
                {feePreview.tierDetails.map((t) => (
                  <div key={t.tierId} className="flex justify-between text-xs">
                    <span className="text-industrial-300">
                      {t.tierLabel} × {t.days}天 × ¥{t.unitPrice.toFixed(2)}
                    </span>
                    <span className="text-industrial-300">{formatMoney(t.subtotal)}</span>
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
            onClick={handleSingleSubmit}
            disabled={loading || !!mismatchWarning}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold disabled:opacity-60 active:scale-[0.98] transition shadow-lg"
          >
            {loading ? "投放中..." : mismatchWarning ? "请调整格口规格" : "确认投放"}
          </button>
        </div>
      ) : batchResult ? (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {batchStats && batchStats.fail === 0 ? (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle size={20} className="text-emerald-400" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle size={20} className="text-amber-400" />
                </div>
              )}
              <div>
                <p className="font-bold text-white">
                  {batchStats?.success === batchStats?.total ? "全部成功" : "部分成功"}
                </p>
                <p className="text-xs text-industrial-400">
                  成功 {batchStats?.success} 件 · 失败 {batchStats?.fail} 件
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {batchResult.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border ${
                  item.success
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-rose-500/5 border-rose-500/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.success ? (
                      <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    ) : (
                      <X size={16} className="text-rose-400 shrink-0" />
                    )}
                    <span className="text-sm font-mono text-white font-medium">{item.trackingNo}</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      item.success ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {item.success ? "成功" : "失败"}
                  </span>
                </div>
                {item.success && item.record && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 text-xs text-industrial-300 space-y-1">
                    <div className="flex justify-between">
                      <span>格口</span>
                      <span>
                        {SIZE_LABEL[item.record.lockerSize]} {item.record.lockerNo}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>取件码</span>
                      <span className="text-emerald-400 font-mono">{item.record.pickupCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>费用</span>
                      <span className="text-amber-400">{formatMoney(item.record.totalFee)}</span>
                    </div>
                  </div>
                )}
                {!item.success && item.message && (
                  <p className="mt-2 text-[11px] text-rose-300">{item.message}</p>
                )}
              </div>
            ))}
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
          {showPaste ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">粘贴/导入包裹数据</h4>
                <button
                  onClick={() => setShowPaste(false)} className="text-xs text-industrial-400 hover:text-white">
                  返回
                </button>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`支持 Tab/逗号/空格分隔，每行一件
格式：单号 手机号 长 宽 高 [天数]
例如：
SF1234567890 13800138000 30 20 15 3
YT9876543210 13900139000 15 10 8`}
                className="w-full h-48 px-3 py-2 rounded-xl bg-industrial-800 border border-industrial-700 text-white text-xs font-mono placeholder-industrial-500 focus:border-primary-500 focus:outline-none resize-none"
              />
              <p className="text-[11px] text-industrial-400">
                每行一件包裹，字段用Tab/逗号/空格分隔；字段顺序：单号 手机号 长 宽 高 天数（天数可选，默认{batchDefaultDays}天）
              </p>
              <button
                onClick={handlePasteParse} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium active:scale-[0.98]">
                <Upload size={16} className="inline mr-2" />
                解析并导入
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowPaste(true)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-industrial-800/60 border border-dashed border-industrial-600 text-industrial-300 hover:text-white hover:border-indigo-500 text-sm transition">
                  <Upload size={16} />
                  粘贴导入
                </button>
                <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-industrial-800/60 border border-dashed border-industrial-600">
                  <Wand2 size={16} className="text-industrial-400" />
                  <select
                    value={batchCourierId}
                    onChange={(e) => {
                      setBatchCourierId(e.target.value);
                      const c = couriers.find((x) => x.id === e.target.value);
                      if (c) setCourier(c.id, c.name);
                    }}
                    className="bg-transparent text-sm text-white focus:outline-none"
                  >
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id} className="bg-industrial-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-industrial-800/50 border border-industrial-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-industrial-400">
                    <Users size={13} className="inline mr-1" />
                    统一设置
                  </label>
                  <span className="text-[11px] text-industrial-500">影响当前包裹将覆盖所有包裹</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-industrial-400 shrink-0">预计天数：</span>
                  <div className="flex gap-1.5 flex-1">
                    {[1, 3, 7, 14].map((d) => (
                      <button
                        key={d}
                        onClick={() => applyBatchDays(d)}
                        className={`flex-1 py-1.5 text-xs rounded-lg transition ${
                          batchDefaultDays === d
                            ? "bg-primary-600 text-white"
                            : "bg-industrial-800 text-industrial-400 hover:text-white"
                        }`}
                      >
                        {d}天
                      </button>
                    ))}
                  </div>
                </div>
                {batchFeePreview !== null && (
                  <div className="flex items-center justify-between pt-2 border-t border-industrial-700">
                    <span className="text-xs text-industrial-400">预估总费用</span>
                    <span className="text-amber-400 font-bold">{formatMoney(batchFeePreview)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {batchItems.map((item, idx) => {
                  const { size: recSize, upgraded } = getBatchItemRecommended(item);
                  const pool = stats?.lockerPools.find((p) => p.size === recSize);
                  const isExpanded = expandedBatchIndex === idx;
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border ${
                        item.parseError
                          ? "bg-rose-500/10 border-rose-500/40"
                          : "bg-industrial-800/60 border-industrial-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                              item.parseError
                                ? "bg-rose-600/40 text-rose-300"
                                : "bg-primary-600/30 text-primary-400"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {item.trackingNo || `第 ${idx + 1} 件`}
                            {upgraded && (
                              <span className="ml-1 text-[10px] text-amber-400">· 升级规格</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.parseError ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                              格式错误
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                              推荐 {SIZE_LABEL[recSize]}
                            </span>
                          )}
                          <button
                            onClick={() => setExpandedBatchIndex(isExpanded ? null : idx)}
                            className="p-1 rounded hover:bg-industrial-700 text-industrial-400"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {batchItems.length > 1 && (
                            <button
                              onClick={() => removeBatchItem(item.id)}
                              className="p-1 rounded hover:bg-rose-500/20 text-industrial-400 hover:text-rose-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {item.parseError && (
                        <p className="text-[11px] text-rose-300">{item.parseError}</p>
                      )}

                      {isExpanded && (
                        <div className="space-y-3 pt-2 border-t border-industrial-700">
                          <div>
                            <label className="text-[10px] text-industrial-500 mb-1 block">快递单号</label>
                            <input
                              type="text"
                              value={item.trackingNo}
                              onChange={(e) =>
                                updateBatchItem(item.id, "trackingNo", e.target.value.toUpperCase())}
                              placeholder="请输入单号"
                              className="w-full px-3 py-2 rounded-lg bg-industrial-900/60 border border-industrial-700 text-white text-sm focus:border-primary-500 focus:outline-none transition"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-industrial-500 mb-1 block">收件人手机号</label>
                            <input
                              type="tel"
                              value={item.recipientPhone}
                              onChange={(e) =>
                                updateBatchItem(
                                  item.id,
                                  "recipientPhone",
                                  e.target.value.replace(/\D/g, "").slice(0, 11)
                                )}
                              placeholder="11位手机号"
                              className="w-full px-3 py-2 rounded-lg bg-industrial-900/60 border border-industrial-700 text-white text-sm focus:border-primary-500 focus:outline-none transition"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-industrial-500 mb-1 block">
                              尺寸 (长×宽×高 cm)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                min={0}
                                value={item.length || ""}
                                onChange={(e) => updateBatchItem(item.id, "length", Number(e.target.value))}
                                placeholder="长"
                                className="w-full px-2 py-2 rounded-lg bg-industrial-900/60 border border-industrial-700 text-white text-sm text-center focus:border-primary-500 focus:outline-none"
                              />
                              <input
                                type="number"
                                min={0}
                                value={item.width || ""}
                                onChange={(e) => updateBatchItem(item.id, "width", Number(e.target.value))}
                                placeholder="宽"
                                className="w-full px-2 py-2 rounded-lg bg-industrial-900/60 border border-industrial-700 text-white text-sm text-center focus:border-primary-500 focus:outline-none"
                              />
                              <input
                                type="number"
                                min={0}
                                value={item.height || ""}
                                onChange={(e) => updateBatchItem(item.id, "height", Number(e.target.value))}
                                placeholder="高"
                                className="w-full px-2 py-2 rounded-lg bg-industrial-900/60 border border-industrial-700 text-white text-sm text-center focus:border-primary-500 focus:outline-none"
                              />
                            </div>
                            {pool?.status === "disabled" && (
                              <p className="text-[10px] text-rose-400 mt-1">
                                该规格已停用，将自动升级
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] text-industrial-500 mb-1 block">预计天数</label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  updateBatchItem(
                                    item.id,
                                    "expectedDays",
                                    Math.max(1, Number(item.expectedDays) - 1)
                                  )
                                }
                                className="w-8 h-8 rounded-md bg-industrial-900/60 border border-industrial-700 text-white text-sm"
                              >
                                -
                              </button>
                              <div className="flex-1 text-center text-sm text-white font-medium">
                                {item.expectedDays}天
                              </div>
                              <button
                                onClick={() =>
                                  updateBatchItem(
                                    item.id,
                                    "expectedDays",
                                    Math.min(30, Number(item.expectedDays) + 1)
                                  )
                                }
                                className="w-8 h-8 rounded-md bg-industrial-900/60 border border-industrial-700 text-white text-sm"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={addBatchItem}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-industrial-800 border border-dashed border-industrial-600 text-industrial-300 hover:text-white hover:border-primary-500 transition text-sm"
              >
                <Plus size={16} />
                添加一件
              </button>

              {batchError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <p className="text-sm text-rose-300">{batchError}</p>
                </div>
              )}

              <button
                onClick={handleBatchSubmit}
                disabled={batchLoading || batchItems.length === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold disabled:opacity-60 active:scale-[0.98] transition shadow-lg"
              >
                {batchLoading ? "提交中..." : `批量提交 (${batchItems.length}件)`}
              </button>
            </>
          )}
        </div>
        )}
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
