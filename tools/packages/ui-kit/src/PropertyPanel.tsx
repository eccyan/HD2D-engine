import React, { useState } from "react";

export interface PropertyPanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function PropertyPanel({ title, children, defaultOpen = true }: PropertyPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  const panelStyle: React.CSSProperties = {
    border: "1px solid #3a3a3a",
    borderRadius: "4px",
    overflow: "hidden",
    fontFamily: "monospace",
    fontSize: "12px",
    marginBottom: "8px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    background: "#2a2a2a",
    cursor: "pointer",
    userSelect: "none",
    color: "#ccc",
    borderBottom: open ? "1px solid #3a3a3a" : "none",
  };

  const arrowStyle: React.CSSProperties = {
    display: "inline-block",
    width: "10px",
    color: "#888",
    transform: open ? "rotate(90deg)" : "rotate(0deg)",
    transition: "transform 0.15s ease",
    fontSize: "10px",
  };

  const bodyStyle: React.CSSProperties = {
    padding: open ? "10px" : "0",
    background: "#1a1a1a",
    display: open ? "block" : "none",
  };

  return (
    <div style={panelStyle}>
      <div
        style={headerStyle}
        onClick={() => setOpen((prev) => !prev)}
        role="button"
        aria-expanded={open}
      >
        <span style={arrowStyle}>&#9654;</span>
        <span>{title}</span>
      </div>
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}
