import cors from "cors";
import express, { Request, Response } from "express";
import { config } from "./config/env";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import adminRoutes from "./routes/admin";
import userStatusRoutes from "./routes/userStatusRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userStatusRoutes);

app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(config.port, () => {
  console.log(`🚀 API running on http://localhost:${config.port}`);
});
