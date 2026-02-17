import { Request, Response, Router } from "express";
import { z } from "zod";
import {
  authenticateUser,
  createUser,
  findUserByEmail,
  findUserById,
} from "../services/userService";
import { signToken } from "../utils/jwt";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { verifyPassword } from "../utils/password";

const router = Router();

const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@dmore.local";
const DEFAULT_ADMIN_PASSWORD = "admin@123";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  mobile: z.string().min(6),
  companyName: z.string().min(2),
  companyAddress: z.string().min(4),
});

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(6),
});

const sanitizeUser = (user: { password?: string;[key: string]: unknown }) => {
  const { password, ...rest } = user;
  return rest;
};

router.post("/register", async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);
    if (body.email.toLowerCase() === ADMIN_EMAIL) {
      return res.status(403).json({ message: "This email is reserved" });
    }

    const user = await createUser({ ...body, role: "user" });
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.flatten() });
    }

    const message =
      error instanceof Error ? error.message : "Registration failed";
    return res.status(400).json({ message });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const identifier = body.email.trim();

    if (identifier.toLowerCase() === ADMIN_USERNAME) {
      let adminUser = await findUserByEmail(ADMIN_EMAIL);
      if (!adminUser) {
        adminUser = await createUser({
          name: "admin",
          email: ADMIN_EMAIL,
          password: DEFAULT_ADMIN_PASSWORD,
          role: "admin",
        });
      }

      const isValid = await verifyPassword(body.password, adminUser.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = signToken({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });
      return res.json({ token, user: sanitizeUser(adminUser) });
    }

    const user = await authenticateUser(identifier, body.password);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    return res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return res.status(400).json({ message });
  }
});

router.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user: sanitizeUser(user) });
});

export default router;
