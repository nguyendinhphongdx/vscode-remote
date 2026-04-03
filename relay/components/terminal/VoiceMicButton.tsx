"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, X, Eraser } from "lucide-react";

type VoiceState = "idle" | "listening" | "unsupported";

// SpeechRecognition types
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { transcript: string };
}

interface SpeechRecognitionEvent {
  results: { [index: number]: SpeechRecognitionResult; length: number };
  resultIndex: number;
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
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  ) as (new () => SpeechRecognitionInstance) | null;
}

interface VoiceModeProps {
  onSubmit: (text: string) => void;
  onClose: () => void;
}

// Waveform visualizer using Web Audio API
function WaveformVisualizer({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    ctxRef.current = audioCtx;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#3b82f6";
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Draw glow bars
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
      const barCount = 32;
      const barWidth = w / barCount;
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * bufferLength);
        const barHeight = (dataArray[idx] / 255) * h * 0.8;
        ctx.fillRect(
          i * barWidth + 1,
          (h - barHeight) / 2,
          barWidth - 2,
          barHeight
        );
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={32}
      className="w-full h-full rounded"
    />
  );
}

const COUNTDOWN_SECONDS = 3;

// Full voice mode overlay for mobile toolbar
function VoiceMode({ onSubmit, onClose }: VoiceModeProps) {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null); // null = not counting
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTextRef = useRef("");

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  // Start countdown with 1s ticks
  const startCountdown = useCallback(
    (text: string) => {
      clearCountdown();
      pendingTextRef.current = text;
      let remaining = COUNTDOWN_SECONDS;
      setCountdown(remaining);

      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearCountdown();
          if (pendingTextRef.current.trim()) {
            onSubmit(pendingTextRef.current.trim());
            setTranscript("");
            setInterim("");
            pendingTextRef.current = "";
            // Restart recognition to clear accumulated results
            if (recognitionRef.current) {
              recognitionRef.current.stop();
              // onend handler will auto-restart
            }
          }
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    },
    [clearCountdown, onSubmit]
  );

  const startRecognition = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    // Get audio stream for visualizer
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setStream(audioStream);
    } catch {
      // Visualizer won't work but speech recognition still can
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      setTranscript(finalText);
      setInterim(interimText);

      if (finalText) {
        startCountdown(finalText);
      }
    };

    recognition.onspeechstart = () => {
      setIsSpeaking(true);
      clearCountdown(); // speaking again → cancel pending submit
    };

    recognition.onspeechend = () => {
      setIsSpeaking(false);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      console.warn("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      // Auto-restart for continuous listening
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started or disposed
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [startCountdown, clearCountdown]);

  // Start on mount
  useEffect(() => {
    startRecognition();

    return () => {
      if (recognitionRef.current) {
        const ref = recognitionRef.current;
        recognitionRef.current = null;
        ref.abort();
      }
      clearCountdown();
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      ref.abort();
    }
    clearCountdown();
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    // Submit remaining text before closing
    if (transcript.trim()) {
      onSubmit(transcript.trim());
    }
    onClose();
  };

  const handleForceSubmit = () => {
    clearCountdown();
    const text = (transcript + " " + interim).trim();
    if (text) {
      onSubmit(text);
      setTranscript("");
      setInterim("");
      pendingTextRef.current = "";
      // Restart recognition to clear accumulated results
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const handleClear = () => {
    clearCountdown();
    setTranscript("");
    setInterim("");
    pendingTextRef.current = "";
  };

  const handleCancelCountdown = () => {
    clearCountdown();
  };

  return (
    <div className="flex flex-col gap-1 h-21">
      {/* Transcript + countdown */}
      <div className="flex-1 min-h-0 px-2 py-1 rounded bg-bg-tertiary text-[12px] font-mono text-text-primary flex items-start gap-1 overflow-y-auto">
        <div className="flex-1 min-w-0">
          {transcript || interim ? (
            <>
              <span>{transcript}</span>
              <span className="text-text-muted italic">{interim}</span>
            </>
          ) : (
            <span className="text-text-muted">
              {isSpeaking ? "Listening..." : "Speak..."}
            </span>
          )}
        </div>
        {countdown !== null && (
          <button
            onPointerDown={(e) => { e.preventDefault(); handleCancelCountdown(); }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[11px] font-mono font-bold shrink-0"
          >
            <svg className="h-3.5 w-3.5 -rotate-90" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2"
                strokeDasharray={2 * Math.PI * 6}
                strokeDashoffset={2 * Math.PI * 6 * (1 - countdown / COUNTDOWN_SECONDS)}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            {countdown}s
          </button>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-1 h-10">
        <div
          className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 ${
            isSpeaking ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-blue-500/20 text-blue-400"
          }`}
        >
          <Mic size={14} />
        </div>
        <div className="flex-1 min-w-0 h-8">
          <WaveformVisualizer stream={stream} />
        </div>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleClear(); }}
          className="w-8 h-8 flex items-center justify-center rounded bg-bg-tertiary text-text-secondary active:bg-yellow-500/30 shrink-0"
        >
          <Eraser size={14} />
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleForceSubmit(); }}
          className="h-8 px-2.5 rounded bg-accent text-white text-[12px] font-medium active:bg-accent-hover shrink-0"
        >
          Send
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded bg-bg-tertiary text-text-secondary active:bg-red-500/30 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// Exported components
interface VoiceMicButtonProps {
  asMenuItem?: boolean;
  onActivate?: () => void;
}

export function VoiceMicButton({ asMenuItem, onActivate }: VoiceMicButtonProps) {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!getSpeechRecognition()) setSupported(false);
  }, []);

  if (!supported) return null;

  if (asMenuItem) {
    return (
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onActivate?.();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-bg-active hover:text-text-primary"
      >
        <Mic size={13} />
        Voice Mode
      </button>
    );
  }

  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onActivate?.();
      }}
      className="p-2 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary active:bg-accent active:text-white"
      title="Voice mode"
    >
      <Mic size={18} />
    </button>
  );
}

export { VoiceMode };
