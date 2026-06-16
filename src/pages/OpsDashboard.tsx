import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  LockerSize,
  OpsBreakdownItem,
  OpsDashboardData,
  TimeRange,
  DeliveryRecord,
  OpsTrendData,
  OpsTrendDay,
} from "../../shared/types";
import { recommendAvailableLockerSize } from "../../shared/types";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import {
  Package,
  CheckCircle,
  TrendingUp,
  Clock,
  DollarSign,
  ArrowLeft,
  ChevronRight,
  BarChart3,
  Users,
  Boxes,
  AlertTriangle,
  LineChart,
} from "lucide-react";
import { api, SIZE_LABEL, formatDateTime, formatMoney, maskPhone } from "@/utils/api";

const RANGE_LABEL: Record<TimeRange, string> = {
  today: "今天",
  week: "本周",
  month: "本月",
};

const TREND_LABEL: Record<number, string> = {
  7: "近7天",
  30: "近30天",
};

export default function OpsDashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>("today");
  const [trendDays, setTrendDays] = useState<number>(7);
  const [data, setData] = useState<OpsDashboardData | null>(null);
  const [trendData, setTrendData] = useState<OpsTrendData | null>(null);
  const [filter, setFilter] = useState<{ courierId?: string; size?: LockerSize; dateTs?: number }>({});
  const [showDetail, setShowDetail] = useState<null | { type: "courier" | "size" | "date"; key: string; label: string }>(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getOpsDashboard(range, filter)
      .then(setData)
      .finally(() => setLoading(false));
  }, [range, filter]);

  useEffect(() => {
    setTrendLoading(true);
    api
      .getOpsTrend(trendDays, filter)
      .then(setTrendData)
      .finally(() => setTrendLoading(false));
  }, [trendDays, filter]);

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    let rs = data.records;
    if (showDetail?.type === "courier") {
      rs = rs.filter((r) => r.courierId === showDetail.key);
    } else if (showDetail?.type === "size") {
      rs = rs.filter((r) => r.lockerSize === showDetail.key);
    } else if (showDetail?.type === "date" && showDetail.key) {
      const ts = Number(showDetail.key);
      const nextTs = ts + 24 * 60 * 60 * 1000;
      rs = rs.filter((r) => r.deliveryTime >= ts && r.deliveryTime < nextTs);
    }
    return rs;
  }, [data, showDetail]);

  function renderBreakdownCard(
    item: OpsBreakdownItem,
    type: "courier" | "size",
    icon: typeof Users
  ) {
    const tension = item.pickupRate < 60 ? "bg-rose-500" : item.pickupRate < 80 ? "bg-amber-500" : "bg-emerald-500";
    return (
      <button
        key={item.key}
        onClick={() => setShowDetail({ type, key: item.key, label: item.label })}
        className="w-full text-left p-4 rounded-xl bg-industrial-800/70 border border-industrial-700 hover:border-primary-600 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary-900/50 text-primary-400 flex items-center justify-center">
              {icon === Users ? <Users size={16} /> : <Boxes size={16} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-industrial-400">
                投放 {item.deliveryCount} 件 · 已取 {item.pickedUpCount} 件
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-industrial-500" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-industrial-400">取件率</p>
            <p className={`text-sm font-bold ${item.pickupRate < 60 ? "text-rose-400" : "text-emerald-400"}`}>
              {item.pickupRate}%
            </p>
          </div>
          <div>
            <p className="text-xs text-industrial-400">滞留费</p>
            <p className="text-sm font-bold text-amber-400">{formatMoney(item.overdueFee)}</p>
          </div>
          <div>
            <p className="text-xs text-industrial-400">均天数</p>
            <p className="text-sm font-bold text-white">{item.avgDays}天</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-industrial-700 overflow-hidden">
          <div className={`h-full ${tension}`} style={{ width: `${item.pickupRate}%` }} />
        </div>
      </button>
    );
  }

  if (showDetail) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title={`${showDetail.label} 明细`}
          subtitle={`${RANGE_LABEL[range]} · 共 ${filteredRecords.length} 条`}
          right={
            <button onClick={() => setShowDetail(null)} className="flex items-center gap-1 text-sm text-primary-400">
              <ArrowLeft size={14} />
              返回
            </button>
          }
        />
        <div className="container mx-auto px-4 py-4 space-y-3">
          {filteredRecords.map((r) => (
            <RecordRow key={r.id} r={r} />
          ))}
          {filteredRecords.length === 0 && (
            <div className="text-center py-10 text-industrial-500 text-sm">暂无明细数据</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="运营看板"
        subtitle="网点A区 · 多维统计分析"
        right={
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-primary-400">
            <ArrowLeft size={14} />
            返回
          </button>
        }
      />

      <div className="container mx-auto px-4 py-4 space-y-5">
        <div className="space-y-3">
          <div className="flex gap-2 bg-industrial-800/50 p-1 rounded-xl">
            {(Object.keys(RANGE_LABEL) as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRange(r);
                  setFilter({});
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  range === r ? "bg-primary-600 text-white shadow" : "text-industrial-300 hover:text-white"
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {([7, 30] as number[]).map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                  trendDays === d
                    ? "bg-primary-900/50 border-primary-600 text-primary-300 border-primary-500/50"
                    : "bg-industrial-800/50 border-industrial-700 text-industrial-300 hover:text-white"
                }`}
              >
                <LineChart size={12} className="inline mr-1" />
                {TREND_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-industrial-800 animate-pulse" />
            ))}
          </div>
        )}

        {data && !loading && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="投放量" value={data.summary.totalDeliveries} icon={Package} color="blue" suffix="件" />
              <StatCard label="取件量" value={data.summary.totalPickedUp} icon={CheckCircle} color="green" suffix="件" />
              <StatCard
                label="取件率"
                value={`${data.summary.pickupRate}%`}
                icon={TrendingUp}
                color={data.summary.pickupRate < 60 ? "rose" : "emerald"}
              />
              <StatCard
                label="滞留费用"
                value={formatMoney(data.summary.totalOverdueFee)}
                icon={Clock}
                color="amber"
              />
              <StatCard
                label="待收总额"
                value={formatMoney(data.summary.totalPendingFee)}
                icon={DollarSign}
                color="rose"
              />
              <StatCard label="平均存放" value={`${data.summary.avgDays}天`} icon={BarChart3} color="purple" />
            </div>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <LineChart size={14} className="text-primary-400" />
                  {TREND_LABEL[trendDays]} · 趋势分析
                </h2>
                <span className="text-xs text-industrial-400">点击日期查看当日明细</span>
              </div>
              <div className="p-4 rounded-xl bg-industrial-800/70 border border-industrial-700">
                {trendLoading ? (
                  <div className="h-40 rounded-lg bg-industrial-700/50 animate-pulse" />
                ) : trendData && trendData.items.length > 0 ? (
                  <>
                    <div className="flex items-center gap-4 mb-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-500/70" />
                        <span className="text-industrial-300">投放</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500/70" />
                        <span className="text-industrial-300">取件</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1.5 rounded bg-amber-400" />
                        <span className="text-industrial-300">滞留费(元)</span>
                      </div>
                    </div>
                    <div className="relative h-40">
                      <div className="absolute inset-0 flex items-end gap-1">
                        {trendData.items.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              setShowDetail({ type: "date", key: String(item.dateTs), label: `${item.date} 明细` })
                            }
                            className="flex-1 flex flex-col items-center justify-end h-full group"
                          >
                            <div className="w-full flex items-end justify-center gap-0.5 h-28">
                              <div
                                className="w-1/2 bg-blue-500/70 rounded-t transition-all group-hover:bg-blue-400"
                                style={{
                                  height: `${(item.deliveryCount / trendData.maxDelivery) * 100}%`,
                                  minHeight: item.deliveryCount > 0 ? "4px" : "0",
                                }}
                              />
                              <div
                                className="w-1/2 bg-emerald-500/70 rounded-t transition-all group-hover:bg-emerald-400"
                                style={{
                                  height: `${(item.pickedUpCount / trendData.maxDelivery) * 100}%`,
                                  minHeight: item.pickedUpCount > 0 ? "4px" : "0",
                                }}
                              />
                            </div>
                            <div className="w-full h-6 flex items-center justify-center mt-1">
                              <div
                                className="h-1 bg-amber-400 rounded transition-all group-hover:bg-amber-300"
                                style={{
                                  width: `${Math.max(20, (item.overdueFee / trendData.maxFee) * 100)}%`,
                                  opacity: item.overdueFee > 0 ? 1 : 0,
                                }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {trendData.items.map((item, idx) => (
                        <div key={idx} className="flex-1 text-center">
                          <p className="text-[10px] text-industrial-400">{item.date}</p>
                          <p className="text-[10px] text-blue-400">投{item.deliveryCount}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-industrial-500">
                    暂无趋势数据
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Boxes size={14} className="text-primary-400" />
                  格口余量与紧张度
                </h2>
              </div>
              <div className="space-y-2">
                {data.lockerTension.map((t) => {
                  const isTight = t.rate >= 80 || t.status === "disabled";
                  return (
                    <div key={t.size} className="p-3 rounded-xl bg-industrial-800/70 border border-industrial-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{t.label}格口</span>
                          {t.status === "disabled" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900/50 text-rose-300">
                              已停用
                            </span>
                          )}
                          {isTight && t.status === "active" && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300">
                              <AlertTriangle size={10} />
                              紧张
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-industrial-400">
                          {t.available}/{t.total} 可用 · 占用 {t.rate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-industrial-700 overflow-hidden">
                        <div
                          className={`h-full ${
                            t.status === "disabled"
                              ? "bg-industrial-600"
                              : t.rate >= 90
                              ? "bg-rose-500"
                              : t.rate >= 70
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${t.status === "disabled" ? 100 : t.rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Users size={14} className="text-primary-400" />
                快递员维度 ({data.byCourier.length})
              </h2>
              <div className="space-y-3">
                {data.byCourier.map((item) => renderBreakdownCard(item, "courier", Users))}
                {data.byCourier.length === 0 && (
                  <div className="text-center py-8 text-industrial-500 text-sm">暂无数据</div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Boxes size={14} className="text-primary-400" />
                格口规格维度
              </h2>
              <div className="space-y-3">
                {data.byLockerSize.map((item) => renderBreakdownCard(item, "size", Boxes))}
                {data.byLockerSize.length === 0 && (
                  <div className="text-center py-8 text-industrial-500 text-sm">暂无数据</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function RecordRow({ r }: { r: DeliveryRecord }) {
  const isPicked = r.status === "picked_up";
  return (
    <div className="p-4 rounded-xl bg-industrial-800/70 border border-industrial-700">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-mono font-semibold text-white">{r.trackingNo}</p>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full ${
            isPicked ? "bg-emerald-900/50 text-emerald-300" : "bg-amber-900/50 text-amber-300"
          }`}
        >
          {isPicked ? "已取件" : "在途"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-industrial-400">规格：</span>
          <span className="text-white">{SIZE_LABEL[r.lockerSize]} · {r.lockerNo}</span>
        </div>
        <div>
          <span className="text-industrial-400">取件码：</span>
          <span className="text-white font-mono">{r.pickupCode}</span>
        </div>
        <div>
          <span className="text-industrial-400">快递员：</span>
          <span className="text-white">{r.courierName}</span>
        </div>
        <div>
          <span className="text-industrial-400">收件人：</span>
          <span className="text-white">{maskPhone(r.recipientPhone)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-industrial-400">投放：</span>
          <span className="text-white">{formatDateTime(r.deliveryTime)}</span>
        </div>
        {isPicked && r.pickupTime && (
          <div className="col-span-2">
            <span className="text-industrial-400">取件：</span>
            <span className="text-emerald-400">{formatDateTime(r.pickupTime)}</span>
          </div>
        )}
        <div className="col-span-2 flex items-center justify-between pt-1 border-t border-industrial-700 mt-1">
          <span className="text-industrial-400">
            {r.totalDays} 天 · {r.tierDetails.map((t) => `${t.tierLabel}×${t.days}`).join(" + ")}
          </span>
          <span className="text-amber-400 font-bold">{formatMoney(r.totalFee)}</span>
        </div>
      </div>
    </div>
  );
}
