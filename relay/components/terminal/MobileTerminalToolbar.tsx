"use client";

import { useState, useCallback, useRef } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  SendHorizonal,
} from "lucide-react";

interface MobileTerminalToolbarProps {
  onKey: (data: string) => void;
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

export function MobileTerminalToolbar({ onKey }: MobileTerminalToolbarProps) {
  const [ctrlActive, setCtrlActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKey = useCallback(
    (key: string) => {
      if (ctrlActive && key.length === 1) {
        // Ctrl + letter: send control character
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

  // Long-press repeat for arrow keys
  const useLongPress = (key: string) => {
    let timer: ReturnType<typeof setInterval> | null = null;

    return {
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        handleKey(key);
        timer = setInterval(() => handleKey(key), 100);
      },
      onTouchEnd: () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      },
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        handleKey(key);
        timer = setInterval(() => handleKey(key), 100);
      },
      onMouseUp: () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      },
      onMouseLeave: () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      },
    };
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

  return (
    <div className="bg-[#1a1a1a] border-t border-border shrink-0 select-none touch-manipulation">
      {/* Top row: special chars */}
      <div className="flex items-center gap-0.5 px-1 py-1 overflow-x-auto">
        {topRow.map((btn, i) => (
          <button
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
              handleKey(btn.key);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              handleKey(btn.key);
            }}
            className="px-2.5 py-1.5 min-w-[32px] text-[12px] font-mono rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white shrink-0"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Bottom row: Ctrl + arrows + enter */}
      <div className="flex items-center gap-0.5 px-1 py-1">
        {/* Ctrl toggle */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setCtrlActive((v) => !v);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            setCtrlActive((v) => !v);
          }}
          className={`px-2 py-1.5 text-[11px] font-mono font-bold rounded shrink-0 ${
            ctrlActive
              ? "bg-accent text-white"
              : "bg-bg-tertiary text-text-secondary"
          }`}
        >
          Ctrl
        </button>

        {/* Ctrl shortcuts when Ctrl is active */}
        {ctrlActive && (
          <div className="flex items-center gap-0.5">
            {ctrlKeys.map((btn) => (
              <button
                key={btn.label as string}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleKey(btn.key);
                  setCtrlActive(false);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleKey(btn.key);
                  setCtrlActive(false);
                }}
                className="px-2 py-1.5 text-[11px] font-mono rounded bg-accent/30 text-accent active:bg-accent active:text-white shrink-0"
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        <div className="flex-1 flex items-center gap-0.5 mx-1">
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
            placeholder="type command..."
            className="flex-1 min-w-0 px-2 py-1.5 text-[12px] font-mono rounded bg-bg-input border border-border text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (inputText) {
                onKey(inputText + "\r");
                setInputText("");
              } else {
                onKey("\r");
              }
              inputRef.current?.focus();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              if (inputText) {
                onKey(inputText + "\r");
                setInputText("");
              } else {
                onKey("\r");
              }
              inputRef.current?.focus();
            }}
            className="p-1.5 rounded bg-accent text-white active:bg-accent-hover shrink-0"
            title="Send"
          >
            <SendHorizonal size={14} />
          </button>
        </div>

        {/* Arrow keys */}
        <div className="flex items-center gap-0.5">
          <button
            {...useLongPress(KEYS.ARROW_LEFT)}
            className="p-1.5 rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex flex-col gap-0.5">
            <button
              {...useLongPress(KEYS.ARROW_UP)}
              className="p-1 rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
            >
              <ArrowUp size={14} />
            </button>
            <button
              {...useLongPress(KEYS.ARROW_DOWN)}
              className="p-1 rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
            >
              <ArrowDown size={14} />
            </button>
          </div>

          <button
            {...useLongPress(KEYS.ARROW_RIGHT)}
            className="p-1.5 rounded bg-bg-tertiary text-text-primary active:bg-accent active:text-white"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
