import type {
  LockerPool,
  LockerSize,
  DashboardStats,
  DeliveryRecord,
  CreateDeliveryRequest,
  PricingTier,
  CalculateFeeRequest,
  CalculateFeeResponse,
  Bill,
} from "../../shared/types";

const API_BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data as T;
}

export const api = {
  getLockers: () => request<LockerPool[]>("/lockers"),
  getStats: () => request<DashboardStats>("/lockers/stats"),
  getDeliveries: (courierId?: string) =>
    request<DeliveryRecord[]>(courierId ? `/delivery?courierId=${courierId}` : "/delivery"),
  createDelivery: (body: CreateDeliveryRequest) =>
    request<{ success: boolean; message?: string; record?: DeliveryRecord; conflict?: boolean; currentPools?: LockerPool[] }>("/delivery", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  findByPickupCode: (code: string) =>
    request<{ success: boolean; record?: DeliveryRecord; message?: string }>(`/delivery/pickup/${code}`),
  verifyPickup: (code: string) =>
    request<{ success: boolean; message?: string; record?: DeliveryRecord }>("/delivery/verify", {
      method: "POST",
      body: JSON.stringify({ pickupCode: code }),
    }),
  getPricing: () => request<PricingTier[]>("/pricing"),
  updatePricing: (tiers: PricingTier[]) =>
    request<{ success: boolean; tiers: PricingTier[] }>("/pricing", {
      method: "PUT",
      body: JSON.stringify({ tiers }),
    }),
  calculateFee: (body: CalculateFeeRequest) =>
    request<CalculateFeeResponse>("/pricing/calculate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getBills: () => request<Bill[]>("/bills"),
  getBill: (id: string) =>
    request<Bill & { details: DeliveryRecord[] }>(`/bills/${id}`),
};

export const SIZE_LABEL: Record<LockerSize, string> = {
  S: "小号",
  M: "中号",
  L: "大号",
};

export const SIZE_DESC: Record<LockerSize, string> = {
  S: "适合文件、小包裹",
  M: "适合常规快递",
  L: "适合大件包裹",
};

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatMoney(v: number): string {
  return `¥${v.toFixed(2)}`;
}

export function maskPhone(p: string): string {
  if (p.length <= 7) return p;
  return p.slice(0, 3) + "****" + p.slice(-4);
}
