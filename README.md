# NapkinPlan

**Stamp a room layout in 60 seconds.**

Free browser tool — not CAD. Place furniture stamps on a grid, export PNG or JSON. No account.

## Brand

| | |
|--|--|
| **Name** | NapkinPlan |
| **Tagline** | Stamp a room layout in 60 seconds |
| **Stack** | Vite + TypeScript + Canvas 2D |
| **License** | MIT |

## Features (v0.1)

- 24×24 square grid (top-down)
- Stamp / erase / fill tools
- 15 stamps (wall, door, table, chair, bed, …)
- Job templates: blank room, studio, meeting room, cafe corner
- Undo/redo, pan, zoom, grid toggle
- Export **PNG** + **JSON**
- Touch-friendly pointer events

## Run

```bash
bun install
bun run dev
```

## Build

```bash
bun run verify   # tsc + vite build
bun run build
```

Output: `dist/` (static host).

## Deploy

```bash
bun run build
zopub sync napkin-plan dist
# → https://zo.pub/triangle/napkin-plan
```

## Related

- [Isometric Pixel Map](https://github.com/ZoriaSoft/isometric-pixel-map) — same DNA, iso / game mockups (Godot)

## License

MIT
