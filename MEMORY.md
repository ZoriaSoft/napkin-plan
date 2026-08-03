# NapkinPlan — MEMORY

## Brand (locked 2026-08-03)

- **Name:** NapkinPlan
- **Tagline:** Stamp a room layout in 60 seconds
- **Stack:** Canvas / Vite / TypeScript (not Godot)
- **Positioning:** Stamp-first napkin layouts — anti-CAD, no signup

## Status

v0.1.1 — live path + contrast fixes after screenshot QA.

### Bugs found (2026-08-03)
1. **zo.pub root URL** = collection file browser, not app → use `/index.html`
2. **Absolute Vite `base: '/'`** broke JS/CSS on subpath → fixed `base: './'`
3. **empty ≈ floor color** made room look broken → contrast + wall bevel + solid room() helper

## DNA shared with Iso Map

Grid · palette · paint · job templates · PNG/JSON · no backend · 60s demo

## Next

- verify + deploy zopub
- public GitHub
- cross-link iso map README
