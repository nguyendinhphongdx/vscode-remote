"use client";

import { useCallback, useState, useRef } from "react";
import { useFileStore } from "@/store/fileStore";
import { useGitStore } from "@/store/gitStore";
import { useFileSystem } from "@/lib/hooks/useFileSystem";
import { useEditor } from "@/lib/hooks/useEditor";
import { FileContextMenu } from "./FileContextMenu";
import { NewFileDialog } from "./NewFileDialog";
import { getFileIconComponent, getFolderIconComponent } from "@/lib/utils/fileIcons";
import type { FileEntry } from "@/lib/ws/protocol";
import { ChevronRight, ChevronDown } from "lucide-react";

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
}

export function FileTreeNode({ entry, depth }: FileTreeNodeProps) {
  const { tree, expandedDirs, selectedPath, selectFile, toggleDir } =
    useFileStore();
  const { listDirectory, createEntry, deleteEntry, renameEntry } = useFileSystem();
  const { openFile, openFilePreview } = useEditor();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [creating, setCreating] = useState<"file" | "directory" | null>(null);
  const [renaming, setRenaming] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const isDir = entry.type === "directory";
  const isExpanded = expandedDirs.has(entry.path);
  const isSelected = selectedPath === entry.path;

  const gitStatus = useGitStore((s) =>
    isDir ? s.getDirStatus(entry.path) : s.getFileStatus(entry.path)
  );
  const children = tree.get(entry.path) || [];

  // VS Code git colors
  const gitColorMap: Record<string, string> = {
    M: "text-[#e2c08d]", // Modified - yellow
    A: "text-[#73c991]", // Added - green
    D: "text-[#c74e39]", // Deleted - red
    R: "text-[#73c991]", // Renamed - green
    U: "text-[#e2c08d]", // Unmerged - yellow
    "?": "text-[#73c991]", // Untracked - green
  };
  const gitLabelMap: Record<string, string> = {
    M: "M", A: "A", D: "D", R: "R", U: "U", "?": "U",
  };

  const statusCode = isDir
    ? (gitStatus as string | null)
    : (gitStatus as { status: string; staged: boolean } | null)?.status ?? null;
  const gitColor = statusCode ? gitColorMap[statusCode] || "" : "";
  const gitLabel = statusCode ? gitLabelMap[statusCode] || "" : "";

  const handleClick = useCallback(async () => {
    if (isDir) {
      toggleDir(entry.path);
      if (!isExpanded) {
        await listDirectory(entry.path);
      }
    } else {
      selectFile(entry.path);
      openFilePreview(entry.path);
    }
  }, [isDir, isExpanded, entry.path, toggleDir, listDirectory, selectFile, openFilePreview]);

  const handleDoubleClick = useCallback(() => {
    if (!isDir) {
      openFile(entry.path);
    }
  }, [isDir, entry.path, openFile]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = async () => {
    setContextMenu(null);
    if (confirm(`Delete "${entry.name}"?`)) {
      await deleteEntry(entry.path);
      const parentPath = entry.path.includes("/")
        ? entry.path.substring(0, entry.path.lastIndexOf("/"))
        : ".";
      listDirectory(parentPath);
    }
  };

  const handleRename = async (newName: string) => {
    setRenaming(false);
    if (newName === entry.name) return;
    const parentPath = entry.path.includes("/")
      ? entry.path.substring(0, entry.path.lastIndexOf("/"))
      : ".";
    const newPath = parentPath === "." ? newName : `${parentPath}/${newName}`;
    await renameEntry(entry.path, newPath);
    listDirectory(parentPath);
  };

  const handleCreate = async (name: string) => {
    if (!creating) return;
    const fullPath = `${entry.path}/${name}`;
    await createEntry(fullPath, creating);
    setCreating(null);
    listDirectory(entry.path);
  };

  const paddingLeft = depth * 12 + 4;

  return (
    <div>
      <div
        ref={nodeRef}
        className={`flex items-center h-[22px] cursor-pointer select-none relative ${
          isSelected
            ? "bg-[#37373d] text-white group-focus-within/tree:bg-[#094771] group-focus-within/tree:outline group-focus-within/tree:outline-1 group-focus-within/tree:outline-[#007fd4] group-focus-within/tree:-outline-offset-1"
            : "hover:bg-[#2a2d2e] text-[#cccccc]"
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Indent guides */}
        {Array.from({ length: depth }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 bottom-0 w-px bg-[#404040]"
            style={{ left: `${i * 12 + 16}px` }}
          />
        ))}

        {/* Chevron */}
        {isDir ? (
          <span className="shrink-0 w-[16px] h-[16px] flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown size={14} className="text-[#c5c5c5]" />
            ) : (
              <ChevronRight size={14} className="text-[#c5c5c5]" />
            )}
          </span>
        ) : (
          <span className="shrink-0 w-[16px]" />
        )}

        {/* Icon */}
        <span className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
          {isDir
            ? getFolderIconComponent(entry.name, isExpanded)
            : getFileIconComponent(entry.name)}
        </span>

        {/* Name */}
        {renaming ? (
          <input
            autoFocus
            defaultValue={entry.name}
            className="ml-2 flex-1 bg-[#3c3c3c] border border-[#007fd4] px-1 text-[#cccccc] outline-none text-[13px] h-[18px] rounded-sm"
            onBlur={(e) => handleRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename(e.currentTarget.value);
              if (e.key === "Escape") setRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`ml-2 flex-1 flex items-center min-w-0 text-[13px] leading-[22px] ${gitColor}`}>
            <span className="truncate">{entry.name}</span>
            {gitLabel && !isDir && (
              <span className={`ml-auto pl-2 pr-1 text-[11px] font-medium shrink-0 ${gitColor}`}>
                {gitLabel}
              </span>
            )}
          </span>
        )}
      </div>

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isDir={isDir}
          onClose={() => setContextMenu(null)}
          onNewFile={() => {
            setContextMenu(null);
            setCreating("file");
          }}
          onNewFolder={() => {
            setContextMenu(null);
            setCreating("directory");
          }}
          onRename={() => {
            setContextMenu(null);
            setRenaming(true);
          }}
          onDelete={handleDelete}
        />
      )}

      {isDir && isExpanded && (
        <>
          {creating && (
            <NewFileDialog
              type={creating}
              depth={depth + 1}
              onConfirm={handleCreate}
              onCancel={() => setCreating(null)}
            />
          )}
          {children.map((child) => (
            <FileTreeNode key={child.path} entry={child} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  );
}
