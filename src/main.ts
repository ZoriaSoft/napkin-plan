import "./style.css";
import { PlanModel } from "./core/model";
import { paint, screenToCell, exportPng } from "./core/render";
import { STAMPS } from "./data/stamps";
import { TEMPLATES } from "./data/templates";
import type { StampId, Tool } from "./core/types";

const model = new PlanModel();
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const paletteEl = document.querySelector<HTMLDivElement>("#palette")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;
const toastEl = document.querySelector<HTMLDivElement>("#toast")!;
const templateMenu = document.querySelector<HTMLDivElement>("#template-menu")!;
const aboutEl = document.querySelector<HTMLDivElement>("#about")!;
const ctx = canvas.getContext("2d")!;

let hover: { c: number; r: number } | null = null;
let painting = false;
let panning = false;
let lastPan = { x: 0, y: 0 };
let spaceDown = false;
let toastTimer = 0;

function redraw() {
  paint(ctx, model, hover);
  statusEl.textContent = `${model.map.title} · ${model.tool} · ${model.stamp}`;
}

function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.add("hidden"), 1600);
}

function setTool(t: Tool) {
  model.tool = t;
  document.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === t);
  });
  redraw();
}

function setStamp(id: StampId) {
  model.stamp = id;
  model.tool = "stamp";
  setTool("stamp");
  document.querySelectorAll<HTMLButtonElement>(".stamp").forEach((b) => {
    b.classList.toggle("active", b.dataset.stamp === id);
  });
  redraw();
}

// palette
for (const s of STAMPS) {
  if (s.id === "empty") continue;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "stamp" + (s.id === model.stamp ? " active" : "");
  b.dataset.stamp = s.id;
  b.title = s.name;
  b.innerHTML = `<span class="swatch" style="--c:${s.fill}"></span><span>${s.name}</span>`;
  b.addEventListener("click", () => setStamp(s.id));
  paletteEl.appendChild(b);
}

// templates menu
for (const t of TEMPLATES) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "menu-item";
  item.role = "menuitem";
  item.textContent = `${t.title} — ${t.use}`;
  item.addEventListener("click", () => {
    model.loadTemplate(t.id);
    templateMenu.classList.add("hidden");
    toast(`Template: ${t.title}`);
    redraw();
  });
  templateMenu.appendChild(item);
}

document.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((b) => {
  b.addEventListener("click", () => setTool(b.dataset.tool as Tool));
});

document.querySelector("#btn-undo")!.addEventListener("click", () => {
  if (model.undo()) {
    toast("Undo");
    redraw();
  }
});
document.querySelector("#btn-redo")!.addEventListener("click", () => {
  if (model.redo()) {
    toast("Redo");
    redraw();
  }
});
document.querySelector("#btn-zoom-in")!.addEventListener("click", () => {
  model.zoom = Math.min(2.5, model.zoom * 1.15);
  redraw();
});
document.querySelector("#btn-zoom-out")!.addEventListener("click", () => {
  model.zoom = Math.max(0.4, model.zoom / 1.15);
  redraw();
});
document.querySelector("#btn-grid")!.addEventListener("click", (e) => {
  model.showGrid = !model.showGrid;
  (e.currentTarget as HTMLElement).classList.toggle("active", model.showGrid);
  toast(model.showGrid ? "Grid on" : "Grid off");
  redraw();
});

document.querySelector("#btn-templates")!.addEventListener("click", (e) => {
  e.stopPropagation();
  templateMenu.classList.toggle("hidden");
});
document.addEventListener("click", () => templateMenu.classList.add("hidden"));

document.querySelector("#btn-png")!.addEventListener("click", async () => {
  try {
    const blob = await exportPng(model, 2);
    downloadBlob(blob, "napkin-plan.png");
    toast("PNG downloaded");
  } catch {
    toast("PNG export failed");
  }
});

document.querySelector("#btn-save")!.addEventListener("click", () => {
  const json = JSON.stringify(model.exportMap(), null, 2);
  downloadBlob(new Blob([json], { type: "application/json" }), "napkin-plan.json");
  toast("JSON downloaded");
});

document.querySelector("#btn-load")!.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      model.importMap(data);
      toast("Map loaded");
      redraw();
    } catch {
      toast("Could not load map");
    }
  };
  input.click();
});

document.querySelector("#btn-about")!.addEventListener("click", () => {
  aboutEl.classList.remove("hidden");
});
document.querySelector("#btn-about-close")!.addEventListener("click", () => {
  aboutEl.classList.add("hidden");
});
aboutEl.addEventListener("click", (e) => {
  if (e.target === aboutEl) aboutEl.classList.add("hidden");
});

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// canvas interaction
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || spaceDown || e.altKey) {
    panning = true;
    lastPan = { x: e.clientX, y: e.clientY };
    return;
  }
  if (e.button !== 0) return;
  painting = true;
  model.beginStroke();
  const cell = screenToCell(model, canvas, e.clientX, e.clientY);
  if (cell) {
    model.applyAt(cell.c, cell.r);
    hover = cell;
    redraw();
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (panning) {
    model.panX += e.clientX - lastPan.x;
    model.panY += e.clientY - lastPan.y;
    lastPan = { x: e.clientX, y: e.clientY };
    redraw();
    return;
  }
  const cell = screenToCell(model, canvas, e.clientX, e.clientY);
  hover = cell;
  if (painting && cell) {
    model.applyAt(cell.c, cell.r);
  }
  redraw();
});

canvas.addEventListener("pointerup", () => {
  if (painting) model.endStroke();
  painting = false;
  panning = false;
});

canvas.addEventListener("pointerleave", () => {
  hover = null;
  redraw();
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    model.zoom = Math.min(2.5, Math.max(0.4, model.zoom * factor));
    redraw();
  },
  { passive: false },
);

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    spaceDown = true;
    e.preventDefault();
  }
  if (e.key === "s" || e.key === "S") setTool("stamp");
  if (e.key === "e" || e.key === "E") setTool("erase");
  if (e.key === "f" || e.key === "F") setTool("fill");
  if (e.key === "g" || e.key === "G") {
    model.showGrid = !model.showGrid;
    document.querySelector("#btn-grid")!.classList.toggle("active", model.showGrid);
    redraw();
  }
  if (e.ctrlKey && e.key === "z") {
    e.preventDefault();
    if (model.undo()) {
      toast("Undo");
      redraw();
    }
  }
  if (e.ctrlKey && e.key === "y") {
    e.preventDefault();
    if (model.redo()) {
      toast("Redo");
      redraw();
    }
  }
  if (e.key === "Escape") aboutEl.classList.add("hidden");
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceDown = false;
});

window.addEventListener("resize", redraw);
redraw();
