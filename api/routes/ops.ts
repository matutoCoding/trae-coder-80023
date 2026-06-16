import { Router } from "express";
import type { TimeRange, LockerSize } from "../../shared/types";
import { getOpsDashboard, getOpsTrend } from "../services/opsService";

const router = Router();

router.get("/dashboard", (req, res) => {
  const range = (req.query.range as TimeRange) || "today";
  const courierId = req.query.courierId as string | undefined;
  const size = req.query.size as LockerSize | undefined;
  const data = getOpsDashboard(range, { courierId, size });
  res.json(data);
});

router.get("/trend", (req, res) => {
  const days = Number(req.query.days) || 7;
  const courierId = req.query.courierId as string | undefined;
  const size = req.query.size as LockerSize | undefined;
  const data = getOpsTrend(days, { courierId, size });
  res.json(data);
});

export default router;
