import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import employeeRoutes from './routes/employee.routes.js';
import kpiRoutes from './routes/kpi.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/employees', employeeRoutes);
app.use('/api/kpi', kpiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
