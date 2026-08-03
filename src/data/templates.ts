import { GRID, type MapData, type StampId } from "../core/types";

function blank(title: string, fill: StampId = "empty"): MapData {
  const cells = Array.from({ length: GRID * GRID }, () => fill as string);
  return { v: 1, w: GRID, h: GRID, title, cells };
}

function set(m: MapData, c: number, r: number, id: StampId) {
  if (c < 0 || r < 0 || c >= m.w || r >= m.h) return;
  m.cells[r * m.w + c] = id;
}

/** Closed rectangle of walls (inclusive). */
function rectWall(m: MapData, c0: number, r0: number, c1: number, r1: number) {
  for (let c = c0; c <= c1; c++) {
    set(m, c, r0, "wall");
    set(m, c, r1, "wall");
  }
  for (let r = r0; r <= r1; r++) {
    set(m, c0, r, "wall");
    set(m, c1, r, "wall");
  }
}

function fillFloor(m: MapData, c0: number, r0: number, c1: number, r1: number) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) set(m, c, r, "floor");
  }
}

/** Room: floor inside, walls on edge, optional door gap on top. */
function room(
  m: MapData,
  c0: number,
  r0: number,
  c1: number,
  r1: number,
  doorAt?: { c: number; r: number },
) {
  fillFloor(m, c0 + 1, r0 + 1, c1 - 1, r1 - 1);
  rectWall(m, c0, r0, c1, r1);
  if (doorAt) {
    set(m, doorAt.c, doorAt.r, "door");
    if (doorAt.c + 1 < c1) set(m, doorAt.c + 1, doorAt.r, "door");
  }
}

export interface TemplateMeta {
  id: string;
  title: string;
  use: string;
  build: () => MapData;
}

/** Job-driven only — no scenic filler. */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: "blank",
    title: "Blank room",
    use: "Empty box — full control",
    build: () => {
      const m = blank("Blank room", "empty");
      room(m, 4, 4, 19, 19, { c: 11, r: 4 });
      return m;
    },
  },
  {
    id: "studio",
    title: "Studio apartment",
    use: "One-room living + bath hint",
    build: () => {
      const m = blank("Studio apartment", "empty");
      // main living shell
      room(m, 2, 2, 21, 21, { c: 11, r: 2 });
      // bath (inner room) — keep outer wall intact on left/top
      room(m, 3, 3, 9, 9, { c: 9, r: 6 });
      set(m, 5, 5, "toilet");
      set(m, 7, 5, "sink");
      set(m, 5, 7, "bath");
      // living furniture (all inside main floor)
      set(m, 14, 7, "sofa");
      set(m, 15, 7, "sofa");
      set(m, 14, 9, "table");
      set(m, 13, 14, "bed");
      set(m, 14, 14, "bed");
      set(m, 16, 14, "storage");
      set(m, 18, 6, "plant");
      set(m, 12, 18, "desk");
      set(m, 12, 19, "chair");
      // windows on outer wall cells
      set(m, 2, 12, "window");
      set(m, 21, 12, "window");
      return m;
    },
  },
  {
    id: "meeting",
    title: "Meeting room",
    use: "Table + chairs for office layout",
    build: () => {
      const m = blank("Meeting room", "empty");
      room(m, 3, 4, 20, 19, { c: 11, r: 4 });
      for (let c = 9; c <= 14; c++) {
        set(m, c, 11, "table");
        set(m, c, 12, "table");
        set(m, c, 10, "chair");
        set(m, c, 13, "chair");
      }
      set(m, 8, 11, "chair");
      set(m, 8, 12, "chair");
      set(m, 15, 11, "chair");
      set(m, 15, 12, "chair");
      set(m, 5, 6, "plant");
      set(m, 18, 6, "plant");
      set(m, 5, 17, "storage");
      set(m, 20, 11, "window");
      set(m, 20, 12, "window");
      return m;
    },
  },
  {
    id: "cafe",
    title: "Cafe corner",
    use: "Small seating sketch for F&B",
    build: () => {
      const m = blank("Cafe corner", "empty");
      room(m, 2, 3, 21, 20, { c: 11, r: 3 });
      for (let c = 4; c <= 10; c++) set(m, c, 5, "desk");
      set(m, 5, 6, "sink");
      set(m, 8, 6, "storage");
      const spots: [number, number][] = [
        [6, 11],
        [11, 11],
        [16, 11],
        [6, 16],
        [11, 16],
        [16, 16],
      ];
      for (const [c, r] of spots) {
        set(m, c, r, "table");
        set(m, c - 1, r, "chair");
        set(m, c + 1, r, "chair");
        set(m, c, r + 1, "chair");
      }
      set(m, 19, 7, "plant");
      set(m, 19, 14, "plant");
      set(m, 21, 10, "window");
      set(m, 21, 11, "window");
      return m;
    },
  },
];

export function templateById(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!;
}
