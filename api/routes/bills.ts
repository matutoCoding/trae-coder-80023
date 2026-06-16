import { Router } from "express";
import { getBills, getBillById, settleBill, getAvailableCouriers } from "../services/billService";
import { getDeliveries } from "../services/deliveryService";

const router = Router();

router.get("/", (_req, res) => {
  const bills = getBills();
  res.json(bills);
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

router.post("/:id/settle", (req, res) => {
  const result = settleBill(req.params.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

export default router;
