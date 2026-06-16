import { Router } from "express";
import type { TimeRange, LockerSize } from "../../shared/types";
import { getOpsDashboard } from "../services/opsService";

const router = Router();

router.get("/dashboard", (req, res) => {
  const range = (req.query.range as TimeRange) || "today";
  const courierId = req.query.courierId as string | undefined;
  const size = req.query.size as LockerSize | undefined;
  const data = getOpsDashboard(range, { courierId, size });
  res.json(data);
});

export default router;
