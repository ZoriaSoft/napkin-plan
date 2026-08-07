import { GRID, type AppState, type MapData, type StampId, type Tool } from "./types";
import { isFloorStamp } from "../data/stamps";
import { templateById } from "../data/templates";

const MAX_UNDO = 48;

export class PlanModel {
  map: MapData;
  tool: Tool = "stamp";
  stamp: StampId = "table";
  showGrid = true;
  /** Fit full 24×24 sheet with margin on typical desktop stage */
  zoom = 0.92;
  panX = 0;
  panY = 0;

  private undoStack: MapData[] = [];
  private redoStack: MapData[] = [];
  private strokeOpen = false;

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  constructor() {
    // Meeting room = clear closed rectangle (best first impression)
    this.map = templateById("meeting").build();
  }

  idx(c: number, r: number): number {
    return r * this.map.w + c;
  }

  inBounds(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.map.w && r < this.map.h;
  }

  get(c: number, r: number): string {
    if (!this.inBounds(c, r)) return "empty";
    return this.map.cells[this.idx(c, r)] ?? "empty";
  }

  beginStroke() {
    if (this.strokeOpen) return;
    this.strokeOpen = true;
    this.pushUndo();
  }

  endStroke() {
    this.strokeOpen = false;
    this.redoStack = [];
  }

  private pushUndo() {
    this.undoStack.push(cloneMap(this.map));
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
  }

  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.redoStack.push(cloneMap(this.map));
    this.map = prev;
    return true;
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return false;
    this.undoStack.push(cloneMap(this.map));
    this.map = next;
    return true;
  }

  loadTemplate(id: string) {
    this.pushUndo();
    this.map = templateById(id).build();
    this.redoStack = [];
  }

  importMap(m: MapData) {
    this.pushUndo();
    this.map = normalizeMap(m);
    this.redoStack = [];
  }

  exportMap(): MapData {
    return cloneMap(this.map);
  }

  serializeState() {
    return JSON.stringify({
      map: this.exportMap(),
      tool: this.tool,
      stamp: this.stamp,
      showGrid: this.showGrid,
      zoom: this.zoom,
      panX: this.panX,
      panY: this.panY,
    });
  }

  restoreState(raw: string) {
    const state = JSON.parse(raw) as Partial<AppState>;
    if (!state.map || !Array.isArray(state.map.cells)) throw new Error("Invalid saved plan");
    this.map = normalizeMap(state.map);
    if (state.tool === "stamp" || state.tool === "erase" || state.tool === "fill") this.tool = state.tool;
    if (typeof state.stamp === "string") this.stamp = state.stamp as StampId;
    if (typeof state.showGrid === "boolean") this.showGrid = state.showGrid;
    if (typeof state.zoom === "number") this.zoom = Math.min(2.5, Math.max(0.35, state.zoom));
    if (typeof state.panX === "number") this.panX = state.panX;
    if (typeof state.panY === "number") this.panY = state.panY;
    this.undoStack = [];
    this.redoStack = [];
  }

  applyAt(c: number, r: number) {
    if (!this.inBounds(c, r)) return false;
    if (this.tool === "erase") {
      return this.setCell(c, r, "floor");
    }
    if (this.tool === "fill") {
      return this.flood(c, r, this.stamp);
    }
    return this.setCell(c, r, this.stamp);
  }

  private setCell(c: number, r: number, id: string): boolean {
    const i = this.idx(c, r);
    if (this.map.cells[i] === id) return false;
    this.map.cells[i] = id;
    return true;
  }

  private flood(c: number, r: number, stamp: StampId): boolean {
    // Fill only replaces floor-like cells for prop stamps; for floor stamps replace same id region
    const target = this.get(c, r);
    if (target === stamp) return false;
    if (!isFloorStamp(stamp) && !isFloorStamp(target) && target !== "empty") {
      // placing prop fill: only single cell
      return this.setCell(c, r, stamp);
    }
    if (!isFloorStamp(stamp)) {
      return this.setCell(c, r, stamp);
    }
    const stack: [number, number][] = [[c, r]];
    const seen = new Set<number>();
    let changed = false;
    let guard = 0;
    const max = GRID * GRID;
    while (stack.length && guard < max) {
      guard++;
      const [x, y] = stack.pop()!;
      const key = y * GRID + x;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!this.inBounds(x, y)) continue;
      if (this.get(x, y) !== target) continue;
      if (this.setCell(x, y, stamp)) changed = true;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return changed;
  }
}

function cloneMap(m: MapData): MapData {
  return {
    v: 1,
    w: m.w,
    h: m.h,
    title: m.title,
    cells: [...m.cells],
  };
}

function normalizeMap(m: MapData): MapData {
  const w = m.w || GRID;
  const h = m.h || GRID;
  const cells = Array.from({ length: w * h }, (_, i) => m.cells?.[i] ?? "empty");
  return { v: 1, w, h, title: m.title || "Untitled", cells };
}
