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
  const disabledCount = lockerPools.filter((p) => p.status === "disabled").length;

  return {
    lockerPools,
    todayDeliveries,
    inTransitCount: inTransit.length,
    pendingFees: Number(pendingFees.toFixed(2)),
    totalCapacity,
    disabledCount,
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
    const pickedUpCount = records.filter((r) => r.status === "picked_up").length;
    const inTransitCount = records.filter((r) => r.status === "in_transit").length;
    const totalFee = records.reduce((sum, r) => sum + r.totalFee, 0);

    const existingBill = dataStore.bills.get(`bill_${courierId}_${period}`);

    const bill: Bill = {
      id: `bill_${courierId}_${period}`,
      courierId,
      courierName: records[0]?.courierName || courierId,
      period,
      totalDeliveries,
      pickedUpCount,
      inTransitCount,
      totalFee: Number(totalFee.toFixed(2)),
      settled: existingBill?.settled ?? false,
      settledAt: existingBill?.settledAt,
      records: records.map((r) => r.id),
    };
    bills.push(bill);
    dataStore.bills.set(bill.id, bill);
  }

  return bills;
}

export function getBills(): Bill[] {
  return generateBills();
}

export function getBillById(id: string): Bill | undefined {
  generateBills();
  return dataStore.bills.get(id);
}

export function settleBill(id: string): { success: boolean; bill?: Bill; message?: string } {
  const bill = getBillById(id);
  if (!bill) {
    return { success: false, message: "账单不存在" };
  }
  if (bill.settled) {
    return { success: false, message: "账单已结算，无需重复结算" };
  }
  const updated: Bill = {
    ...bill,
    settled: true,
    settledAt: Date.now(),
  };
  dataStore.bills.set(id, updated);
  return { success: true, bill: updated };
}

export function getAvailableCouriers(): { id: string; name: string }[] {
  const deliveries = getDeliveries();
  const courierMap = new Map<string, string>();
  for (const d of deliveries) {
    courierMap.set(d.courierId, d.courierName);
  }
  return Array.from(courierMap.entries()).map(([id, name]) => ({ id, name }));
}
