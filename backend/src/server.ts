import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { clerkMiddleware } from "@clerk/express";
import employeeRoutes from "./routes/employee.routes.js";
import kpiRoutes from "./routes/kpi.routes.js";

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // Dev usage (StrictMode double-firing effects, multiple tabs, rapid page
  // navigation while testing) blows past most limits fast and isn't the
  // thing this is meant to catch. Clerk already rate-limits actual sign-in
  // attempts at their end — this is just a backstop against gross API abuse
  // once this is actually deployed.
  skip: () => process.env.NODE_ENV !== "production",
});

app.use(cors());
app.use(express.json());
app.use("/api", apiLimiter);
app.use(clerkMiddleware());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/employees", employeeRoutes);
app.use("/api/kpi", kpiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
