import type { Bill, DashboardStats } from "../../shared/types";
import { dataStore } from "../store/dataStore";
import { getDeliveries, getLockerPools } from "./deliveryService";

export function getDashboardStats(): DashboardStats {
  const lockerPools = getLockerPools();
  const deliveries = getDeliveries();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayTs = startOfDay.getTime();

  const todayDeliveries = deliveries.filter((d) => d.deliveryTime >= startOfDayTs).length;
  const inTransit = deliveries.filter((d) => d.status === "in_transit");
  const pendingFees = inTransit.reduce((sum, d) => sum + d.totalFee, 0);
  const totalCapacity = lockerPools.reduce((sum, p) => sum + p.total, 0);

  return {
    lockerPools,
    todayDeliveries,
    inTransitCount: inTransit.length,
    pendingFees: Number(pendingFees.toFixed(2)),
    totalCapacity,
  };
}

export function generateBills(): Bill[] {
  const deliveries = getDeliveries();
  const courierMap = new Map<string, typeof deliveries>();

  for (const d of deliveries) {
    if (!courierMap.has(d.courierId)) {
      courierMap.set(d.courierId, []);
    }
    courierMap.get(d.courierId)!.push(d);
  }

  const bills: Bill[] = [];
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (const [courierId, records] of courierMap) {
    const totalDeliveries = records.length;
    const totalFee = records.reduce((sum, r) => sum + r.totalFee, 0);
    const bill: Bill = {
      id: `bill_${courierId}_${period}`,
      courierId,
      courierName: records[0]?.courierName || courierId,
      period,
      totalDeliveries,
      totalFee: Number(totalFee.toFixed(2)),
      settled: false,
      records: records.map((r) => r.id),
    };
    bills.push(bill);
    dataStore.bills.set(bill.id, bill);
  }

  return bills;
}

export function getBills(): Bill[] {
  if (dataStore.bills.size === 0) {
    return generateBills();
  }
  return Array.from(dataStore.bills.values()).sort((a, b) => b.period.localeCompare(a.period));
}

export function getBillById(id: string): Bill | undefined {
  return dataStore.bills.get(id);
}
