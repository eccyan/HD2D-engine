import React from "react";

export interface TileEntry {
  id: number;
  color: string;
  label?: string;
}

export interface TilePaletteProps {
  tiles: TileEntry[];
  selected: number;
  onSelect: (id: number) => void;
}

export function TilePalette({ tiles, selected, onSelect }: TilePaletteProps) {
  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))",
    gap: "4px",
    padding: "8px",
    background: "#1a1a1a",
    border: "1px solid #3a3a3a",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "10px",
  };

  const getTileStyle = (id: number, color: string): React.CSSProperties => {
    const isSelected = id === selected;
    return {
      width: "36px",
      height: "36px",
      background: color,
      border: isSelected ? "2px solid #61afef" : "2px solid #3a3a3a",
      borderRadius: "3px",
      cursor: "pointer",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: isSelected ? "0 0 0 1px #61afef" : "none",
      transition: "border-color 0.1s, box-shadow 0.1s",
      position: "relative",
    };
  };

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "1px",
    left: 0,
    right: 0,
    textAlign: "center",
    color: "rgba(255,255,255,0.85)",
    fontSize: "9px",
    textShadow: "0 1px 2px rgba(0,0,0,0.9)",
    pointerEvents: "none",
    lineHeight: 1,
    padding: "0 2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <div style={containerStyle}>
      {tiles.map((tile) => (
        <div
          key={tile.id}
          style={getTileStyle(tile.id, tile.color)}
          onClick={() => onSelect(tile.id)}
          title={tile.label ?? `Tile ${tile.id}`}
          role="button"
          aria-selected={tile.id === selected}
        >
          {tile.label && <span style={labelStyle}>{tile.label}</span>}
        </div>
      ))}
    </div>
  );
}
