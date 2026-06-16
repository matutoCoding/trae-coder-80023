import type {
  TimeRange,
  OpsDashboardData,
  OpsBreakdownItem,
  LockerSize,
  DeliveryRecord,
  OpsTrendData,
  OpsTrendDay,
} from "../../shared/types";
import { SIZE_LABEL } from "../../shared/constants";
import { dataStore } from "../store/dataStore";
import { getDeliveries, getLockerPools } from "./deliveryService";
import { calculateFee, calculateDaysFromTime } from "./pricingService";

function getRangeStart(range: TimeRange): number {
  const now = new Date();
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (range === "week") {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildBreakdown(
  records: DeliveryRecord[],
  getKey: (r: DeliveryRecord) => string,
  getLabel: (r: DeliveryRecord) => string
): OpsBreakdownItem[] {
  const map = new Map<string, { label: string; records: DeliveryRecord[] }>();
  for (const r of records) {
    const k = getKey(r);
    if (!map.has(k)) {
      map.set(k, { label: getLabel(r), records: [] });
    }
    map.get(k)!.records.push(r);
  }

  const items: OpsBreakdownItem[] = [];
  for (const [key, v] of map.entries()) {
    const picked = v.records.filter((r) => r.status === "picked_up");
    const overdue = v.records.filter((r) => r.status === "in_transit");
    const overdueFee = overdue.reduce((s, r) => s + r.totalFee, 0);
    const pendingFee = v.records.reduce((s, r) => s + r.totalFee, 0);
    const avgDays =
      v.records.reduce((s, r) => {
        if (r.status === "picked_up" && r.pickupTime) {
          return s + calculateDaysFromTime(r.deliveryTime, r.pickupTime);
        }
        return s + calculateDaysFromTime(r.deliveryTime);
      }, 0) / Math.max(1, v.records.length);

    items.push({
      key,
      label: v.label,
      deliveryCount: v.records.length,
      pickedUpCount: picked.length,
      pickupRate: v.records.length === 0 ? 0 : Number(((picked.length / v.records.length) * 100).toFixed(1)),
      overdueFee: Number(overdueFee.toFixed(2)),
      pendingFee: Number(pendingFee.toFixed(2)),
      avgDays: Number(avgDays.toFixed(1)),
    });
  }
  return items.sort((a, b) => b.deliveryCount - a.deliveryCount);
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function getOpsTrend(days: number, filter?: { courierId?: string; size?: LockerSize }): OpsTrendData {
  const now = Date.now();
  const startTs = startOfDay(now - (days - 1) * 24 * 60 * 60 * 1000);
  const endTs = startOfDay(now) + 24 * 60 * 60 * 1000;

  const dayItems: OpsTrendDay[] = [];
  for (let i = 0; i < days; i++) {
    const ts = startTs + i * 24 * 60 * 60 * 1000;
    dayItems.push({
      date: formatDate(ts),
      dateTs: ts,
      deliveryCount: 0,
      pickedUpCount: 0,
      overdueFee: 0,
    });
  }

  let allRecords = Array.from(dataStore.deliveryRecords.values()).filter(
    (r) => r.deliveryTime >= startTs && r.deliveryTime < endTs
  );
  if (filter?.courierId) {
    allRecords = allRecords.filter((r) => r.courierId === filter.courierId);
  }
  if (filter?.size) {
    allRecords = allRecords.filter((r) => r.lockerSize === filter.size);
  }

  for (const r of allRecords) {
    const dayIdx = Math.floor((startOfDay(r.deliveryTime) - startTs) / (24 * 60 * 60 * 1000));
    if (dayIdx >= 0 && dayIdx < dayItems.length) {
      dayItems[dayIdx].deliveryCount++;
      if (r.status === "picked_up") {
        dayItems[dayIdx].pickedUpCount++;
      }
      if (r.status === "in_transit") {
        const fee = calculateFee(r.lockerSize, calculateDaysFromTime(r.deliveryTime));
        dayItems[dayIdx].overdueFee += fee.totalFee;
      } else if (r.pickupTime) {
        const fee = calculateFee(r.lockerSize, calculateDaysFromTime(r.deliveryTime, r.pickupTime));
        dayItems[dayIdx].overdueFee += fee.totalFee;
      }
    }
  }

  for (const item of dayItems) {
    item.overdueFee = Number(item.overdueFee.toFixed(2));
  }

  const maxDelivery = Math.max(1, ...dayItems.map((d) => d.deliveryCount));
  const maxFee = Math.max(1, ...dayItems.map((d) => d.overdueFee));

  return {
    days,
    items: dayItems,
    maxDelivery,
    maxFee,
  };
}

export function getOpsDashboard(range: TimeRange, filter?: { courierId?: string; size?: LockerSize }): OpsDashboardData {
  const startTs = getRangeStart(range);
  let allRecords = getDeliveries().filter((r) => r.deliveryTime >= startTs);
  if (filter?.courierId) {
    allRecords = allRecords.filter((r) => r.courierId === filter.courierId);
  }
  if (filter?.size) {
    allRecords = allRecords.filter((r) => r.lockerSize === filter.size);
  }

  const enriched = allRecords.map((r) => {
    if (r.status === "in_transit") {
      const days = calculateDaysFromTime(r.deliveryTime);
      const fee = calculateFee(r.lockerSize, days);
      return { ...r, totalDays: days, totalFee: fee.totalFee, tierDetails: fee.tierDetails };
    }
    return r;
  });

  const picked = enriched.filter((r) => r.status === "picked_up");
  const inTransit = enriched.filter((r) => r.status === "in_transit");
  const totalOverdueFee = inTransit.reduce((s, r) => s + r.totalFee, 0);
  const totalPendingFee = enriched.reduce((s, r) => s + r.totalFee, 0);
  const avgDays =
    enriched.reduce((s, r) => {
      if (r.status === "picked_up" && r.pickupTime) {
        return s + calculateDaysFromTime(r.deliveryTime, r.pickupTime);
      }
      return s + calculateDaysFromTime(r.deliveryTime);
    }, 0) / Math.max(1, enriched.length);

  const pools = getLockerPools();
  const lockerTension = pools.map((p) => ({
    size: p.size,
    label: SIZE_LABEL[p.size],
    total: p.total,
    available: p.status === "disabled" ? 0 : p.available,
    rate: p.total === 0 ? 0 : Number(((1 - (p.status === "disabled" ? 0 : p.available) / p.total) * 100).toFixed(1)),
    status: p.status,
  }));

  return {
    range,
    summary: {
      totalDeliveries: enriched.length,
      totalPickedUp: picked.length,
      pickupRate: enriched.length === 0 ? 0 : Number(((picked.length / enriched.length) * 100).toFixed(1)),
      totalOverdueFee: Number(totalOverdueFee.toFixed(2)),
      totalPendingFee: Number(totalPendingFee.toFixed(2)),
      avgDays: Number(avgDays.toFixed(1)),
    },
    byCourier: buildBreakdown(
      enriched,
      (r) => r.courierId,
      (r) => r.courierName
    ),
    byLockerSize: buildBreakdown(
      enriched,
      (r) => r.lockerSize,
      (r) => SIZE_LABEL[r.lockerSize]
    ),
    lockerTension,
    records: enriched,
  };
}
