import { Router } from "express";
import { getBills, getBillById, settleBill, getAvailableCouriers } from "../services/billService";
import { getDeliveries } from "../services/deliveryService";
import { SIZE_LABEL } from "../../shared/constants";

const router = Router();

function toCSVValue(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(headers: string[], rows: (string | number)[][]): string {
  return [headers.map(toCSVValue).join(","), ...rows.map((r) => r.map(toCSVValue).join(","))].join("\n");
}

function formatTs(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

router.get("/", (_req, res) => {
  const bills = getBills();
  res.json(bills);
});

router.get("/export", (req, res) => {
  const period = req.query.period as string | undefined;
  const courierId = req.query.courierId as string | undefined;
  const status = req.query.status as "all" | "settled" | "unsettled" | undefined;

  let bills = getBills();
  if (period) bills = bills.filter((b) => b.period === period);
  if (courierId) bills = bills.filter((b) => b.courierId === courierId);
  if (status && status !== "all") {
    bills = bills.filter((b) => (status === "settled" ? b.settled : !b.settled));
  }

  const allDeliveries = getDeliveries();
  const rows: (string | number)[][] = [];
  for (const bill of bills) {
    const details = allDeliveries.filter((d) => bill.records.includes(d.id));
    if (details.length === 0) {
      rows.push([
        bill.id,
        bill.period,
        bill.courierName,
        bill.courierId,
        "",
        "",
        "",
        "",
        "",
        "",
        bill.totalDeliveries,
        bill.pickedUpCount,
        bill.totalFee,
        bill.settled ? "已结算" : "待结算",
        formatTs(bill.settledAt),
      ]);
    } else {
      for (const d of details) {
        const feeSource = d.tierDetails.map((t) => `${t.tierLabel}×${t.days}天@${t.unitPrice}元`).join("; ");
        rows.push([
          bill.id,
          bill.period,
          bill.courierName,
          bill.courierId,
          d.trackingNo,
          SIZE_LABEL[d.lockerSize],
          d.lockerNo,
          d.pickupCode,
          d.recipientPhone,
          formatTs(d.deliveryTime),
          formatTs(d.pickupTime),
          d.status === "picked_up" ? "已取件" : d.status === "cancelled" ? "已取消" : "在途",
          d.totalDays,
          feeSource,
          d.totalFee,
          bill.totalDeliveries,
          bill.pickedUpCount,
          bill.totalFee,
          bill.settled ? "已结算" : "待结算",
          formatTs(bill.settledAt),
        ]);
      }
    }
  }

  const headers = [
    "账单ID",
    "账期",
    "快递员",
    "快递员ID",
    "快递单号",
    "格口规格",
    "格口号",
    "取件码",
    "收件人手机",
    "投放时间",
    "取件时间",
    "状态",
    "存放天数",
    "费用来源",
    "本次费用",
    "账单投放总数",
    "账单已取件数",
    "账单总费用",
    "结算状态",
    "结算时间",
  ];

  const csv = "\ufeff" + buildCSV(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="bills_${Date.now()}.csv"`);
  res.send(csv);
});

router.get("/couriers", (_req, res) => {
  const couriers = getAvailableCouriers();
  res.json(couriers);
});

router.get("/:id", (req, res) => {
  const bill = getBillById(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: "账单不存在" });
  }
  const allDeliveries = getDeliveries();
  const records = allDeliveries.filter((d) => bill.records.includes(d.id));
  res.json({ ...bill, records: bill.records, details: records });
});

router.get("/:id/export", (req, res) => {
  const bill = getBillById(req.params.id);
  if (!bill) {
    return res.status(404).json({ success: false, message: "账单不存在" });
  }
  const allDeliveries = getDeliveries();
  const details = allDeliveries.filter((d) => bill.records.includes(d.id));

  const rows: (string | number)[][] = details.map((d) => {
    const feeSource = d.tierDetails.map((t) => `${t.tierLabel}×${t.days}天@${t.unitPrice}元`).join("; ");
    return [
      d.trackingNo,
      SIZE_LABEL[d.lockerSize],
      d.lockerNo,
      d.pickupCode,
      d.recipientPhone,
      formatTs(d.deliveryTime),
      formatTs(d.pickupTime),
      d.status === "picked_up" ? "已取件" : d.status === "cancelled" ? "已取消" : "在途",
      d.totalDays,
      feeSource,
      d.totalFee,
      bill.settled ? "已结算" : "待结算",
      formatTs(bill.settledAt),
    ];
  });

  const headers = [
    "快递单号",
    "格口规格",
    "格口号",
    "取件码",
    "收件人手机",
    "投放时间",
    "取件时间",
    "状态",
    "存放天数",
    "费用来源",
    "费用(元)",
    "结算状态",
    "结算时间",
  ];

  const summaryRow: (string | number)[] = [
    `汇总: ${bill.courierName} ${bill.period}`,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    `投放${bill.totalDeliveries}件`,
    `已取${bill.pickedUpCount}件`,
    bill.totalFee,
    bill.settled ? "已结算" : "待结算",
    formatTs(bill.settledAt),
  ];

  const csv = "\ufeff" + buildCSV(headers, [...rows, summaryRow]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="bill_${bill.id}_${Date.now()}.csv"`);
  res.send(csv);
});

router.post("/:id/settle", (req, res) => {
  const result = settleBill(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

export default router;
