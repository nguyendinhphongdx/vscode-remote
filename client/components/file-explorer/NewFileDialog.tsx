"use client";

import { useState } from "react";
import { getFileIconComponent, getFolderIconComponent } from "@/lib/utils/fileIcons";

interface NewFileDialogProps {
  type: "file" | "directory";
  depth?: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NewFileDialog({
  type,
  depth = 0,
  onConfirm,
  onCancel,
}: NewFileDialogProps) {
  const [name, setName] = useState("");

  const paddingLeft = depth * 12 + 4;

  return (
    <div
      className="flex items-center h-[22px]"
      style={{ paddingLeft: `${paddingLeft}px` }}
    >
      <span className="shrink-0 w-[16px]" />
      <span className="shrink-0 mx-[3px]">
        {type === "directory"
          ? getFolderIconComponent(name || "new", false)
          : getFileIconComponent(name || "untitled")}
      </span>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="ml-1 flex-1 bg-[#3c3c3c] border border-[#007fd4] px-1 text-[#cccccc] outline-none text-[13px] h-[18px] rounded-sm"
        placeholder={type === "file" ? "filename" : "folder name"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onConfirm(name.trim());
          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => {
          if (name.trim()) onConfirm(name.trim());
          else onCancel();
        }}
      />
    </div>
  );
}
