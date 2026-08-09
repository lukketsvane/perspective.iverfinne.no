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

Then three **studies**, reconstructed from Kim Jung Gi pages. Each is a single
sculpted mesh — fifteen figures, the furniture they are on, the animals among
them, welded into one — so there is nothing in them to take apart and nothing to
select inside. That is the point: they are not a kit, they are a room to stand
in and draw, at the density of incident he actually drew at.

A study is a *scene* rather than an object, and the difference is not size, it
is what you do with it. An object is something you stand a known distance from
and draw; a scene is something you walk into and draw from inside. So a study
lands on the origin rather than beside whatever is already there, and it carries
no construction cage and no vanishing points of its own — one box round fifteen
figures answers nothing, and its three axes are the world's, which the
construction sheet already marks. They are placed exactly as authored, like
everything else here, because measuring them says they already are life size:
stood at scale 1 with the eye at 1.9 m, the tallest figure's head sits on the
horizon, which is what a 1.9 m thing does at any distance.

They arrive at about 960,000 triangles and 24 MB each, which is not a thing to
put on a static site three times over. Shipped, they are decimated to 15 % and
quantized — 144,000 triangles and 2.6 MB, in line with the three objects — and
at the size a figure occupies on screen the two are indistinguishable. The
quantization is `KHR_mesh_quantization`, which three.js reads natively, so
there is no decoder to ship and no loader to wire up.

Everything else in the library is yours. The tile beside the reference cube
takes a file, and what comes in is both placed and **kept** — listed with the
three from then on, in this browser, so a mesh is imported once and placed as
often as the drawing wants. An import used to be a one-off: it stood in the
scene, it was saved with it, and placing it a second time meant finding it on
disk again.

The bytes are filed under a hash of themselves, so importing the same file twice
is one entry. The small mark on a tile takes it off the shelf, twice to confirm,
and the file goes with it unless a saved scene still stands on it.

The library also mints a **cylinder** — the ellipse lesson. A circle in
perspective is an ellipse whose openness follows how far it stands from the
eye line: the drum's bottom rim sits further below your eye than its top, so
the bottom ellipse is always the opener of the two, and raising or kneeling
sweeps both live. Lathed with a small chamfer rather than cut sharp, because
the ink draws lines where a surface turns edge-on - a razor rim never does,
and the ellipse, the entire point of the object, went missing until the rim
was rounded the way every real drum's is.

## Opening

The car is standing on the grid when the tool opens, framed for its size, drawn
in ink, at a 90° field, with the eye level and the six points ruled and nothing
else.

It used to open at 180°, the whole hemisphere, where the four horizon points
land exactly on the edge of the frame and the fifth is at its centre — the
five-point sheet itself rather than an approximation of it. That is still what
the projection is for and it is still one drag of the field away. It is not what
to open on. At 180° every straight edge in the world is visibly bowed, so there
is nothing on the page you can lay a straightedge against and nothing that looks
like the perspective anyone was taught first: someone opening this to learn
perspective was handed the hardest case in the subject before the ordinary one.
At 90° the equidistant sheet is within a pencil-width of straight-line
perspective — and, because the corner of a 16:9 frame then reaches about 52°,
inside `FLAT_LIMIT`, it also drops onto the single flat pass instead of the
six-face cube, so it is sharper and a sixth of the cost. Widen it and you watch
the straight lines bend, which is the lesson, in the order it can be learned.

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
  it, spread to size it, slide to move it. The turn lands on 15° steps whenever
  the snap is on, so 45° — the two-point setup — is hittable by hand
- **Turn from a keyboard** — `[` and `]`, fifteen degrees a press, shift for one.
- **Look by turning the phone** — a toggle in the tools row hands the view's
  heading to the phone's own orientation sensors, smoothed, with drag-to-look
  layered on top for the turn your chair will not make. Hold the phone up and
  your body's turn is the camera's, which is the nearest thing to standing
  inside the scene a browser can offer — position stays on the sticks, since
  no web API tracks where you walk. iOS asks permission on the first tap, as
  it insists on doing; a desktop with no sensor offers the toggle and then
  honestly declines it. Switching off keeps the heading you reached rather
  than snapping back to wherever the last drag left it.
  Two fingers is the gesture and a mouse has one, so on a laptop nothing in the
  scene could be turned at all — which put the lesson the selection's own
  vanishing points exist to teach out of reach on the machine most people will
  open this on
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
  the construction ladder (off, the selection's, everything's), the selection's
  own vanishing points, view lock, the room (tap to step, drag to size), the
  surface of everything, the lights, undo, redo, and save the view as a PNG

The **light** control is the one that changes what it does with the mode. On the
clay it sweeps the page from black to white, as it always did. In ink it sweeps
the *paper* — a warm ramp from a near-black board to white — and the pen is
derived from it rather than chosen: a near-black or a chalk, whichever has more
contrast against the sheet. The two are equal at a relative luminance of 0.179,
which is exactly where a sheet stops being paper and becomes a board, so drag
past that point and the drawing turns to chalk on slate on its own. Paper and
pen are one decision with a constraint on it, and offering them as two controls
would be offering a way to make the mode useless.

**The dock stays up when something is selected**, with the selection bar stacked
above it. It used to hide — and three of the things it hides do nothing *except*
when something is selected: the cage, the selection's own vanishing points, and
the export that would carry them into a picture.

Seven controls plus the glass around them come to 346 px, which is more than the
narrowest screens still in use have: at 320 px the dock was centred over the
window and hung six pixels off each end, so the first control and the last were
half unreachable. Below 360 px they go to 40 px wide with tighter gaps, and the
whole thing comes to 310. Four pixels off one dimension is a worse target than
44; a control you cannot get a thumb on at all is not a target. The height does
not move, and a thumb is wider than it is tall. The two drag readouts stay full
width, since dragging is what they are for. The selection bar solves the same
problem the other way — it scrolls sideways, because it is a list of things you
can do to one object and a list can be as long as it likes.

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

**180°** is the number that matters for a curvilinear study: the four horizon
points land exactly on the edge of the frame and the fifth is dead centre — the
five-point sheet itself, not an approximation of it. It is one drag of the field
away, and it is not where the tool opens; see *Opening*.

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

**Two families and four rays, and nothing else.** Two rays per family: the top
and the bottom of the corner nearest you, each starting on the object, running
out to its point, and stopping there. Four is the number because one is fewer
than the lesson needs — a single line through a thing to a mark is a pointer,
and what perspective actually looks like is *two* lines closing. The near corner
in particular, because then all four rays pass through the same place in space,
so they radiate from one point on the page instead of netting the object from
four sides.

Not the verticals. They have a real point overhead on a curved sheet, and it is
the room's rather than this object's: the construction sheet already rings the
zenith and rules the whole family that meets there, so drawing it again here was
drawing the fifth point twice in two inks — and at 90°, where the zenith is
three and a half frames off the top, it drew it as two pins stuck to the top and
bottom edges pointing at nothing.

Not the whole great circle either. A ray used to run to infinity *both* ways,
which draws the circle the edge lies on rather than the edge — and the far half
converges on the same point carrying no information, at the cost of the whole
width of the page and everything it crosses on the way. It runs one way and
stops.

Which way is "out" is decided by which way the edge **recedes**, not by which
way the camera is pointing. The two agree near the middle of a frame and part
company off to one side of a wide one, where an edge can run away from you while
pointing across your view.

A point that lands off the frame is pinned to the edge rather than dropped —
"off to the left, roughly level with here" is what you need when you are ruling
by hand — but only out to one frame. Past that it is not off to the left, it is
behind your head, and the tick is telling you to rule the wrong way.

**Nothing on a selection is dashed.** The dash was meant to say "this is
construction, not the drawing", and since every mark on the sheet is
construction it was distinguishing nothing from nothing. In the drafting
convention it is borrowed from, a dashed line means a *hidden edge*, which is
not what any of these are. And on a curved sheet it is actively worse than a
line: a curve turning ninety degrees across the frame, chopped five on and six
off, stops reading as one line and starts reading as a field of ticks pointing
in slightly different directions. What says "guide" instead is what a pencil
actually does — lighter weight, one ink, and pressure that dies away as the line
leaves the thing it belongs to. Each ray is drawn in three bands, darkest where
you place it and faintest out where it would otherwise cross the drawing.

### The field of view

The control on the dock is one number — how much of the world the sheet holds,
from a long lens to past a full turn — and the frame decides the shape of it.

How far that number may open is a ladder of its own, in the tools row: **human
sight** stops the drag at 210°, about what two eyes cover, so the whole throw
of the control is spent inside what a standing person could actually see;
**the sphere** is the tool's usual reach, out to where the entire sphere sits
on the page with paper round it; and **endless** unlocks three full turns — in
the cylindrical system the band then *repeats* instead of running out, the
same room again and again along one seam-free frieze, so a study can be set
out on a strip that never ends. Only the cylinder can promise that: its yaw is
periodic by construction. The radial systems keep their edge, which is the
whole sphere on the page. Stepping down onto human sight pulls an open lens
back inside the new range, so the control never reads one thing while the view
does another.
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

### Placed lamps

The sun and the fill say where the big light comes from. **Lamps** say where
the small ones hang, and they are scene objects, not settings — placed from the
model library (the tile left of the cube), selected with a tap, slid along
their own level, lifted, duplicated by another placement, saved with the
composition, exported in the scene file and taken back by undo, exactly like a
box. That is what separates a light *editor* from a light panel.

Held, one offers its own bar: height off the floor, brightness, colour
temperature, its kind, its switch, and the way out. A **bulb** shines every way
at once; a **spot** throws a cone along an aim you drag, and casts its own
shadow. Falloff is physical, so near things are genuinely brighter — which is
the whole lesson a placed light teaches and the thing the sun, at infinity,
cannot show. The mark stays when the light is off or the page is in ink — a
lamp you cannot see is a lamp you cannot move — hanging from a plumb line with
a tick on the floor, so its height reads against the grid like every other
height here.

### Guides, and the floor's two rulings

The guides control steps down through three levels rather than switching on and
off: the ruled sphere, then the eye level and the points alone, then nothing.
The middle rung is where the tool opens and is the one that earns its place —
the eye level and the six points are what you set a drawing up with, and the
ruled sphere behind them is a lesson in what the projection is doing, which is
wanted while you are learning it and not while you are drawing.

**The sheet is ruled in one ink, and in one family.** It used to draw three at
once, in three saturated hues — forty-seven curves in red, green and blue over
the thing you were trying to draw. Two of the three did not survive inspection.
One was ruled on latitude, which gives *parallels*: concentric rings that
converge on nothing, so they were not the image of any set of parallel lines in
the world and there was nothing to rule towards. The second was honest great
circles about the Z axis, but ±Z is whichever way the scene file happened to be
authored, and once you have turned your head it is not an axis of anything you
are drawing.

What is left is the family every upright edge in the world runs along. They meet
overhead and underfoot, and that meeting is the fifth point — the whole thing
the sheet is here to show. The pole fade went with the other two: it erased the
family over a 35° disc centred on the pole, which is to say it deleted the
crowding that *is* the vanishing point and kept the noise everywhere else.

The construction cage goes round **the selection, and only the selection**. It
is the box a thing blocks into, which is the first mark anyone makes when they
draw a figure, and the argument for drawing it round everything standing in the
scene was that you block the whole scene in before you block in one object of
it. True, and it does not survive contact with a scene that has fifteen things
in it: fifteen cages, fifteen footprints, thirty dashed diagonals and fifteen
plumb lines, over the drawing. A box round everything at once is a box round
nothing in particular.

**The ground grid is two switches, one per direction** — the lines running away
from you, and the lines running across. It used to be a rung of the ladder,
which could only ever offer the whole grid, and a floor is not drawn that way:
you lay the receding lines to their point and then you cross them. Either family
alone is the step before a grid; both is a grid; neither is bare ground.

The ground is ruled as a tape measure is: three rulers at once — the step you
snap to, the metre, and the five — each heavier than the last, so distance can
be counted rather than guessed. The two axes through the origin are coloured,
red along X and green along Z, except in ink, where they go to the same ink as
everything else: a red line and a green line running through a pen drawing are
two things you did not draw.

**The finest ruler is a near ruler.** It is spaced at whatever dragging snaps to
— a quarter of a metre by default — and at about twelve metres out that spacing
has fallen below a pixel. Past there it is not a ruler, it is a band of
interference, and it was the densest thing on screen after the sheet. It fades
out between four and twelve metres; you measure with it at your feet, and from
across the room the metre and the five do the work.

### Blocking out

Standing in a real place with the tool in hand, the job is speed: estimate
the forms in the space around you and stand boxes in for them before the
estimate fades. Two things carry it.

**Drawing boxes.** Pick the pencil up in the tools row and a drag on the
ground draws a footprint where the table is; release, and the next drag pulls
its height; release, and the box stands - sized by eye, in two strokes, with
its dimensions reading beside your finger as you draw and the snap applied
throughout. The mode stays armed, so a room is blocked out in a run of
strokes, each box one undo step, each landing selected for the usual handles
to refine.

**The known forms.** The model library carries the dozen numbers a real place
is actually blocked out of: a seat is 0.45, a bed 0.55, a table 0.75, a
counter 0.9, a person 1.75, a door 2.1. One tap stands the true-size box at
the gaze point. Own those numbers and every form in a room can be estimated
off them - a wardrobe is a door and a bit, a desk is a table - and placing
them is how they are learned. The tile glyphs are each form's own proportion;
the number under each is its height, the dimension a standing eye reads
everything against.

### The measure

The pencil at arm's length, as an instrument. Every artist measures the world
the same way — pencil up, one eye shut, thumb slid down the shaft — and what
that gesture actually reads is **visual angle**, the one measure sight has.
"The car is three of its own heights long" is a statement about angles, and
taking it by eye is the skill under every other perspective skill.

Pick the divider up in the tools row and a drag on the scene lays a measure:
two directions from the eye, the angle in degrees written at the line.
Measures pin to the world, so you can lay several and turn to compare them;
they go into an exported picture; putting the instrument down clears the sheet
— a measurement is a reading of the view, never part of the composition.

Each measure is drawn twice, and the gap between the drawings is a lesson no
telling teaches: the **geodesic**, solid — the image of the straight line in
the world between the two marks, which bows on a curved sheet because that is
what straight things genuinely look like across a wide field — and the
**chord**, faint — the ruler-straight line your flat-page schooling insists
on. Near the middle of a narrow view they lie on top of each other, which is
why the belief survives; open the field and watch them part company.

### The row

One press on the selection bar stamps four more of the held thing, marching
along its own facing — the diminution lesson as a gesture. Equal steps on the
ground are shrinking steps on the page, and the rate they shrink at *is* the
perspective; the construction's crossed diagonals are how that spacing is
derived by hand, and the row lays out the answer to check a derivation
against. Turn the thing to aim the row: the avenue, the fence, the queue, the
street of lamps.

### Snap

Dragging lands on free, 5 cm, 25 cm or 1 m, and **the ground grid is ruled at
whatever is chosen** — so what you snap to is what you can see to line things
up against. Eye level sets to the centimetre.

Selecting something raises a second bar above the dock — it does not replace it —
with what you can do to the thing you are holding: **how far away it is**, size,
**lock the size**, lift it off the floor, change its surface, duplicate, export
the mesh at the size you settled on, delete.

The distance is a reading, not a control. Perspective is a relation between
three numbers — how big a thing is, how far away it is, and how high your eye is
— and the tool stated the height here, the eye level on the dock, and computed
the third silently. Past about fifteen metres, which is where foreshortening
starts being the lesson, you could not count your way to it either: the fine
ruler fades by twelve metres and the sheet from seventeen.

Turning is not on the bar — it is
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

The room is a ladder, not a switch: **off, the lines, the lines and the walls**.

The lines are the rung that teaches. Where a wall meets the floor is the most
informative mark in a room — it is the one that says how far away the wall is —
and until this you could not have it without three flat greys standing between
you and your drawing. At that rung the wall surfaces are gone and the ruling
hangs in the air where they would be, writing no depth, so nothing inside the
room is sorted away behind a wall you cannot see.

At the top rung, on the clay, it is the flat value ladder it always was: one
value per orientation, because a box under no lighting has to read as a box. In
ink every face is paper. Ink has no tone in it anywhere else and does not get
one here — what the top rung means on a sheet is "you cannot see through the
walls", which is the more useful distinction anyway.

Dragging the control while the room is off raises the **lines**, not the walls.
You cannot size a room you cannot see, and it is the rung nobody would otherwise
find.

Three decisions are worth writing down.

The floor sits four millimetres under the ground plane rather than on it.
Everything else in the tool that draws the floor — the ruled grid, the plane the
sun's shadows land on — is at exactly zero, and two surfaces at the same height
fight for every pixel between them. And the room's floor face is not ruled at
all: the ground already rules that exact plane, at the snap step as well as the
metre, and fades honestly with distance where this did not, so the two were only
doubling each other's darkness.

There is no lighting. One directional sun outside a closed box leaves the
ceiling and two of the four walls perfectly black, which is true and useless.
These are construction surfaces.

And the ruling is in world coordinates, not the plane's own. A line up the wall
is the continuation of a line across the floor, because both are asking the same
question of the same metre — which is the property that makes the room a
measuring device rather than wallpaper.

## How solid a thing is drawn

Every box and every placed mesh carries its own surface, so a scene can have a
solid car standing inside a wire box on a floor of inked ones. Four rungs,
ordered by how much has been taken away:

- **solid** — as the thing is: a box in plain white, a mesh in the materials its
  file was authored with
- **matte** — opaque, plain white, no texture. Photographed skin and fabric is a
  lot of information to draw past; stripped out, a figure reads as form and
  value only, which is what it is doing in a scene full of white boxes
- **ink** — the light gone too, and only the line left. This is the one the tool
  opens on; it has its own section below
- **brush** — the same drawing with its blacks spotted in. Everything turned
  from the sun floods solid ink, the pen's own lines run in *paper* through the
  fill — drawn around, not painted over — and the cast shadow goes down as a
  near-solid shape. Where ink is the pen underdrawing, this is the finished
  brush page: line and flat black and nothing between, which is the page a
  brush-and-ink spread actually is. Swing the sun and the blacks sweep with it,
  live
- **wire** — the twelve edges and nothing else: the construction with the object
  taken away

There was a fifth, **glass**: translucent and writing no depth, so the far edges
came through the near faces. The argument for it was drawing through — if a
box's hidden corner is in the wrong place then the whole box is, and on an
opaque box there is nothing to check it against. Good argument, answered better
elsewhere. A wire box draws through by construction, and on a mesh, where the
rung was a wash of overlapping translucency rather than a readable interior, ink
already draws the far side's contour wherever the form rolls over. A rung nobody
reaches for is a rung in the way of the next one.

The button on the selection bar steps the one thing you are holding, through the
rungs its own kind has — a box skips matte, being plain white already, and a
mesh skips wire, having no cage to fall back on. The button in the tools row
steps the whole scene at once and stamps everything standing in it, in one
undoable move.

## Ink

The other four rungs answer *what is this object made of*. A perspective study
never asks that. **Ink** answers the only question it does ask — where would the
pen go — and it is what the tool opens on.

It draws three families of line straight out of the surface, per pixel, with no
extra geometry at all. The **contour** is wherever the form turns edge-on to the
eye: on a smooth closed shape that locus *is* the silhouette, and it is also
every interior edge the form rolls over — the far rim of an ear, the inside of a
nostril, the crease of a bent elbow. Outline and inner line are one term, not
two, because geometrically they are one thing seen from one place. The **form
lines** are ruled at even steps of the same quantity and wrap the shape the way
the lines of an engraving do. The **terminator** is the single line where the
light grazes, which says which way the sun is without laying down a wash.

Boxes need none of it. A box's faces are flat, so that quantity is constant
across each one and its derivative is nothing — there is no contour to find and
none is wanted. A box's lines are its twelve edges, which it already carries as
geometry. Ink only lays the paper under them.

**A cast shadow only when it is hard.** The objection was never to shadows; it
was to soft *boundaries*. A penumbra is resampled by the reprojection and again
by the export, so on a sheet you are about to trace there is no telling which
line is an edge of the object and which is the edge of its shadow. A hard shadow
has no penumbra to confuse: it is a shape, and a shape is a thing you can lay a
pen round and fill.

The shadow control steps **off, hard, soft**. Hard is PCF rather than the
unfiltered map — both give the same shape, and the difference is one shadow-map
texel, about 5 mm on the floor here, which PCF spreads into a line and the
unfiltered one steps into a staircase. A line is what you would have drawn. In
ink the fill is light, about 1.4:1 against the paper: the object's own contour
is a full-ink line and a fill near that value would put two drawings on one
page. It fades out entirely as the sheet darkens, because on a blackboard you
draw the lit parts and the shadow is bare board.

With shadows soft or off, ink casts nothing, and things still do not float — the
ground ruling running behind a foot and reappearing the other side pins it
better than a blur does, and says *where* on the floor as well.

An inked object never *receives* a shadow, and that is not an oversight: the ink
material carries no lighting, so there is nothing in it for a shadow to darken,
and a drawing says which side is dark with its terminator rather than with a
wash laid over the form.

**Ink is on paper in both themes**, and the paper is what the light control
sweeps. The theme is for the chrome, which sits in the room you are in; this is
the drawing, and the drawing is what the export writes out at three times the
frame to be printed or dropped into a tablet layer and traced over. Which sheet
you want is yours to choose — but a *white line on a black field* is not what
the dark theme should hand you by default, so the two are separate decisions.

The marks are composited in display space rather than in linear light. Both
colours are linear, and mixing them linearly is what a camera records of a
half-covered pixel — not what ink does to paper: a stroke at forty per cent
coverage came out a 22 per cent grey rather than the 36 the number reads as, so
every line landed a third lighter than asked for. Physically the linear blend is
the correct one. This is a sheet that exists to be traced.

### Why a dot product rather than an edge filter

The obvious way to outline a 3D scene is to compare neighbouring pixels of the
rendered frame — a Sobel over depth and normals. It cannot work here. The scene
is not rendered to the screen; it goes onto the six faces of a cube (or one flat
pass) and a shader re-projects that, so a cube face has no neighbours past its
own border and every one of the twelve seams would gain a false line or lose a
true one. The source's pixels-per-degree also varies two or three times across a
single face, so the weight would breathe and then jump at the seam.

How squarely a surface faces the eye has no such problem: it is a property of
the surface at that point and of where you are standing, not of a framebuffer.
Both vectors live in view space, and a dot product of two vectors turned by the
same matrix is the same number — so all six faces agree exactly. It also costs
nothing to look around in, because the cube is only redrawn when you *move*, and
nothing here depends on which way your head is pointing.

Line weight is specified in pixels of the finished sheet and converted, per
fragment, into pixels of whatever the source happens to be. That is what holds
one pen across a cube face, a flat pass and the 3× export. It is exact in
equidistant, the default; in cylindrical the lines thin towards the top and
bottom, and in stereographic they thicken towards the rim, along with everything
else those projections magnify out there.

The lines that are geometry rather than shader — a box's twelve edges, the
room's, the construction ruled under a selection — could not do that per
fragment, because the library that draws them measures a width against the
canvas, and this app never draws to the canvas. So they were ruled in pixels of
an intermediate nobody sees, and a box got *thinner* the wider the lens opened,
a wide field sampling that intermediate down harder. Measured across 60° to
270°, a box on its own fell from 1.54 px to 1.28 while the ink contour beside it
went 1.85 up to 2.11 — two marks that are the same mark, drifting a quarter of a
pixel apart over the range.

They now carry the same correction, worked out once per draw instead of once per
fragment. The two cases disagree about which way to go: on the flat pass the
answer is within two per cent of one, which is why a fixed width looked right at
ordinary fields and hid this for so long; on the cube it is `4·halfYaw/π`, so the
width has to *grow* as the lens opens. The face size cancels out, which is what
makes it a number rather than a table. The pen is two sheet pixels, which is not
a fitted constant — it is what a silhouette is drawn at, and a box's twelve edges
are its silhouette.

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

**It is written in display light.** three forces a render target's output colour
space to linear for anything that is not an XR target, so the conversion the
live frame gets was a no-op on the export path and only on the export path.
Every PNG this tool wrote before this was in linear light: paper measured
247,244,239 on screen and 237,231,220 in the file, midtones crushed 200 to 147
and 128 to 55, ink mass roughly tripled. It is encoded in the shader rather than
after the readback, so the eight-bit quantisation still happens in display
space; a lookup table applied to the bytes afterwards would band the darks.

The filename says which sheet it was drawn on — `perspective-eye1.60m-90deg-
equidistant-2026-08-08.png`. An equidistant 180 and a stereographic 180 are
different drawings of the same room, and nothing in the pixels says which.

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

A ladder, like the guides: off, the selection's, everything's. The middle rung
is the working default — the cage answers questions about the thing in your
hands, and drawing it round everything *at the same weight* was defensible when
a scene had three things in it and indefensible at fifteen: fifteen equal
cages, thirty diagonals and fifteen plumb lines over the drawing, a box round
everything at once being a box round nothing in particular.

The top rung is that page done properly, because it is how a page is actually
started: every object blocked in before any object is drawn. What makes it
usable where the old always-on version was not is the weight rule a real page
follows — the selection keeps the full voice and everything else drops to an
underdrawing, so the scene is blocked in *and* still has a subject.

- **the box it blocks into** — the first mark anyone makes when they draw a
  figure, and the thing a drawing is measured in
- **the ground it stands on** — where its footprint meets the floor, to be lined
  up against the grid
- **the diagonals of that footprint** — crossed, they mark its true centre *in
  perspective*, which is not the middle of the drawn rectangle and is how a
  receding row is halved and doubled without measuring anything
- **the crossing itself**, marked. Every other mark here confirms geometry you
  already have; the diagonals *derive* geometry you do not, and ruling the
  working while leaving the answer for the eye to find stops one step short
- **the plumb line** — up through the middle and a little past the top, which is
  what a figure's height and balance are read against. A share of the object's
  own height rather than a flat two metres, which on a half-metre box was a mark
  five times the height of the thing it belonged to

A box gets exactly the same four marks a mesh does, on the same switch. It used
to draw two of its own regardless of that switch, and one of them was a tinted
plane rather than a line — a tone, which is the one thing a line drawing cannot
carry and the one thing you cannot trace — and 40 cm larger than the box in both
directions, so lining it up against the grid lined up the wrong rectangle.

All of it in one ink, and none of it dashed, for the reasons under *the
selection's own points*. It follows the page: the construction red on the clay,
where it has to carry across a lit grey scene, and the same warm grey as the
rest of the construction in ink. The whole of it switches off from the tools
row, since the construction of the things and the construction of the room are
wanted at different times — which is also why the room has a switch of its own.

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
where a point in the world is on the glass, in each of the three projections. It
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
