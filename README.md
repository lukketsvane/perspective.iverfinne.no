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
- **Turn** — the arrows in the selection bar: a tap steps 15°, a drag turns
  continuously
- **The sun** — three fingers anywhere: across for its bearing, up and down for
  its height
- **Undo** — ⌘Z / Ctrl-Z, or the arrow in the tools row

## The dock

Along the bottom, fading out while you draw and back on the first touch:

- **Cube** — the mesh library: a 1 m reference cube, then the four objects
- **Frames** — the scene library (below)
- **Cone** — field of view; drag for any value, tap to step through presets
- **Horizon** — eye level, from 0.2 m to 12 m
- **Projection** — opens the wall of projections (below)
- **Sun / moon** — tap for light and dark, drag through all 256 greys,
  double-tap for the procedural sky
- **Sliders** — everything else: AR, guides, snap, the 60° cone, view lock,
  matte models, the lights, mesh import, de-duplicate, undo, clear, and save
  the view as a PNG

### Projections

Twelve, picked from a grid rather than stepped through: straight lines,
curvilinear, five-point, fisheye, panorama, Mercator, hyperbolic, mirror ball,
little planet, inside out, vortex, and 720°. The last five are there to be hard
to hold in your head — the mirror ball crowds a whole hemisphere against its
rim, inside out puts what is behind you in the middle of the frame and bends
every straight line into a circle through the centre, and the vortex winds the
world up around whatever you are looking at.

### Lights

The sun is one hard light with no fill, which is what makes a box read as a box:
a face turned away from it is genuinely unlit, and that separation is the thing
being drawn. Its bearing, height, strength and colour temperature are four
drags in the light sheet, and its shadows can be switched off.

A **second light** lives under it, off until asked for: shadowless, cooler and
weaker by default, the way a studio or an overcast sky answers the problem of
one light leaving half of everything black.

### Guides

The guides control steps down through four levels rather than switching on and
off: the curvilinear construction circles, the ground grid, the eye-level line,
nothing. The useful state is usually one less than what you have.

The ground is ruled as a tape measure is: three rulers at once — the step you
snap to, the metre, and the five — each heavier than the last, so distance can
be counted rather than guessed. The two axes through the origin are coloured,
and coloured to match the curvilinear construction sheet: red along X, green
along Z. Turning the projection inside out does not change what a colour means.

### Snap

Dragging lands on free, 5 cm, 25 cm or 1 m, and **the ground grid is ruled at
whatever is chosen** — so what you snap to is what you can see to line things
up against. Eye level sets to the centimetre.

Selecting something replaces the dock with what you can do to it: turn, size,
duplicate, export the mesh at the size you settled on, delete. A copy lands
beside its original with about six centimetres of air, so duplicating along a
line builds a row rather than a scattering. Readings are in
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
