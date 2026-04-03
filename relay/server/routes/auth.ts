import { Router } from "express";
import rateLimit from "express-rate-limit";
import { forwardLoginToAgent, forwardOtpVerifyToAgent } from "../agentBridge.js";

export function createAuthRouter(): Router {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: "Too many login attempts, try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // POST /api/auth/login — forward to agent
  router.post("/login", loginLimiter, async (req, res) => {
    const { machineId, password } = req.body;
    if (!machineId || !password) {
      res.status(400).json({ error: "machineId and password required" });
      return;
    }

    const result = await forwardLoginToAgent(machineId, password);
    if (result.success) {
      res.json(result.payload);
    } else {
      res.status(401).json({ error: result.error });
    }
  });

  // POST /api/auth/otp-verify — forward OTP verification to agent
  router.post("/otp-verify", loginLimiter, async (req, res) => {
    const { machineId, otpSession, code } = req.body;
    if (!machineId || !otpSession || !code) {
      res.status(400).json({ error: "machineId, otpSession, and code required" });
      return;
    }

    const result = await forwardOtpVerifyToAgent(machineId, otpSession, code);
    if (result.success) {
      res.json(result.payload);
    } else {
      res.status(401).json({ error: result.error });
    }
  });

  return router;
}
