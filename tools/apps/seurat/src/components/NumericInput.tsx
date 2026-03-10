import React, { useState, useCallback, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  fallback?: number;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * A text input that accepts free-form numeric input and validates on blur.
 * Replaces `<input type="number">` for better UX (no spinner arrows,
 * unrestricted typing, validation only on commit).
 */
export function NumericInput({
  value,
  onChange,
  min,
  max,
  step: _step,
  integer,
  fallback,
  style,
  disabled,
}: NumericInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Sync draft with external value when not editing
  useEffect(() => {
    if (!focused) {
      setDraft(String(value));
    }
  }, [value, focused]);

  const commit = useCallback(() => {
    let n = integer ? parseInt(draft, 10) : parseFloat(draft);
    if (isNaN(n)) {
      n = fallback ?? value;
    }
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    if (integer) n = Math.round(n);
    setDraft(String(n));
    if (n !== value) {
      onChange(n);
    }
  }, [draft, value, onChange, min, max, integer, fallback]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    }
  }, [commit]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); commit(); }}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      style={style}
    />
  );
}
