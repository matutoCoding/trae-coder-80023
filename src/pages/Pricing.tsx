import { useEffect, useState } from "react";
import type { LockerSize, PricingTier, CalculateFeeResponse } from "../../shared/types";
import { useAppStore } from "@/store/appStore";
import { api, SIZE_LABEL, formatMoney } from "@/utils/api";
import PageHeader from "@/components/PageHeader";
import { Calculator, Plus, Trash2, Save, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";

interface ValidationError {
  type: "gap" | "overlap" | "price_desc" | "start_day";
  message: string;
  idx?: number;
}

function validateTiers(tiers: PricingTier[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const sorted = [...tiers].sort((a, b) => a.startDay - b.startDay);

  if (sorted.length === 0) return errors;

  if (sorted[0].startDay !== 1) {
    errors.push({ type: "start_day", message: `第一档起始天数必须为1，当前为${sorted[0].startDay}`, idx: 0 });
  }

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];

    if (cur.endDay !== -1 && cur.endDay < cur.startDay) {
      errors.push({ type: "overlap", message: `第${i + 1}档结束天数不能小于起始天数`, idx: i });
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev.endDay === -1) {
        errors.push({ type: "overlap", message: `第${i}档已设为无限，后面不能再有档位`, idx: i });
      } else if (cur.startDay > prev.endDay + 1) {
        errors.push({ type: "gap", message: `第${i}档与第${i + 1}档之间有空缺（第${prev.endDay + 1}~${cur.startDay - 1}天未覆盖）`, idx: i });
      } else if (cur.startDay <= prev.endDay && prev.endDay !== -1) {
        errors.push({ type: "overlap", message: `第${i}档与第${i + 1}档天数重叠`, idx: i });
      }
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      if (cur.pricePerDay < prev.pricePerDay) {
        errors.push({ type: "price_desc", message: `第${i + 1}档单价(¥${cur.pricePerDay})不应低于第${i}档(¥${prev.pricePerDay})`, idx: i });
      }
    }
  }

  return errors;
}

export default function Pricing() {
  const pricingTiers = useAppStore((s) => s.pricingTiers);
  const fetchPricing = useAppStore((s) => s.fetchPricing);

  const [activeSize, setActiveSize] = useState<LockerSize>("M");
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [previewSize, setPreviewSize] = useState<LockerSize>("M");
  const [previewDays, setPreviewDays] = useState(5);
  const [previewResult, setPreviewResult] = useState<CalculateFeeResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  useEffect(() => {
    const filtered = pricingTiers
      .filter((t) => t.size === activeSize)
      .sort((a, b) => a.startDay - b.startDay);
    setTiers(filtered);
  }, [pricingTiers, activeSize]);

  useEffect(() => {
    api.calculateFee({ size: previewSize, days: previewDays }).then(setPreviewResult).catch(() => {});
  }, [previewSize, previewDays, pricingTiers]);

  useEffect(() => {
    setValidationErrors(validateTiers(tiers));
  }, [tiers]);

  const updateTier = (idx: number, field: "startDay" | "endDay" | "pricePerDay", value: number) => {
    setTiers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    const startDay = last ? (last.endDay === -1 ? last.startDay + 1 : last.endDay + 1) : 1;
    const lastPrice = last ? last.pricePerDay : 0.5;
    setTiers((prev) => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        size: activeSize,
        startDay,
        endDay: startDay + 1,
        pricePerDay: Number((lastPrice + 0.5).toFixed(1)),
      },
    ]);
  };

  const removeTier = (idx: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const errors = validateTiers(tiers);
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const otherSizes = pricingTiers.filter((t) => t.size !== activeSize);
      const allTiers = [...otherSizes, ...tiers.map((t) => ({ ...t, size: activeSize }))];
      await api.updatePricing(allTiers);
      await fetchPricing();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const sizeButtons: LockerSize[] = ["S", "M", "L"];

  const getTierErrors = (idx: number) => validationErrors.filter((e) => e.idx === idx);

  return (
    <div className="min-h-screen">
      <PageHeader title="阶梯计费" subtitle="按存放天数分档定价" />

      <div className="container mx-auto px-4 py-5 space-y-5">
        <section className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Calculator size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">费用预览器</h3>
              <p className="text-[11px] text-industrial-400">按真实档位计算，第N天落在哪档就按哪档单价</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {sizeButtons.map((s) => (
              <button
                key={s}
                onClick={() => setPreviewSize(s)}
                className={`py-2.5 rounded-lg text-sm font-medium transition ${
                  previewSize === s
                    ? "bg-primary-600 text-white"
                    : "bg-industrial-800 text-industrial-300 hover:bg-industrial-700"
                }`}
              >
                {SIZE_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-industrial-400 whitespace-nowrap">存放</span>
            <input
              type="range"
              min={1}
              max={30}
              value={previewDays}
              onChange={(e) => setPreviewDays(Number(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-lg font-bold font-display text-amber-400 w-14 text-right">{previewDays}天</span>
          </div>

          {previewResult && (
            <div className="p-4 rounded-xl bg-industrial-900/60 border border-industrial-700">
              <div className="space-y-2 mb-3">
                {previewResult.tierDetails.map((t, i) => (
                  <div key={t.tierId} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-amber-400">{i + 1}</span>
                    </div>
                    <div className="flex-1 flex justify-between text-xs">
                      <span className="text-industrial-300">{t.tierLabel}</span>
                      <span className="text-industrial-300">
                        {t.days}天 × ¥{t.unitPrice.toFixed(2)} = <span className="text-white font-medium">{formatMoney(t.subtotal)}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-industrial-700">
                <span className="text-sm font-medium text-white flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-amber-400" />
                  累计费用
                </span>
                <span className="text-2xl font-bold font-display text-amber-400">{formatMoney(previewResult.totalFee)}</span>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">档位配置</h3>
            <button
              onClick={handleSave}
              disabled={saving || validationErrors.length > 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
            >
              {saved ? <Sparkles size={14} /> : <Save size={14} />}
              {saved ? "已保存" : "保存"}
            </button>
          </div>

          {validationErrors.length > 0 && (
            <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-rose-400" />
                <span className="text-xs font-medium text-rose-300">配置校验未通过</span>
              </div>
              <ul className="space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i} className="text-[11px] text-rose-300 pl-5">• {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-1.5 mb-4 p-1 rounded-xl bg-industrial-800">
            {sizeButtons.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSize(s)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                  activeSize === s ? "bg-industrial-600 text-white" : "text-industrial-400 hover:text-white"
                }`}
              >
                {SIZE_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {tiers.map((tier, idx) => {
              const colors = ["from-sky-600/30 to-sky-700/20 border-sky-500/30", "from-amber-600/30 to-amber-700/20 border-amber-500/30", "from-rose-600/30 to-rose-700/20 border-rose-500/30", "from-purple-600/30 to-purple-700/20 border-purple-500/30"];
              const color = colors[idx % colors.length];
              const tierErrors = getTierErrors(idx);
              const hasError = tierErrors.length > 0;
              return (
                <div key={tier.id} className={`p-3.5 rounded-xl bg-gradient-to-br ${hasError ? "from-rose-600/20 to-rose-700/10 border-rose-500/50" : color} border`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/70 font-medium">第 {idx + 1} 档</span>
                    {tiers.length > 1 && (
                      <button
                        onClick={() => removeTier(idx)}
                        className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-rose-400 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-white/50 mb-1 block">起始天</label>
                      <input
                        type="number"
                        min={1}
                        value={tier.startDay}
                        onChange={(e) => updateTier(idx, "startDay", Math.max(1, Number(e.target.value)))}
                        className={`w-full px-2 py-2 rounded-lg bg-industrial-900/60 border text-white text-sm text-center focus:outline-none ${hasError ? "border-rose-500/60" : "border-white/10 focus:border-primary-500"}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/50 mb-1 block">结束天</label>
                      <input
                        type="number"
                        min={tier.startDay}
                        value={tier.endDay === -1 ? "" : tier.endDay}
                        placeholder="∞"
                        onChange={(e) =>
                          updateTier(idx, "endDay", e.target.value === "" ? -1 : Math.max(tier.startDay, Number(e.target.value)))
                        }
                        className={`w-full px-2 py-2 rounded-lg bg-industrial-900/60 border text-white text-sm text-center focus:outline-none ${hasError ? "border-rose-500/60" : "border-white/10 focus:border-primary-500"}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/50 mb-1 block">单价(元/天)</label>
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={tier.pricePerDay}
                        onChange={(e) => updateTier(idx, "pricePerDay", Math.max(0, Number(e.target.value)))}
                        className={`w-full px-2 py-2 rounded-lg bg-industrial-900/60 border text-white text-sm text-center focus:outline-none ${hasError ? "border-rose-500/60" : "border-white/10 focus:border-primary-500"}`}
                      />
                    </div>
                  </div>
                  {tierErrors.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {tierErrors.map((err, i) => (
                        <p key={i} className="text-[10px] text-rose-300 flex items-center gap-1">
                          <AlertTriangle size={10} />
                          {err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={addTier}
            className="w-full mt-3 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-industrial-800 border border-dashed border-industrial-600 text-industrial-300 hover:text-white hover:border-primary-500 transition"
          >
            <Plus size={16} />
            新增档位
          </button>
        </section>
      </div>
    </div>
  );
}
