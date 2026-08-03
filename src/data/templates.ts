import { GRID, type MapData, type StampId } from "../core/types";

function blank(title: string, floor: StampId = "floor"): MapData {
  const cells = Array.from({ length: GRID * GRID }, () => floor as string);
  return { v: 1, w: GRID, h: GRID, title, cells };
}

function set(m: MapData, c: number, r: number, id: StampId) {
  if (c < 0 || r < 0 || c >= m.w || r >= m.h) return;
  m.cells[r * m.w + c] = id;
}

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
      fillFloor(m, 4, 4, 19, 19);
      rectWall(m, 4, 4, 19, 19);
      set(m, 11, 4, "door");
      set(m, 12, 4, "door");
      return m;
    },
  },
  {
    id: "studio",
    title: "Studio apartment",
    use: "One-room living + bath hint",
    build: () => {
      const m = blank("Studio apartment", "empty");
      fillFloor(m, 3, 3, 20, 20);
      rectWall(m, 3, 3, 20, 20);
      set(m, 11, 3, "door");
      set(m, 12, 3, "door");
      // bath corner
      for (let r = 4; r <= 8; r++) for (let c = 4; c <= 8; c++) set(m, c, r, "floor");
      rectWall(m, 4, 4, 8, 8);
      set(m, 8, 6, "door");
      set(m, 5, 5, "toilet");
      set(m, 7, 5, "sink");
      set(m, 6, 7, "bath");
      // living
      set(m, 14, 8, "sofa");
      set(m, 15, 8, "sofa");
      set(m, 14, 10, "table");
      set(m, 12, 14, "bed");
      set(m, 13, 14, "bed");
      set(m, 16, 14, "storage");
      set(m, 18, 6, "plant");
      set(m, 10, 18, "desk");
      set(m, 10, 19, "chair");
      set(m, 6, 12, "window");
      set(m, 18, 12, "window");
      return m;
    },
  },
  {
    id: "meeting",
    title: "Meeting room",
    use: "Table + chairs for office layout",
    build: () => {
      const m = blank("Meeting room", "empty");
      fillFloor(m, 4, 5, 19, 18);
      rectWall(m, 4, 5, 19, 18);
      set(m, 11, 5, "door");
      set(m, 12, 5, "door");
      // conference table
      for (let c = 9; c <= 14; c++) {
        set(m, c, 11, "table");
        set(m, c, 12, "table");
      }
      // chairs around
      for (let c = 9; c <= 14; c++) {
        set(m, c, 10, "chair");
        set(m, c, 13, "chair");
      }
      set(m, 8, 11, "chair");
      set(m, 8, 12, "chair");
      set(m, 15, 11, "chair");
      set(m, 15, 12, "chair");
      set(m, 6, 7, "plant");
      set(m, 17, 7, "plant");
      set(m, 6, 16, "storage");
      set(m, 17, 11, "window");
      set(m, 17, 12, "window");
      return m;
    },
  },
  {
    id: "cafe",
    title: "Cafe corner",
    use: "Small seating sketch for F&B",
    build: () => {
      const m = blank("Cafe corner", "empty");
      fillFloor(m, 3, 4, 20, 19);
      rectWall(m, 3, 4, 20, 19);
      set(m, 11, 4, "door");
      set(m, 12, 4, "door");
      // counter
      for (let c = 4; c <= 10; c++) set(m, c, 6, "desk");
      set(m, 5, 7, "sink");
      set(m, 8, 7, "storage");
      // tables
      const spots: [number, number][] = [
        [6, 12],
        [10, 12],
        [14, 12],
        [6, 16],
        [10, 16],
        [14, 16],
      ];
      for (const [c, r] of spots) {
        set(m, c, r, "table");
        set(m, c - 1, r, "chair");
        set(m, c + 1, r, "chair");
        set(m, c, r - 1, "chair");
      }
      set(m, 18, 8, "plant");
      set(m, 18, 14, "plant");
      set(m, 18, 10, "window");
      set(m, 18, 11, "window");
      return m;
    },
  },
];

export function templateById(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!;
}
