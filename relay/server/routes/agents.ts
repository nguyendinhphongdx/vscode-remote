import { Router } from "express";
import type { AdminAuth } from "../adminAuth.js";
import { agents, getBrowsersForAgent } from "../state.js";

export function createAgentsRouter(adminAuth: AdminAuth): Router {
  const router = Router();

  // GET /api/agents — list online agents (admin only)
  router.get("/", adminAuth.middleware, (_req, res) => {
    const list = Array.from(agents.values()).map((a) => ({
      machineId: a.machineId,
      connectedAt: a.connectedAt.toISOString(),
      browserCount: getBrowsersForAgent(a.machineId).length,
    }));
    res.json({ agents: list });
  });

  return router;
}
