import type {
  LockerSize,
  DeliveryRecord,
  CreateDeliveryRequest,
  LockerPool,
} from "../../shared/types";
import {
  dataStore,
  acquireLock,
  releaseLock,
  generateId,
  generatePickupCode,
  generateLockerNo,
} from "../store/dataStore";
import { calculateFee, calculateDaysFromTime } from "./pricingService";

export function getLockerPools(): LockerPool[] {
  return Array.from(dataStore.lockerPools.values());
}

export function getLockerPool(size: LockerSize): LockerPool | undefined {
  return dataStore.lockerPools.get(size);
}

export interface CreateDeliveryResult {
  success: boolean;
  message?: string;
  record?: DeliveryRecord;
  conflict?: boolean;
  currentPools?: LockerPool[];
}

export function createDelivery(req: CreateDeliveryRequest): CreateDeliveryResult {
  const size = req.lockerSize;
  const pool = dataStore.lockerPools.get(size);

  if (!pool) {
    return { success: false, message: "无效的格口类型" };
  }

  const expectedVersion = req.version[size];
  if (pool.version !== expectedVersion) {
    return {
      success: false,
      message: "格口余量已更新，请重试",
      conflict: true,
      currentPools: getLockerPools(),
    };
  }

  if (!acquireLock(size)) {
    return {
      success: false,
      message: "系统繁忙，请稍后重试",
      conflict: true,
      currentPools: getLockerPools(),
    };
  }

  try {
    const freshPool = dataStore.lockerPools.get(size)!;
    if (freshPool.version !== expectedVersion) {
      return {
        success: false,
        message: "格口余量已更新，请重试",
        conflict: true,
        currentPools: getLockerPools(),
      };
    }

    if (freshPool.available <= 0) {
      return {
        success: false,
        message: "该规格格口已无可用余量",
        conflict: true,
        currentPools: getLockerPools(),
      };
    }

    const usedCount = freshPool.total - freshPool.available;
    const lockerNo = generateLockerNo(size, usedCount + 1);

    let pickupCode = generatePickupCode();
    let attempts = 0;
    while (dataStore.pickupCodeIndex.has(pickupCode) && attempts < 10) {
      pickupCode = generatePickupCode();
      attempts++;
    }

    const deliveryTime = Date.now();
    const { tierDetails, totalFee } = calculateFee(size, Math.max(1, req.expectedDays));

    const record: DeliveryRecord = {
      id: generateId("del"),
      trackingNo: req.trackingNo,
      courierId: req.courierId,
      courierName: req.courierName,
      lockerSize: size,
      lockerNo,
      pickupCode,
      recipientPhone: req.recipientPhone,
      deliveryTime,
      status: "in_transit",
      totalDays: Math.max(1, req.expectedDays),
      tierDetails,
      totalFee,
    };

    dataStore.lockerPools.set(size, {
      ...freshPool,
      available: freshPool.available - 1,
      version: freshPool.version + 1,
    });

    dataStore.deliveryRecords.set(record.id, record);
    dataStore.pickupCodeIndex.set(pickupCode, record.id);

    return { success: true, record };
  } finally {
    releaseLock(size);
  }
}

export function getDeliveries(courierId?: string): DeliveryRecord[] {
  const records = Array.from(dataStore.deliveryRecords.values());
  const enriched = records.map((r) => {
    if (r.status === "in_transit") {
      const days = calculateDaysFromTime(r.deliveryTime);
      const recalc = calculateFee(r.lockerSize, days);
      return { ...r, totalDays: days, tierDetails: recalc.tierDetails, totalFee: recalc.totalFee };
    }
    return r;
  });

  const sorted = enriched.sort((a, b) => b.deliveryTime - a.deliveryTime);
  if (courierId) {
    return sorted.filter((r) => r.courierId === courierId);
  }
  return sorted;
}

export function verifyPickup(pickupCode: string): { success: boolean; message?: string; record?: DeliveryRecord } {
  const recordId = dataStore.pickupCodeIndex.get(pickupCode);
  if (!recordId) {
    return { success: false, message: "取件码无效" };
  }

  const record = dataStore.deliveryRecords.get(recordId);
  if (!record) {
    return { success: false, message: "投放记录不存在" };
  }

  if (record.status !== "in_transit") {
    return { success: false, message: "该快递已被取件或取消" };
  }

  const pickupTime = Date.now();
  const days = calculateDaysFromTime(record.deliveryTime, pickupTime);
  const { tierDetails, totalFee } = calculateFee(record.lockerSize, days);

  const updated: DeliveryRecord = {
    ...record,
    status: "picked_up",
    pickupTime,
    totalDays: days,
    tierDetails,
    totalFee,
  };

  dataStore.deliveryRecords.set(record.id, updated);

  const pool = dataStore.lockerPools.get(record.lockerSize);
  if (pool) {
    dataStore.lockerPools.set(record.lockerSize, {
      ...pool,
      available: pool.available + 1,
      version: pool.version + 1,
    });
  }

  return { success: true, record: updated };
}

export function findDeliveryByPickupCode(pickupCode: string): DeliveryRecord | undefined {
  const recordId = dataStore.pickupCodeIndex.get(pickupCode);
  if (!recordId) return undefined;
  const record = dataStore.deliveryRecords.get(recordId);
  if (!record) return undefined;
  if (record.status === "in_transit") {
    const days = calculateDaysFromTime(record.deliveryTime);
    const recalc = calculateFee(record.lockerSize, days);
    return { ...record, totalDays: days, tierDetails: recalc.tierDetails, totalFee: recalc.totalFee };
  }
  return record;
}
