import { Router } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import type { AdminAuth } from "../adminAuth.js";

export function createAdminRouter(adminAuth: AdminAuth, adminPassword: string, dev: boolean): Router {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { error: "Too many login attempts, try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // POST /api/admin/login
  router.post("/login", loginLimiter, (req, res) => {
    const { password } = req.body;

    if (!adminPassword) {
      res.status(503).json({ error: "Admin password not configured" });
      return;
    }

    // Timing-safe comparison
    const passwordBuf = Buffer.from(String(password));
    const adminBuf = Buffer.from(adminPassword);
    if (passwordBuf.length !== adminBuf.length || !crypto.timingSafeEqual(passwordBuf, adminBuf)) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const token = adminAuth.signToken();
    res.setHeader(
      "Set-Cookie",
      `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${!dev ? "; Secure" : ""}`
    );
    res.json({ success: true });
  });

  // GET /api/admin/check
  router.get("/check", (req, res) => {
    res.json({ authenticated: adminAuth.isAuthed(req), required: !!adminPassword });
  });

  // POST /api/admin/logout
  router.post("/logout", (_req, res) => {
    res.setHeader("Set-Cookie", "admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
    res.json({ success: true });
  });

  return router;
}
