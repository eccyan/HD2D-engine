import React from "react";

export interface ToolBarItem {
  id: string;
  label: string;
  icon?: string;
}

export interface ToolBarProps {
  tools: ToolBarItem[];
  selected: string;
  onSelect: (id: string) => void;
}

export function ToolBar({ tools, selected, onSelect }: ToolBarProps) {
  const barStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "2px",
    padding: "4px 6px",
    background: "#252525",
    borderBottom: "1px solid #3a3a3a",
    fontFamily: "monospace",
    fontSize: "12px",
  };

  const getButtonStyle = (id: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    border: "1px solid transparent",
    borderRadius: "3px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "12px",
    transition: "background 0.1s, border-color 0.1s",
    background: id === selected ? "#3a3a5c" : "#2a2a2a",
    borderColor: id === selected ? "#61afef" : "#3a3a3a",
    color: id === selected ? "#abb2bf" : "#888",
  });

  const iconStyle: React.CSSProperties = {
    fontSize: "14px",
    lineHeight: 1,
  };

  return (
    <div style={barStyle}>
      {tools.map((tool) => (
        <button
          key={tool.id}
          style={getButtonStyle(tool.id)}
          onClick={() => onSelect(tool.id)}
          title={tool.label}
        >
          {tool.icon && <span style={iconStyle}>{tool.icon}</span>}
          <span>{tool.label}</span>
        </button>
      ))}
    </div>
  );
}
