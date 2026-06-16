import type {
  LockerSize,
  DeliveryRecord,
  CreateDeliveryRequest,
  LockerPool,
  BatchDeliveryRequest,
  BatchDeliveryResponse,
  BatchDeliveryResultItem,
  PackageSize,
} from "../../shared/types";
import { isSizeMismatch, PACKAGE_SIZE_MAP, recommendLockerSize, getPackageSize } from "../../shared/types";
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

export function toggleLockerStatus(size: LockerSize, status: "active" | "disabled"): LockerPool | undefined {
  const pool = dataStore.lockerPools.get(size);
  if (!pool) return undefined;
  const updated = { ...pool, status, version: pool.version + 1 };
  dataStore.lockerPools.set(size, updated);
  return updated;
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

  if (pool.status === "disabled") {
    return {
      success: false,
      message: `${pool.name}已停用，暂不支持投放`,
    };
  }

  if (req.packageSize && isSizeMismatch(req.packageSize, size)) {
    const recommended = PACKAGE_SIZE_MAP[req.packageSize];
    return {
      success: false,
      message: `包裹尺寸为${req.packageSize === "small" ? "小件" : req.packageSize === "medium" ? "中件" : "大件"}，推荐使用${recommended === "S" ? "小号" : recommended === "M" ? "中号" : "大号"}及以上格口，当前选择${size === "S" ? "小号" : size === "M" ? "中号" : "大号"}格口过小`,
    };
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

    if (freshPool.status === "disabled") {
      return {
        success: false,
        message: `${freshPool.name}已停用，暂不支持投放`,
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
      packageSize: req.packageSize,
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

export function createBatchDelivery(req: BatchDeliveryRequest): BatchDeliveryResponse {
  const results: BatchDeliveryResultItem[] = [];
  let successCount = 0;
  let failCount = 0;

  const sizes: LockerSize[] = ["S", "M", "L"];
  for (const size of sizes) {
    acquireLock(size);
  }

  try {
    for (const item of req.items) {
      const dim = { length: item.length, width: item.width, height: item.height };
      const recommendedSize = recommendLockerSize(dim);
      const packageSize = getPackageSize(dim);

      const pool = dataStore.lockerPools.get(recommendedSize);
      if (!pool) {
        failCount++;
        results.push({
          trackingNo: item.trackingNo,
          success: false,
          message: "无效的格口类型",
          recommendedLocker: recommendedSize,
        });
        continue;
      }

      if (pool.status === "disabled") {
        failCount++;
        results.push({
          trackingNo: item.trackingNo,
          success: false,
          message: `${pool.name}已停用`,
          recommendedLocker: recommendedSize,
        });
        continue;
      }

      if (pool.available <= 0) {
        failCount++;
        results.push({
          trackingNo: item.trackingNo,
          success: false,
          message: "该规格格口已无可用余量",
          recommendedLocker: recommendedSize,
        });
        continue;
      }

      if (!/^1\d{10}$/.test(item.recipientPhone)) {
        failCount++;
        results.push({
          trackingNo: item.trackingNo,
          success: false,
          message: "手机号格式不正确",
          recommendedLocker: recommendedSize,
        });
        continue;
      }

      if (!item.trackingNo.trim()) {
        failCount++;
        results.push({
          trackingNo: item.trackingNo,
          success: false,
          message: "快递单号不能为空",
          recommendedLocker: recommendedSize,
        });
        continue;
      }

      const usedCount = pool.total - pool.available;
      const lockerNo = generateLockerNo(recommendedSize, usedCount + 1);

      let pickupCode = generatePickupCode();
      let codeAttempts = 0;
      while (dataStore.pickupCodeIndex.has(pickupCode) && codeAttempts < 10) {
        pickupCode = generatePickupCode();
        codeAttempts++;
      }

      const deliveryTime = Date.now();
      const { tierDetails, totalFee } = calculateFee(recommendedSize, Math.max(1, item.expectedDays));

      const record: DeliveryRecord = {
        id: generateId("del"),
        trackingNo: item.trackingNo.trim(),
        courierId: req.courierId,
        courierName: req.courierName,
        lockerSize: recommendedSize,
        lockerNo,
        pickupCode,
        recipientPhone: item.recipientPhone,
        deliveryTime,
        status: "in_transit",
        totalDays: Math.max(1, item.expectedDays),
        tierDetails,
        totalFee,
        packageSize: packageSize as PackageSize,
      };

      dataStore.lockerPools.set(recommendedSize, {
        ...pool,
        available: pool.available - 1,
        version: pool.version + 1,
      });

      dataStore.deliveryRecords.set(record.id, record);
      dataStore.pickupCodeIndex.set(pickupCode, record.id);

      successCount++;
      results.push({
        trackingNo: item.trackingNo,
        success: true,
        record,
        recommendedLocker: recommendedSize,
      });
    }
  } finally {
    for (const size of sizes) {
      releaseLock(size);
    }
  }

  return {
    successCount,
    failCount,
    results,
    currentPools: getLockerPools(),
  };
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
