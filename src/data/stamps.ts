import type { StampDef, StampId } from "../core/types";

/** Max 16 job-useful stamps — no filler. */
export const STAMPS: StampDef[] = [
  { id: "empty", name: "Empty", kind: "floor", fill: "#d5d0c6" },
  { id: "floor", name: "Floor", kind: "floor", fill: "#f3ebe0" },
  { id: "wall", name: "Wall", kind: "floor", fill: "#2a3038" },
  { id: "door", name: "Door", kind: "prop", fill: "#8b5a2b", stroke: "#5c3a1a" },
  { id: "window", name: "Window", kind: "prop", fill: "#a8d4e8", stroke: "#5a8aa0" },
  { id: "table", name: "Table", kind: "prop", fill: "#c4a574", stroke: "#7a5a30" },
  { id: "chair", name: "Chair", kind: "prop", fill: "#6b8f71", stroke: "#3d5a42" },
  { id: "sofa", name: "Sofa", kind: "prop", fill: "#6a7d9a", stroke: "#3d4a5c" },
  { id: "bed", name: "Bed", kind: "prop", fill: "#d4c4e0", stroke: "#7a6a8a" },
  { id: "desk", name: "Desk", kind: "prop", fill: "#b8956a", stroke: "#6a4a28" },
  { id: "sink", name: "Sink", kind: "prop", fill: "#c0d0d8", stroke: "#607080" },
  { id: "toilet", name: "Toilet", kind: "prop", fill: "#e8eef2", stroke: "#8090a0" },
  { id: "bath", name: "Bath", kind: "prop", fill: "#9ec5d8", stroke: "#4a7080" },
  { id: "plant", name: "Plant", kind: "prop", fill: "#4caf70", stroke: "#2d6a40" },
  { id: "stairs", name: "Stairs", kind: "prop", fill: "#9a9080", stroke: "#5a5040" },
  { id: "storage", name: "Storage", kind: "prop", fill: "#8a7560", stroke: "#4a3a28" },
];

const byId = new Map(STAMPS.map((s) => [s.id, s]));

export function stampDef(id: string): StampDef {
  return byId.get(id as StampId) ?? STAMPS[0]!;
}

export function isFloorStamp(id: string): boolean {
  return stampDef(id).kind === "floor";
}
