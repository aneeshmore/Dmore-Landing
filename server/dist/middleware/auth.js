"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const userService_1 = require("../services/userService");
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res
            .status(401)
            .json({ message: "Missing or invalid authorization header" });
    }
    const token = authHeader.substring(7);
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        if (!payload) {
            return res.status(401).json({ message: "Invalid token" });
        }
        const user = await (0, userService_1.findUserById)(payload.userId);
        if (!user) {
            return res.status(403).json({ message: "User is inactive" });
        }
        // Keep admin access available even if account status was toggled accidentally.
        if (user.role !== "admin" && !user.isActive) {
            return res.status(403).json({ message: "User is inactive" });
        }
        req.user = payload;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};
exports.requireAdmin = requireAdmin;
