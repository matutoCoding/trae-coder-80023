import { Router } from "express";
import type { LockerSize } from "../../shared/types";
import { getLockerPools, toggleLockerStatus } from "../services/deliveryService";
import { getDashboardStats } from "../services/billService";

const router = Router();

router.get("/", (_req, res) => {
  const pools = getLockerPools();
  res.json(pools);
});

router.get("/stats", (_req, res) => {
  const stats = getDashboardStats();
  res.json(stats);
});

router.put("/:size/status", (req, res) => {
  const size = req.params.size as LockerSize;
  const { status } = req.body;
  if (!["active", "disabled"].includes(status)) {
    return res.status(400).json({ success: false, message: "无效的状态" });
  }
  const result = toggleLockerStatus(size, status);
  if (!result) {
    return res.status(404).json({ success: false, message: "格口不存在" });
  }
  res.json({ success: true, pool: result });
});

export default router;
