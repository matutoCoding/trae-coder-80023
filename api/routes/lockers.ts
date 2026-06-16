import { Router } from "express";
import { getLockerPools } from "../services/deliveryService";
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

export default router;
