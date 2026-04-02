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
  CornerDownLeft,
} from "lucide-react";
import { VoiceMode } from "./VoiceMicButton";

interface MobileTerminalToolbarProps {
  onKey: (data: string) => void;
  networkStatus?: "connected" | "connecting" | "disconnected";
}

const KEYS = {
  ESC: "\x1b",
  TAB: "\t",
  ARROW_UP: "\x1b[A",
  ARROW_DOWN: "\x1b[B",
  ARROW_RIGHT: "\x1b[C",
  ARROW_LEFT: "\x1b[D",
} as const;

const ARROW_SIZE = 18;
const DPAD_BTN = "flex items-center justify-center rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white";

export function MobileTerminalToolbar({ onKey, networkStatus }: MobileTerminalToolbarProps) {
  const [voiceActive, setVoiceActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKey = useCallback((key: string) => { onKey(key); }, [onKey]);

  const longPress = (key: string) => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const clear = () => { if (timer) { clearInterval(timer); timer = null; } };
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

  const press = (e: React.PointerEvent, action: () => void) => {
    e.preventDefault();
    action();
  };

  const statusColor =
    networkStatus === "connected"
      ? "text-green-400"
      : networkStatus === "connecting"
        ? "text-yellow-400 animate-pulse"
        : "text-red-400";

  return (
    <div className="bg-[#1a1a1a] border-t border-border shrink-0 select-none touch-manipulation">
      <div className="flex gap-1.5 p-1.5">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          {voiceActive ? (
            <VoiceMode
              onSubmit={(text) => onKey(text + "\r")}
              onClose={() => setVoiceActive(false)}
            />
          ) : (
            <>
              {/* Left row 1: network + voice + esc + tab */}
              <div className="flex items-center gap-1 h-10">
                <div className={`shrink-0 px-1 ${statusColor}`}>
                  {networkStatus === "disconnected" ? <WifiOff size={14} /> : <Wifi size={14} />}
                </div>
                <button
                  onPointerDown={(e) => press(e, () => setVoiceActive(true))}
                  className="h-10 w-10 flex items-center justify-center rounded bg-bg-tertiary text-text-secondary active:bg-blue-500/30 active:text-blue-400 shrink-0"
                >
                  <Mic size={16} />
                </button>
                <button
                  onPointerDown={(e) => press(e, () => handleKey(KEYS.ESC))}
                  className="h-10 flex-1 text-[13px] font-mono rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
                >
                  Esc
                </button>
                <button
                  onPointerDown={(e) => press(e, () => handleKey(KEYS.TAB))}
                  className="h-10 flex-1 text-[13px] font-mono rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
                >
                  Tab
                </button>
              </div>
              {/* Left row 2: input + send */}
              <div className="flex items-center gap-1 h-10">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onKey((inputText || "") + "\r");
                      setInputText("");
                    }
                  }}
                  placeholder="type..."
                  className="flex-1 min-w-0 h-10 px-2.5 text-[13px] font-mono rounded bg-bg-input border border-border text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onPointerDown={(e) => press(e, () => {
                    onKey((inputText || "") + "\r");
                    setInputText("");
                    inputRef.current?.focus();
                  })}
                  className="w-10 h-10 flex items-center justify-center rounded bg-accent text-white active:bg-accent-hover shrink-0"
                >
                  <SendHorizonal size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right column: D-pad (cross layout) — 3 cols x 3 rows, enter in center */}
        <div className="grid grid-cols-3 grid-rows-3 gap-px shrink-0 w-28 h-21">
          <div />
          <button {...longPress(KEYS.ARROW_UP)} className={DPAD_BTN}>
            <ArrowUp size={ARROW_SIZE} />
          </button>
          <div />
          <button {...longPress(KEYS.ARROW_LEFT)} className={DPAD_BTN}>
            <ArrowLeft size={ARROW_SIZE} />
          </button>
          <button
            onPointerDown={(e) => press(e, () => handleKey("\r"))}
            className={`${DPAD_BTN} bg-accent/20 text-accent active:bg-accent active:text-white`}
          >
            <CornerDownLeft size={16} />
          </button>
          <button {...longPress(KEYS.ARROW_RIGHT)} className={DPAD_BTN}>
            <ArrowRight size={ARROW_SIZE} />
          </button>
          <div />
          <button {...longPress(KEYS.ARROW_DOWN)} className={DPAD_BTN}>
            <ArrowDown size={ARROW_SIZE} />
          </button>
          <div />
        </div>
      </div>
    </div>
  );
}
