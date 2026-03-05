import React, { useCallback } from "react";

export interface ColorPickerProps {
  value: [number, number, number, number];
  onChange: (v: [number, number, number, number]) => void;
  label?: string;
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

function fromHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [r, g, b, a] = value;
  const hexValue = toHex(r, g, b);

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const [nr, ng, nb] = fromHex(e.target.value);
      onChange([nr, ng, nb, a]);
    },
    [a, onChange]
  );

  const handleHexInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
        const [nr, ng, nb] = fromHex(raw);
        onChange([nr, ng, nb, a]);
      }
    },
    [a, onChange]
  );

  const handleAlphaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newAlpha = parseFloat(e.target.value);
      onChange([r, g, b, newAlpha]);
    },
    [r, g, b, onChange]
  );

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#ccc",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const hexInputStyle: React.CSSProperties = {
    background: "#1e1e1e",
    border: "1px solid #444",
    borderRadius: "3px",
    color: "#eee",
    fontFamily: "monospace",
    fontSize: "12px",
    padding: "2px 6px",
    width: "72px",
  };

  const sliderStyle: React.CSSProperties = {
    flex: 1,
    accentColor: "#888",
  };

  return (
    <div style={containerStyle}>
      {label && <span style={{ color: "#aaa", marginBottom: "2px" }}>{label}</span>}
      <div style={rowStyle}>
        <input
          type="color"
          value={hexValue}
          onChange={handleColorChange}
          style={{ width: "32px", height: "24px", border: "none", padding: 0, background: "none", cursor: "pointer" }}
        />
        <input
          type="text"
          value={hexValue}
          onChange={handleHexInput}
          style={hexInputStyle}
          maxLength={7}
        />
      </div>
      <div style={rowStyle}>
        <span style={{ minWidth: "36px", color: "#888" }}>Alpha</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={a}
          onChange={handleAlphaChange}
          style={sliderStyle}
        />
        <span style={{ minWidth: "32px", textAlign: "right" }}>{a.toFixed(2)}</span>
      </div>
    </div>
  );
}
