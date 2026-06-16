import { Router } from "express";
import type { CreateDeliveryRequest } from "../../shared/types";
import { createDelivery, getDeliveries, verifyPickup, findDeliveryByPickupCode } from "../services/deliveryService";

const router = Router();

router.get("/", (req, res) => {
  const courierId = req.query.courierId as string | undefined;
  const records = getDeliveries(courierId);
  res.json(records);
});

router.post("/", (req, res) => {
  const body = req.body as CreateDeliveryRequest;
  if (!body.trackingNo || !body.courierId || !body.lockerSize || !body.recipientPhone) {
    return res.status(400).json({ success: false, message: "参数不完整" });
  }
  const result = createDelivery(body);
  if (!result.success) {
    return res.status(result.conflict ? 409 : 400).json(result);
  }
  res.json(result);
});

router.get("/pickup/:code", (req, res) => {
  const code = req.params.code;
  const record = findDeliveryByPickupCode(code);
  if (!record) {
    return res.status(404).json({ success: false, message: "取件码无效" });
  }
  res.json({ success: true, record });
});

router.post("/verify", (req, res) => {
  const { pickupCode } = req.body;
  if (!pickupCode) {
    return res.status(400).json({ success: false, message: "取件码不能为空" });
  }
  const result = verifyPickup(pickupCode);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

export default router;
