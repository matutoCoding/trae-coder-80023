export type LockerSize = 'S' | 'M' | 'L';

export type PackageSize = 'small' | 'medium' | 'large';

export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
}

export const PACKAGE_SIZE_MAP: Record<PackageSize, LockerSize> = {
  small: 'S',
  medium: 'M',
  large: 'L',
};

export const PACKAGE_SIZE_LABEL: Record<PackageSize, string> = {
  small: '小件',
  medium: '中件',
  large: '大件',
};

export const PACKAGE_SIZE_DESC: Record<PackageSize, string> = {
  small: '文件/小盒 ≤20cm',
  medium: '常规快递 ≤40cm',
  large: '大件包裹 ≤60cm',
};

export function recommendLockerSize(dim: PackageDimensions): LockerSize {
  const maxDim = Math.max(dim.length, dim.width, dim.height);
  if (maxDim <= 20) return 'S';
  if (maxDim <= 40) return 'M';
  return 'L';
}

export function isSizeMismatch(packageSize: PackageSize, lockerSize: LockerSize): boolean {
  const recommended = PACKAGE_SIZE_MAP[packageSize];
  const sizeOrder: Record<LockerSize, number> = { S: 0, M: 1, L: 2 };
  return sizeOrder[lockerSize] < sizeOrder[recommended];
}

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
  packageSize?: PackageSize;
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
