# Perspective

A first-person perspective reference tool. Real objects at real sizes on a
metric ground grid, seen from a human eye level, in straight-line or
curvilinear projection — set up a view, then draw from it.

The interface has no words in it. Everything is the scene, a mark, or a number
of metres, and it is meant to be legible without reading.

## Opening

One of four Norwegian objects — the Ekstrem chair, the Balans Variabel, Il
Tempo Gigante, the Tripp Trapp — is standing on the grid when the tool opens,
picked at random and framed for its size. They are the whole mesh library, they
are true to life as authored, and a different one each time is a different
exercise.

## Moving about

- **Look** — drag anywhere on the right or upper part of the screen
- **Walk** — a thumb stick appears wherever the left thumb lands; WASD or the
  arrow keys on a desktop
- **Select** — tap an object
- **Move** — drag a selected object along the floor; hold shift to lift it
- **Resize a box** — drag one of its faces
- **Move and turn a mesh** — two fingers on a selected mesh: pinch-twist to
  turn it, slide to move it
- **The sun** — three fingers anywhere: across for its bearing, up and down for
  its height
- **Undo** — ⌘Z / Ctrl-Z, or the arrow in the tools row

## The dock

Along the bottom, fading out while you draw and back on the first touch:

- **Cube** — the mesh library: a 1 m reference cube, then the four objects
- **Frames** — the scene library (below)
- **Cone** — field of view; drag for any value, tap to step through presets
- **Horizon** — eye level, from 0.2 m to 12 m
- **Projection** — linear, equidistant, stereographic, cylindrical, hyperbolic,
  5-point, and a 720° non-euclidean view
- **Sun / moon** — tap for light and dark, drag through all 256 greys,
  double-tap for the procedural sky
- **Sliders** — everything else: AR, guides, the 60° cone, view lock, model
  material, mesh import, de-duplicate, undo, clear, and save the view as a PNG

Selecting something replaces the dock with what you can do to it: turn, size,
duplicate, export the mesh at the size you settled on, delete. Readings are in
metres — the grid is ruled in metres, so the unit is never written down.

## Saving a scene

The scene library (the frames icon) keeps whole compositions in the browser:
the boxes, every placed mesh with its position, bearing and size, the eye
level, the lens, the sun, and the spot you were standing on. Each one is a
thumbnail of the view it was saved from, which is how you tell them apart —
there is nothing to name and nothing to overwrite. Saving always adds one, so
nothing is lost by saving; deleting takes two taps.

**Imported meshes are kept too.** A file dropped into the scene is written into
the browser's own storage under a hash of its contents and referred to
afterwards as `asset:<hash>`, so a scene built out of imported furniture comes
back whole a week later. Importing the same file twice stores it once. Meshes
stop being kept when no saved scene names them any more.

Scenes can also leave as a file, through the arrows in the scene sheet. A file
carries the arrangement and the viewpoint; the four bundled meshes travel with
it, but an imported mesh is a reference to the browser it was imported into, so
that part of a scene only reopens on the same device.

## Install

Add to Home Screen on iOS for a full-screen PWA.

## Dev

```
npm install
npm run dev     # http://localhost:3000
npm run lint    # tsc --noEmit
npm run build
```

State lives in `store.ts` (zustand). `lib/assets.ts` is the IndexedDB layer:
imported meshes, saved scenes and library thumbnails. In a dev build the store
and the walk input are on `window.__store` and `window.__walk`, and
`window.__forceMesh` pins which object opens — that is how the scene can be
read and driven from a browser test, since nearly all of it is otherwise only
pixels on a canvas.

The four meshes ship simplified and quantized (`gltf-transform optimize
--compress quantize --simplify-ratio 0.12`), which takes each from about 20 MB
to under 3 MB with no visible difference at drawing scale. Quantization is
`KHR_mesh_quantization`, which three.js reads natively — no decoder to load.
