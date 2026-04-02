"use client";

import { useState, useCallback, useRef } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  SendHorizonal,
  Mic,
  Wifi,
  WifiOff,
} from "lucide-react";
import { VoiceMode } from "./VoiceMicButton";

interface MobileTerminalToolbarProps {
  onKey: (data: string) => void;
  networkStatus?: "connected" | "connecting" | "disconnected";
}

// ANSI escape sequences for special keys
const KEYS = {
  ESC: "\x1b",
  TAB: "\t",
  CTRL_C: "\x03",
  CTRL_D: "\x04",
  CTRL_Z: "\x1a",
  CTRL_L: "\x0c",
  CTRL_A: "\x01",
  CTRL_E: "\x05",
  CTRL_R: "\x12",
  CTRL_W: "\x17",
  ARROW_UP: "\x1b[A",
  ARROW_DOWN: "\x1b[B",
  ARROW_RIGHT: "\x1b[C",
  ARROW_LEFT: "\x1b[D",
  HOME: "\x1b[H",
  END: "\x1b[F",
  PGUP: "\x1b[5~",
  PGDN: "\x1b[6~",
} as const;

interface KeyBtn {
  label: string | React.ReactNode;
  key: string;
  className?: string;
  holdRepeat?: boolean;
}

export function MobileTerminalToolbar({ onKey, networkStatus }: MobileTerminalToolbarProps) {
  const [ctrlActive, setCtrlActive] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKey = useCallback(
    (key: string) => {
      if (ctrlActive && key.length === 1) {
        const code = key.toUpperCase().charCodeAt(0) - 64;
        if (code >= 1 && code <= 26) {
          onKey(String.fromCharCode(code));
          setCtrlActive(false);
          return;
        }
      }
      onKey(key);
    },
    [onKey, ctrlActive]
  );

  // Long-press repeat for arrow keys — uses pointer events to avoid duplicate touch+mouse
  const longPress = (key: string) => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const clear = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        handleKey(key);
        timer = setInterval(() => handleKey(key), 100);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
    };
  };

  const handleButtonPress = (e: React.PointerEvent, action: () => void) => {
    e.preventDefault();
    action();
  };

  const topRow: KeyBtn[] = [
    { label: "Esc", key: KEYS.ESC },
    { label: "Tab", key: KEYS.TAB },
    { label: "|", key: "|" },
    { label: "/", key: "/" },
    { label: "-", key: "-" },
    { label: "~", key: "~" },
    { label: ":", key: ":" },
    { label: "*", key: "*" },
    { label: ".", key: "." },
  ];

  const ctrlKeys: KeyBtn[] = [
    { label: "C", key: KEYS.CTRL_C },
    { label: "D", key: KEYS.CTRL_D },
    { label: "Z", key: KEYS.CTRL_Z },
    { label: "L", key: KEYS.CTRL_L },
    { label: "A", key: KEYS.CTRL_A },
    { label: "R", key: KEYS.CTRL_R },
    { label: "W", key: KEYS.CTRL_W },
  ];

  const statusColor =
    networkStatus === "connected"
      ? "text-green-400"
      : networkStatus === "connecting"
        ? "text-yellow-400 animate-pulse"
        : "text-red-400";

  if (voiceActive) {
    return (
      <VoiceMode
        onSubmit={(text) => {
          onKey(text + "\r");
        }}
        onClose={() => setVoiceActive(false)}
      />
    );
  }

  return (
    <div className="bg-[#1a1a1a] border-t border-border shrink-0 select-none touch-manipulation">
      {/* Top row: special chars + network status */}
      <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
        {/* Network status indicator */}
        <div className={`px-2 py-2 shrink-0 ${statusColor}`} title={networkStatus || "unknown"}>
          {networkStatus === "disconnected" ? <WifiOff size={18} /> : <Wifi size={18} />}
        </div>

        {topRow.map((btn, i) => (
          <button
            key={i}
            onPointerDown={(e) => handleButtonPress(e, () => handleKey(btn.key))}
            className="px-3 py-2 min-w-[40px] text-[14px] font-mono rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white shrink-0"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Bottom row: Ctrl + arrows + enter */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        {/* Mic toggle */}
        <button
          onPointerDown={(e) => handleButtonPress(e, () => setVoiceActive(true))}
          className="p-2 rounded bg-bg-tertiary text-text-secondary active:bg-blue-500/30 active:text-blue-400 shrink-0"
          title="Voice mode"
        >
          <Mic size={18} />
        </button>

        {/* Ctrl toggle */}
        <button
          onPointerDown={(e) => handleButtonPress(e, () => setCtrlActive((v) => !v))}
          className={`px-3 py-2 text-[13px] font-mono font-bold rounded shrink-0 ${
            ctrlActive
              ? "bg-accent text-white"
              : "bg-bg-tertiary text-text-secondary"
          }`}
        >
          Ctrl
        </button>

        {ctrlActive ? (
          /* Ctrl shortcuts — full width, scrollable */
          <div className="flex-1 flex items-center gap-1 overflow-x-auto">
            {ctrlKeys.map((btn) => (
              <button
                key={btn.label as string}
                onPointerDown={(e) =>
                  handleButtonPress(e, () => {
                    handleKey(btn.key);
                    setCtrlActive(false);
                  })
                }
                className="px-4 py-2 text-[14px] font-mono rounded bg-accent/30 text-accent active:bg-accent active:text-white shrink-0"
              >
                ^{btn.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Text input */}
            <div className="flex-1 flex items-center gap-1 mx-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (inputText) {
                      onKey(inputText + "\r");
                      setInputText("");
                    } else {
                      onKey("\r");
                    }
                  }
                }}
                placeholder="type..."
                className="flex-1 min-w-0 px-3 py-2 text-[14px] font-mono rounded bg-bg-input border border-border text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onPointerDown={(e) =>
                  handleButtonPress(e, () => {
                    if (inputText) {
                      onKey(inputText + "\r");
                      setInputText("");
                    } else {
                      onKey("\r");
                    }
                    inputRef.current?.focus();
                  })
                }
                className="p-2.5 rounded bg-accent text-white active:bg-accent-hover shrink-0"
                title="Send"
              >
                <SendHorizonal size={18} />
              </button>
            </div>

            {/* Arrow keys */}
            <div className="flex items-center gap-1">
              <button
                {...longPress(KEYS.ARROW_LEFT)}
                className="p-2.5 rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex flex-col gap-0.5">
                <button
                  {...longPress(KEYS.ARROW_UP)}
                  className="p-1.5 rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  {...longPress(KEYS.ARROW_DOWN)}
                  className="p-1.5 rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
                >
                  <ArrowDown size={18} />
                </button>
              </div>

              <button
                {...longPress(KEYS.ARROW_RIGHT)}
                className="p-2.5 rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
