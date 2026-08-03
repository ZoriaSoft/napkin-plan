export const GRID = 24;
export const CELL = 28; // logical px before zoom

export type Tool = "stamp" | "erase" | "fill";

export type StampId =
  | "empty"
  | "floor"
  | "wall"
  | "door"
  | "window"
  | "table"
  | "chair"
  | "sofa"
  | "bed"
  | "desk"
  | "sink"
  | "toilet"
  | "bath"
  | "plant"
  | "stairs"
  | "storage";

export interface StampDef {
  id: StampId;
  name: string;
  kind: "floor" | "prop";
  /** fill color for simple stamp draw */
  fill: string;
  stroke?: string;
}

export interface MapData {
  v: 1;
  w: number;
  h: number;
  title: string;
  /** length w*h, StampId as string */
  cells: string[];
}

export interface AppState {
  map: MapData;
  tool: Tool;
  stamp: StampId;
  showGrid: boolean;
  zoom: number;
  panX: number;
  panY: number;
}
