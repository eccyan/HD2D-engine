import React, { useCallback } from "react";

export interface NumberSliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export function NumberSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
}: NumberSliderProps) {
  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  const handleNumber = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    },
    [onChange]
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
    gap: "8px",
  };

  const sliderStyle: React.CSSProperties = {
    flex: 1,
    accentColor: "#61afef",
    cursor: "pointer",
  };

  const numberInputStyle: React.CSSProperties = {
    background: "#1e1e1e",
    border: "1px solid #444",
    borderRadius: "3px",
    color: "#eee",
    fontFamily: "monospace",
    fontSize: "12px",
    padding: "2px 6px",
    width: "64px",
    textAlign: "right",
  };

  return (
    <div style={containerStyle}>
      {label && <span style={{ color: "#aaa" }}>{label}</span>}
      <div style={rowStyle}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSlider}
          style={sliderStyle}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleNumber}
          style={numberInputStyle}
        />
      </div>
    </div>
  );
}
