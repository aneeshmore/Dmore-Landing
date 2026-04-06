"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const admin_1 = __importDefault(require("./routes/admin"));
const userStatusRoutes_1 = __importDefault(require("./routes/userStatusRoutes"));
const db_1 = require("./db");
const schema_1 = require("./db/schema");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Public Pricing API
app.get("/api/pricing", async (_req, res) => {
    try {
        const results = await db_1.db.select().from(schema_1.plans);
        const pricing = {};
        results.forEach((p) => {
            pricing[p.planType] = {
                monthly: Number(p.monthlyPrice),
                "6months": Number(p.sixMonthPrice),
                "1year": Number(p.yearlyPrice),
            };
        });
        res.json(pricing);
    }
    catch (error) {
        console.error("Fetch pricing failed:", error);
        res.status(500).json({ message: "Failed to fetch pricing." });
    }
});
app.use("/api/auth", authRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/payments", paymentRoutes_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/user", userStatusRoutes_1.default);
app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
});
app.listen(env_1.config.port, () => {
    console.log(`🚀 API running on http://localhost:${env_1.config.port}`);
});
