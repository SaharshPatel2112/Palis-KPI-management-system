import { Router } from "express";
import { requireRole } from "../middleware/requireRole.js";
import {
  getDashboardSummary,
  getMyKpis,
  listKpiEntries,
  listDepartments,
  uploadKpiCsv,
  getGrowthTrend,
  getDepartmentBreakdown,
  getEmployeeProgress,
} from "../controllers/kpi.controller.js";

const router = Router();

router.get("/dashboard-summary", requireRole(), getDashboardSummary);
router.get("/growth-trend", requireRole(), getGrowthTrend);
router.get("/department-breakdown", requireRole(), getDepartmentBreakdown);
router.get(
  "/employee-progress",
  requireRole("ADMIN", "HR"),
  getEmployeeProgress,
);
router.get("/my-kpis", requireRole(), getMyKpis);
router.get("/entries", requireRole("ADMIN", "HR", "MANAGER"), listKpiEntries);
router.get("/departments", requireRole(), listDepartments);
// CSV upload is the only write path for KPI data.
router.post("/upload-csv", requireRole("ADMIN"), uploadKpiCsv);

export default router;
