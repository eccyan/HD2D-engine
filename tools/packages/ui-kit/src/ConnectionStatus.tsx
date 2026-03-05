import React from "react";

export interface ConnectionStatusProps {
  connected: boolean;
  url?: string;
}

export function ConnectionStatus({ connected, url }: ConnectionStatusProps) {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 8px",
    fontFamily: "monospace",
    fontSize: "11px",
    color: connected ? "#98c379" : "#e06c75",
    background: "#1a1a1a",
    borderRadius: "3px",
    border: `1px solid ${connected ? "#3a5c3a" : "#5c3a3a"}`,
    userSelect: "none",
  };

  const dotStyle: React.CSSProperties = {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: connected ? "#98c379" : "#e06c75",
    flexShrink: 0,
    boxShadow: connected
      ? "0 0 4px rgba(152, 195, 121, 0.6)"
      : "0 0 4px rgba(224, 108, 117, 0.4)",
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: "bold",
  };

  const urlStyle: React.CSSProperties = {
    color: "#666",
    marginLeft: "4px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "180px",
  };

  return (
    <div style={containerStyle}>
      <span style={dotStyle} />
      <span style={labelStyle}>{connected ? "Connected" : "Disconnected"}</span>
      {url && <span style={urlStyle}>{url}</span>}
    </div>
  );
}
