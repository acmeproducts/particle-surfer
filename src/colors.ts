// colorGrid.ts

export type RGB01 = { r: number; g: number; b: number }; // each in [0,1]
type HexColor = string;

export interface ColorGridResult {
  grid: RGB01[][]; // [row][col], y then x
  getColor: (xSpeed: number, ySpeed: number, out: RGB01) => void;
}

/** Parse hex like "#abc" or "#aabbcc" into RGB01 (0..1) */
function hexToRgb01(hex: string): RGB01 {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 0xff) / 255;
  const g = ((int >> 8) & 0xff) / 255;
  const b = (int & 0xff) / 255;
  return { r, g, b };
}

/** Convert RGB01 to hex string "#rrggbb" */
export function rgb01ToHex({ r, g, b }: RGB01): HexColor {
  const clamp8 = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255))) // convert to 0-255
      .toString(16)
      .padStart(2, "0");
  return `#${clamp8(r)}${clamp8(g)}${clamp8(b)}`;
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Lerp between two RGB01 colors */
function lerpColor(c1: RGB01, c2: RGB01, t: number): RGB01 {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
}

/**
 * Sample a multi-stop gradient. stops are hex colors, t in [0,1].
 * Returns RGB01.
 */
function sampleGradient(stops: HexColor[], t: number): RGB01 {
  if (t <= 0) return hexToRgb01(stops[0]);
  if (t >= 1) return hexToRgb01(stops[stops.length - 1]);
  const scaled = t * (stops.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const c1 = hexToRgb01(stops[idx]);
  const c2 = hexToRgb01(stops[idx + 1]);
  return lerpColor(c1, c2, frac);
}

/** Simple average blend of two RGB01 colors */
function blendRGB(a: RGB01, b: RGB01): RGB01 {
  return {
    r: (a.r + b.r) * 0.5,
    g: (a.g + b.g) * 0.5,
    b: (a.b + b.b) * 0.5,
  };
}

/**
 * Build the precomputed color grid and sampler.
 * xSpeed and ySpeed are expected in [-1,1].
 */
export function createColorGrid(params: {
  gradientXStops: HexColor[]; // for x speed (-1 → 1)
  gradientYStops: HexColor[]; // for y speed (-1 → 1)
  detailX?: number; // columns
  detailY?: number; // rows
}): ColorGridResult {
  const detailX = params.detailX ?? 20;
  const detailY = params.detailY ?? 20;

  const gradX: RGB01[] = new Array(detailX);
  const gradY: RGB01[] = new Array(detailY);
  for (let i = 0; i < detailX; i++) {
    const tx = detailX === 1 ? 0.5 : i / (detailX - 1);
    gradX[i] = sampleGradient(params.gradientXStops, tx);
  }
  for (let j = 0; j < detailY; j++) {
    const ty = detailY === 1 ? 0.5 : j / (detailY - 1);
    gradY[j] = sampleGradient(params.gradientYStops, ty);
  }

  // build blended grid [row][col] (y then x)
  const grid: RGB01[][] = new Array(detailY);
  for (let row = 0; row < detailY; row++) {
    grid[row] = new Array(detailX);
    for (let col = 0; col < detailX; col++) {
      grid[row][col] = blendRGB(gradX[col], gradY[row]);
    }
  }

  const temp1 = { r: 0, g: 0, b: 0 };
  const temp2 = { r: 0, g: 0, b: 0 };

  /**
   * Writes interpolated color into `out` (mutated), each channel in [0,1].
   */
  function getColor(xSpeed: number, ySpeed: number, out: RGB01): void {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    xSpeed = clamp(xSpeed);
    ySpeed = clamp(ySpeed);

    const fx = ((xSpeed + 1) / 2) * (detailX - 1);
    const fy = ((ySpeed + 1) / 2) * (detailY - 1);

    const x0 = Math.floor(fx);
    const x1 = Math.min(detailX - 1, x0 + 1);
    const y0 = Math.floor(fy);
    const y1 = Math.min(detailY - 1, y0 + 1);
    const wx = fx - x0;
    const wy = fy - y0;

    const c00 = grid[y0][x0];
    const c10 = grid[y0][x1];
    const c01 = grid[y1][x0];
    const c11 = grid[y1][x1];

    // bilinear interpolation
    const mix = (a: RGB01, b: RGB01, t: number, out?: RGB01): RGB01 => {
      if (out) {
        out.r = lerp(a.r, b.r, t);
        out.g = lerp(a.g, b.g, t);
        out.b = lerp(a.b, b.b, t);
        return out;
      }
      return {
        r: lerp(a.r, b.r, t),
        g: lerp(a.g, b.g, t),
        b: lerp(a.b, b.b, t),
      };
    };

    mix(c00, c10, wx, temp1);
    mix(c01, c11, wx, temp2);
    mix(temp1, temp2, wy, out);
  }

  return { grid, getColor };
}

/**
 * Render a RGB01 grid to an offscreen canvas and trigger PNG download.
 */
export function saveGridAsPNG(
  grid: RGB01[][],
  cellSize: number = 20,
  filename: string = "color-grid.png",
): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("2D context unavailable");
    return;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const { r, g, b } = grid[y][x];
      // convert to 0-255
      const ir = Math.round(Math.max(0, Math.min(1, r)) * 255);
      const ig = Math.round(Math.max(0, Math.min(1, g)) * 255);
      const ib = Math.round(Math.max(0, Math.min(1, b)) * 255);
      ctx.fillStyle = `rgb(${ir},${ig},${ib})`;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // optional subtle grid lines
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize + 0.5, 0);
    ctx.lineTo(x * cellSize + 0.5, rows * cellSize);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize + 0.5);
    ctx.lineTo(cols * cellSize, y * cellSize + 0.5);
    ctx.stroke();
  }

  canvas.toBlob((blob) => {
    if (!blob) {
      console.error("Failed to make PNG blob");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
}
