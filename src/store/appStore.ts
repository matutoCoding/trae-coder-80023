import { create } from "zustand";
import type { LockerPool, LockerSize, DashboardStats, DeliveryRecord, PricingTier, Bill } from "../../shared/types";
import { api } from "@/utils/api";

const CURRENT_COURIER = { id: "C001", name: "张师傅" };

interface AppState {
  courier: { id: string; name: string };
  couriers: { id: string; name: string }[];
  stats: DashboardStats | null;
  lockerVersions: Record<LockerSize, number>;
  deliveries: DeliveryRecord[];
  pricingTiers: PricingTier[];
  bills: Bill[];
  refreshInterval: number | null;

  setCourier: (c: { id: string; name: string } | string, name?: string) => void;
  fetchCouriers: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchDeliveries: () => Promise<void>;
  fetchPricing: () => Promise<void>;
  fetchBills: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  courier: CURRENT_COURIER,
  couriers: [CURRENT_COURIER],
  stats: null,
  lockerVersions: { S: 0, M: 0, L: 0 },
  deliveries: [],
  pricingTiers: [],
  bills: [],
  refreshInterval: null,

  setCourier: (c, name) => {
    if (typeof c === "string" && name) {
      set({ courier: { id: c, name } });
    } else if (typeof c === "object" && c) {
      set({ courier: c });
    }
  },

  fetchCouriers: async () => {
    try {
      const list = await api.getCouriers();
      set({ couriers: list });
    } catch (e) {
      console.error(e);
    }
  },

  fetchStats: async () => {
    try {
      const stats = await api.getStats();
      const versions = stats.lockerPools.reduce(
        (acc, p) => ({ ...acc, [p.size]: p.version }),
        {} as Record<LockerSize, number>
      );
      set({ stats, lockerVersions: versions });
    } catch (e) {
      console.error(e);
    }
  },

  fetchDeliveries: async () => {
    try {
      const list = await api.getDeliveries();
      set({ deliveries: list });
    } catch (e) {
      console.error(e);
    }
  },

  fetchPricing: async () => {
    try {
      const tiers = await api.getPricing();
      set({ pricingTiers: tiers });
    } catch (e) {
      console.error(e);
    }
  },

  fetchBills: async () => {
    try {
      const bills = await api.getBills();
      set({ bills });
    } catch (e) {
      console.error(e);
    }
  },

  startPolling: () => {
    if (get().refreshInterval) return;
    const id = window.setInterval(() => {
      get().fetchStats();
      get().fetchDeliveries();
    }, 5000);
    set({ refreshInterval: id });
  },

  stopPolling: () => {
    const id = get().refreshInterval;
    if (id) {
      window.clearInterval(id);
      set({ refreshInterval: null });
    }
  },
}));
