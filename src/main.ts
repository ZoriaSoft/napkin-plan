import "./style.css";
import { PlanModel } from "./core/model";
import { paint, screenToCell, exportPng, fitZoom, stampIconDataUrl } from "./core/render";
import { STAMPS } from "./data/stamps";
import { TEMPLATES } from "./data/templates";
import { t, getLocale, toggleLocale } from "./i18n";
import type { StampId, Tool } from "./core/types";

const model = new PlanModel();
const STORAGE_KEY = "napkin-plan:last-state:v1";

// --- State restore ---
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) model.restoreState(saved);
} catch {
  localStorage.removeItem(STORAGE_KEY);
}

const shared = new URLSearchParams(window.location.hash.slice(1)).get("plan");
if (shared) {
  try {
    model.restoreState(decodeURIComponent(escape(atob(shared))));
    toast(t().toast.mapLoaded);
  } catch {
    toast(t().toast.loadFailed);
  }
}

// --- DOM refs ---
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const paletteEl = document.querySelector<HTMLDivElement>("#palette")!;
const statusTitleEl = document.querySelector<HTMLSpanElement>("#status-title")!;
const statusCellEl = document.querySelector<HTMLSpanElement>("#status-cell")!;
const toastEl = document.querySelector<HTMLDivElement>("#toast")!;
const templateMenu = document.querySelector<HTMLDivElement>("#template-menu")!;
const aboutEl = document.querySelector<HTMLDivElement>("#about")!;
const titleInput = document.querySelector<HTMLInputElement>("#title-input")!;
const langBtn = document.querySelector<HTMLButtonElement>("#btn-lang")!;
const ctx = canvas.getContext("2d")!;

// --- Interaction state ---
let hover: { c: number; r: number } | null = null;
let painting = false;
let panning = false;
let lastPan = { x: 0, y: 0 };
let spaceDown = false;
let toastTimer = 0;
let persistTimer = 0;
let rafPending = false;

// --- Throttled persist (300ms debounce) ---
function persist() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, model.serializeState());
  }, 300);
}

// --- rAF-batched redraw ---
function redraw() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    paint(ctx, model, hover);
    const i18n = t();
    const stampName = STAMPS.find((s) => s.id === model.stamp)?.name ?? model.stamp;
    statusTitleEl.textContent = `${model.map.title} · ${i18n.tools[model.tool]} · ${stampName}`;
    statusCellEl.textContent = hover ? `${i18n.status.cell} ${hover.c},${hover.r}` : "";
    updateHistoryButtons();
  });
}

function updateHistoryButtons() {
  (document.querySelector("#btn-undo") as HTMLButtonElement).disabled = !model.canUndo();
  (document.querySelector("#btn-redo") as HTMLButtonElement).disabled = !model.canRedo();
}

function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.add("hidden"), 1600);
}

function setTool(tool: Tool) {
  model.tool = tool;
  persist();
  document.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === tool);
  });
  canvas.dataset.tool = tool;
  redraw();
}

function setStamp(id: StampId) {
  model.stamp = id;
  model.tool = "stamp";
  persist();
  setTool("stamp");
  document.querySelectorAll<HTMLButtonElement>(".stamp").forEach((b) => {
    b.classList.toggle("active", b.dataset.stamp === id);
  });
  redraw();
}

function afterMapChange() {
  fitZoom(model, canvas);
  persist();
  redraw();
}

// --- Title ---
function setTitle(title: string) {
  model.map.title = title || "Untitled";
  persist();
  redraw();
}

titleInput.value = model.map.title;
titleInput.addEventListener("input", () => setTitle(titleInput.value));
titleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") titleInput.blur();
  e.stopPropagation(); // don't trigger canvas shortcuts
});

// --- Palette ---
for (const s of STAMPS) {
  if (s.id === "empty") continue;
  const b = document.createElement("button");
  b.type = "button";
  b.className = "stamp" + (s.id === model.stamp ? " active" : "");
  b.dataset.stamp = s.id;
  b.title = s.name;
  b.setAttribute("role", "option");
  const img = document.createElement("img");
  img.src = stampIconDataUrl(s.id, 48);
  img.alt = "";
  img.width = 28;
  img.height = 28;
  img.className = "stamp-icon";
  const label = document.createElement("span");
  label.textContent = s.name;
  b.append(img, label);
  b.addEventListener("click", () => setStamp(s.id));
  paletteEl.appendChild(b);
}

// --- Templates ---
for (const tpl of TEMPLATES) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "menu-item";
  item.role = "menuitem";
  item.innerHTML = `<strong>${tpl.title}</strong><span>${tpl.use}</span>`;
  item.addEventListener("click", () => {
    model.loadTemplate(tpl.id);
    setTitle(tpl.title);
    titleInput.value = tpl.title;
    persist();
    templateMenu.classList.add("hidden");
    toast(t().toast.templateLoaded);
    afterMapChange();
  });
  templateMenu.appendChild(item);
}

// --- Tool buttons ---
document.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((b) => {
  b.addEventListener("click", () => setTool(b.dataset.tool as Tool));
});

// --- History ---
document.querySelector("#btn-undo")!.addEventListener("click", () => {
  if (model.undo()) {
    persist();
    toast(t().toast.undo);
    redraw();
  }
});
document.querySelector("#btn-redo")!.addEventListener("click", () => {
  if (model.redo()) {
    persist();
    toast(t().toast.redo);
    redraw();
  }
});

// --- View ---
document.querySelector("#btn-zoom-in")!.addEventListener("click", () => {
  model.zoom = Math.min(2.5, model.zoom * 1.15);
  redraw();
});
document.querySelector("#btn-zoom-out")!.addEventListener("click", () => {
  model.zoom = Math.max(0.35, model.zoom / 1.15);
  redraw();
});
document.querySelector("#btn-fit")!.addEventListener("click", () => {
  fitZoom(model, canvas);
  toast(t().toast.fitView);
  redraw();
});
document.querySelector("#btn-grid")!.addEventListener("click", (e) => {
  model.showGrid = !model.showGrid;
  persist();
  (e.currentTarget as HTMLElement).classList.toggle("active", model.showGrid);
  toast(model.showGrid ? t().toast.gridOn : t().toast.gridOff);
  redraw();
});

// --- Templates menu ---
document.querySelector("#btn-templates")!.addEventListener("click", (e) => {
  e.stopPropagation();
  templateMenu.classList.toggle("hidden");
});
document.addEventListener("click", () => templateMenu.classList.add("hidden"));

// --- Language toggle ---
function updateLangUI() {
  const i18n = t();
  langBtn.textContent = getLocale() === "tr" ? "TR" : "EN";
  titleInput.placeholder = i18n.titlePlaceholder;
  document.querySelector("#hint")!.textContent = i18n.hint;
  document.querySelector(".label")!.textContent = i18n.palette.label;
  document.querySelector("#btn-about")!.setAttribute("title", i18n.actions.about);
  document.querySelector("#btn-templates")!.textContent = `${i18n.actions.templates} ▾`;
  document.querySelector("#btn-load")!.textContent = i18n.actions.load;
  document.querySelector("#btn-save")!.textContent = i18n.actions.save;
  document.querySelector("#btn-png")!.textContent = i18n.actions.downloadPng;
  document.querySelector("#btn-share")!.textContent = i18n.actions.share;
  document.querySelector("#btn-undo")!.setAttribute("title", i18n.actions.undo);
  document.querySelector("#btn-redo")!.setAttribute("title", i18n.actions.redo);
  document.querySelector("#btn-zoom-in")!.setAttribute("title", i18n.actions.zoomIn);
  document.querySelector("#btn-zoom-out")!.setAttribute("title", i18n.actions.zoomOut);
  document.querySelector("#btn-fit")!.setAttribute("title", i18n.actions.fit);
  document.querySelector("#btn-grid")!.setAttribute("title", i18n.actions.grid);
  // About modal
  document.querySelector("#about h2")!.textContent = i18n.about.title;
  document.querySelector("#about .tagline")!.textContent = i18n.about.tagline;
  document.querySelector("#about p:nth-of-type(2)")!.textContent = i18n.about.body;
  document.querySelector("#about .shortcuts")!.textContent = i18n.about.shortcuts;
  document.querySelector("#btn-about-close")!.textContent = i18n.about.close;
  // Tools
  document.querySelector('[data-tool="stamp"]')!.textContent = i18n.tools.stamp;
  document.querySelector('[data-tool="erase"]')!.textContent = i18n.tools.erase;
  document.querySelector('[data-tool="fill"]')!.textContent = i18n.tools.fill;
  redraw();
}

langBtn.addEventListener("click", () => {
  toggleLocale();
  updateLangUI();
});

// --- Share ---
document.querySelector("#btn-share")!.addEventListener("click", async () => {
  const encoded = btoa(unescape(encodeURIComponent(model.serializeState())));
  const url = `${window.location.origin}${window.location.pathname}#plan=${encoded}`;
  if (url.length > 8000) {
    toast(t().toast.shareTooLong);
    return;
  }
  history.replaceState(null, "", url);
  try {
    await navigator.clipboard.writeText(url);
    toast(t().toast.shareCopied);
  } catch {
    window.prompt(t().toast.shareFailed, url);
  }
});

// --- Export ---
document.querySelector("#btn-png")!.addEventListener("click", async () => {
  try {
    const blob = await exportPng(model, 2);
    const safeTitle = model.map.title.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "napkin-plan";
    downloadBlob(blob, `${safeTitle}.png`);
    toast(t().toast.pngDownloaded);
  } catch {
    toast(t().toast.loadFailed);
  }
});

document.querySelector("#btn-save")!.addEventListener("click", () => {
  const json = JSON.stringify(model.exportMap(), null, 2);
  const safeTitle = model.map.title.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "napkin-plan";
  downloadBlob(new Blob([json], { type: "application/json" }), `${safeTitle}.json`);
  toast(t().toast.jsonDownloaded);
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
      setTitle(data.title || "Untitled");
      titleInput.value = model.map.title;
      persist();
      toast(t().toast.mapLoaded);
      afterMapChange();
    } catch {
      toast(t().toast.loadFailed);
    }
  };
  input.click();
});

// --- About ---
document.querySelector("#btn-about")!.addEventListener("click", () => {
  aboutEl.classList.remove("hidden");
});
document.querySelector("#btn-about-close")!.addEventListener("click", () => {
  aboutEl.classList.add("hidden");
});
aboutEl.addEventListener("click", (e) => {
  if (e.target === aboutEl) aboutEl.classList.add("hidden");
});

// --- Canvas interaction ---
function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 1 || e.button === 2 || spaceDown || e.altKey) {
    panning = true;
    lastPan = { x: e.clientX, y: e.clientY };
    canvas.classList.add("panning");
    return;
  }
  if (e.button !== 0) return;
  painting = true;
  model.beginStroke();
  const cell = screenToCell(model, canvas, e.clientX, e.clientY);
  if (cell) {
    model.applyAt(cell.c, cell.r);
    persist();
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
    persist();
  }
  redraw();
});

canvas.addEventListener("pointerup", () => {
  if (painting) model.endStroke();
  painting = false;
  panning = false;
  canvas.classList.remove("panning");
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
    model.zoom = Math.min(2.5, Math.max(0.35, model.zoom * factor));
    redraw();
  },
  { passive: false },
);

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// --- Keyboard shortcuts (skip when typing in input) ---
window.addEventListener("keydown", (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.code === "Space") {
    spaceDown = true;
    e.preventDefault();
  }
  if (e.key === "s" || e.key === "S") setTool("stamp");
  if (e.key === "e" || e.key === "E") setTool("erase");
  if (e.key === "l" || e.key === "L") setTool("fill");
  if (e.key === "g" || e.key === "G") {
    model.showGrid = !model.showGrid;
    persist();
    document.querySelector("#btn-grid")!.classList.toggle("active", model.showGrid);
    redraw();
  }
  if (e.key === "f" || e.key === "F") {
    if (e.ctrlKey) return; // Ctrl+F = browser find
    fitZoom(model, canvas);
    redraw();
  }
  if (e.ctrlKey && e.key === "z") {
    e.preventDefault();
    if (model.undo()) {
      persist();
      toast(t().toast.undo);
      redraw();
    }
  }
  if (e.ctrlKey && e.key === "y") {
    e.preventDefault();
    if (model.redo()) {
      persist();
      toast(t().toast.redo);
      redraw();
    }
  }
  if (e.key === "Escape") {
    aboutEl.classList.add("hidden");
    templateMenu.classList.add("hidden");
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceDown = false;
});

window.addEventListener("resize", () => {
  fitZoom(model, canvas);
  redraw();
});

// --- Init ---
updateLangUI();
requestAnimationFrame(() => {
  fitZoom(model, canvas);
  redraw();
  // Welcome toast on first visit
  if (!localStorage.getItem(STORAGE_KEY)) {
    setTimeout(() => toast(t().toast.welcome), 600);
  }
});
