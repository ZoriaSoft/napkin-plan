import type { PlanModel } from "./model";
import { CELL } from "./types";
import { stampDef } from "../data/stamps";

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

  // paper background
  ctx.fillStyle = "#1a1f27";
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.save();
  ctx.translate(panX + cssW / 2, panY + cssH / 2);
  ctx.scale(zoom, zoom);

  const gw = map.w * CELL;
  const gh = map.h * CELL;
  const ox = -gw / 2;
  const oy = -gh / 2;

  // napkin sheet
  roundRect(ctx, ox - 12, oy - 12, gw + 24, gh + 24, 8);
  ctx.fillStyle = "#f7f3eb";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let r = 0; r < map.h; r++) {
    for (let c = 0; c < map.w; c++) {
      const id = map.cells[r * map.w + c] ?? "empty";
      drawStamp(ctx, ox + c * CELL, oy + r * CELL, CELL, id);
    }
  }

  if (showGrid) {
    ctx.strokeStyle = "rgba(40,50,60,0.12)";
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

  if (hover && model.inBounds(hover.c, hover.r)) {
    const x = ox + hover.c * CELL;
    const y = oy + hover.r * CELL;
    ctx.strokeStyle =
      model.tool === "erase" ? "rgba(232,93,93,0.9)" : "rgba(61,220,151,0.85)";
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
    if (model.tool === "stamp" || model.tool === "fill") {
      ctx.globalAlpha = 0.45;
      drawStamp(ctx, x, y, CELL, model.stamp);
      ctx.globalAlpha = 1;
    }
  }

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

function drawStamp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: string) {
  const def = stampDef(id);
  const pad = s * 0.12;
  const ix = x + pad;
  const iy = y + pad;
  const is = s - pad * 2;

  if (id === "empty") {
    // Outside room — muted so floor/walls read clearly
    ctx.fillStyle = def.fill;
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
    return;
  }
  if (id === "floor") {
    ctx.fillStyle = def.fill;
    ctx.fillRect(x, y, s, s);
    return;
  }
  if (id === "wall") {
    // Solid block + strong edge so 1-cell top/bottom walls stay readable
    ctx.fillStyle = def.fill;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x + 1, y + 1, s - 2, Math.max(2, s * 0.18));
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = Math.max(1.5, s * 0.08);
    ctx.strokeRect(x + 0.75, y + 0.75, s - 1.5, s - 1.5);
    return;
  }

  // floor under props
  ctx.fillStyle = "#f3ebe0";
  ctx.fillRect(x, y, s, s);

  ctx.fillStyle = def.fill;
  ctx.strokeStyle = def.stroke ?? "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, s * 0.06);

  switch (id) {
    case "door":
      ctx.fillRect(ix, iy + is * 0.15, is * 0.35, is * 0.7);
      ctx.beginPath();
      ctx.arc(ix + is * 0.35, iy + is * 0.5, is * 0.45, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      break;
    case "window":
      ctx.fillRect(ix, iy + is * 0.3, is, is * 0.4);
      ctx.strokeRect(ix, iy + is * 0.3, is, is * 0.4);
      ctx.beginPath();
      ctx.moveTo(ix + is / 2, iy + is * 0.3);
      ctx.lineTo(ix + is / 2, iy + is * 0.7);
      ctx.stroke();
      break;
    case "table":
      roundRect(ctx, ix + is * 0.1, iy + is * 0.15, is * 0.8, is * 0.7, 3);
      ctx.fill();
      ctx.stroke();
      break;
    case "chair":
      roundRect(ctx, ix + is * 0.2, iy + is * 0.2, is * 0.6, is * 0.55, 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "sofa":
      roundRect(ctx, ix, iy + is * 0.25, is, is * 0.55, 4);
      ctx.fill();
      ctx.stroke();
      break;
    case "bed":
      roundRect(ctx, ix + is * 0.05, iy + is * 0.1, is * 0.9, is * 0.8, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff8";
      ctx.fillRect(ix + is * 0.1, iy + is * 0.15, is * 0.8, is * 0.25);
      break;
    case "desk":
      ctx.fillRect(ix + is * 0.05, iy + is * 0.25, is * 0.9, is * 0.45);
      ctx.strokeRect(ix + is * 0.05, iy + is * 0.25, is * 0.9, is * 0.45);
      break;
    case "sink":
      ctx.beginPath();
      ctx.arc(ix + is / 2, iy + is / 2, is * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "toilet":
      roundRect(ctx, ix + is * 0.25, iy + is * 0.15, is * 0.5, is * 0.7, 6);
      ctx.fill();
      ctx.stroke();
      break;
    case "bath":
      roundRect(ctx, ix + is * 0.08, iy + is * 0.2, is * 0.84, is * 0.6, 8);
      ctx.fill();
      ctx.stroke();
      break;
    case "plant":
      ctx.beginPath();
      ctx.arc(ix + is / 2, iy + is * 0.4, is * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(ix + is * 0.4, iy + is * 0.55, is * 0.2, is * 0.3);
      break;
    case "stairs":
      for (let i = 0; i < 4; i++) {
        const yy = iy + (is / 4) * i;
        ctx.fillRect(ix + 2, yy, is - 4, is / 4 - 1);
        ctx.strokeRect(ix + 2, yy, is - 4, is / 4 - 1);
      }
      break;
    case "storage":
      ctx.fillRect(ix + is * 0.15, iy + is * 0.1, is * 0.7, is * 0.8);
      ctx.strokeRect(ix + is * 0.15, iy + is * 0.1, is * 0.7, is * 0.8);
      ctx.beginPath();
      ctx.moveTo(ix + is / 2, iy + is * 0.1);
      ctx.lineTo(ix + is / 2, iy + is * 0.9);
      ctx.stroke();
      break;
    default:
      ctx.fillRect(ix, iy, is, is);
  }
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

/** Export full map to PNG blob (no chrome). */
export async function exportPng(model: PlanModel, scale = 2): Promise<Blob> {
  const w = model.map.w * CELL * scale;
  const h = model.map.h * CELL * scale;
  const off = document.createElement("canvas");
  off.width = w + 24 * scale;
  off.height = h + 24 * scale;
  const ctx = off.getContext("2d")!;
  ctx.fillStyle = "#f7f3eb";
  ctx.fillRect(0, 0, off.width, off.height);
  ctx.save();
  ctx.translate(12 * scale, 12 * scale);
  ctx.scale(scale, scale);
  for (let r = 0; r < model.map.h; r++) {
    for (let c = 0; c < model.map.w; c++) {
      const id = model.map.cells[r * model.map.w + c] ?? "empty";
      drawStamp(ctx, c * CELL, r * CELL, CELL, id);
    }
  }
  ctx.restore();
  return new Promise((resolve, reject) => {
    off.toBlob((b) => (b ? resolve(b) : reject(new Error("png failed"))), "image/png");
  });
}
