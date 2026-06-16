export type LockerSize = 'S' | 'M' | 'L';

export interface LockerPool {
  size: LockerSize;
  name: string;
  total: number;
  available: number;
  version: number;
}

export interface PricingTier {
  id: string;
  size: LockerSize;
  startDay: number;
  endDay: number;
  pricePerDay: number;
}

export interface TierDetail {
  tierId: string;
  days: number;
  unitPrice: number;
  subtotal: number;
  tierLabel: string;
}

export interface DeliveryRecord {
  id: string;
  trackingNo: string;
  courierId: string;
  courierName: string;
  lockerSize: LockerSize;
  lockerNo: string;
  pickupCode: string;
  recipientPhone: string;
  deliveryTime: number;
  pickupTime?: number;
  status: 'in_transit' | 'picked_up' | 'cancelled';
  totalDays: number;
  tierDetails: TierDetail[];
  totalFee: number;
}

export interface Bill {
  id: string;
  courierId: string;
  courierName: string;
  period: string;
  totalDeliveries: number;
  totalFee: number;
  settled: boolean;
  records: string[];
}

export interface DashboardStats {
  lockerPools: LockerPool[];
  todayDeliveries: number;
  inTransitCount: number;
  pendingFees: number;
  totalCapacity: number;
}

export interface CalculateFeeRequest {
  size: LockerSize;
  days: number;
}

export interface CalculateFeeResponse {
  tierDetails: TierDetail[];
  totalFee: number;
}

export interface CreateDeliveryRequest {
  trackingNo: string;
  courierId: string;
  courierName: string;
  lockerSize: LockerSize;
  recipientPhone: string;
  expectedDays: number;
  version: Record<LockerSize, number>;
}

export interface VerifyPickupRequest {
  pickupCode: string;
}

export interface VerifyPickupResponse {
  record: DeliveryRecord;
}
