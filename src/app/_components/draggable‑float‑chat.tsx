"use client";

import { AiChat01Icon } from "hugeicons-react";
import { useEffect, useRef, useState } from "react";

const BUTTON_SIZE = 64;
const EDGE_GAP = 24;

export function DraggableFloatChat() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const startOffset = useRef({ dx: 0, dy: 0 });
  const latestPos = useRef(pos);
  const dragged = useRef(false);

  useEffect(() => {
    const initialPos = {
      x: window.innerWidth - BUTTON_SIZE - EDGE_GAP,
      y: window.innerHeight - BUTTON_SIZE - 40,
    };
    latestPos.current = initialPos;
    setPos(initialPos);

    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    startOffset.current = {
      dx: event.clientX - pos.x,
      dy: event.clientY - pos.y,
    };
    dragged.current = false;
    setIsDragging(false);

    const onMouseMove = (mouseEvent: MouseEvent) => {
      dragged.current = true;
      setIsDragging(true);
      const nextPos = {
        x: Math.max(
          0,
          Math.min(mouseEvent.clientX - startOffset.current.dx, window.innerWidth - BUTTON_SIZE),
        ),
        y: Math.max(
          0,
          Math.min(mouseEvent.clientY - startOffset.current.dy, window.innerHeight - BUTTON_SIZE),
        ),
      };
      latestPos.current = nextPos;
      setPos(nextPos);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setIsDragging(false);
      const snapX =
        latestPos.current.x + BUTTON_SIZE / 2 < window.innerWidth / 2
          ? EDGE_GAP
          : window.innerWidth - BUTTON_SIZE - EDGE_GAP;
      const snappedPos = { ...latestPos.current, x: snapX };
      latestPos.current = snappedPos;
      setPos(snappedPos);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      aria-label="打开 AI 对话"
      onMouseDown={handleMouseDown}
      role="button"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        zIndex: 9999,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        backgroundColor: "#0ea5e9",
        borderRadius: "9999px",
        boxShadow: "0 10px 25px rgba(14, 165, 233, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      tabIndex={0}
      onClick={() => {
        if (!dragged.current) window.location.href = "/dialogue";
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") window.location.href = "/dialogue";
      }}
    >
      <AiChat01Icon size={30} color={isDark ? "#ffffff" : "#0f172a"} />
    </div>
  );
}
