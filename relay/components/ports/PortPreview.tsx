"use client";

import { useState } from "react";
import { Globe, X, ExternalLink, RotateCw, Copy, Check } from "lucide-react";

interface PortPreviewProps {
  port: number;
  url: string;
  onClose: () => void;
}

export function PortPreview({ port, url, onClose }: PortPreviewProps) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-editor">
      {/* Toolbar */}
      <div className="flex items-center h-[35px] px-2 gap-1.5 border-b border-border bg-bg-secondary shrink-0">
        <Globe size={14} className="text-[#73c991] shrink-0 ml-1" />
        <span className="text-[11px] text-text-secondary shrink-0">
          Port {port}
        </span>

        {/* URL bar */}
        <div className="flex-1 flex items-center mx-2">
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setIframeKey((k) => k + 1);
            }}
            className="w-full px-2 py-0.5 bg-bg-input border border-border rounded text-[12px] text-text-primary outline-none focus:border-accent"
          />
        </div>

        {/* Actions */}
        <button
          onClick={() => setIframeKey((k) => k + 1)}
          className="p-1 rounded hover:bg-bg-active text-text-secondary"
          title="Reload"
        >
          <RotateCw size={13} />
        </button>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-bg-active text-text-secondary"
          title="Copy URL"
        >
          {copied ? <Check size={13} className="text-[#73c991]" /> : <Copy size={13} />}
        </button>
        <button
          onClick={() => window.open(currentUrl, "_blank")}
          className="p-1 rounded hover:bg-bg-active text-text-secondary"
          title="Open in Browser"
        >
          <ExternalLink size={13} />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-bg-active text-text-secondary"
          title="Close Preview"
        >
          <X size={13} />
        </button>
      </div>

      {/* iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          key={iframeKey}
          src={currentUrl}
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title={`Port ${port} Preview`}
        />
      </div>
    </div>
  );
}
