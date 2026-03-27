"use client";

import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
}

export function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const startPosRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startPosRef.current = direction === "horizontal" ? e.clientX : e.clientY;

      const handleMouseMove = (e: MouseEvent) => {
        const currentPos =
          direction === "horizontal" ? e.clientX : e.clientY;
        const delta = currentPos - startPosRef.current;
        startPosRef.current = currentPos;
        onResize(delta);
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [direction, onResize]
  );

  return (
    <div
      className={`${
        direction === "horizontal"
          ? "w-[3px] cursor-col-resize hover:bg-accent"
          : "h-[3px] cursor-row-resize hover:bg-accent"
      } bg-border shrink-0 transition-colors`}
      onMouseDown={handleMouseDown}
    />
  );
}
