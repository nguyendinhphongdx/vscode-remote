"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getToken, setToken, isTokenExpired, getMachineId, setMachineId } from "@/lib/auth/auth";
import { AppShell } from "@/components/layout/AppShell";

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const machineId = params.machineId as string;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for token in URL (from agent UI redirect)
    const urlToken = searchParams.get("token");
    if (urlToken && !isTokenExpired(urlToken)) {
      setToken(urlToken);
      setMachineId(machineId);
      // Clean URL (remove token from query params)
      window.history.replaceState({}, "", `/editor/${machineId}`);
      setReady(true);
      return;
    }

    // Check localStorage
    const token = getToken();
    const storedMid = getMachineId();

    if (!token || isTokenExpired(token) || storedMid !== machineId) {
      router.replace(`/login?machineId=${machineId}`);
      return;
    }

    setReady(true);
  }, [router, machineId, searchParams]);

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return <AppShell />;
}
