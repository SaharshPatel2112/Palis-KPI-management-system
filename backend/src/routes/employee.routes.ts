import { Router } from 'express';
import { syncEmployee, getMe, listEmployees, updateEmployee } from '../controllers/employee.controller.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.post('/sync', syncEmployee);
router.get('/me', requireRole(), getMe);
router.get('/', requireRole('ADMIN', 'HR', 'MANAGER'), listEmployees);
router.patch('/:id', requireRole('ADMIN'), updateEmployee);

export default router;
