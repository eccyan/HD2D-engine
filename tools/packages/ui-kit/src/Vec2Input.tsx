import React, { useCallback } from "react";

export interface Vec2InputProps {
  value: [number, number];
  onChange: (v: [number, number]) => void;
  label?: string;
  step?: number;
}

export function Vec2Input({ value, onChange, label, step = 0.1 }: Vec2InputProps) {
  const [x, y] = value;

  const handleChange = useCallback(
    (index: 0 | 1, raw: string) => {
      const parsed = parseFloat(raw);
      if (isNaN(parsed)) return;
      const next: [number, number] = [x, y];
      next[index] = parsed;
      onChange(next);
    },
    [x, y, onChange]
  );

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#ccc",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };

  const inputStyle: React.CSSProperties = {
    background: "#1e1e1e",
    border: "1px solid #444",
    borderRadius: "3px",
    color: "#eee",
    fontFamily: "monospace",
    fontSize: "12px",
    padding: "2px 6px",
    width: "72px",
    textAlign: "right",
  };

  const axisLabelStyle: React.CSSProperties = {
    minWidth: "14px",
    color: "#888",
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      {label && <span style={{ color: "#aaa" }}>{label}</span>}
      <div style={rowStyle}>
        <span style={{ ...axisLabelStyle, color: "#e06c75" }}>X</span>
        <input
          type="number"
          value={x}
          step={step}
          onChange={(e) => handleChange(0, e.target.value)}
          style={inputStyle}
        />
        <span style={{ ...axisLabelStyle, color: "#98c379" }}>Y</span>
        <input
          type="number"
          value={y}
          step={step}
          onChange={(e) => handleChange(1, e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>
  );
}
