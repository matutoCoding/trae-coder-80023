import type { LockerPool, LockerSize, PricingTier, DeliveryRecord, Bill } from "../../shared/types";

const lockerLocks: Record<LockerSize, boolean> = { S: false, M: false, L: false };

export const dataStore = {
  lockerPools: new Map<LockerSize, LockerPool>([
    ["S", { size: "S", name: "小号格口", total: 20, available: 15, version: 0 }],
    ["M", { size: "M", name: "中号格口", total: 15, available: 10, version: 0 }],
    ["L", { size: "L", name: "大号格口", total: 8, available: 5, version: 0 }],
  ]),

  pricingTiers: new Map<string, PricingTier>([
    ["t1", { id: "t1", size: "S", startDay: 1, endDay: 2, pricePerDay: 0.5 }],
    ["t2", { id: "t2", size: "S", startDay: 3, endDay: 5, pricePerDay: 1.0 }],
    ["t3", { id: "t3", size: "S", startDay: 6, endDay: -1, pricePerDay: 2.0 }],
    ["t4", { id: "t4", size: "M", startDay: 1, endDay: 2, pricePerDay: 1.0 }],
    ["t5", { id: "t5", size: "M", startDay: 3, endDay: 5, pricePerDay: 1.5 }],
    ["t6", { id: "t6", size: "M", startDay: 6, endDay: -1, pricePerDay: 3.0 }],
    ["t7", { id: "t7", size: "L", startDay: 1, endDay: 2, pricePerDay: 1.5 }],
    ["t8", { id: "t8", size: "L", startDay: 3, endDay: 5, pricePerDay: 2.5 }],
    ["t9", { id: "t9", size: "L", startDay: 6, endDay: -1, pricePerDay: 5.0 }],
  ]),

  deliveryRecords: new Map<string, DeliveryRecord>(),
  pickupCodeIndex: new Map<string, string>(),
  bills: new Map<string, Bill>(),
  courierBills: new Map<string, string[]>(),
};

export function acquireLock(size: LockerSize): boolean {
  if (lockerLocks[size]) return false;
  lockerLocks[size] = true;
  return true;
}

export function releaseLock(size: LockerSize): void {
  lockerLocks[size] = false;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateLockerNo(size: LockerSize, index: number): string {
  const prefix = { S: "S", M: "M", L: "L" }[size];
  return `${prefix}${String(index).padStart(3, "0")}`;
}

export function seedMockDeliveries(): void {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const mocks: DeliveryRecord[] = [
    {
      id: generateId("del"),
      trackingNo: "SF1234567890",
      courierId: "C001",
      courierName: "张师傅",
      lockerSize: "M",
      lockerNo: "M001",
      pickupCode: "123456",
      recipientPhone: "138****1234",
      deliveryTime: now - 1 * dayMs,
      status: "in_transit",
      totalDays: 1,
      tierDetails: [
        { tierId: "t4", days: 1, unitPrice: 1.0, subtotal: 1.0, tierLabel: "第1-2天" },
      ],
      totalFee: 1.0,
    },
    {
      id: generateId("del"),
      trackingNo: "YT9876543210",
      courierId: "C002",
      courierName: "李师傅",
      lockerSize: "S",
      lockerNo: "S005",
      pickupCode: "654321",
      recipientPhone: "139****5678",
      deliveryTime: now - 4 * dayMs,
      status: "in_transit",
      totalDays: 4,
      tierDetails: [
        { tierId: "t1", days: 2, unitPrice: 0.5, subtotal: 1.0, tierLabel: "第1-2天" },
        { tierId: "t2", days: 2, unitPrice: 1.0, subtotal: 2.0, tierLabel: "第3-5天" },
      ],
      totalFee: 3.0,
    },
    {
      id: generateId("del"),
      trackingNo: "JD111222333",
      courierId: "C001",
      courierName: "张师傅",
      lockerSize: "L",
      lockerNo: "L002",
      pickupCode: "789012",
      recipientPhone: "137****9012",
      deliveryTime: now - 7 * dayMs,
      status: "in_transit",
      totalDays: 7,
      tierDetails: [
        { tierId: "t7", days: 2, unitPrice: 1.5, subtotal: 3.0, tierLabel: "第1-2天" },
        { tierId: "t8", days: 3, unitPrice: 2.5, subtotal: 7.5, tierLabel: "第3-5天" },
        { tierId: "t9", days: 2, unitPrice: 5.0, subtotal: 10.0, tierLabel: "第6天+" },
      ],
      totalFee: 20.5,
    },
  ];

  for (const mock of mocks) {
    dataStore.deliveryRecords.set(mock.id, mock);
    dataStore.pickupCodeIndex.set(mock.pickupCode, mock.id);
  }
}
