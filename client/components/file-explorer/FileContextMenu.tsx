"use client";

import { useEffect, useRef } from "react";
import { FilePlus, FolderPlus, Pencil, Trash2 } from "lucide-react";

interface FileContextMenuProps {
  x: number;
  y: number;
  isDir: boolean;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function FileContextMenu({
  x,
  y,
  isDir,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Adjust position so menu doesn't go off screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  const items = [
    ...(isDir
      ? [
          { icon: <FilePlus size={14} />, label: "New File", onClick: onNewFile },
          { icon: <FolderPlus size={14} />, label: "New Folder", onClick: onNewFolder },
          { type: "separator" as const },
        ]
      : []),
    { icon: <Pencil size={14} />, label: "Rename", onClick: onRename, shortcut: "F2" },
    { icon: <Trash2 size={14} />, label: "Delete", onClick: onDelete, shortcut: "Del", danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[#3c3c3c] border border-[#454545] rounded-md shadow-xl py-1 min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) =>
        "type" in item && item.type === "separator" ? (
          <div key={i} className="border-t border-[#454545] my-1" />
        ) : (
          <button
            key={i}
            className={`w-full text-left px-2 py-[3px] text-[13px] flex items-center gap-2 ${
              "danger" in item && item.danger
                ? "text-[#f48771] hover:bg-[#094771]"
                : "text-text-primary hover:bg-[#094771]"
            }`}
            onClick={"onClick" in item ? item.onClick : undefined}
          >
            {"icon" in item && <span className="w-4 text-text-secondary">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {"shortcut" in item && (
              <span className="text-[11px] text-text-muted ml-4">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
}
