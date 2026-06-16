import type {
  LockerPool,
  LockerSize,
  DashboardStats,
  DeliveryRecord,
  CreateDeliveryRequest,
  CreateDeliveryResult,
  PricingTier,
  FeePreviewResponse,
  Bill,
  BatchDeliveryRequest,
  BatchDeliveryResponse,
  BillDetail,
  LockerStatus,
  CalculateFeeResponse,
} from "../../shared/types";

const API_BASE = "";

export const SIZE_LABEL: Record<LockerSize, string> = {
  S: "小号",
  M: "中号",
  L: "大号",
};

export const SIZE_DESC: Record<LockerSize, string> = {
  S: "≤20cm 小件",
  M: "≤40cm 中件",
  L: "≤60cm 大件",
};

export function formatMoney(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(7);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "请求失败");
  }
  return response.json() as Promise<T>;
}

export const api = {
  async getLockers(): Promise<LockerPool[]> {
    const res = await fetch(`${API_BASE}/api/lockers`);
    return handleResponse(res);
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/api/lockers/stats`);
    return handleResponse(res);
  },

  async toggleLockerStatus(size: string, status: LockerStatus): Promise<{ success: boolean; pool: LockerPool }> {
    const res = await fetch(`${API_BASE}/api/lockers/${size}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async getDeliveries(courierId?: string): Promise<DeliveryRecord[]> {
    const url = courierId
      ? `${API_BASE}/api/delivery?courierId=${encodeURIComponent(courierId)}`
      : `${API_BASE}/api/delivery`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async createDelivery(data: CreateDeliveryRequest): Promise<CreateDeliveryResult> {
    const res = await fetch(`${API_BASE}/api/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async batchDelivery(data: BatchDeliveryRequest): Promise<BatchDeliveryResponse> {
    const res = await fetch(`${API_BASE}/api/delivery/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async verifyPickup(pickupCode: string): Promise<{ success: boolean; message?: string; record?: DeliveryRecord }> {
    const res = await fetch(`${API_BASE}/api/delivery/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupCode }),
    });
    return handleResponse(res);
  },

  async findByPickupCode(code: string): Promise<{ success: boolean; message?: string; record?: DeliveryRecord }> {
    const res = await fetch(`${API_BASE}/api/delivery/pickup/${encodeURIComponent(code)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, message: (data as { message?: string }).message || "取件码无效" };
    }
    return res.json() as Promise<{ success: boolean; record?: DeliveryRecord; message?: string }>;
  },

  async getPricingTiers(): Promise<PricingTier[]> {
    const res = await fetch(`${API_BASE}/api/pricing`);
    return handleResponse(res);
  },

  async savePricingTiers(tiers: PricingTier[]): Promise<{ success: boolean; message?: string; tiers?: PricingTier[] }> {
    const res = await fetch(`${API_BASE}/api/pricing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiers }),
    });
    return handleResponse(res);
  },

  async getFeePreview(lockerSize: string, days: number): Promise<FeePreviewResponse> {
    const res = await fetch(`${API_BASE}/api/pricing/preview?size=${lockerSize}&days=${days}`);
    return handleResponse(res);
  },

  async getBills(): Promise<Bill[]> {
    const res = await fetch(`${API_BASE}/api/bills`);
    return handleResponse(res);
  },

  async getCouriers(): Promise<{ id: string; name: string }[]> {
    const res = await fetch(`${API_BASE}/api/bills/couriers`);
    return handleResponse(res);
  },

  async getBillDetail(id: string): Promise<BillDetail> {
    const res = await fetch(`${API_BASE}/api/bills/${id}`);
    return handleResponse(res);
  },

  async settleBill(id: string): Promise<{ success: boolean; bill?: Bill; message?: string }> {
    const res = await fetch(`${API_BASE}/api/bills/${id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res);
  },

  async calculateFee(params: { size: LockerSize; days: number }): Promise<CalculateFeeResponse> {
    return this.getFeePreview(params.size, params.days) as Promise<CalculateFeeResponse>;
  },

  async updatePricing(tiers: PricingTier[]): Promise<{ success: boolean; message?: string; tiers?: PricingTier[] }> {
    return this.savePricingTiers(tiers);
  },

  async getPricing(): Promise<PricingTier[]> {
    return this.getPricingTiers();
  },

  async getBill(id: string): Promise<BillDetail> {
    return this.getBillDetail(id);
  },
};

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}
