"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/40" onClick={onCancel} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[340px] bg-[#252526] border border-[#454545] rounded-lg shadow-2xl">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            {destructive && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#c74e39]/15 flex items-center justify-center mt-0.5">
                <AlertTriangle size={16} className="text-[#c74e39]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-medium text-[#cccccc] mb-1">{title}</h3>
              <p className="text-[13px] text-[#999] break-words">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[13px] text-[#cccccc] bg-[#3c3c3c] hover:bg-[#505050] border border-[#555] rounded"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-3 py-1.5 text-[13px] text-white rounded ${
              destructive
                ? "bg-[#c74e39] hover:bg-[#d4593f]"
                : "bg-[#0e639c] hover:bg-[#1177bb]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
