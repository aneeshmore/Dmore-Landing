import { Router } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { findUserById } from "../services/userService";

const router = Router();

const toPaymentStatus = (user: {
  accountStatus?: string | null;
  renewalDate?: Date | null;
}) => {
  if (user.accountStatus === "disabled") return "Failed" as const;
  if (user.accountStatus === "pending_payment") return "Pending" as const;
  if (user.accountStatus === "pending_approval") return "Completed" as const;
  if (user.accountStatus === "active") {
    return user.renewalDate ? "Completed" : "Pending";
  }
  return "Pending" as const;
};

router.get("/status", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = await findUserById(req.user!.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    paymentStatus: toPaymentStatus(user),
  });
});

export default router;
