import type { LockerSize, TierDetail } from "../../shared/types";
import { dataStore, savePricingTiers } from "../store/dataStore";

export function getTierLabel(startDay: number, endDay: number): string {
  if (endDay === -1) return `第${startDay}天+`;
  if (startDay === endDay) return `第${startDay}天`;
  return `第${startDay}-${endDay}天`;
}

export function calculateFee(size: LockerSize, days: number): { tierDetails: TierDetail[]; totalFee: number } {
  const tiers = Array.from(dataStore.pricingTiers.values())
    .filter((t) => t.size === size)
    .sort((a, b) => a.startDay - b.startDay);

  const tierDetails: TierDetail[] = [];
  let remainingDays = Math.max(1, days);
  let totalFee = 0;

  for (const tier of tiers) {
    if (remainingDays <= 0) break;

    let daysInTier: number;
    if (tier.endDay === -1) {
      daysInTier = remainingDays;
    } else {
      const tierSpan = tier.endDay - tier.startDay + 1;
      daysInTier = Math.min(remainingDays, tierSpan);
    }

    if (daysInTier > 0) {
      const subtotal = Number((daysInTier * tier.pricePerDay).toFixed(2));
      tierDetails.push({
        tierId: tier.id,
        days: daysInTier,
        unitPrice: tier.pricePerDay,
        subtotal,
        tierLabel: getTierLabel(tier.startDay, tier.endDay),
      });
      totalFee += subtotal;
      remainingDays -= daysInTier;
    }
  }

  return { tierDetails, totalFee: Number(totalFee.toFixed(2)) };
}

export function calculateDaysFromTime(deliveryTime: number, pickupTime?: number): number {
  const end = pickupTime ?? Date.now();
  const diffMs = end - deliveryTime;
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(1, days);
}

export function getTiersBySize(size: LockerSize) {
  return Array.from(dataStore.pricingTiers.values())
    .filter((t) => t.size === size)
    .sort((a, b) => a.startDay - b.startDay);
}

export function getAllTiers() {
  return Array.from(dataStore.pricingTiers.values());
}

export function updateTiers(tiers: { id?: string; size: LockerSize; startDay: number; endDay: number; pricePerDay: number }[]) {
  const existingIds = new Set(dataStore.pricingTiers.keys());
  const newIds = new Set<string>();

  for (const tier of tiers) {
    const id = tier.id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    newIds.add(id);
    dataStore.pricingTiers.set(id, { ...tier, id });
  }

  for (const oldId of existingIds) {
    if (!newIds.has(oldId)) {
      dataStore.pricingTiers.delete(oldId);
    }
  }

  savePricingTiers(dataStore.pricingTiers);

  return getAllTiers();
}
