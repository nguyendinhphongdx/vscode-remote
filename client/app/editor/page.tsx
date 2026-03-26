"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, isTokenExpired } from "@/lib/auth/auth";
import { AppShell } from "@/components/layout/AppShell";

export default function EditorPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      router.replace("/login");
    }
  }, [router]);

  return <AppShell />;
}
