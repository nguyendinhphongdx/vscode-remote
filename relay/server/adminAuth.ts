import crypto from "crypto";
import type { IncomingMessage } from "http";
import type { Request, Response, NextFunction } from "express";

export interface AdminAuth {
  signToken: () => string;
  verifyToken: (token: string) => boolean;
  isAuthed: (req: IncomingMessage) => boolean;
  middleware: (req: Request, res: Response, next: NextFunction) => void;
}

export function createAdminAuth(adminPassword: string, adminTokenSecret: string): AdminAuth {
  function getToken(req: IncomingMessage): string | null {
    const cookie = req.headers.cookie;
    if (!cookie) return null;
    const match = cookie.match(/(?:^|;\s*)admin_token=([^;]+)/);
    return match ? match[1] : null;
  }

  function signToken(): string {
    const payload = JSON.stringify({ role: "admin", iat: Date.now() });
    const hmac = crypto.createHmac("sha256", adminTokenSecret).update(payload).digest("hex");
    return Buffer.from(payload).toString("base64") + "." + hmac;
  }

  function verifyToken(token: string): boolean {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    try {
      const payload = Buffer.from(parts[0], "base64").toString();
      const data = JSON.parse(payload);
      if (Date.now() - data.iat > 24 * 60 * 60 * 1000) return false;
      const expectedHmac = crypto.createHmac("sha256", adminTokenSecret).update(payload).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expectedHmac));
    } catch {
      return false;
    }
  }

  function isAuthed(req: IncomingMessage): boolean {
    if (!adminPassword) return false; // No password = blocked, not open access
    const token = getToken(req);
    return token ? verifyToken(token) : false;
  }

  function middleware(req: Request, res: Response, next: NextFunction): void {
    if (!adminPassword) {
      res.status(503).json({ error: "Admin password not configured" });
      return;
    }
    if (!isAuthed(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  }

  return { signToken, verifyToken, isAuthed, middleware };
}
