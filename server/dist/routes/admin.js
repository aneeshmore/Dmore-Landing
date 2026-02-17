"use strict";
// routes/admin.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get("/registered-users", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const registeredUsers = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            email: schema_1.users.email,
            mobile: schema_1.users.mobile,
            companyName: schema_1.users.companyName,
            role: schema_1.users.role,
            createdAt: schema_1.users.createdAt,
        })
            .from(schema_1.users)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
        res.json({ users: registeredUsers });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.default = router;
