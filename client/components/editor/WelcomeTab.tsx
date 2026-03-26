"use client";

export function WelcomeTab() {
  return (
    <div className="h-full flex items-center justify-center text-text-muted">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-light text-text-secondary">VS Code Remote</h2>
        <div className="text-sm space-y-1">
          <p>Open a file from the explorer to start editing</p>
          <div className="mt-4 text-xs space-y-0.5">
            <p><kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Ctrl+S</kbd> Save file</p>
            <p><kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Ctrl+`</kbd> Toggle terminal</p>
            <p><kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Ctrl+B</kbd> Toggle sidebar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
