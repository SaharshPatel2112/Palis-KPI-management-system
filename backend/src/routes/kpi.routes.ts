import { Router } from 'express';
import { requireRole } from '../middleware/requireRole.js';
import {
  getDashboardSummary,
  getMyKpis,
  listKpiEntries,
  upsertKpiEntry,
  listDepartments,
} from '../controllers/kpi.controller.js';

const router = Router();

router.get('/dashboard-summary', requireRole(), getDashboardSummary);
router.get('/my-kpis', requireRole(), getMyKpis);
router.get('/entries', requireRole('ADMIN', 'HR', 'MANAGER'), listKpiEntries);
router.get('/departments', requireRole(), listDepartments);
router.post('/entry', requireRole('ADMIN', 'HR', 'MANAGER'), upsertKpiEntry);

export default router;
