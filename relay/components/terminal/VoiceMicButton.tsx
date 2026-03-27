"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic } from "lucide-react";
import { useTerminal } from "@/lib/hooks/useTerminal";
import { useTerminalStore } from "@/store/terminalStore";

type MicState = "idle" | "listening" | "unsupported";

// SpeechRecognition types
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  ) as (new () => SpeechRecognitionInstance) | null;
}

export function VoiceMicButton() {
  const [state, setState] = useState<MicState>("idle");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const { sendInput } = useTerminal();
  const { activeSessionId } = useTerminalStore();

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setState("unsupported");
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition || !activeSessionId) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript && activeSessionId) {
        sendInput(activeSessionId, transcript);
      }
    };

    recognition.onerror = () => {
      setState("idle");
    };

    recognition.onend = () => {
      setState("idle");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");
  }, [activeSessionId, sendInput]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  if (state === "unsupported" || !activeSessionId) return null;

  return (
    <button
      onPointerDown={startListening}
      onPointerUp={stopListening}
      onPointerCancel={stopListening}
      onContextMenu={(e) => e.preventDefault()}
      className={`p-1.5 rounded touch-none select-none ${
        state === "listening"
          ? "bg-red-600/30 text-red-400 animate-pulse"
          : "hover:bg-bg-active text-text-secondary hover:text-text-primary"
      }`}
      title="Hold to speak"
      style={{ minWidth: 32, minHeight: 32 }}
    >
      <Mic size={14} />
    </button>
  );
}
