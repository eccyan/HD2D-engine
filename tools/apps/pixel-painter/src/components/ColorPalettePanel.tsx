import React, { useCallback, useState } from 'react';
import { usePainterStore, RGBA } from '../store/usePainterStore.js';

// ---------------------------------------------------------------------------
// Default 16-color pixel art palette
// ---------------------------------------------------------------------------

const DEFAULT_PALETTE: RGBA[] = [
  [0, 0, 0, 255],       // black
  [255, 255, 255, 255], // white
  [128, 128, 128, 255], // mid gray
  [64, 64, 64, 255],    // dark gray
  [200, 76, 80, 255],   // red
  [255, 130, 100, 255], // salmon
  [200, 140, 40, 255],  // amber
  [255, 220, 80, 255],  // yellow
  [60, 180, 60, 255],   // green
  [40, 120, 200, 255],  // blue
  [100, 200, 220, 255], // cyan
  [160, 80, 200, 255],  // purple
  [220, 130, 60, 255],  // orange
  [160, 100, 60, 255],  // brown
  [255, 180, 200, 255], // pink
  [0, 0, 0, 0],         // transparent
];

// ---------------------------------------------------------------------------
// HSV <-> RGB helpers
// ---------------------------------------------------------------------------

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h /= 360; s /= 100; v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbaToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ColorSwatch({ color, size = 16, onClick, title, border = false }: {
  color: RGBA;
  size?: number;
  onClick?: () => void;
  title?: string;
  border?: boolean;
}) {
  const [r, g, b, a] = color;
  const style: React.CSSProperties = {
    width: size,
    height: size,
    cursor: onClick ? 'pointer' : 'default',
    border: border ? '2px solid #888' : '1px solid rgba(255,255,255,0.2)',
    borderRadius: 2,
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  };

  // Transparent checkerboard
  const bgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: a < 255
      ? 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 0 0 / 8px 8px'
      : undefined,
  };

  const colorLayerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: `rgba(${r},${g},${b},${a / 255})`,
  };

  return (
    <div style={style} onClick={onClick} title={title}>
      {a < 255 && <div style={bgStyle} />}
      <div style={colorLayerStyle} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ColorPalettePanel() {
  const {
    fgColor,
    bgColor,
    recentColors,
    setFgColor,
    setBgColor,
    swapColors,
    addRecentColor,
    setActiveTool,
  } = usePainterStore();

  const [editingFg, setEditingFg] = useState(true);
  const [hexInput, setHexInput] = useState('');

  const activeColor = editingFg ? fgColor : bgColor;
  const [h, s, v] = rgbToHsv(activeColor[0], activeColor[1], activeColor[2]);
  const alpha = activeColor[3];

  const updateColor = useCallback((newColor: RGBA) => {
    if (editingFg) {
      setFgColor(newColor);
      addRecentColor(newColor);
    } else {
      setBgColor(newColor);
      addRecentColor(newColor);
    }
  }, [editingFg, setFgColor, setBgColor, addRecentColor]);

  const handleHsvChange = useCallback((type: 'h' | 's' | 'v', value: number) => {
    let nh = h, ns = s, nv = v;
    if (type === 'h') nh = value;
    if (type === 's') ns = value;
    if (type === 'v') nv = value;
    const [r, g, b] = hsvToRgb(nh, ns, nv);
    updateColor([r, g, b, alpha]);
  }, [h, s, v, alpha, updateColor]);

  const handleAlphaChange = useCallback((value: number) => {
    updateColor([activeColor[0], activeColor[1], activeColor[2], value]);
  }, [activeColor, updateColor]);

  const handleHexInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    const rgb = hexToRgb(val);
    if (rgb) {
      updateColor([rgb[0], rgb[1], rgb[2], alpha]);
    }
  }, [alpha, updateColor]);

  const handleHexBlur = useCallback(() => {
    setHexInput('');
  }, []);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>Color</div>

      {/* FG/BG display */}
      <div style={styles.fgBgContainer}>
        {/* Background color (back) */}
        <div
          onClick={() => setEditingFg(false)}
          style={{
            ...styles.colorBox,
            width: 36,
            height: 36,
            position: 'absolute',
            top: 14,
            left: 14,
            border: !editingFg ? '2px solid #f8a84a' : '2px solid #555',
            zIndex: 1,
          }}
          title="Background Color (right click to paint)"
        >
          <ColorSwatch color={bgColor} size={32} />
        </div>
        {/* Foreground color (front) */}
        <div
          onClick={() => setEditingFg(true)}
          style={{
            ...styles.colorBox,
            width: 36,
            height: 36,
            position: 'absolute',
            top: 2,
            left: 2,
            border: editingFg ? '2px solid #4a9ef8' : '2px solid #555',
            zIndex: 2,
          }}
          title="Foreground Color (left click to paint)"
        >
          <ColorSwatch color={fgColor} size={32} />
        </div>
        {/* Swap button */}
        <button
          onClick={swapColors}
          style={styles.swapBtn}
          title="Swap FG/BG"
        >
          ⇆
        </button>
        {/* Eyedropper */}
        <button
          onClick={() => setActiveTool('eyedropper')}
          style={styles.eyedropperBtn}
          title="Pick color from canvas (E)"
        >
          [eyedrop]
        </button>
      </div>

      {/* HSV sliders */}
      <div style={styles.slidersSection}>
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>H</span>
          <input
            type="range" min={0} max={360} value={h}
            onChange={(e) => handleHsvChange('h', parseInt(e.target.value))}
            style={{ ...styles.slider, accentColor: `hsl(${h},100%,50%)` }}
          />
          <span style={styles.sliderVal}>{h}</span>
        </div>
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>S</span>
          <input
            type="range" min={0} max={100} value={s}
            onChange={(e) => handleHsvChange('s', parseInt(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderVal}>{s}%</span>
        </div>
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>V</span>
          <input
            type="range" min={0} max={100} value={v}
            onChange={(e) => handleHsvChange('v', parseInt(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderVal}>{v}%</span>
        </div>
        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>A</span>
          <input
            type="range" min={0} max={255} value={alpha}
            onChange={(e) => handleAlphaChange(parseInt(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.sliderVal}>{Math.round(alpha / 255 * 100)}%</span>
        </div>
      </div>

      {/* Hex input */}
      <div style={styles.hexRow}>
        <span style={styles.sliderLabel}>#</span>
        <input
          type="text"
          value={hexInput || rgbaToHex(activeColor[0], activeColor[1], activeColor[2])}
          onChange={handleHexInput}
          onFocus={() => setHexInput(rgbaToHex(activeColor[0], activeColor[1], activeColor[2]))}
          onBlur={handleHexBlur}
          placeholder="rrggbb"
          maxLength={7}
          style={styles.hexInput}
        />
      </div>

      {/* Default palette */}
      <div style={styles.sectionLabel}>Palette</div>
      <div style={styles.palette}>
        {DEFAULT_PALETTE.map((color, i) => (
          <ColorSwatch
            key={i}
            color={color}
            size={18}
            onClick={() => updateColor(color)}
            title={`rgba(${color[0]},${color[1]},${color[2]},${color[3]})`}
          />
        ))}
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Recent</div>
          <div style={styles.recentColors}>
            {recentColors.map((color, i) => (
              <ColorSwatch
                key={i}
                color={color}
                size={18}
                onClick={() => updateColor(color)}
                title={`rgba(${color[0]},${color[1]},${color[2]},${color[3]})`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '10px',
    background: '#1e1e2e',
    borderBottom: '1px solid #333',
  },
  header: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    color: '#ccc',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  fgBgContainer: {
    position: 'relative',
    height: 64,
    marginBottom: 4,
  },
  colorBox: {
    borderRadius: 3,
    cursor: 'pointer',
    overflow: 'hidden',
  },
  swapBtn: {
    position: 'absolute',
    top: 30,
    left: 32,
    background: '#2a2a3e',
    border: '1px solid #555',
    borderRadius: 3,
    color: '#aaa',
    fontSize: 12,
    width: 20,
    height: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    zIndex: 3,
  },
  eyedropperBtn: {
    position: 'absolute',
    top: 2,
    right: 0,
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#777',
    fontFamily: 'monospace',
    fontSize: 8,
    padding: '2px 4px',
    cursor: 'pointer',
    zIndex: 3,
  },
  slidersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  sliderLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#777',
    width: 12,
    flexShrink: 0,
    textAlign: 'right',
  },
  slider: {
    flex: 1,
    height: 14,
    cursor: 'pointer',
  },
  sliderVal: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#aaa',
    width: 32,
    textAlign: 'right',
    flexShrink: 0,
  },
  hexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  hexInput: {
    flex: 1,
    background: '#1a1a2a',
    border: '1px solid #444',
    borderRadius: 3,
    color: '#ccc',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '4px 6px',
    outline: 'none',
  },
  sectionLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  palette: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 3,
  },
  recentColors: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 3,
  },
};
