import React, { useCallback, useRef, useState } from 'react';

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  style?: React.CSSProperties;
}

function formatValue(v: number): string {
  // Remove trailing zeros: "12.500" -> "12.5", "12.0" -> "12"
  return parseFloat(v.toFixed(10)).toString();
}

function clamp(v: number, min?: number, max?: number): number {
  if (min !== undefined && v < min) return min;
  if (max !== undefined && v > max) return max;
  return v;
}

const defaultInputStyle: React.CSSProperties = {
  padding: '4px 6px',
  background: '#2a2a4a',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#ddd',
  fontSize: 13,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  userSelect: 'none',
  cursor: 'ew-resize',
};

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  style,
}: NumberInputProps) {
  const [text, setText] = useState(() => formatValue(value));
  const [focused, setFocused] = useState(false);
  const prevValue = useRef(value);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);
  const dragging = useRef(false);

  // Keep text in sync with external value changes when not focused
  if (!focused && value !== prevValue.current) {
    prevValue.current = value;
  }
  const displayText = focused ? text : formatValue(value);

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw);
      if (isNaN(parsed)) {
        // Revert to previous value
        setText(formatValue(value));
        return;
      }
      const clamped = clamp(parsed, min, max);
      onChange(clamped);
      setText(formatValue(clamped));
    },
    [value, min, max, onChange],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    setText(formatValue(value));
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    commit(text);
  }, [text, commit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commit(text);
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setText(formatValue(value));
        setFocused(false);
        (e.target as HTMLInputElement).blur();
      }
    },
    [text, commit, value],
  );

  // Drag-to-scrub on label
  const handleLabelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      dragStartX.current = e.clientX;
      dragStartValue.current = value;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value],
  );

  const handleLabelPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStartX.current;
      const delta = Math.round(dx / 2) * step;
      const newVal = clamp(dragStartValue.current + delta, min, max);
      onChange(newVal);
    },
    [step, min, max, onChange],
  );

  const handleLabelPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <>
      {label && (
        <span
          style={labelStyle}
          onPointerDown={handleLabelPointerDown}
          onPointerMove={handleLabelPointerMove}
          onPointerUp={handleLabelPointerUp}
        >
          {label}
        </span>
      )}
      <input
        type="text"
        value={displayText}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPointerDown={(e) => {
          // Only initiate drag if not already focused (typing mode)
          if (document.activeElement !== e.currentTarget) {
            dragStartX.current = e.clientX;
            dragStartValue.current = value;
            dragging.current = false;  // Will become true on first move
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }
        }}
        onPointerMove={(e) => {
          if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return;
          const dx = e.clientX - dragStartX.current;
          // Start dragging only after 3px threshold (allows click-to-focus)
          if (!dragging.current && Math.abs(dx) < 3) return;
          if (!dragging.current) {
            dragging.current = true;
            e.preventDefault();
          }
          const delta = Math.round(dx / 2) * step;
          const newVal = clamp(dragStartValue.current + delta, min, max);
          onChange(newVal);
        }}
        onPointerUp={(e) => {
          if (dragging.current) {
            dragging.current = false;
          } else {
            // No drag happened — allow focus for typing
            (e.target as HTMLInputElement).focus();
          }
          try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
        }}
        style={{ ...defaultInputStyle, cursor: focused ? 'text' : 'ew-resize', ...style }}
      />
    </>
  );
}
