# DECISIONS — NapkinPlan

## ADR-0001 — Brand + stack
**Date:** 2026-08-03  
**Decision:** Name **NapkinPlan**, tagline **Stamp a room layout in 60 seconds**. Stack **Vite + Canvas 2D**, not Godot.  
**Why:** English brand; light first paint; utility not game. Godot wasm (~36MB) conflicts with 60s napkin promise. Iso map stays Godot.

## ADR-0002 — Stamp-first originality
**Decision:** No freehand CAD walls. Grid + stamps + floor fill.  
**Why:** Differentiates from Floorplanner/Excalidraw; matches DNA of iso map palette tools.

## ADR-0003 — Job templates only
**Decision:** Blank room, Studio, Meeting room, Cafe corner.  
**Why:** Same filter as iso map — every template answers a real job.
