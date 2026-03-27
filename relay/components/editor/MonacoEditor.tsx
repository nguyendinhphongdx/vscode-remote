"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface MonacoEditorProps {
  content: string;
  language: string;
  path: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onOpenFile: (path: string) => void;
  resolveFilePath: (path: string) => Promise<string | null>;
}

// Resolve import path relative to current file
function resolveImportPath(importPath: string, currentFilePath: string): string | null {
  let resolved = importPath;
  if (resolved.startsWith("@/")) {
    resolved = resolved.slice(2);
  } else if (resolved.startsWith("./") || resolved.startsWith("../")) {
    const currentDir = currentFilePath.includes("/")
      ? currentFilePath.substring(0, currentFilePath.lastIndexOf("/"))
      : ".";
    const parts = currentDir.split("/");
    const importParts = resolved.split("/");

    for (const part of importParts) {
      if (part === "..") {
        parts.pop();
      } else if (part !== ".") {
        parts.push(part);
      }
    }
    resolved = parts.join("/");
  } else {
    return null;
  }

  return resolved;
}

// Extract all import paths from a line with their positions
function extractImportFromLine(line: string): { path: string; startCol: number; endCol: number } | null {
  const patterns = [
    /from\s+["']([^"']+)["']/,
    /import\s+["']([^"']+)["']/,
    /require\s*\(\s*["']([^"']+)["']\s*\)/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match) continue;

    const importPath = match[1];
    const fullMatchIndex = line.indexOf(match[0]);
    const pathStart = fullMatchIndex + match[0].indexOf(importPath);
    const pathEnd = pathStart + importPath.length;

    return { path: importPath, startCol: pathStart + 1, endCol: pathEnd + 1 };
  }
  return null;
}

export function MonacoEditor({
  content,
  language,
  path,
  onChange,
  onSave,
  onOpenFile,
  resolveFilePath,
}: MonacoEditorProps) {
  const [isMonacoReady, setIsMonacoReady] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Ensure Monaco is loaded before rendering Editor
  useEffect(() => {
    loader.init().then(() => setIsMonacoReady(true));
  }, []);
  const onSaveRef = useRef(onSave);
  const onOpenFileRef = useRef(onOpenFile);
  const resolveFilePathRef = useRef(resolveFilePath);
  onSaveRef.current = onSave;
  onOpenFileRef.current = onOpenFile;
  resolveFilePathRef.current = resolveFilePath;

  const handleMount: OnMount = useCallback(
    (editorInstance, monaco) => {
      editorRef.current = editorInstance;

      // Disable semantic validation - no full project context available
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
      });
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
      });

      // Ctrl+S save
      editorInstance.addAction({
        id: "save-file",
        label: "Save File",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => onSaveRef.current(),
      });

      // Register link provider for import paths
      // This makes import paths clickable with Ctrl+Click and shows underline on hover
      const languages = ["typescript", "typescriptreact", "javascript", "javascriptreact"];
      for (const lang of languages) {
        monaco.languages.registerLinkProvider(lang, {
          provideLinks: async (model) => {
            const links: { range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; tooltip?: string; data?: string }[] = [];
            const lineCount = model.getLineCount();

            // Cache resolved paths to avoid duplicate requests
            const resolveCache = new Map<string, string | null>();

            for (let i = 1; i <= lineCount; i++) {
              const line = model.getLineContent(i);
              const extracted = extractImportFromLine(line);
              if (!extracted) continue;

              const resolved = resolveImportPath(extracted.path, path);
              if (!resolved) continue;

              // Check if file exists (with caching)
              let actualPath = resolveCache.get(resolved);
              if (actualPath === undefined) {
                actualPath = await resolveFilePathRef.current(resolved);
                resolveCache.set(resolved, actualPath);
              }

              if (actualPath) {
                links.push({
                  range: {
                    startLineNumber: i,
                    startColumn: extracted.startCol,
                    endLineNumber: i,
                    endColumn: extracted.endCol,
                  },
                  tooltip: actualPath,
                  data: resolved,
                });
              }
            }

            return { links };
          },
          resolveLink: (link) => {
            // Open the file when clicked
            const resolved = (link as { data?: string }).data;
            if (resolved) {
              onOpenFileRef.current(resolved);
            }
            return link;
          },
        });
      }

      editorInstance.focus();
    },
    [path]
  );

  if (!isMonacoReady) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#808080" }}>
        Loading editor...
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={language}
      defaultValue={content}
      path={path}
      theme="vs-dark"
      onChange={(value) => onChange(value || "")}
      onMount={handleMount}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "off",
        tabSize: 2,
        renderWhitespace: "selection",
        bracketPairColorization: { enabled: true },
        padding: { top: 8 },
        cursorBlinking: "smooth",
        smoothScrolling: true,
      }}
    />
  );
}
