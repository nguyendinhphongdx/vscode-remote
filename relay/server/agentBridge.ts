import { v4 as uuid } from "uuid";
import { agents, pendingHttpRequests } from "./state.js";

export function forwardLoginToAgent(
  machineId: string,
  password: string
): Promise<{ success: boolean; payload?: unknown; error?: string }> {
  return new Promise((resolve) => {
    const agent = agents.get(machineId);
    if (!agent) {
      resolve({ success: false, error: "Agent offline" });
      return;
    }

    const id = uuid();
    const timeout = setTimeout(() => {
      pendingHttpRequests.delete(id);
      resolve({ success: false, error: "Agent timeout" });
    }, 10000);

    pendingHttpRequests.set(id, (response) => {
      clearTimeout(timeout);
      resolve(response as { success: boolean; payload?: unknown; error?: string });
    });

    agent.ws.send(JSON.stringify({
      id,
      type: "auth:login",
      payload: { machineId, password },
    }));
  });
}

export function verifyTokenViaAgent(
  machineId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const agent = agents.get(machineId);
    if (!agent) {
      resolve({ success: false, error: "Agent offline" });
      return;
    }

    const id = uuid();
    const timeout = setTimeout(() => {
      pendingHttpRequests.delete(id);
      resolve({ success: false, error: "Verification timeout" });
    }, 5000);

    pendingHttpRequests.set(id, (response) => {
      clearTimeout(timeout);
      const res = response as { success: boolean; error?: string };
      resolve({ success: res.success, error: res.error });
    });

    agent.ws.send(JSON.stringify({
      id,
      type: "auth:verify",
      payload: { token },
    }));
  });
}
