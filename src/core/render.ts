import type { PlanModel } from "./model";
import { CELL } from "./types";
import { stampDef } from "../data/stamps";

const PAPER = "#f6f1e7";
const FLOOR = "#efe6d8";
const EMPTY = "#cfc8bc";
const WALL = "#2c333c";
const INK = "#1e2430";

export function paint(
  ctx: CanvasRenderingContext2D,
  model: PlanModel,
  hover: { c: number; r: number } | null,
) {
  const { map, zoom, panX, panY, showGrid } = model;
  const cssW = ctx.canvas.clientWidth;
  const cssH = ctx.canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  if (ctx.canvas.width !== Math.floor(cssW * dpr) || ctx.canvas.height !== Math.floor(cssH * dpr)) {
    ctx.canvas.width = Math.floor(cssW * dpr);
    ctx.canvas.height = Math.floor(cssH * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  // stage backdrop
  const g = ctx.createLinearGradient(0, 0, cssW, cssH);
  g.addColorStop(0, "#121820");
  g.addColorStop(1, "#0a0e13");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.save();
  ctx.translate(panX + cssW / 2, panY + cssH / 2);
  ctx.scale(zoom, zoom);

  const gw = map.w * CELL;
  const gh = map.h * CELL;
  const ox = -gw / 2;
  const oy = -gh / 2;

  // soft shadow under napkin
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  roundRect(ctx, ox - 16, oy - 16, gw + 32, gh + 32, 12);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // paper edge
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // stable paper grain (no Math.random per frame)
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, ox - 16, oy - 16, gw + 32, gh + 32, 12);
  ctx.clip();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 80; i++) {
    const px = ox - 16 + ((i * 97) % (gw + 32));
    const py = oy - 16 + ((i * 53) % (gh + 32));
    ctx.fillStyle = i % 2 ? "#000" : "#fff";
    ctx.fillRect(px, py, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // cells: floors/empty first, props second (clean stacking)
  for (let r = 0; r < map.h; r++) {
    for (let c = 0; c < map.w; c++) {
      const id = map.cells[r * map.w + c] ?? "empty";
      const def = stampDef(id);
      if (def.kind === "floor" || id === "empty" || id === "floor" || id === "wall") {
        drawStamp(ctx, ox + c * CELL, oy + r * CELL, CELL, id, map, c, r);
      } else {
        // floor under props
        drawStamp(ctx, ox + c * CELL, oy + r * CELL, CELL, "floor", map, c, r);
      }
    }
  }
  for (let r = 0; r < map.h; r++) {
    for (let c = 0; c < map.w; c++) {
      const id = map.cells[r * map.w + c] ?? "empty";
      const def = stampDef(id);
      if (def.kind === "prop") {
        drawStamp(ctx, ox + c * CELL, oy + r * CELL, CELL, id, map, c, r);
      }
    }
  }

  if (showGrid) {
    ctx.strokeStyle = "rgba(40,50,60,0.1)";
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    for (let c = 0; c <= map.w; c++) {
      const x = ox + c * CELL;
      ctx.moveTo(x, oy);
      ctx.lineTo(x, oy + gh);
    }
    for (let r = 0; r <= map.h; r++) {
      const y = oy + r * CELL;
      ctx.moveTo(ox, y);
      ctx.lineTo(ox + gw, y);
    }
    ctx.stroke();
  }

  // scale bar (bottom-left of sheet)
  drawScaleBar(ctx, ox + 8, oy + gh - 18, zoom);

  if (hover && model.inBounds(hover.c, hover.r)) {
    const x = ox + hover.c * CELL;
    const y = oy + hover.r * CELL;
    if (model.tool === "stamp" || model.tool === "fill") {
      ctx.globalAlpha = 0.55;
      drawStamp(ctx, x, y, CELL, model.stamp, map, hover.c, hover.r);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle =
      model.tool === "erase" ? "rgba(220,70,70,0.95)" : "rgba(40,180,120,0.95)";
    ctx.lineWidth = 2.5 / zoom;
    ctx.setLineDash([4 / zoom, 3 / zoom]);
    ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawScaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number) {
  const w = CELL * 2;
  ctx.save();
  ctx.strokeStyle = "rgba(30,36,48,0.55)";
  ctx.fillStyle = "rgba(30,36,48,0.7)";
  ctx.lineWidth = 1.5 / Math.max(zoom, 0.5);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y + 4);
  ctx.moveTo(x + w, y - 4);
  ctx.lineTo(x + w, y + 4);
  ctx.stroke();
  ctx.font = `${11 / Math.max(zoom, 0.6)}px system-ui,sans-serif`;
  ctx.fillText("2 cells ≈ 1 m", x + w + 6, y + 4);
  ctx.restore();
}

export function screenToCell(
  model: PlanModel,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { c: number; r: number } | null {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const cssW = rect.width;
  const cssH = rect.height;
  const lx = (x - model.panX - cssW / 2) / model.zoom;
  const ly = (y - model.panY - cssH / 2) / model.zoom;
  const gw = model.map.w * CELL;
  const gh = model.map.h * CELL;
  const ox = -gw / 2;
  const oy = -gh / 2;
  const c = Math.floor((lx - ox) / CELL);
  const r = Math.floor((ly - oy) / CELL);
  if (!model.inBounds(c, r)) return null;
  return { c, r };
}

export function fitZoom(model: PlanModel, canvas: HTMLCanvasElement, padding = 48) {
  const cssW = canvas.clientWidth || 800;
  const cssH = canvas.clientHeight || 600;
  const gw = model.map.w * CELL + 40;
  const gh = model.map.h * CELL + 40;
  const z = Math.min((cssW - padding * 2) / gw, (cssH - padding * 2) / gh, 1.35);
  model.zoom = Math.max(0.35, z);
  model.panX = 0;
  model.panY = 0;
}

/** Draw stamp into any context (map cell or palette icon). */
export function drawStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  id: string,
  map?: { w: number; h: number; cells: string[] },
  c = 0,
  r = 0,
) {
  const def = stampDef(id);
  const m = s * 0.14;
  const ix = x + m;
  const iy = y + m;
  const is = s - m * 2;

  if (id === "empty") {
    ctx.fillStyle = EMPTY;
    ctx.fillRect(x, y, s, s);
    return;
  }
  if (id === "floor") {
    ctx.fillStyle = FLOOR;
    ctx.fillRect(x, y, s, s);
    // wood-ish grain
    ctx.strokeStyle = "rgba(120,90,50,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + (s * i) / 3);
      ctx.lineTo(x + s - 2, y + (s * i) / 3 + 1);
      ctx.stroke();
    }
    return;
  }
  if (id === "wall") {
    drawWall(ctx, x, y, s, map, c, r);
    return;
  }

  // soft drop shadow for props
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  roundRect(ctx, ix + 1, iy + 2, is, is, 3);
  ctx.fill();

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = def.stroke ?? INK;
  ctx.fillStyle = def.fill;
  ctx.lineWidth = Math.max(1.2, s * 0.055);

  switch (id) {
    case "door": {
      // frame on wall line
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(ix, iy + is * 0.08, is * 0.22, is * 0.84);
      ctx.strokeStyle = "#5c3a1a";
      ctx.strokeRect(ix, iy + is * 0.08, is * 0.22, is * 0.84);
      ctx.beginPath();
      ctx.arc(ix + is * 0.22, iy + is * 0.5, is * 0.55, -Math.PI / 2, Math.PI / 2, false);
      ctx.strokeStyle = "rgba(90,55,25,0.7)";
      ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
      // knob
      ctx.beginPath();
      ctx.fillStyle = "#d4af37";
      ctx.arc(ix + is * 0.16, iy + is * 0.52, is * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "window": {
      ctx.fillStyle = "#c5e4f2";
      roundRect(ctx, ix, iy + is * 0.28, is, is * 0.44, 2);
      ctx.fill();
      ctx.strokeStyle = "#4a6a7a";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ix + is / 2, iy + is * 0.28);
      ctx.lineTo(ix + is / 2, iy + is * 0.72);
      ctx.moveTo(ix, iy + is * 0.5);
      ctx.lineTo(ix + is, iy + is * 0.5);
      ctx.stroke();
      // sill
      ctx.fillStyle = "#8a9098";
      ctx.fillRect(ix - 1, iy + is * 0.72, is + 2, is * 0.08);
      break;
    }
    case "table": {
      // top
      roundRect(ctx, ix + is * 0.08, iy + is * 0.18, is * 0.84, is * 0.64, 4);
      ctx.fillStyle = "#c9a06a";
      ctx.fill();
      ctx.strokeStyle = "#7a5530";
      ctx.stroke();
      // surface highlight
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(ix + is * 0.18, iy + is * 0.3);
      ctx.lineTo(ix + is * 0.75, iy + is * 0.3);
      ctx.stroke();
      break;
    }
    case "chair": {
      // seat
      roundRect(ctx, ix + is * 0.22, iy + is * 0.32, is * 0.56, is * 0.42, 3);
      ctx.fillStyle = "#5f8f6a";
      ctx.fill();
      ctx.strokeStyle = "#2f5238";
      ctx.stroke();
      // back
      roundRect(ctx, ix + is * 0.22, iy + is * 0.14, is * 0.56, is * 0.2, 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "sofa": {
      roundRect(ctx, ix + is * 0.02, iy + is * 0.28, is * 0.96, is * 0.5, 6);
      ctx.fillStyle = "#6a7fa0";
      ctx.fill();
      ctx.strokeStyle = "#3a4a60";
      ctx.stroke();
      // cushions
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.moveTo(ix + is * 0.34, iy + is * 0.32);
      ctx.lineTo(ix + is * 0.34, iy + is * 0.72);
      ctx.moveTo(ix + is * 0.66, iy + is * 0.32);
      ctx.lineTo(ix + is * 0.66, iy + is * 0.72);
      ctx.stroke();
      // back
      roundRect(ctx, ix + is * 0.02, iy + is * 0.18, is * 0.96, is * 0.16, 4);
      ctx.fillStyle = "#5a6f90";
      ctx.fill();
      break;
    }
    case "bed": {
      roundRect(ctx, ix + is * 0.06, iy + is * 0.12, is * 0.88, is * 0.76, 4);
      ctx.fillStyle = "#d8c8e8";
      ctx.fill();
      ctx.strokeStyle = "#6a5a7a";
      ctx.stroke();
      // pillow
      roundRect(ctx, ix + is * 0.12, iy + is * 0.16, is * 0.76, is * 0.22, 3);
      ctx.fillStyle = "#f5f0fa";
      ctx.fill();
      ctx.stroke();
      // blanket line
      ctx.beginPath();
      ctx.moveTo(ix + is * 0.1, iy + is * 0.45);
      ctx.lineTo(ix + is * 0.9, iy + is * 0.45);
      ctx.strokeStyle = "rgba(80,60,100,0.25)";
      ctx.stroke();
      break;
    }
    case "desk": {
      ctx.fillStyle = "#b8956a";
      ctx.fillRect(ix + is * 0.04, iy + is * 0.28, is * 0.92, is * 0.4);
      ctx.strokeStyle = "#6a4a28";
      ctx.strokeRect(ix + is * 0.04, iy + is * 0.28, is * 0.92, is * 0.4);
      // legs
      ctx.fillRect(ix + is * 0.1, iy + is * 0.68, is * 0.1, is * 0.14);
      ctx.fillRect(ix + is * 0.8, iy + is * 0.68, is * 0.1, is * 0.14);
      break;
    }
    case "sink": {
      // counter
      ctx.fillStyle = "#d0d8e0";
      roundRect(ctx, ix + is * 0.08, iy + is * 0.22, is * 0.84, is * 0.56, 3);
      ctx.fill();
      ctx.strokeStyle = "#607080";
      ctx.stroke();
      // basin
      ctx.beginPath();
      ctx.fillStyle = "#e8f2f8";
      ctx.ellipse(ix + is / 2, iy + is * 0.5, is * 0.28, is * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // faucet
      ctx.strokeStyle = "#8090a0";
      ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(ix + is / 2, iy + is * 0.28);
      ctx.lineTo(ix + is / 2, iy + is * 0.4);
      ctx.stroke();
      break;
    }
    case "toilet": {
      // tank
      roundRect(ctx, ix + is * 0.28, iy + is * 0.1, is * 0.44, is * 0.28, 2);
      ctx.fillStyle = "#eef2f5";
      ctx.fill();
      ctx.strokeStyle = "#708090";
      ctx.stroke();
      // bowl
      ctx.beginPath();
      ctx.ellipse(ix + is / 2, iy + is * 0.62, is * 0.28, is * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "bath": {
      roundRect(ctx, ix + is * 0.06, iy + is * 0.2, is * 0.88, is * 0.58, 10);
      ctx.fillStyle = "#a8d0e0";
      ctx.fill();
      ctx.strokeStyle = "#4a7080";
      ctx.stroke();
      // water
      roundRect(ctx, ix + is * 0.14, iy + is * 0.3, is * 0.72, is * 0.38, 8);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();
      break;
    }
    case "plant": {
      // pot
      ctx.fillStyle = "#8b5a3c";
      ctx.beginPath();
      ctx.moveTo(ix + is * 0.3, iy + is * 0.55);
      ctx.lineTo(ix + is * 0.7, iy + is * 0.55);
      ctx.lineTo(ix + is * 0.62, iy + is * 0.88);
      ctx.lineTo(ix + is * 0.38, iy + is * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#5a3a20";
      ctx.stroke();
      // foliage
      ctx.fillStyle = "#3d9a5c";
      circle(ctx, ix + is * 0.5, iy + is * 0.38, is * 0.28);
      ctx.fillStyle = "#56b872";
      circle(ctx, ix + is * 0.35, iy + is * 0.42, is * 0.16);
      circle(ctx, ix + is * 0.65, iy + is * 0.4, is * 0.15);
      break;
    }
    case "stairs": {
      for (let i = 0; i < 4; i++) {
        const t = i / 4;
        const yy = iy + is * t;
        const ww = is * (0.55 + t * 0.4);
        ctx.fillStyle = i % 2 ? "#a09888" : "#908878";
        ctx.fillRect(ix + (is - ww) / 2, yy, ww, is / 4 - 1);
        ctx.strokeStyle = "#5a5040";
        ctx.strokeRect(ix + (is - ww) / 2, yy, ww, is / 4 - 1);
      }
      break;
    }
    case "storage": {
      ctx.fillStyle = "#8a7560";
      roundRect(ctx, ix + is * 0.12, iy + is * 0.08, is * 0.76, is * 0.84, 2);
      ctx.fill();
      ctx.strokeStyle = "#4a3a28";
      ctx.stroke();
      // doors
      ctx.beginPath();
      ctx.moveTo(ix + is / 2, iy + is * 0.1);
      ctx.lineTo(ix + is / 2, iy + is * 0.9);
      ctx.stroke();
      // handles
      ctx.beginPath();
      ctx.arc(ix + is * 0.42, iy + is * 0.5, is * 0.04, 0, Math.PI * 2);
      ctx.arc(ix + is * 0.58, iy + is * 0.5, is * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = "#d4af37";
      ctx.fill();
      break;
    }
    default:
      ctx.fillRect(ix, iy, is, is);
  }
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  map?: { w: number; h: number; cells: string[] },
  c = 0,
  r = 0,
) {
  ctx.fillStyle = WALL;
  ctx.fillRect(x, y, s, s);

  // neighbor connectivity soft edges
  const n = (dc: number, dr: number) => {
    if (!map) return false;
    const nc = c + dc;
    const nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= map.w || nr >= map.h) return false;
    return map.cells[nr * map.w + nc] === "wall";
  };
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  if (!n(0, -1)) ctx.fillRect(x, y, s, s * 0.18);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  if (!n(0, 1)) ctx.fillRect(x, y + s * 0.82, s, s * 0.18);

  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export async function exportPng(model: PlanModel, scale = 2): Promise<Blob> {
  const pad = 20 * scale;
  const w = model.map.w * CELL * scale + pad * 2;
  const h = model.map.h * CELL * scale + pad * 2;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d")!;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(pad, pad);
  ctx.scale(scale, scale);
  for (let r = 0; r < model.map.h; r++) {
    for (let c = 0; c < model.map.w; c++) {
      const id = model.map.cells[r * model.map.w + c] ?? "empty";
      const def = stampDef(id);
      if (def.kind === "prop") {
        drawStamp(ctx, c * CELL, r * CELL, CELL, "floor", model.map, c, r);
      }
      drawStamp(ctx, c * CELL, r * CELL, CELL, id, model.map, c, r);
    }
  }
  ctx.restore();
  return new Promise((resolve, reject) => {
    off.toBlob((b) => (b ? resolve(b) : reject(new Error("png failed"))), "image/png");
  });
}

/** Mini icon for palette (returns data URL). */
export function stampIconDataUrl(id: string, size = 40): string {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, 0, size, size);
  drawStamp(ctx, 0, 0, size, id === "empty" ? "floor" : id);
  return c.toDataURL("image/png");
}
