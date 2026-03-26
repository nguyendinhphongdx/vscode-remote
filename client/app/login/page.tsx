"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

function formatMachineId(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 3) {
    parts.push(digits.slice(i, i + 3));
  }
  return parts.join("-");
}

export default function LoginPage() {
  const [machineId, setMachineId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleMachineIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMachineId(formatMachineId(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      const { token } = await res.json();
      login(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            VS Code Remote
          </h1>
          <p className="text-text-secondary text-sm">
            Connect to a remote workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error/30 rounded text-error text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-text-secondary text-sm mb-1">
              Machine ID
            </label>
            <input
              type="text"
              value={machineId}
              onChange={handleMachineIdChange}
              placeholder="000-000-000"
              className="w-full px-3 py-2 bg-bg-input border border-border rounded text-text-primary focus:outline-none focus:border-accent font-mono text-lg tracking-wider text-center"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-bg-input border border-border rounded text-text-primary focus:outline-none focus:border-accent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}
