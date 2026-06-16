import type { LockerSize, PackageSize } from "./types";

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

export const PACKAGE_LABEL: Record<PackageSize, string> = {
  small: "小件",
  medium: "中件",
  large: "大件",
};

export const PACKAGE_DESC: Record<PackageSize, string> = {
  small: "文件/小盒 ≤20cm",
  medium: "常规快递 ≤40cm",
  large: "大件包裹 ≤60cm",
};

export function formatMoney(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || "";
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

export function formatCurrency(n: number): string {
  return formatMoney(n);
}
