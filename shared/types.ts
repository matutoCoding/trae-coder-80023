export type LockerSize = 'S' | 'M' | 'L';

export type PackageSize = 'small' | 'medium' | 'large';

export type LockerStatus = 'active' | 'disabled';

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
  if (maxDim <= 0) return 'M';
  if (maxDim <= 20) return 'S';
  if (maxDim <= 40) return 'M';
  return 'L';
}

export function recommendAvailableLockerSize(
  dim: PackageDimensions,
  pools: { size: LockerSize; status: LockerStatus; available: number }[]
): { size: LockerSize; upgraded: boolean } {
  const base = recommendLockerSize(dim);
  const order: LockerSize[] = ['S', 'M', 'L'];
  const baseIdx = order.indexOf(base);
  for (let i = baseIdx; i < order.length; i++) {
    const s = order[i];
    const p = pools.find((x) => x.size === s);
    if (p && p.status === 'active' && p.available > 0) {
      return { size: s, upgraded: i > baseIdx };
    }
  }
  return { size: base, upgraded: false };
}

export function getPackageSize(dim: PackageDimensions): PackageSize {
  const size = recommendLockerSize(dim);
  if (size === 'S') return 'small';
  if (size === 'M') return 'medium';
  return 'large';
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
  status: LockerStatus;
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
  packageSize?: PackageSize;
}

export interface Bill {
  id: string;
  courierId: string;
  courierName: string;
  period: string;
  totalDeliveries: number;
  pickedUpCount: number;
  inTransitCount: number;
  totalFee: number;
  settled: boolean;
  settledAt?: number;
  records: string[];
}

export interface DashboardStats {
  lockerPools: LockerPool[];
  todayDeliveries: number;
  inTransitCount: number;
  pendingFees: number;
  totalCapacity: number;
  disabledCount: number;
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

export interface BatchDeliveryItem {
  trackingNo: string;
  recipientPhone: string;
  length: number;
  width: number;
  height: number;
  expectedDays: number;
}

export interface BatchDeliveryRequest {
  courierId: string;
  courierName: string;
  items: BatchDeliveryItem[];
  version: Record<LockerSize, number>;
}

export interface BatchDeliveryResultItem {
  trackingNo: string;
  success: boolean;
  message?: string;
  record?: DeliveryRecord;
  recommendedLocker?: LockerSize;
  upgraded?: boolean;
  baseLocker?: LockerSize;
}

export interface BatchDeliveryResponse {
  successCount: number;
  failCount: number;
  results: BatchDeliveryResultItem[];
  currentPools?: LockerPool[];
}

export interface VerifyPickupRequest {
  pickupCode: string;
}

export interface VerifyPickupResponse {
  record: DeliveryRecord;
}

export type BillFilter = 'all' | 'settled' | 'unsettled';

export interface CreateDeliveryResult {
  success: boolean;
  message?: string;
  record?: DeliveryRecord;
  conflict?: boolean;
  currentPools?: LockerPool[];
}

export interface BillDetail extends Bill {
  details: DeliveryRecord[];
}

export type TimeRange = 'today' | 'week' | 'month';

export interface OpsBreakdownItem {
  key: string;
  label: string;
  deliveryCount: number;
  pickedUpCount: number;
  pickupRate: number;
  overdueFee: number;
  pendingFee: number;
  avgDays: number;
}

export interface OpsDashboardData {
  range: TimeRange;
  summary: {
    totalDeliveries: number;
    totalPickedUp: number;
    pickupRate: number;
    totalOverdueFee: number;
    totalPendingFee: number;
    avgDays: number;
  };
  byCourier: OpsBreakdownItem[];
  byLockerSize: OpsBreakdownItem[];
  lockerTension: { size: LockerSize; label: string; total: number; available: number; rate: number; status: LockerStatus }[];
  records: DeliveryRecord[];
}

export interface OpsTrendDay {
  date: string;
  dateTs: number;
  deliveryCount: number;
  pickedUpCount: number;
  overdueFee: number;
}

export interface OpsTrendData {
  days: number;
  items: OpsTrendDay[];
  maxDelivery: number;
  maxFee: number;
}

export interface FeePreviewResponse {
  tierDetails: TierDetail[];
  totalFee: number;
}
