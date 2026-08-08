# Perspective

A first-person perspective reference tool. Real objects at real sizes on a
metric ground grid, seen from a human eye level, in straight-line or
curvilinear projection — set up a view, then draw from it.

The interface has no words in it. Everything is the scene, a mark, or a number
of metres, and it is meant to be legible without reading.

## The library

Three Norwegian objects — the Ekstrem chair, the Balans Variabel and Il Tempo
Gigante — true to life as authored. Measured, they come in at the sizes the real
things are, so anything drawn against one is drawn against a real chair. A knee-
high thing, a seat-high thing and a six-metre thing: between them they cover the
range a study needs something known to be measured against.

Everything else in the library is yours. The tile beside the reference cube
takes a file, and what comes in is both placed and **kept** — listed with the
three from then on, in this browser, so a mesh is imported once and placed as
often as the drawing wants. An import used to be a one-off: it stood in the
scene, it was saved with it, and placing it a second time meant finding it on
disk again.

The bytes are filed under a hash of themselves, so importing the same file twice
is one entry. The small mark on a tile takes it off the shelf, twice to confirm,
and the file goes with it unless a saved scene still stands on it.

## Opening

The car is standing on the grid when the tool opens, framed for its size, on a
180° five-point sheet.

**Nothing in the tool erases the scene.** There was a control that came back to
exactly this opening, and it sat a thumb-width from the ones you reach for
constantly, with a single undo between a mis-tap and a morning's work. A tool
you draw from for an hour should not carry a button that empties it. Reloading
the page is the way back to the opening, and it is a deliberate enough act to
be the only one.

It is always the car and never one of the chairs. A chair is a box with legs;
the car is curved where a box is flat, six metres long so its far end is visibly
smaller than its near one, and turned enough that all three of its axes run to
three separate points. It is the object here with the most perspective in it.

You stand as far back as the room has floor — 3.8 m at its default size. The car
is nearly six metres long, so framing it by its own length used to put the
viewer a step outside the front wall, looking in at it through the brickwork.
Where the tool opens should be one place, whether or not the room is switched
on; make the room smaller and the opening view comes in with it.

Framing solves for two legs, not one: how far back to stand, and how high the
eye has to be. A chair 0.7 m away from a 1.9 m eye is not 0.7 m away — it is
1.7 m away and mostly below you, which is why it used to open small however
close the walker was put.

Whether to kneel is the other half. Anything over about a metre is something you
meet from your own height — a person, a car — and dropping to its waist would be
a strange way to do it. Anything lower has to be knelt to, or it is a thing on
the floor seen from above.

## Moving about

- **Look** — drag anywhere on the right or upper part of the screen
- **Walk** — a thumb stick appears wherever the left thumb lands; WASD or the
  arrow keys on a desktop
- **Select** — tap an object
- **Move** — drag the selection along the floor; hold shift to lift it
- **Resize a box** — drag one of the dots at the centre of a face
- **Turn, size and slide at once** — two fingers on the selection: twist to turn
  it, spread to size it, slide to move it
- **The sun** — three fingers anywhere: across for its bearing, up and down for
  its height
- **Undo** — ⌘Z / Ctrl-Z; **redo** ⇧⌘Z, or the two arrows in the tools row
- **Deselect** — escape, or tap where there is nothing
- **Delete** — the delete key, or the bin in the selection bar

A tap selects and stops there; the *second* grab is what moves. So brushing past
a figure while looking around never shoves it across the room.

Every one of these is aimed through the projection actually on screen, so a
chair follows the finger on a five-point sheet exactly as it does on a flat one.

### Taking hold of a box

The dots are the three faces you can push and pull, and each is drawn only where
it means something: on a face turned towards you, and only once it has come far
enough clear of the box to be aimed at. Meet a box square on and the face
pointing at you has no dot — pushing it would move nothing you could see — so
the middle of the box is the middle of the box, and dragging there slides it.

A face follows the finger rather than moving at some fixed rate: how far a metre
of the box's own axis reaches across the screen is measured as it is taken hold
of. The opposite face stays where it is, which is what makes this sizing rather
than scaling.

## The dock

Along the bottom, fading out a few seconds after the last touch and back on the
next one — as does the selection bar, which is the same kind of chrome over the
same view. The point of the tool is the picture you set up and then draw from,
and chrome that will not get out of the way is a window with a sticker on it.
The timer lives outside both of them, in `lib/rail.ts`, since they are different
components in different parts of the tree and there is only one idea of "the
chrome is wanted" between them.

The controls:

- **Cube** — the mesh library: a 1 m reference cube, then the objects and figures
- **Frames** — the scene library (below)
- **Field of view** — drag for any value, tap to step through presets, the last
  of which stands back far enough to see the whole sheet
- **Horizon** — eye level, from 0.2 m to 12 m
- **Projection** — steps through the three systems (below)
- **Sun / moon** — tap for light and dark, drag through all 256 greys,
  double-tap for the procedural sky
- **Sliders** — everything else: the room's guides, the floor's two rulings, snap,
  the construction around each object, the selection's own vanishing points,
  view lock, the room (tap to toggle, drag to size), the surface of everything,
  the lights, de-duplicate, undo, redo, and save the view as a PNG

### Projections

Three systems, all of them ones you can draw in, cycled with one button:

- **Cylindrical** — four-point. Verticals stay straight and vertical while
  horizontals bow. The system for ruling a long wall.
- **Equidistant** — five-point, and the default. Angle from the centre of the
  frame is distance from the centre, evenly, in every direction. That even
  mapping is what makes it a ruled sphere, and it is the sheet Kim Jung Gi
  draws on.
- **Stereographic** — the conformal one (below).

Every projection here is one function: the angle away from the view axis, mapped
to a distance from the middle of the frame. Equidistant is the identity — the
angle *is* the distance — which is why it rules so evenly and why it is the
sheet to measure on. Stereographic is the tangent of the half angle, and that
one change buys the property no other azimuthal projection has: **angles are
preserved everywhere**. A small square anywhere on the page is still a square, a
sphere is still drawn as a circle, and two lines crossing at sixty degrees in
the world cross at sixty degrees on the paper — at the rim of a full-turn field
as much as at the centre. Measured on a right-angled cross 70° off the axis:
stereographic gives 90.4° with arms 1.007× apart, equidistant 0.77×.

What it costs is scale. The periphery is expanded enormously, which is exactly
the "little planet" picture, and at a full turn the point directly behind you is
at infinity and can never be drawn: the sphere minus one point onto the whole
plane, which is the map that makes the Riemann sphere a sphere and the one the
Poincaré disk is built from. It is the closest thing to a straight edge that
survives a curved sheet — what stays true is not the length of anything but the
angle between everything.

Straight-line perspective is not among them. It is honest inside the field of
view and nowhere else, and this is a tool whose whole subject is the wide field —
so opening the lens in it did not open the view out, it smeared the edges of the
frame into something no drawing could be made from. The three above answer the
same question at forty degrees as at three hundred, and at forty they *are* the
flat one to within the width of a pencil line.

The tool opens at **180°**, which is the number that matters for a curvilinear
study: the four horizon points land exactly on the edge of the frame and the
fifth is dead centre — the five-point sheet itself, not an approximation of it.

With the construction guides on, **all five vanishing points are marked** on the
sphere. They are fixed to the room, not to the frame, so they slide as you turn
and stay where the geometry says they are.

### What the picture is read off

A curvilinear frame is rendered rather than warped: the scene goes onto a
source, and one full-screen pass asks, for every pixel, what is along this ray.
There are two sources and each is right for exactly one half of the range.

A **cube** — six faces of world — is the right shape for a wide field, because a
360° frame needs a picture in every direction and a cube has one. It is a poor
shape for a narrow field: a face spans 90° whatever the lens is doing, so a 35°
frame is a third of one face stretched across the whole screen. On a phone that
worked out at **0.63 pixels of source behind every pixel of glass** — the
picture was magnified, which is what put stair steps on every silhouette the
moment anyone zoomed in. Bigger faces are not the answer: six of them at 4096 is
400 MB of video memory, and most of it is behind you.

So a narrow field is read off **one flat render** instead, wide enough to cover
every direction the frame asks for and denser than the screen — 1.9× on the same
phone, three times the source and over the line from magnified to supersampled,
which is the difference between stair steps and none. It is also one render
rather than six.

The usual objection to warping a flat render is that a flat frame has no picture
past its own edge to bend into view, and that stretching one magnifies every
jagged edge in it. Neither is true when the frame is narrower than the source
and the source is denser than the screen — which is the whole condition, and
also exactly where the changeover sits: at about 60° out from the axis at the
corner of the frame, past which a flat frustum stops being a sensible thing to
render and the cube has face to spare.

### Standing back from the sheet

The field goes past a full turn, and the last stop on it is the one that matters:
**the whole sphere drawn small enough to see all the way round**, a ruled disc
sitting on the page with paper about it. That is the sheet itself — everything
there is to see, at once, with its edge visible — rather than something you are
inside and cropped by.

The scale follows the longest edge of the frame, so at 360° the sphere spans
that edge exactly and the shorter one cuts the top and bottom off it. How much
wider you have to go to bring the disc inside depends entirely on the shape of
the window — about 500° on a laptop, nearer 800° on a phone held upright — so
the tool works it out and puts it at the top of the control and last in the
tap-through. Cylindrical does the same thing and comes out as a rectangle: the
whole panoramic band, top edge, bottom edge and both ends.

### The selection's own points

Select anything and its own vanishing points are drawn, with its edges carried
out to them — in every one of the three systems, not only the flat one. **On its
own switch**, not a rung of the guides: the guides are the construction of the
*room* — the horizon, the floor, the sheet — and are wanted or not wanted for a
whole session, while this is the construction of the one thing in your hand, and
it is wanted while you work out where that thing's edges run and in the way the
moment you have.

That is the whole lesson, and it is invisible until somebody draws it: a box has
its own points, decided by how *it* is turned relative to you, not by the scene
being "in two-point perspective". Turn one off the grid and its pair moves off
the scene's.

The maths is the same everywhere — a direction vanishes where a point infinitely
far along it is drawn — and everything else about it changes with the sheet. On
a flat one only the point in front of you exists and the lines to it are
straight. On a curved one **both** points are on the page, opposite each other,
and the edge between them is a great circle rather than a straight line. So the
edges are drawn by asking the projection where the line itself lands, a sample
at a time, which draws a straight one straight and a bent one bent.

The verticals are ruled too on a curved sheet, to the point overhead: that is
the fifth point, and it is the one thing a five-point sheet is for.

A point that lands off the frame is pinned to the edge rather than dropped —
"off to the left, roughly level with here" is what you need when you are ruling
by hand. Which is also how the fifth point stays locatable at 180°, where a
landscape frame reaches about 65° up and the zenith is at 90°.

### The field of view

The control on the dock is one number — how much of the world the sheet holds,
from a long lens to past a full turn — and the frame decides the shape of it.
`fieldOf` splits that spread across the frame's own proportions, so a landscape
frame is wider than it is tall in degrees as well as in pixels, and turning a
phone sideways changes what is in the picture rather than how it is squeezed.

There used to be an oval ruled over the view at the 60° mark, the "cone of
vision" of the drawing convention drawn as the oval it actually is: two eyes
side by side under brows and over cheeks share something over 200° across and
about 130° top to bottom, more of it below the line of sight than above. It is
a true and useful fact and it made a poor overlay — a permanent ring across the
middle of the thing you are trying to draw, in a tool whose entire argument is
that the view should be the only thing on screen. The fact is in this file now,
which is where a fact belongs; the sheet is left clear.

What it marked is still there to see without being drawn. On a curved sheet the
60° region is where a rectilinear projection matches what an eye sees and a
straight edge is honest; outside it squares stretch and spheres go oval, and the
bend is not a stylisation but the only truthful answer. Sweep the field control
and you watch that boundary move.

### Lights

The sun is one hard light with no fill, which is what makes a box read as a box:
a face turned away from it is genuinely unlit, and that separation is the thing
being drawn. Its bearing, height, strength and colour temperature are four
drags in the light sheet, and its shadows can be switched off.

The panel is ten knobs in two rows and is exactly ten knobs wide — it hugs its
contents rather than stretching to the edge of the screen, and each knob's
reading floats clear of it rather than being kept inside by 40 px of empty
headroom. It covers about a tenth of a phone where it used to cover a quarter,
which matters for a control whose whole purpose is watching the scene change
while you drag it.

A **second light** lives under it, off until asked for: shadowless, cooler and
weaker by default, the way a studio or an overcast sky answers the problem of
one light leaving half of everything black.

### Guides, and the floor's two rulings

The guides control steps down through three levels rather than switching on and
off: the curvilinear construction circles, the eye-level line, nothing. The
useful state is usually one less than what you have.

**The ground grid is two switches, one per direction** — the lines running away
from you, and the lines running across. It used to be a rung of the ladder,
which could only ever offer the whole grid, and a floor is not drawn that way:
you lay the receding lines to their point and then you cross them. Either family
alone is the step before a grid; both is a grid; neither is bare ground.

The ground is ruled as a tape measure is: three rulers at once — the step you
snap to, the metre, and the five — each heavier than the last, so distance can
be counted rather than guessed. The two axes through the origin are coloured,
and coloured to match the curvilinear construction sheet: red along X, green
along Z. Turning the projection inside out does not change what a colour means.

### Snap

Dragging lands on free, 5 cm, 25 cm or 1 m, and **the ground grid is ruled at
whatever is chosen** — so what you snap to is what you can see to line things
up against. Eye level sets to the centimetre.

Selecting something replaces the dock with what you can do to it: size,
**lock the size**, lift it off the floor, change its surface, duplicate, export
the mesh at the size you settled on, delete. Turning is not on the bar — it is
two fingers on the thing itself, which is where it is looked for first, and a
pair of arrows that step a thing round by a fixed amount is a worse version of
that gesture rather than a second way to reach it. A copy lands beside its original with about six
centimetres of air, so duplicating along a line builds a row rather than a
scattering. Readings are in metres — the grid is ruled in metres, so the unit is
never written down.

**Lock** pins a mesh's size and nothing else. A mesh arrives at the size its
file says it is — and for the three that ship, that is the real thing's size,
which is the whole reason for drawing against them. Everything else about a
placed mesh is meant to be handled: slid, turned, lifted. Sizing is the one
usually done once and then only ever done again by accident, because the gesture
that turns a thing is the same two fingers that resize it and the two are hard
to keep apart on glass. Locked, two fingers still turn it and still slide it and
the size in that same gesture is refused; the reading goes quiet and the padlock
goes amber. It is enforced in the store rather than at the controls, because
there are three ways to resize a mesh and a rule kept at the controls holds only
until somebody adds a fourth. Meshes only — a box is sized by its faces, which
is deliberate every time.

**Lift** drags by the metre rather than by proportion, unlike everything else on
that bar: scrubbing by percentage is right for a size and useless for a height
that starts at zero, where every proportion of nothing is nothing. A centimetre
per pixel, a double tap to put it back on the floor, and the icon stays amber
while it is up — a thing floating a few centimetres off the ground for no reason
is hard to see and easy to do. Sizing something that has been lifted keeps it at
the height it was left at rather than dropping it.

## The room

Four walls, a ceiling and a floor, standing round the origin — ten metres square
and three high to begin with, and settable. It is the perspective exercise. A box on open ground gives you
its own twelve edges and a horizon somewhere past it; a room gives you the ones
that reach the corners of the frame, which is where a curved projection does all
of its visible work. Standing in the middle of one on a five-point sheet, the
floor lines run to the point under your feet, the ceiling lines to the one over
your head and the four wall corners out to the four around the horizon — five
points, one picture, nothing left to imagine.

**Tap the room control to put it up or take it down; drag it to size it** —
across for the length running away from you, up and down for the width running
across, both at once from one diagonal drag, with the reading floating above
your thumb. Continuous, not stepped: a room is set by eye against what is
standing in it, and a control that jumps under the thumb is a control fighting
the eye. From a 3 m cupboard to a 40 m hangar on either axis, so a corridor, a
square studio and a wide shallow hall are all one drag apart.

Dragging raises the room if it was down, because sizing something you cannot see
is a control with no feedback — and if the walls would pass you as it shrinks,
you come in with them, so they close on you rather than leaving you outside
looking at the box you were sizing.

The ceiling stays at three metres. It is the floor's proportion that decides
which exercise you are in, and moving the lid turns out to be the least
interesting thing about a room.

The walls are ruled in world coordinates rather than their own, so a line across
the floor is the same line continuing up the wall. That is what makes it a
measuring device rather than wallpaper, and it is also what lets the room be
resized without rebuilding a single shader.

There is no lighting in it. One directional sun outside a closed box leaves the
ceiling and two of the four walls perfectly black, which is true and useless.
These are construction surfaces: flat tones, lightest at the ceiling and darkest
underfoot, so the room still reads as a box under any light at all.

## How solid a thing is drawn

Every box and every placed mesh carries its own surface, so a scene can have a
solid car standing inside a wire box on a floor of glass ones. Four rungs:

- **solid** — as the thing is: a box in plain white, a mesh in the materials its
  file was authored with
- **matte** — opaque, plain white, no texture. Photographed skin and fabric is a
  lot of information to draw past; stripped out, a figure reads as form and
  value only, which is what it is doing in a scene full of white boxes
- **glass** — translucent, writing no depth, so the far edges come through the
  near faces. This is drawing through, and it is how a box is checked: if the
  hidden corner is in the wrong place then the whole thing is, and on an opaque
  box there is nothing to check it against
- **wire** — the twelve edges and nothing else: the construction with the object
  taken away

The button on the selection bar steps the one thing you are holding, through the
rungs its own kind has — a box skips matte, being plain white already, and a
mesh skips wire, having no cage to fall back on. The button in the tools row
steps the whole scene at once and stamps everything standing in it, in one
undoable move.

## Undo

Everything that changes the scene can be taken back and put again — placing,
sliding, lifting, turning, sizing, duplicating, deleting, and opening a saved
composition over your work. A gesture is one step however many frames it
took, and taking hold of something and letting go without moving it is not a
step at all. Twenty-five deep, and going forward is closed off by the next
change, as everywhere else.

## Taking the picture away

The camera control writes a **PNG at three times the frame** — around 3000 px on
the long edge of a laptop, which is A3 at 250 dpi — and it is drawn again at that
size rather than scraped off the glass.

That distinction is the whole of it. The canvas runs at a capped pixel ratio to
hold sixty frames a second, so a screenshot of it is both small and soft, and it
carries none of the SVG construction drawn over it. The export runs the same
projection sums with the export's own frame in them: a source built at the
export's density rather than the screen's, so nothing is magnified; multisampled,
so the geometry's edges are resolved rather than stepped; and carrying mipmaps
with trilinear minification, so where the projection squeezes the source — which
it does hard towards the edge of a wide field — the picture is filtered down
instead of point-sampled into sparkle. Then the overlays are re-rendered from
their own markup at the same scale and composited on top, so the vanishing
points and the lines ruled towards them come with it.

None of those compromises are worth making for a picture that is drawn once.

## Coming back to it

The setup is kept in this browser and read back on the next visit, which means
every field in it is a promise to a version of the tool that does not exist yet.
When the room's floor went from one square number to two, that promise was
broken in the quietest possible way: the stored `{ floor, height }` came back
through the allow-list intact, the room had no width and no depth, and every sum
downstream held a NaN. Nothing threw. The camera went to a place that is not a
place and the frame came up **white** — for everybody who had used the previous
version, and for nobody testing in a fresh browser.

So a setting is now taken back only if the key is known *and* the value is the
right kind of thing, and the room and the projection are read through functions
that start from the defaults and only accept what they understand. A setting
that cannot be read is a setting lost, which is the smallest price there is and
the only one that cannot take the tool down with it.

## While it is working

There is one mark for it, along the top edge of the frame: a hairline running
while a mesh is being fetched, a scene written or a file read, and the same line
in red for a moment when what was asked for never arrived. A library mesh is
three megabytes over the network, and a tool that does nothing for two seconds
after being asked has, as far as anyone watching can tell, not heard.

## The construction around each thing

Every object standing in the scene carries its own construction, whether or not
it is the one you are holding:

- **the box it blocks into** — the first mark anyone makes when they draw a
  figure, and the thing a drawing is measured in
- **the ground it stands on** — where its footprint meets the floor, to be lined
  up against the grid
- **the diagonals of that footprint** — crossed, they mark its true centre *in
  perspective*, which is not the middle of the drawn rectangle and is how a
  receding row is halved and doubled without measuring anything
- **the plumb line** — up through the middle and on past the top, which is what
  a figure's height and balance are read against

It is drawn in the construction red like the rest of the sheet, and goes
**green** on the one a drag would move. The whole of it switches off from the
tools row, since the construction of the things and the construction of the room
are wanted at different times — which is also why the room has a switch of its
own.

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

Scenes can also leave as a file, through the arrows in the scene sheet — and a
file is the **whole project**: the arrangement, the viewpoint, and the geometry
of every imported mesh packed in after it. Carry one to another machine and the
furniture arrives with it.

The container is built the way GLB is — a short header, a JSON manifest, then
the mesh bytes uncompressed, since a GLB is already compressed and base64 in
JSON would cost a third of the file for nothing:

```
magic    4 bytes   "PSPV"
version  uint32
json     uint32    length of the manifest
manifest utf8      the scene, and where each mesh sits below
meshes   bytes     concatenated, each padded to four bytes
```

The meshes the app ships with stay as `/meshes/…` references: both ends have
them already, so a scene of nothing but library objects exports as about a
kilobyte. Older plain-JSON exports still read.

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
imported meshes, saved scenes and library thumbnails.

`lib/pick.ts` is the one place that knows where a pixel is in the world and
where a point in the world is on the glass, in each of the four projections. It
has to live outside the canvas: the walk layer covers it and owns every pointer
event, so react-three-fiber's own picking never sees one. The scene registers
what it is drawing with; `lib/manipulate.ts` turns a pointer into a grab.

In a dev build the store, the walk input and the picker are on `window.__store`,
`window.__walk` and `window.__pick`; `window.__forceMesh` pins which object
opens; and `window.__panorama` says which source the frame is being read off and
how big it is. That is how the scene can be read and driven from a browser test,
since nearly all of it is otherwise only pixels on a canvas — and in the
panorama's case, because a test cannot tell a sharp frame from a soft one by
looking, but it can ask. The picker is published by the running app rather than
imported by the test on purpose: a dev server that has hot-reloaded the file
hands out a second copy of it, with nothing registered in it.

Every mesh ships simplified and quantized (`gltf-transform optimize --compress
quantize --simplify-ratio 0.12 --texture-compress webp --texture-size 1024`),
which takes each from about 21 MB to under 3 MB with no visible difference at
drawing scale — 650k triangles down to 76k, and 4096² textures that cost 89 MB
of video memory apiece down to 1024². Quantization is `KHR_mesh_quantization`,
which three.js reads natively — no decoder to load.
