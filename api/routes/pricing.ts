import { Router } from "express";
import type { CalculateFeeRequest, LockerSize } from "../../shared/types";
import { calculateFee, getAllTiers, updateTiers } from "../services/pricingService";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getAllTiers());
});

router.put("/", (req, res) => {
  const { tiers } = req.body;
  if (!Array.isArray(tiers)) {
    return res.status(400).json({ success: false, message: "参数错误" });
  }
  const updated = updateTiers(tiers);
  res.json({ success: true, tiers: updated });
});

router.post("/calculate", (req, res) => {
  const body = req.body as CalculateFeeRequest;
  if (!body.size || !body.days) {
    return res.status(400).json({ success: false, message: "参数不完整" });
  }
  const result = calculateFee(body.size as LockerSize, body.days);
  res.json(result);
});

export default router;
