"use client";

import { useEditor } from "@/lib/hooks/useEditor";
import { X } from "lucide-react";

export function EditorTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab, pinTab } = useEditor();

  if (tabs.length === 0) return null;

  return (
    <div className="flex bg-tab-border overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-border text-[13px] shrink-0 max-w-[160px] ${
              isActive
                ? "bg-tab-active text-text-primary"
                : "bg-tab-inactive text-text-secondary hover:bg-bg-hover"
            }`}
            onClick={() => setActiveTab(tab.id)}
            onDoubleClick={() => pinTab(tab.id)}
            onMouseDown={(e) => {
              // Middle click to close
              if (e.button === 1) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
          >
            <span className={`truncate ${tab.isPreview ? "italic" : ""}`}>
              {tab.isDirty && <span className="text-text-muted mr-0.5">*</span>}
              {tab.filename}
            </span>
            <button
              className="p-0.5 rounded hover:bg-bg-active shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
