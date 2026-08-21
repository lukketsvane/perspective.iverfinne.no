# Perspective

A first-person perspective reference tool. Real objects at real sizes on a
metric ground grid, seen from a human eye level, in straight-line or
curvilinear projection — set up a view, then draw from it.

The interface has no words in it. Everything is the scene, a mark, or a number
of metres, and it is meant to be legible without reading.

## The library

One character and the metre she is measured against. The shelf was six times
this size and has been cut twice, and both cuts are the point.

The first took out two chairs, a car, four horses, a platypus, three crowded
studies of fifteen figures each — twenty megabytes of things that were on it
because they were interesting rather than because a drawing needed them. What
survived was one subject and the yard around it: a **Hughes H-1** at nineteen
megabytes, the four men who worked on it, and three astronauts built openly out
of spheres and capsules, which is how a figure is blocked in before it is
anybody.

The second took *those*, and it is the harder cut to argue for, because every
one of them was good. The racer was the best hard drawing in the library and
the only solid of revolution on it — a fuselage tapering in two directions at
once, wings that are one aerofoil swept and stretched, a cross-section no box
construction predicts. The crew were real anatomy at real sizes, four poses of
which no two were the same drawing problem.

The argument against them is not quality. A shelf is a claim about who the tool
is for, and a shelf carrying three separate casts makes three claims at once: a
viewer met an aeroplane mechanic at the front door, a jetpacked cartoon on the
sixth card and a hare on the seventh, and had to work out for themselves which
of them was the measuring stick. One body, in every attitude a drawing needs,
says it without being said. It also took twenty-eight megabytes off the shelf
and left two and a half.

**Perspektivharen** is fourteen poses of one character, and the only thing on
this shelf that belongs to the tool rather than to whoever made it. Everything
that used to stand here was found and cut to size, and that showed in what it
could be asked to do — four men who work on an aeroplane and three
demonstrations of an armature, and not one of them *anybody*. A hare in a
bunny-eared suit who is waving at you when the tool opens, who turns up on the
fifth card and the seventh and the seventeenth, and who is sitting beside the
cube you are left drawing at the end, is something else — the person the lesson
is addressed to, and therefore the measuring stick, which has to be one
recognisable body or it is only more furniture standing about.

**A hundred and seventy centimetres, sole to crown, all fourteen** — and that is
not the number the files measure. The ears go a good twenty centimetres past the
top of the head, so a standing hare's box is 1.88 to 1.94 tall and its *head* is
at 1.70. None of them carries a height: the size is baked into the file.
The gap between the two numbers is not a rounding error either; it is a thing
the lesson uses. The deck stands you at 1.70, so the horizon lands on the
crown of every standing hare in the frame, near one and far one alike, with the
ears over the line — while the tool's own default eye is 1.9, a tall standing
one, so at the front door the line sits a hand's width *above* her head. That is
not a contradiction; it is the reading the fifth card teaches. The line is your
height, and where it crosses somebody says how much taller or shorter than you
they are.

Which is the second thing they are for. In metres to the crown they run
1.70 / 1.70 / 1.70 / 1.66 / 1.68 standing, 1.64 and 1.66 mid-jump, 1.49
running, 1.23 crouched, 1.13 kneeling, 1.10 / 1.13 / 0.96 sitting, and 0.65 tall
by 1.79 long flat out. A body you know the height of, in seven attitudes you
also know the height of, is a ruler you can lay against anything: a seated
person's head is two thirds of a standing one's, and nobody who has drawn that
once has to be told it again.

**Five of them stand**, and that is the one count on this shelf that is not
about drawing problems. Every other rule here says no two poses may be the same
problem, and five standing hares are five copies of one. They are here because a
*flock* is a card — a dozen figures at a dozen distances with one line landing
in the same place on every one of them, which is the most useful sentence in
perspective said with bodies instead of posts. A flock built from one model is
not a flock, it is a texture, and the eye reads the repetition instead of the
rule. Folded arms, hands on hips, a raised thumb, a wave and nothing at all is a
crowd. The other nine are the usual argument: two jumps with everything in the
air, a run with the weight nowhere, a crouch and a kneel that fold a whole body
into a metre, three ways of sitting that put the legs at three angles to the
eye, and one flat out with the feet towards you.

Three of them are **off the ground**, which is what `lift` on a library entry is
for: everything the loader puts down is grounded on its own lowest point, which
is right for anything standing and wrong for a jump, whose lowest point is a
boot — grounding one stands the leap on that boot and the leap becomes a man on
tiptoe. A third of a metre is what an ordinary head gains at the top of an
ordinary hop, so each jump is lifted until its crown reaches 2.0. The run is not
that arithmetic and does not get it: a runner's crown is low because the body is
folded forward, not because it is down, so what it needs is a stride's ground
clearance, about a hand's width.

They cost 190 KB apiece and 2.6 MB for all fourteen — an eighth of what the
racer weighed on its own — at ten thousand triangles each, one flat grey material, and no maps
whatsoever, so they are the cheapest things here to draw as well as to fetch.
Twelve arrived facing +X, one facing −X and one facing −Z; the turns are baked
into the files, and a quarter turn about Y is a swap and a sign in floating
point, so not one vertex was resampled to do it.

Everything else in the library is yours. The tile beside the reference cube
takes a file, and what comes in is both placed and **kept** — listed with the
shelf from then on, in this browser, so a mesh is imported once and placed as
often as the drawing wants. An import used to be a one-off: it stood in the
scene, it was saved with it, and placing it a second time meant finding it on
disk again.

An import goes on the **front** of the shelf, newest first, ahead of everything
that ships with the tool. The shelf is one row you push sideways, so its far end
is the expensive place to be — and that is exactly where a file you had just
walked to the picker for used to land, behind a dozen tiles you did not ask for.

Taking something off the shelf does not put the shelf away, either. It used to,
on every tile, which made blocking a scene a loop of open, scroll, tap, open,
scroll, tap. Building a scene is placing several things, not one. It closes when
you close it.

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

Two things are standing there when the tool opens, under the real sky at noon:
**a figure waving at you, and a metre cube beside her**, turned nearly a
quarter off the grid so it carries a pair of points of its own. That is the
whole door.

It has been three doors. It was the **racer and its yard** first — one
beautiful object, framed, which taught scale and taught nothing else until you
walked. Then it was a **street**: two rows of metre cubes running their edges
to one point, a tower in each row, three lamps repeating down the left side, a
figure walking out of it at 1.80 with the horizon through his face, a second
hovering deeper at 1.15 with the line over his helmet, a crewman kneeling at
work by the first corner, and the turned box in the roadway. Everything the
tool teaches was in the frame before anything was tapped, and every word of
that argument was true.

It was also a **demonstration, and a demonstration has to be read**. Somebody
who has never met a vanishing point sees a car park. The gaps compress and the
lamps measure the depth and the turned box refuses the street's points — and
not one of those facts announces itself to a person who does not already have
the words for it. They are the *answers* to the deck, standing in the doorway
before the questions have been asked.

What a character and a cube say instead is one thing, and everybody reads it
without being told: *that* is how big a person is, *this* is how big a metre
is, and here they are side by side. Which is the sentence the whole tool is
built on — a scene is right when the sizes are right — and it is the one thing
the street could not say, because a street has nothing in it you already know
the size of. It is also the reading the lesson's second act spends six cards
on, waiting in the hall.

The street is not gone. It is a card in the deck and one of the eleven
arrangements the shelf deals, which is where an exercise belongs: something you
ask for when you want to draw it, rather than something standing in the hall.
The drawn pages are all one rung-tap away and the deck goes on dealing them in
the gaps; what the front door shows is what those pages are *of*.

It opened for years on the brush page on black — line and spotted black, hard
light, black mount — and the paragraphs below are that reasoning, kept because
every argument in them still holds for the page itself; it is now the deck's
first card rather than the door. What moved is only which face wins the
door: a first visit reads a photographic noon instantly and a white-on-black
ink plate only after it reads the tool, and the tool should not need reading
first. The guides start folded away for the same reason - a thick red
eye-line across a blue sky is debug chrome to anyone who has not met the
ruling yet - and come back with one tap, or with the lesson, which raises its
own per card.

That brush page is three separate decisions and it is worth saying which. The
**brush** rung rather than plain ink, because line-and-flat-black is what a
brush-and-ink page looks like and it is the one that shows what the tool can do
rather than the one with the least in it. **Hard** shadows rather than soft,
because a hard shadow is a shape you can draw and a penumbra is a thing you can
only approximate — the rung the whole shadow argument below lands on, so it is
the one to start on. And the **page black** while the drawing stays on its warm
paper, which needs its own paragraph.

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

**The stand is fixed, not solved.** You open a conversation's distance from
her, half a step off the axis so the two read as things beside each other
rather than one behind the other, at a standing eye. The one-object opening
needed a framing solve — two transcendental conditions searched to a
centimetre, a reframe listener for the phone turning, a whole apparatus for
standing the right distance from one aeroplane — and neither the street nor
this needed any of it: two things at a known distance hold their view in
either orientation without arithmetic. The solve went out with the object it
was built around.

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
- **Stand it in the room you are in** — the AR control in the panel; its own
  section below
- **Look by turning the phone** — a toggle in the panel hands the view's
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
- **Undo** — ⌘Z / Ctrl-Z; **redo** ⇧⌘Z, or the two arrows on the dock
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

### A hand of several: tap, then hold

**Tap selects one. Hold takes another one as well** — press on a second thing
for about half a second and it joins what is already in your hand; hold it
again to put it back down; tap anywhere to go back to holding one. There is no
modifier key on a phone and no room for a mode button, and a mode button is the
wrong shape anyway: picking four things out of a scene is four gestures, not a
switch and four gestures and a switch back.

Everything held is outlined, and the selection bar grows a count in the accent
so the row of controls beside it cannot quietly be doing four times what it
looks like it is doing. From there:

- **the numbers are read off one and written to all** — the height, the size of
  an axis, the height off the floor. Which one they are read from is the one
  the tap chose, since there is only one row of digits; what a viewer means by
  dragging the height with four figures held is that the four of them end up
  the same height
- **the rung and the page's own knobs** go to all of them, which is the reason
  most people will reach for this at all
- **a drag moves the lot**, by the primary's own snapped delta rather than each
  snapping to the ruling separately — four things placed against each other are
  an arrangement, and an arrangement re-snapped per object is one pulled apart
  by the act of moving it
- **two fingers turn and size the lot**, each about itself rather than about the
  group: this tool's turning lesson is that a form turned off the grid sends
  its *own* pair of points somewhere else, and a rigid body swinging round a
  common pivot would teach the opposite
- **delete takes the whole hand in one step back**, because undoing a delete of
  four things is one thought

The one that was tapped stays the primary throughout: it is what a drag moves,
what the bar reads from, and whose rung decides which knobs the material panel
shows. The rest are carried.

## The dock

Along the bottom, fading out a few seconds after the last touch and back on the
next one — as does the selection bar, which is the same kind of chrome over the
same view. The point of the tool is the picture you set up and then draw from,
and chrome that will not get out of the way is a window with a sticker on it.
The timer lives outside both of them, in `lib/rail.ts`, since they are different
components in different parts of the tree and there is only one idea of "the
chrome is wanted" between them.

**The dock is the verbs, and only the verbs.** Eight seats:

- **Cube** — the mesh library: a lamp, a 1 m reference cube, the block-out
  pencil, the way in for your own files, then the objects and figures
- **Frames** — the scene library: your projects, and the plus that starts
  another one
- **Field of view** — drag for any value, tap to step through presets, the last
  of which stands back far enough to see the whole sheet
- **Horizon** — eye level, from 0.2 m to 12 m
- **Guides** — the world's own construction, stepped by tapping: nothing, the
  horizon and the five points, then the whole ruled sphere
- **Undo** and **redo** — properly disabled at the ends of the stack rather than
  dimmed and still live
- **Sliders** — the panel of everything else, in four bands

The test for a seat is how often a thing is reached for *mid-drawing* rather
than between drawings. Undo is the second half of every gesture that went wrong,
and its whole value is that it costs nothing — two taps and a flyout in the way
is enough to make a mis-drag something you live with instead, which is a tool
teaching you to be careful rather than to try things. The guides are the same
shape of thing for a tool whose subject *is* perspective: rule the sheet, read
the form against it, put it away, rule it again is a rhythm of taps, and it
spent a while two taps deep in a menu of settings.

Two modes left this row rather than joining it. The **block-out pencil** is on
the mesh shelf, one tap behind the cube, beside the reference cube it is the
by-eye version of; the **measure** is in the panel band about where the scene is
seen from, which is what a visual angle is a reading of. Both were the only
things down here that arm a mode rather than do something.

What went the other way is everything that is a *setting*: the projection and
the sheet tone down into the panel. You pick a projection once and draw for an
hour inside it. The scene library went with them for a while and came back —
keeping and reopening a project is not a setting, it is how every session starts
and ends.

**The panel, in four bands**, hairline-separated and hung from one left edge:
what is drawn on the ground (the floor's two rulings, the floor itself, snap,
the construction ladder); what the picture is made of (the surface,
its settings, the sheet, the page, the lamps); where it is seen from (standing
it in the real room, the projection, the lens reach, the room, the measure,
looking by turning the phone, and a photograph under it); and the session (save the view as a PNG, and the
lesson). Sixteen identical circles wrapping into whatever rows the
width happened to give was a wall rather than a menu — nothing sat near anything
it was related to, and which row a control landed in changed with the phone. A
band is scanned in one movement and keeps its company at every width.

### A page of cubes to draw

The exercise this whole tool grew out of is a page of unit cubes hanging in
space, all square to the same three axes, ruled to the same six vanishing
points. It is the scales of perspective drawing: everything harder is a cube
with something wrapped round it, and anybody who can put a convincing cube
anywhere on a curved sheet can put anything anywhere.

What makes it an exercise rather than a doodle is that **every cube shares the
same points**. One cube drawn well is a lucky guess; twenty drawn to the same
six points is a construction you either understand or do not, and the page tells
you which within about four cubes.

One tile on the model shelf, beside the single reference cube, deals one of
eleven arrangements:

| | |
| --- | --- |
| **Swarm** | the classic page — every question at once, and therefore the last one worth doing |
| **Rank** | one direction, nothing else to think about; an error is a cube out of the queue |
| **Street** | two ranks facing each other: the first field using both horizontal points at once |
| **Tower** | straight up past the zenith — the family a flat sheet keeps parallel and every curved sheet bends |
| **Lattice** | three families, evenly spaced, so a cube in the wrong place is *visibly* in the wrong place |
| **Steps** | a staircase, whose diagonal is not a family at all but the sum of two |
| **Ring** | at eye level around you, so a third of it is behind you — undrawable on a flat sheet, not badly, *at all* |
| **Shoal** | nothing touching anything: only the six points to measure against |
| **Ladder** | one line at doubling distances, halving on the page — a rate you can check with a thumbnail |
| **Flock** | every cube at one height — the only field whose property is about the *horizon* rather than the points |
| **Loose** | every cube turned individually. Six points become forty and none are marked. The hard one, labelled as hard. |

**Eleven arrangements, not eleven random seeds.** A truly random scatter is a
worse exercise than any of these, and worse in a specific way: it has no
*property* to check your drawing against. Each of these asks a different
question, and the scatter — which is the classic page, and is here — asks all of
them at once, which makes it the last one worth doing rather than the first.

**And each of them says what it is asking.** The arrangements were always
questions and the file had been saying so to itself in comments since the day it
was written; the tile that dealt them said nothing at all, so what arrived on the
floor was a heap of cubes and a free mode, and a page you cannot mark is a page
you cannot get better at. Two lines now come up in the band above the drawing
for eight seconds — the arrangement's name, and the property to check when it is
finished. *Every cube must line up along one direction.* *Each one about half
the height of the one before — hold a thumb up and check.* *The horizon must cut
every cube in the same place, near or far.* Not how to draw it: what has to be
true of it afterwards, which is the only thing that lets somebody mark their own
page. It leaves on a timer rather than on a tap, because a task you have to
dismiss is a dialog.

The **Flock** is the eleventh and the one that follows straight on from the
lesson's eye-level act: nine of the ten above can be drawn correctly by somebody
who has understood the six points and never thought about the eye line, and this
one cannot be drawn at all without it. Its cubes sit at 1.15 rather than level
with the eye — level with the eye is the arrangement the lesson uses to show
that a form *on* the line cannot be read at all, and a whole page of unreadable
cubes is a trick rather than an exercise. A shade under puts the line across
every one of them near the top and leaves every top face open by the same
sliver, so any cube whose top is wider or narrower than its neighbours' is at
the wrong height however good its corners are.

The positions are worked out rather than written down, but worked out the same
way every time: the jitter is a hash of each cube's own index, so a field looks
scattered and *is* fixed. Deal the swarm twice and it is the same swarm, which
is what makes it possible to draw it, put it away, and come back to see whether
you have got better. It never deals the field you are already drawing.

Two details that took tuning and are the difference between a page and a mess.
The fields sit between about **2 and 12 metres** — the first draft ran from 3 to
26 and produced specks along the horizon, which is correct arithmetic and a
useless exercise, because the tool opens at 210° and a metre cube at ten metres
is a thumbnail. And stacked cubes are given **a quarter-metre of air**: at
exactly a metre they touch, and a column of touching cubes is not a column of
cubes, it is a prism with lines drawn on it — a different and much easier thing
to draw.

It replaces what is standing there rather than adding to it, because a practice
field with last session's chair in the middle of it is neither the exercise nor
the composition — and it takes a history step, so one undo puts the scene back.
Nothing about the view is touched: not the lens, not the sheet, not the
projection, not where you are standing. The whole point is to draw the same
field on several sheets.

### The lesson

This tool exists because of a thing draughtsmen do and almost nobody explains:
rule a sphere on a blank page, then draw a room full of cubes onto it, freehand,
in five point. Everything else here was built to make that reachable. What was
missing is the thing the demonstrations do not contain: **why it works**.

**One idea, thirty-two cards.** Almost every perspective tutorial teaches one, two
and three point as three separate recipes and then presents four and five point
as exotica. That is not what they are, and teaching it that way is why so few
people can draw the later ones:

> Stand still. Everything you can see lies in a **direction**. The set of all
> directions is a **sphere** around your eye. A family of parallel lines shares
> one direction, so it vanishes at the **two** points where that direction
> pierces the sphere. A cube has three families, so it has **six** points,
> always, whichever way you are facing.
>
> A sphere of directions is not a picture yet, so the rays have to be **caught
> on a surface**, and which surface you pick *is* which system you get: a flat
> sheet gives one, two or three point; a cylinder gives four; the sphere itself
> gives five.

Then one, two, three, four and five point are not five systems. They are one
system seen through five different amounts of paper, and the number in the name
is simply how many of the six a given sheet can show you. Every card is a
consequence of that.

**And one act is not.** Between the sphere and the points there are six cards
about the horizon, because the most useful sentence in perspective is one almost
nobody is shown a proof of: *the horizon sits at your own eye height, so
anything in the world that is also that height is cut by it — and cut at the
same place three metres away and forty*. Four posts of exactly eye height,
scattered near and far, and the line lands on every top. Then a desk, a child, a
car and a door, whose heights you already know in your body, read straight off
where the line crosses them — and among them the hare, whose crown the line
lands exactly on, because she is 1.70 and so is the eye. Then the eye slides from a crouch to a stretch with
nothing on the floor moving, which is the only way to stop somebody putting the
horizon in the middle of every page they ever draw — and on the way it shows
that a top face closes up as it rises to the line and is gone *at* it.

Then the same three facts again, **with bodies instead of boxes**, because that
is the form an illustrator actually uses them in. A flock of hares at a dozen
depths, all 1.70, walked into rather than watched — the near ones sweeping past
your shoulder, the far ones barely growing, and the line glued to every crown
throughout. Then three of them up on a platform, cut at the knee, which is the
clause the rule is always taught without: it cuts everything your own height
*standing on the same floor as you*, and the moment a drawing has one step in it
the naive version starts producing figures that float. Then two equal boxes near
and far, cut at the same fraction of their height — the rule run backwards,
which is the version you draw with: one measurement taken once gives every copy
of a thing at every depth on the page.

That is the whole of what a beginner actually needs before the vanishing points
mean anything, and it is what makes the tool's metres worth having: a scene is
right when the sizes are right, and the sizes are right when they are read off
the horizon rather than guessed.

| | |
| --- | --- |
| **Ei kule av retningar** | the sphere, ruled, with nothing standing on it |
| **Snu deg heilt rundt** | *do it*: look for an edge on the sphere, and find there is none |
| **Kva fangar du kula på?** | the same scene, same spot, stepping plane → cylinder → sphere |
| **Hovudpunktet og horisonten** | *do it*: turn, and see which two marks refuse to move |
| **Alt i di eiga høgd** | *do it*: four posts of exactly your own height, five metres out and forty — the line cuts every one of them at the top |
| **Linja er ein målestokk** | a desk, a car, a door — and the hare, whose crown *is* the line: read their heights off where it crosses them |
| **Auget flyttar seg med deg** | the eye slides from a crouch to a stretch while nothing on the floor moves |
| **Heile flokken på ein gong** | *do it*: walk into a crowd of hares at a dozen depths and watch the line hold every crown |
| **Dei som står høgare** | three of them up on a platform, cut at the knee: the rule is about floors, not about people |
| **Storleik ut av staden** | two equal boxes near and far, cut at the same fraction — the rule run backwards |
| **Parallelle linjer møtest** | a rank of cubes, and *why* the point exists — as a limit, not a rule |
| **Punktet flyttar seg ikkje** | *do it*: walk, and watch the point refuse to move |
| **Djupna kryp saman** | metre-equal steps in the world, shrinking steps on the sheet — and the too-deep mistake |
| **Kvart knippe har to punkt** | *do it*: turn right round and find the other one |
| **Eitt punkt** | cube square on; two families parallel to the sheet |
| **To punkt** | *do it*: turn your head — the cube is untouched and now has two |
| **Tre punkt** | *do it*: look up; the verticals gather too |
| **Kvar kasse sitt eige par** | *do it*: put a finger on one box, then another, and watch the pair leap along the horizon |
| **Ingenting av dette er kassa** | the card that collects the three before it |
| **Rampa har sine eigne** | *do it*: a family that climbs has its pair off the eye line — the one thing a floor of boxes cannot show |
| **Sideflata krympar** | two equal cubes at one distance: the one sitting on its own point has no side to draw |
| **Det flate arket tek slutt** | *do it*: open the lens yourself and watch the corners go |
| **Fire punkt** | bend one axis; the horizon becomes a circle |
| **Fem punkt** | bend both; zenith and nadir arrive |
| **Ei kasse har seks** | *do it*: turn slowly and count the ringed points |
| **Namna dei andre brukar** | the same six ideas under the names the books use — the bill for the plain words |
| **Rul arket fyrst** | the 15° meridians, and what you sight against them |
| **Sikt langs kurvene** | *do it*: follow one upright edge round and watch it hold its meridian |
| **Kubus eller langkasse?** | *do it*: a cube and a long box drawn as one rectangle, and the turn that tells them apart |
| **Kvar krysset står** | *do it*: turn until the street leaves the principal point, and watch the corner pay for it |
| **Det same, om att** | a colonnade and a flock: repetition is the ruler that is part of the subject |
| **Teikn ei sjølv** | the pencil, on the sheet you have just been given — and five things to draw on it |

**Fifteen of the thirty-two are done by you, not shown to you.** The first draft ran
the whole thing as a performance, and it was a film — correct, watchable, and
*agreed with* rather than learned. You do not learn that the verticals gather by
watching them gather. You learn it by looking up yourself, with your own thumb
on the glass, and seeing it happen because you did it.

So the director stages each card and then lets go. `hands: 'viewer'` stops the
loop writing to the camera at all; a **gate** measures what you do instead —
turned, pitched, walked, the lens opened, or, on the card about a floor of boxes
all turned differently, *how many different things you have taken hold of*,
because a gate counting how far you swung your arm would pass without you having
chosen anything — and a hairline under the card fills as you go. When you have done it, a sentence appears that was not there
before: the one that says what just happened. *That* sentence is the point of
the card, and everything above it is setup.

The measuring is cumulative rather than absolute — how far you have turned
altogether, not how far you ended up from where you started — because "turn all
the way round" is answered by going round, and somebody who overshoots and comes
back has still been round. **Neste is never disabled**: a viewer who cannot make
the gesture must always be able to go on; it simply stops being the accented
thing until the picture has answered — and now they can always go back, too.

Ten director cards carry an answer with no gate to pass — the sheets slideshow,
the ruler, the posture sweep, the shrinking steps, the platform, the fraction
read off two boxes, the closing side face, the glossary, the colonnade and the
handover — and theirs arrives on the reading clock instead: one full cycle for a
sweep, a beat of looking for a still card. The sentence is still earned; the earning is just
done with the eyes.

The best of them is **Punktet flyttar seg ikkje**, and it is a fact almost nobody
is taught. Walk, and every cube in the rank slides across the page while the
point they aim at does not move at all. A vanishing point belongs to a
*direction* — not to a set of lines and not to a place — which is the whole
reason it is a usable tool, because it means the six points of a scene are fixed
by which way you are facing and nothing else. Told, that sounds obvious and is
not believed. Walked, it is startling.

**And it is slow.** Every sweep that is still automatic runs about twice as long
as it first did, and every move between cards takes nearly two seconds. A
transformation you can follow is worth four you can only notice — and the
fifteen interactive cards have no clock on them at all, so most of the lesson
runs at whatever pace you set.

**There is no card, and that is the point.** The first two drafts put the lesson
in the same glass panel every other sheet uses: a rounded slab with a border, two
pill buttons and a row of eighteen dots. It read as a *dialog over an app*, which is
exactly what it is not, and a dialog is a thing you dismiss. It made the most
considered part of this tool feel like the most skippable.

So the words sit **on the picture**, over a wash of the page's own tone that
fades to nothing before the middle of the screen, and the picture runs to every
edge. One idea at a time, large, arriving rather than appearing. Tap the words to
go on: that is the whole interface.

Each thing that went, went for a reason. The border and the fill, because they
drew a box round words that are on a photograph. The two pills, because a row of
buttons is a form. The eighteen dots, because that is a progress bar pretending
to be jewellery — it is a hairline across the top of the screen now, which is
what it always was. And **"Hopp over"**, because an escape hatch in the corner of
the frame is an invitation to use it. It is still leavable, and has to be: the
way out is one unlabelled mark in the far corner at a third of an opacity. The
difference between that and a pill marked *skip* is the difference between a door
and a sign pointing at a door.

**One thing came back, at thirty-two cards: a way backwards.** Tapping the words
only ever went one way, which at eighteen cards was survivable and at thirty-two
is not — the commonest thing anybody does with a deck this long is tap through an
answer half-read, and a lesson you can only leave and restart to see a sentence
again is a lesson nobody sees that sentence in. It is an arrow beside the cross,
at the cross's own weight: the same *kind* of thing as the mark it stands next
to, a small dim unlabelled way of not going forward, so the corner reads as one
quiet pair rather than a toolbar growing. It is absent on the first card rather
than dimmed, because a disabled control is a thing you try and are refused by.

And **an answer, once earned, stays earned.** Step back into a card you have
already opened and its found sentence is there waiting, not stripped off to be
worked for a second time. The sentence is earned once; the arrow exists for
people who want to read it twice.

**Five acts, with titles.** Thirty-two cards in a row is a list, and a list has no
shape: at card eleven nobody knows whether they are near the end. **Kula**,
**Auget**, **Punkta**, **Arka**, **Handa** — each held large over a dimmed picture for two
and a half seconds, naming the one thing its cards are about. It is the only
full-screen moment in the app and the only place a single word is the whole
picture, which is what makes it worth the seconds it costs.

**It is performed rather than illustrated.** No diagrams, because the app is
already the diagram — it has the four projections, the ruled sphere, a family
of parallels you can watch converge, and a cube whose own points it will rule
for you. So the lesson *takes the controls*: the field, the sheet, where you
stand, which way you look, what is standing on the floor, and works them while
the card says what is happening. Every diagram in a perspective book is a lie of
omission — it shows the end of a transformation and asks you to believe the
middle — and the three facts this lesson exists to teach are all about the
middle. The second point **walking** onto the page as you turn. The corners of a
flat sheet **stretching** as the lens opens. The verticals **gathering** as you
look up. The horizon **staying** on every crown in a crowd while you walk into
it. A ramp's pair **leaving** the eye line. There is no picture of any of those;
there is only the thing happening.

Three of the cards therefore sit still while the world moves under them, back
and forth on a raised cosine so the turn has no jerk at either end — that being
what a head does.

**What it promises to give back.** It takes one snapshot on the way in — the
scene, the meshes, the lamps, the sheet, the field, the guides, where you were
standing — and puts every bit of it back on the way out, *including* when you
walk out in the middle. That is the case that matters: it is what somebody does
when they are bored, and finding your work gone is how a tool loses somebody for
good.

Reaching the end means the opposite, and exits differently. The last card's
whole subject is that you now *have* the sheet — ruled, at five point, with a
cube on it and its own six points showing — so finishing hands it over with the
block-out pencil in it rather than sweeping it away and giving back the blank
page you arrived with. **And it sets a task**, which the first version did not:
"now the sheet is yours" is a true and useless thing to say to somebody who has
just been shown thirty-one pictures and has never made one. So the answer names
the five arrangements the shelf will deal — a street, a staircase, a ladder that
halves at each doubling, a flock at your own height, and the swarm that asks
everything at once — and the photograph, for the one exercise that has to be
your own room rather than anybody's cubes. The SHEET is what stays, though, not the stage: the
scene and where you stood come back from before the lesson, because the first
version kept the last card's stand while restoring the scene, and back when the
door was an aeroplane the returning fuselage arrived through your view from
three metres — the lesson ended inside it, with the practice cube standing in
its tail. Now it ends where it began: the same floor, from the same spot, on
the page you have just learned to read, pencil in hand.

And the dock goes down while a card is up, and **stays** down. A lesson is a
performance, and a performance with a toolbar over it is a screenshot of a menu.
Putting it away was not enough, because of what the cards ask for: the first one
says drag on the picture and turn all the way round, a drag is a touch, and a
touch used to bring the whole dock straight back up over the card telling you to
drag. So the chrome can be held *down* as well as up (`muteRail` in
`lib/rail.ts`), and it goes inert as well as invisible — a thumb dragging along
the bottom of the picture cannot press a button it can no longer see. The two
cards that are *about* a control let go for their turn, and the whole thing is
handed back when the lesson ends.

**A first visit is offered it, once.** One line above the dock — *Kva er
perspektiv?* — with a cross beside it. Tap the line and the lesson starts; tap
the cross and it never appears again; either way the offer is spent and the app
never mentions it unasked again. It holds the chrome up while it stands, which
is not fussiness: the dock fades six seconds after the last touch, and a
first-time viewer looking at the picture for ten seconds — the correct thing to
do with it — watched the one line telling them the lesson exists fade out before
they had read it. Measured, that is exactly what happened. And it stands aside
while the shelf or a panel is up — they open in the same band, straight over
it, and the offer's own text ghosting through the shelf's glass tiles was the
first thing a phone-sized walkthrough of a fresh visit turned up.

**There used to be a guided tour beside it**, and it is gone. It was nine cards
that rang a button and waited for it to be pressed, so a first-time viewer knew
what was on screen. Two things took its job: holding any control now says what
it is, which is the same answer available at the moment you want it rather than
once on the way in; and the lesson took over the teaching. What was left was two
cards at the top of the screen each waiting for a different drag — a viewer who
tapped the lesson while the tour was still running got both at once, with the
tour's dashed walk zone ruled across the lesson's own text. Nothing is offered
on the way in any more. The lesson is a thing you ask for.

### Hold a control, and it says what it is

Nothing in this tool carries visible text — there is no room for eight captions
on a phone, a label under a control is read once and never again, and the shape
is what you learn. That has one honest cost: three weeks later, the difference
between the sphere and the endless band is a glyph you half remember.

**So hold any control and its name appears above it**, two or three words, in the
same language the lesson is written in. Let go and it is gone — and the control
does not fire, because reading what something is must never be the same gesture
as doing it. Holding *clear the scene* to remember what it does and losing the
scene is the exact opposite of an answer, so the click is swallowed in the
capture phase and the handful of controls that act on pointer-up rather than
click ask whether a hint is up before they act. A press that moves is a drag and cancels
the hint on the way, since half the controls here are dragged and a slow drag
starts with a finger sitting still.

It is **one listener for forty buttons**, keyed on the `aria-label` each of them
already carries — the same names the lesson reaches by and the harness clicks by,
so there is no second register of names to keep in step. A control added tomorrow
gets a hint by being named, which it has to be anyway. Labels that carry a live
value (`Snap to 0.25 m`, `Floor: 128 of 255…`) are matched by their stem, longest
key first.

Always on, rather than something a mode switches on. The question this answers is
one you have long after your first visit, and a gesture that only works inside a
mode you have already left is a gesture nobody finds. It is also why the guided
tour could go: this says the same thing, about every control rather than nine,
at the moment you are actually asking.

**Turned sideways, the dock splits in two.** A phone held in landscape is held
in *two hands*, and the two places a thumb actually rests are the bottom
corners — not the middle of the bottom edge, which is where the row sat and
which is also directly under the subject of the drawing. Below 560 px of window
height the eight controls become two clusters anchored to the two corners, and
the whole centre of the frame comes back: measured on an 844 × 390 phone, 414 px
of clear gap between them. The clusters are `display: contents` in portrait,
which removes their boxes entirely and lets all eight children lay themselves
out as the single row they have always been — one wrapper, no second layout.

**And every panel hangs from the right there.** Centred, a panel opened from the
right-hand thumb cluster came up somewhere else — and on a landscape phone
"somewhere else" is most of a hand's width away, so the control you pressed and
the controls it revealed were nowhere near each other. Hung right, a panel opens
directly above the button that opened it, all four occupants of the slot share
one edge, and the narrow ones (the lights, the page's own knobs) leave the left
two thirds of the frame — the part the drawing is in — clear. Upright it stays
centred: there is one dock there, in the middle, and a panel pinned to one side
of a 390 px screen would be lopsided for nothing.

**Turned sideways, the whole panel turns with it.** A phone on its side has
about 390 px of height and something like 850 of width. Four stacked bands plus
the dock plus the selection bar came to more than half that height, over the
middle of the frame — which is the one part of it the drawing is actually in.
Nothing was wrong with the panel except that it was laid out for the wrong
axis: below 560 px of window height the four bands stand side by side in one
line, the hairlines between them go vertical, and the whole thing is 58 px tall
instead of 217. It scrolls sideways if eighteen controls will not fit, because
a row you push sideways is still one row. Keyed on height rather than on
orientation — a short window is a short window whether it is a landscape phone,
a split view or a browser with three toolbars in it.

**And it stays up.** It used to dismiss itself: a full-screen catcher sat under
it and closed it on the first touch anywhere else. Every control in it changes
what the drawing looks like, and the only way to judge that is to look at the
drawing — so every single adjustment cost a reopen, and comparing two settings
was four taps a comparison. Worse, the catcher swallowed the touch that closed
it, so the drag you actually wanted did not happen either. The panel is pinned
now and the scene under it stays live: turn the view, drag the sun, walk, with
the tools still in reach. Tools puts it away, Lights swaps to the other panel,
Escape closes whichever is up. The lights panel behaves the same way, which it
always should have.

The **light** control is the one that changes what it does with the mode. On the
clay it sweeps the page from black to white, as it always did. In ink it sweeps
the *paper* — a warm ramp from a near-black board to white — and the pen is
derived from it rather than chosen: a near-black or a chalk, whichever has more
contrast against the sheet. The two are equal at a relative luminance of 0.179,
which is exactly where a sheet stops being paper and becomes a board, so drag
past that point and the drawing turns to chalk on slate on its own. Paper and
pen are one decision with a constraint on it, and offering them as two controls
would be offering a way to make the mode useless. What it no longer sweeps is
the *page behind* the drawing, which stands right beside it in the panel and has
its own section below — two tones, one band, one decision taken twice.

**The dock stays up when something is selected**, with the selection bar stacked
above it. It used to hide — and three of the things it hides do nothing *except*
when something is selected: the cage, the selection's own vanishing points, and
the export that would carry them into a picture.

Eight controls at 44 px plus the glass around them come to 392 px, which no
phone has: measured, a 390 px frame gives the dock 366, and every phone width
folded it in half over the drawing for want of two pixels. Below 430 px they go
to 40 px wide with tighter gaps, which brings the row to 360 and puts it back on
one line at 390 and above; at 320 it still wraps, and wrapping is the right
failure — a control pushed off the edge of the screen is not a smaller control,
it is no control. Four pixels off one dimension is a worse target than 44 and a
better one than nothing. The height does not move, and a thumb is wider than it
is tall. The selection bar solves the same problem the other way — it scrolls
sideways, because it is a list of things you can do to one object and a list can
be as long as it likes.

**The glass is 96 % opaque, and there is no blur behind it.** The eight per cent
it used to let through was chosen when the tool drew mid-grey clay on a mid-grey
page, where a little of the scene coming through cost nothing. The page is black
now and the drawing is white paper, which is the widest gap a screen has: eight
per cent of 255 over a panel that is itself 10 put the car's lines twenty levels
above the panel around them, and the drawing read *through* the menu on top of
it. A backdrop-blur is the usual answer and the wrong one here — the thing
behind every panel is a live WebGL canvas, and a blurred backdrop has the
compositor resample it every frame, paid on the phone this is actually used on,
to soften something four per cent of opacity removes for nothing.

Tiles in the two libraries carry a hairline for the same reason, **and nothing
else**. A tenth of white over a panel that is 96 % black is about four values of
separation, so the fill they started with never did the job it was there for: a
shelf of them read as icons floating on glass rather than as a grid of targets,
and the only one whose edges anybody could see was the import tile, which
happens to have a dashed border. The hairline fixed that — an edge is what makes
a tile a tile — which left the fill doing nothing but making every tile look like
a key to be pressed. That is the one thing this interface is not: a global rule
strips the background off every button in the app so that shape, border and
glyph carry it, and a grid of filled rectangles was the last place still arguing
with the rule. The fill survives only under a finger or a cursor, where it is
feedback rather than decoration. The delete mark on a saved scene lost its
filled disc for the same reason and keeps a drop shadow instead, which is what
it actually needed: it sits on a photograph, and a photograph can be any value
anywhere.

### Projections

Four systems, all of them ones you can draw in, cycled with one button:

- **Rectilinear** — one, two and three point. A straight line in the world is a
  straight line on the page, everywhere. That single property is what makes a
  vanishing point a point you can rule *to*, and it is why every camera, every
  draughtsman's board and every perspective lesson since Alberti uses this and
  nothing else. It is also the one system here that sight is not: it cannot
  reach 180° at any size of paper, and it stretches the corners of a wide frame
  without bound. Held at 130°, where the corner of a phone frame is already
  about four times the scale of its middle — a 12 mm ultra-wide, the widest
  rectilinear lens anybody sells, is 122°.
- **Cylindrical** — four-point. Verticals stay straight and vertical while
  horizontals bow. The system for ruling a long wall.
- **Equidistant** — five-point, and the default. Angle from the centre of the
  frame is distance from the centre, evenly, in every direction. That even
  mapping is what makes it a ruled sphere, and it is the sheet a five-point
  page is ruled on.
- **Stereographic** — the conformal one (below).

The flat board went away once and came back, and both decisions were right
about different questions. It went because this is a tool whose subject is the
wide field: opening a rectilinear lens does not open the view out, it smears
the corners into something no drawing can be made from, and inside the cone of
vision the curvilinear systems *are* the flat one to within a pencil line. What
that missed is that a system nobody would choose for a wide view is still the
system a beginner meets first, and one, two and three point perspective are not
looser versions of five point — they *are* this projection, and they cannot be
shown in any other. The four together are the ladder from the board to the
sphere.

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
own control**, not a rung of the guides: the guides are the construction of the
*room* — the horizon, the floor, the sheet — and are wanted or not wanted for a
whole session, while this is the construction of the one thing in your hand, and
it is wanted while you work out where that thing's edges run and in the way the
moment you have.

**Four rungs, tapped through**, and they are a sequence somebody works in rather
than four unrelated looks:

| | |
| --- | --- |
| **off** | nothing |
| **points** | its own edges carried out to its own vanishing points |
| **halved** | …and the rectangle it stands on, with the two diagonals that *find* the centre of that rectangle |
| **quartered** | …and the two lines through that centre: the floor under it, in four |

The diagonals are why the rungs are in that order. Halving a receding rectangle
by eye is guesswork and the guess is always too far away; halving it by its own
diagonals is exact, needs no measurement, and holds at any angle on any of these
sheets — it is the first construction anybody is taught, and the one thing this
tool can *show being true* rather than assert. The tool could say where a thing's
points were and had nothing to say about dividing the span between them, which is
most of what a viewer is doing when they place the second chair along a table or
set a window in the middle of a wall.

They are drawn on the **footprint** — the rectangle the thing stands on, taken at
its base — because a floor is what you divide when you are placing things at
halves and quarters, and it is the one face every object has whether it is a box,
a chair or a figure. Each line is sampled and asked where it lands, like the rays
are: the image of a straight line on a curved sheet is an arc, and a stroke drawn
between two projected ends would be a chord that misses the middle of it by a
third of the frame.

That is the whole lesson, and it is invisible until somebody draws it: a box has
its own points, decided by how *it* is turned relative to you, not by the scene
being "in two-point perspective". Turn one off the grid and its pair moves off
the scene's.

**And tilt one, and the pair leaves the horizon altogether.** A family of
parallel edges vanishes on the eye level only when the family is *level*, which
is true of every edge of everything that sits square on a floor and false of a
ramp, a roof, a staircase's nosings or a leaning ladder: their pair sits as far
above and below the line as the family climbs. It is the one fact about
vanishing points a room full of upright boxes can never demonstrate, and until
the ramp card was written this tool could not draw it either — the construction
was built from one bearing and an assumed upright, which is exact for anything
standing on a floor and quietly false for anything that leans. It did not fail:
it drew two confident rays to two points sitting neatly on the line, and they
were the points of a box that was not there. A blank overlay is a gap; a
plausible wrong answer is a lie, and this is a tool whose whole job is being
checked against. The families are built from the thing's own three axes now.

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

Not the verticals, and now for a plainer reason than the original one. It used
to be that the third family *was* the world's uprights, so drawing it drew the
fifth point twice in two inks — and at 90°, where the zenith is three and a half
frames off the top, it drew it as two pins stuck to the top and bottom edges
pointing at nothing. Tilt a box and its third axis is no longer the world's, so
that argument stops covering it; what covers it now is that a ramp leans by a
fifth of a radian, so its third family would land a fifth of a radian off the
zenith, a couple of frames past the top of the page, beside a mark that is
already there. What a ramp is *for* is the family running up the slope, and that
one is drawn.

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

**The cone glyph is blue while the field is inside sight, and plain past it.**
About 210° is what a pair of eyes actually takes in, and everything beyond that
is honest curvilinear drawing of a world nobody can see all of at once. Those
two states are a digit apart to look at — 210 and 270 read the same in a bubble
that is only up while a thumb is down — so the one accent this app has says
which side of realism you are on, at rest, without a word on screen. The number
lives in one place (`HUMAN_SIGHT` in `lib/projection.ts`): the glyph marks it,
the human rung of the reach clamps to it, and the migration that decides which
rung a stored field belongs to reads it.

How far that number may open is a ladder of its own, in the panel: **human
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

### A lens, rather than a pair of eyes

Everything above frames the world the way sight does: a field measured in
degrees, opened as wide as 210° because that is what a person takes in, on a
curved sheet because sight has no straight edges in it. That is the honest
model of standing somewhere and looking, and it is the wrong model of the other
thing people compose with.

A camera is a handful of numbers and none of them is "how much can you see". It
is a **focal length** on a frame of a known size, an **aperture**, a **shutter
speed**, a **sensitivity**, a **distance it is focused at**, and the shape of
the **gate** — and what those produce is not a wider or narrower version of
sight but a different picture. So there is a button that frames the view as a
lens, and it changes five things:

- **The projection goes rectilinear**, and this is not a suggestion. A focal
  length on a curved sheet is a number with no meaning: 50 mm says exactly one
  thing about a picture — how much of a 36 mm frame a straight-line projection
  takes in — and a sheet that bows straight lines is not that projection. It
  does not put the old sheet back on the way out; which sheet you draw on is a
  decision about the drawing, not something a mode should quietly undo.
- **The field reads in millimetres.** The same control, the same number: on the
  flat board a field *is* a focal length, and the tap-cycle steps 14, 20, 28,
  35, 50 and 85 rather than round degrees. Those are worked out rather than
  written down, because the answer depends on the window and on the gate — a 50
  through a 3:2 gate on a phone held upright is a different field from a 50
  across the whole of a laptop. The focal length is **not stored**: it is a
  reading of the field, and a copy kept alongside is a copy that drifts.
- **A gate**, fitted inside the screen and matted rather than blacked out.
  What is outside the frame is still the scene, and being able to see it dimly
  is what tells you what you are about to lose by moving in — which is the
  decision the gate exists to make. The edge is one pixel of the same ink the
  horizon is ruled in: a crop mark, not a border.
- **A shutter and a sensitivity beside the aperture**, because those three are
  one quantity — how much light lands — and you cannot see a triangle one
  corner at a time. `t · (ISO/100) / N²`, normalised so that f/4 at 1/125 on
  ISO 200 is exactly the picture the tool has always drawn: the setting the
  lens arms on. **Aperture priority** is on by default, which is the mode most
  bodies are actually left in — open up and the shutter moves under you to hold
  the brightness, so the dial you reached for does the one thing you reached
  for it to do, which is the depth of field. Switch the meter off and two stops
  open is two stops brighter, which is how anybody learns what a stop is. The
  readout then shows how far off the metered exposure you are, signed, in the
  same place a real body puts it.
- **And depth of field**, which is the part that cannot be faked with a knob.

And it says all of it in one line at the top of the frame — `50 mm · f/2.8 ·
1/125 · ISO 400 · A` — because a camera tells you where it is set without being
asked, and in the order everybody reads it. That line is most of why a
photographer can pick up a body they have never held.

**Where the stop is applied, and why it is not on the renderer.** three runs its
tone mapping inside each material's own shader and only when that material is
drawn straight to the canvas: rendering into a target sets `NoToneMapping`, on
the reasoning that a target is an intermediate and should stay linear. Every
pixel this app draws goes into a target first — the cube pass, the flat pass —
so `toneMappingExposure` was being read by nothing at all. The stop lives in the
one pass that reaches the canvas, `components/Panorama.tsx`, alongside the blur.

**And the curve is a shoulder, not a film curve.** ACES was tried and was wrong
here: it is built for scene-referred radiance and it moves everything, so middle
grey lifts and paper white lands at three quarters — in a tool whose subject is
a white sheet with lines on it. Below a knee at 0.72 the picture is left exactly
as drawn, which is the promise the base setting makes; above it an exponential
rolls toward one, tangent to the identity at the knee so there is no corner.
Three stops over then reads as a blown sky with its gradient still in it rather
than as one flat white shape with the cloud dissolved into it.

### Depth of field, at one tap per pixel

It is a physical consequence of the other three numbers rather than a setting
of its own. A lens of focal length *f* at f-number *N* focused at *S* throws a
point at distance *D* onto a disc of diameter `f²/(N(S−f)) · |1 − S/D|`. The
first factor does not depend on *D* at all, so it is worked out once on the CPU,
turned from millimetres of sensor into pixels of source, and handed to the
shader as one number.

Two things make that affordable on a phone:

- **The depth pass rides the existing cache.** The panorama already keeps its
  source between frames — a cube map is indexed by direction, so turning your
  head does not invalidate it, only moving does. The depth pass is the same
  scene rendered again at half the size with one `overrideMaterial` over
  everything, on exactly the same staleness check. No per-object shader, no
  multiple render targets, and nothing at all redrawn while you stand still and
  look around.
- **The blur is the source's own mipmap chain.** A level *L* of it averages
  about 2^L texels, so the level that averages a disc of *N* texels is log2(*N*)
  — one trilinear fetch instead of the twenty-odd taps a poisson disc costs. It
  is not a bokeh: a mip is a box, not an aperture, so a bright point does not
  open into a disc with the shape of the blades. What it *is* is a correctly
  sized, correctly placed, physically derived softness at one tap per pixel and
  no second pass.

The stored value is `near/D` rather than *D* — a reciprocal, because that is
the quantity the circle of confusion is linear in (the whole blur is one
subtraction in these units) and because it spends its precision on the near
half of the scene, where the eye spends its. Half float rather than packed
bytes: eight bits over a reciprocal bands exactly where the picture goes from
sharp to soft, which is the one place anybody is looking.

Focus is automatic unless you set it, and automatic means *where the eye line
meets the floor* — one ray against one plane rather than a raycast against the
geometry, which gives the same answer for a hundredth of the cost and does not
flicker between an object and the gap beside it as the frame drifts.

The picture that leaves has the same lens on it as the picture on the glass. A
sharp export would have been easier to write and a quiet lie: the depth of
field is most of what says where the eye is meant to go, and a file that
silently undoes it is a file of a different drawing.

### Lights

The sun is one hard light with no fill, which is what makes a box read as a box:
a face turned away from it is genuinely unlit, and that separation is the thing
being drawn. Its bearing, height, strength and colour temperature are four
drags in the light sheet, and its shadows can be switched off.

The panel hugs its contents rather than stretching to the edge of the screen,
and each knob's reading floats clear of it rather than being kept inside by
40 px of empty headroom — which matters for a control whose whole purpose is
watching the scene change while you drag it. A rail across the top is every
light there is, the key and the fill and each lamp you have stood somewhere,
and whichever you tap comes under the same four knobs, because a light is a
light.

A **second light** lives under it, off until asked for: shadowless, cooler and
weaker by default, the way a studio or an overcast sky answers the problem of
one light leaving half of everything black.

### The sky, which is the other way of aiming the sun

Those four drags are the right control for a *drawing*: you put the light where
the drawing needs it. They are the wrong control for a *question*, and the
question people bring to a perspective tool is not "what does 286° at 14 look
like" — it is **"what will this look like here, at four o'clock, in October"**.

So the light rail carries a third seat that is not a light. Give it a place and
a moment and the sun goes and stands where the sun actually stands:

- **A place.** One press of the pin takes the device's own fix, sets the hour to
  now and fetches the forecast for it, all together — a place moved under an
  hour left over from a previous session is half an answer, and the wrong half
  decides where the shadows go. Until that press it is Greenwich at noon, which
  is deliberately somebody else's: a default that quietly guessed at your
  latitude would be a location fix taken without a prompt. Nothing here asks the
  browser for a permission except that one button.
- **A moment**, as an hour and a date, both read and written in local time. The
  position is the NOAA solar equations — a hundredth of a degree over any date
  this tool will see — and it is checkable by eye: at Greenwich at noon the sun
  is due south.
- **A clock that runs**, at ten minutes a second — the rate at which a shadow
  crosses a courtyard at about the speed a shadow looks like it should. It had
  a speed knob of its own once, six rates deep; a knob for how fast a
  rehearsal plays is a setting about a setting, and it went in the cull below.
  The moment still advances every animation frame so the motion is continuous,
  but it is *committed* to the store ten times a second, because a store write
  re-renders everything subscribed to the sky and sixty of those a second was
  a drag you could feel with the panel open — and ten a second moves the sun
  an order of magnitude less than the quarter degree the dome itself
  quantises to.
- **The real weather.** Cloud cover, how high the deck sits and what the wind is
  doing to it, fetched from a public hourly forecast for that place and that
  hour. One fetch covers two days back and three forward, so scrubbing across an
  afternoon reads hour after hour out of what is already in hand rather than
  asking again — and a sky left up on a desk asks again every half hour, so it
  goes on being the sky outside. What the finger reaches is one axis, clear to
  overcast: cover follows it, and the deck's height and the wind ride along,
  because that is how the three arrive together in the world — fair-weather
  puffs sit high in light air, stratus sits low in a blow. The forecast still
  writes all four raw numbers underneath, so a live sky is as exact as it ever
  was. Put a hand on the axis and it stops calling itself live: a reading you
  have overwritten is a sky you composed, and a panel that goes on claiming
  otherwise is lying about where its numbers came from.

**The pane was fifteen controls and is eight.** Beside the rate knob and the
weather's three extra scrubs, the cull took the fetch seat (the location pin
already snaps the hour to now and fetches the conditions — the second seat was
the same press wearing its own button), the star knob and the constellation
toggle (the stars are always up there, and they show exactly when the air or
the daylight stops drowning them, which no knob says better than the sky
itself), and the four dead scrubs the key light showed while the sky was
aiming it. Nothing the picture could do went with them. The same pass gave the
deck a fast exit, twice over: the low deck's field — ten noise reads a pixel —
sits behind a uniform branch now and is skipped entirely under a clear sky,
where every one of those reads used to end in a zero, into all six faces of
the panorama's cube; and when every layer of the dome comes to nothing at once
(a vacuum, or a clear day before dusk with no veil) the mesh is not drawn at
all.

**Cover is not a dimmer.** It moves the deck overhead, which throws its own
shadows across the scene; and it changes the sun underneath, which gets weaker
*and less warm* — a covered noon is both, because the reddening happens along a
path the cloud has already scattered. One number, three consequences, which is
what makes it a condition rather than a knob.

**And the cloud is a deck, not a backdrop.** It is a shader on the inside of a
dome, and every pixel of it asks one question: follow this ray out to the height
the cloud base is at, and see what is there. That is what makes it read as a
*plane overhead* — the puffs get smaller and crowd together toward the horizon
because they are further away, which is the perspective this whole tool is
about, and no arrangement of sprites on a dome will do it. Its shape comes out
of a coverage threshold fitted to the noise field's own distribution, so sixty
per cent cover is sixty per cent of the sky. It drifts at the real wind speed on
the real bearing, and a cloud shadow crossing a courtyard at four metres a
second is the one thing in the scene that says the picture is a moment rather
than a diagram.

**What makes it weather rather than blobs**, because a threshold on noise is a
field of round shapes and a real cloud field is never round:

- **The field is read at a point a slower field has already moved.** Two extra
  samples of noise, and they are the whole difference: the puffs lean and hook
  and run into each other in lines, which is what the shear they are sitting in
  actually does to them.
- **A finer field is added before the threshold, not after.** It eats into the
  outline without touching the cores, because the cores are far above the line
  and the outline is sitting on it. That is the ragged fringe.
- **The light through it is Beer and powder off a sunward path.** Two more
  readings along the deck toward the sun — the puff's own face, and the shadow
  another puff throws across it — with a powder term for the thing everybody
  paints backwards: a cloud is darker at its *fringe* than a hand's width
  inside it, because light entering a thin edge scatters straight back out
  before it has been turned around enough times to come at you.
- **The silver rim is a phase function**, Henyey–Greenstein rather than a
  `pow(dot)`. Light that goes into a droplet mostly goes on forward: the puff
  between you and the sun has a rim of fire on it and the identical puff behind
  your shoulder is flat grey, and the falloff is narrow at the top and wide at
  the bottom in a way no power curve tunes into.
- **And a second deck of cirrus above it**, eight kilometres up, drawn out into
  fibres along the wind because that shear is the whole look of the stuff and a
  round version reads as smoke. A sky with no high cloud in it reads as a
  render. It is ice, so it scatters forward harder than water does, and it
  stops being drawn as the low deck closes over — you cannot see cirrus through
  overcast.
- **The heavier the deck, the less of the sun reaches the underside** you are
  standing under. That is not a shading choice: an overcast sky is grey because
  the light is two thousand feet of water away, and a deck that renders white
  at nine tenths cover is drawing a bright day with a lid on it.

**And after the sun goes down there is a sky rather than a hole.** The night is
drawn on the same dome, under the cloud, because that is the order the world is
in — the stars are behind the weather:

- **The stars are the real ones.** They were invented ones — a hash per cell of
  the celestial sphere, fixed so the same invented stars came back every night.
  That is the right answer for a backdrop and the wrong one here, because of
  what a star sky is *for* in a tool about perspective: it is the one thing in
  the world with none in it. Everything else the tool draws converges, shrinks,
  has a vanishing point. The stars do none of it — walk a mile and not one moves
  by a hair, and the whole sphere turns rigidly without any figure in it
  changing shape. Having a cube with a vanishing point and a sky with none on
  one screen is the clearest statement of what perspective *is* that this tool
  can make, and it is only worth anything if the sky is **checkable**.
- So it is the **Yale Bright Star Catalogue** cut at the naked-eye limit: 8404
  stars at their true right ascension, declination, magnitude and spectral
  class, packed six characters apiece into about fifty kilobytes. Orion is
  Orion — the belt three in a row, Betelgeuse orange at the shoulder, Rigel blue
  at the knee — and the joining-up is its own faint switch, because the stars are
  out there and the constellation figures are something people drew on them.
- **A star is drawn at least a pixel and a half wide**, because below a pixel a
  point source does not get fainter, it gets *unreliable* — lit or not depending
  on where the sample fell — and the whole sky boils as you turn your head. And
  **how much of the catalogue is worth drawing depends on the field**: a star is
  a point source, so what decides whether you can pick it out is its flux
  against the sky behind it, and a wider field puts more sky behind every pixel.
  It matters twice over on the six-faced path, where every star is drawn six
  times.
- **They are added over the weather, not shown through it.** The night layer on
  the dome carries an alpha near one — it *is* the night sky — so anything
  behind it is behind a curtain. Stars are seen through the air, so they go on
  top, and what cloud does to them is done on the processor instead: a knob on
  the gain rather than a curtain in front.
- **The Milky Way is a great circle** tilted sixty-three degrees to the
  celestial equator, which it gets for free by being defined in the same star
  frame: it rises and sets with the catalogue because it is made of it. Its star
  clouds and dust lanes are sines of the angle *along* the band rather than
  noise, because noise on an angle has a seam where the angle wraps, and a seam
  down the middle of the galaxy would be the most visible artefact in the file.
- **And the moon is up there, in its real place, with its real phase**, throwing
  its own light once the sun is down. The terminator is not a chord across the
  disc — it is the edge of the lit hemisphere seen at an angle, so it is half an
  ellipse — and the horns point exactly away from the sun however far under the
  ground the sun has got. Both fall out of asking, per pixel, which way that bit
  of the sphere faces and whether the sun can see it, which is why they come out
  right rather than being drawn right.
- **Twilight is its own colour, not a dimmer daylight.** The scattering model
  underneath is Preetham's and Preetham has a cliff: a little over two degrees
  below the horizon its sun term reaches zero and the whole dome snaps, in one
  frame, to a flat grey wash. So the air is aimed at the sun's *true* height —
  not the two-degree floor the lamp is held at, which is what kept the sky at a
  permanent navy twilight at three in the morning — held a degree above that
  cliff, and this layer takes over from it at the horizon: a deep blue overhead,
  a warm band low down *on the side the sun went down*, and the stars coming up
  through it as the night runs on to civil twilight's end.
- **The dome carries its own stop.** Preetham's output is a radiance, not a
  picture, and at a forty degree sun it is several times its output at a fifteen
  degree one — true of the real sky and exactly why nobody photographs one at
  noon without stopping down. Run at a fixed exposure it came out as a sheet of
  white-cyan with the cloud lost in it, and a cloud you cannot see is not a
  cloud that has been drawn realistically. Half a stop at the horizon, near two
  at midsummer noon, which is roughly what an eye does.

#### Air, which is the other perspective

Linear perspective is the one everybody teaches: things converge, things get
smaller. The other one is what the mile of air between you and the hill does to
the hill — it goes pale, it goes blue, it loses its darks, and far enough off it
is a flat shape the colour of the sky. Leonardo wrote it down before anybody had
the word for it, and a tool that draws the convergence perfectly and has no air
in it is teaching half the subject.

So there is an **air** knob, and it is not a weather reading — the forecast has
nothing to say about it.

- **Upward it is haze.** More turbidity in the dome, a paler horizon, and a fog
  whose colour is not picked: it is what a single-scattering integral — Rayleigh
  for the molecules, Mie for the dust, marched along a ray — says the sky at the
  horizon actually is, averaged over four bearings because a fog has one colour
  and a sky at sundown plainly does not. So the haze under an evening sky is
  orange without anybody saying so. The density is set for this tool's own
  distances: about half veiled at a kilometre at one atmosphere, which is what
  the thousand metres of floor this app lays down needs to show it. That is a
  hazy day rather than a clear one — genuinely clear air is thinner than any
  painting of it has ever been, which is why every painter reaches for more.
- **It reaches the lit rungs and not the drawn ones**, and that falls out rather
  than being decided: fog is a chunk in the standard materials, and the ink
  shaders are written from scratch and never included it. Which is right. An ink
  drawing has no air in it.
- **Downward it is a vacuum**, and that is not an off switch. With no air there
  is nothing to scatter sunlight, so there is nothing for a scattering model to
  draw: no dome, no twilight, no cloud — cloud is water *in air* — and the frame
  is cleared to black. Everything the sun can see goes on being lit, harder if
  anything, since nothing is taking the beam apart on the way in. The shadows
  have nothing filling them. The whole catalogue comes out **at midday**,
  because there is no sky left to drown it. And the sun becomes a hard white
  disc with no glare, drawn by the star pass because nothing else is drawing
  one.

That last setting is the moon, and it is worth a minute of anybody's time: it is
also, exactly, the lighting model the rest of this tool has always used — one
hard key, no ambient, no environment — made visible for once instead of assumed.

**And the clock runs on the frame.** It used to step twice a second, and twice
a second is not a clock, it is a metronome: at ten minutes of sky per second the
sun jumped a degree and a quarter every step, and the whole point of watching
light move is that it *moves*. What made a timer seem necessary was cost, and
the cost was never in the clock — it was that a moving sun invalidates its own
shadow, so every step redrew a four-megapixel shadow map. Those are separate
now. The lamp's position is written every frame, unconditionally, because it is
three floats and it is the thing you see; the map is redrawn eight times a
second while the aim is sliding, and immediately for anything that is not a
continuous slide. Shadows a twelfth of a second behind a sun that takes ten
minutes to cross a degree are shadows nobody can catch out. A sun that jumps is
one everybody can. The `sun` in the store is left as the *same object* while it
has not really moved, too — below a twentieth of a degree nothing on screen can
change, and a new object identity every frame re-rendered every component that
reads the light, sixty times a second, to hand them numbers differing in the
fifth decimal.

While the sky is in charge, the sun's four knobs go dead and go on showing what
the sun is doing — they are readings now, and a knob that silently loses its
value the moment you let go is worse than one that plainly is not yours to turn.
The shadows switch stays live either way: whether and how a shadow falls is a
drawing decision, and a simulated overcast noon with hard shadows is a
perfectly reasonable thing to want to draw.

Nothing downstream knows any of this happened. The shadow map, the sky shader,
the ink shader's terminator and the cloud deck all go on reading the one `sun`
they always read; the simulation only writes it. `lib/sky.ts`,
`lib/skyClock.ts`, `components/Sky.tsx`.

### Placed lamps

The sun and the fill say where the big light comes from. **Lamps** say where
the small ones hang, and they are scene objects, not settings — placed from the
model library (the tile left of the cube), selected with a tap, slid along
their own level, lifted, placed again from the shelf, saved with the
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

**And a small cross at the middle of the frame: the principal point.** Every
other mark the guides draw is a point in the *world* — where a direction things
run along ends up — so they all slide as you turn and stay where the room says
they are. This one is the image of the direction you are *looking* along, which
in all four of these projections is the middle of the sheet, and it is therefore
the one mark on the page that cannot move however far you turn. It is a cross
and not a ring on purpose: a ring on this sheet means "a family of parallels
goes there", and this is the one point in a picture nothing is ever ruled
towards. Two marks that mean opposite things must not look alike.

It went in because the lesson had been naming it for two drafts and there was
nothing on the sheet that was it. The card said *the ring in the middle of the
picture is the principal point — turn, and watch what does not move*, and the
ring in the middle of the picture is the shader's −Z vanishing point, fixed to
the room, so the one thing it does when you turn is slide off centre. The idea
was right and it was pointing at the wrong mark.

The construction cage goes round **the selection, and only the selection**. It
is the box a thing blocks into, which is the first mark anyone makes when they
draw a figure, and the argument for drawing it round everything standing in the
scene was that you block the whole scene in before you block in one object of
it. True, and it does not survive contact with a scene that has fifteen things
in it: fifteen cages, fifteen footprints, thirty dashed diagonals and fifteen
plumb lines, over the drawing. A box round everything at once is a box round
nothing in particular.

**The ground ruling is one seat with four states** — none, the lines running
away from you, both, the lines running across. It used to be a rung of the
guides ladder, which could only ever offer the whole grid, and a floor is not
drawn that way: you lay the receding lines to their point and then you cross
them. Either family alone is the step before a grid; both is a grid; neither is
bare ground. It was then a switch each, which said all four but spent two seats
in the widest band in the panel — and the widest band is what sets the panel's
whole width. The cycle is ordered so that the sequence above is two consecutive
taps.

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
estimate fades.

Pick the pencil up off the model shelf and a drag on the ground draws a
footprint where the table is; release, and the next drag pulls its height;
release, and the box stands — sized by eye, in two strokes, with its dimensions
reading beside your finger as you draw and the snap applied throughout. Each box
is one undo step and lands selected for the usual handles to refine.

**Taking the pencil leaves the shelf where it is.** It used to put the shelf
away, on the argument that an instrument is for using on the drawing and the
shelf covers the bottom of the frame. Half of that is true, and the half that is
not is the half you feel: the pencil puts *itself* down after every box, so a run
of boxes was pencil, box, open the shelf, scroll to the pencil, box — three taps
of overhead for every second box, to save a strip of floor the drawing is rarely
in. The shelf stays, the pencil is one tap away for as long as you are blocking
things in, and the way to be rid of it is the button that opened it.

**One press, one box.** The pencil used to stay armed, on the theory that a
room is blocked out in a run of strokes. In the hand that is wrong: the moment
a box stands you want to look at it, and every drag you make to look is another
box. Press again for the next one — the mode is never on when you did not just
ask for it, and the button says which state you are in.

The library used to carry a block of sized boxes beside it — a seat at 0.45, a
bed 0.55, a table 0.75, a counter 0.9, a person 1.75, a door 2.1 — one tap
each for the half-dozen numbers a room is actually estimated off. The numbers
are worth owning; the tiles were not the way to own them. Six near-identical
cubes labelled with decimals is a spreadsheet, they pushed the actual objects
below the fold of a phone-sized sheet, and each one is the pencil plus a guess
— which is precisely what the pencil is for. Making the estimate is the
exercise. Being handed it is not.

### The measure

The pencil at arm's length, as an instrument. Every artist measures the world
the same way — pencil up, one eye shut, thumb slid down the shaft — and what
that gesture actually reads is **visual angle**, the one measure sight has.
"The car is three of its own heights long" is a statement about angles, and
taking it by eye is the skill under every other perspective skill.

Pick the divider up on the dock and a drag on the scene lays a measure:
two directions from the eye, the angle in degrees written at the line.
Measures pin to the world, so you can lay several and turn to compare them;
they go into an exported picture; putting the instrument down clears the sheet
— a measurement is a reading of the view, never part of the composition.

**It also reads metres**, when it can. The angle is the reading the instrument
is for and it is always available, because every direction from the eye has
one. A distance is not: it needs both ends of the drag to have landed *on*
something — an object or the floor — and when they did, the straight-line
metres between those two places is written beside the angle, quieter. Blocking
a real place out is a conversation in both units at once ("that wall is four
metres off, and it stands two heads high from here"), and one gesture answering
both is one gesture. A line taken across the sky has an angle and no length,
and gets no number rather than an invented one.

Each measure is drawn twice, and the gap between the drawings is a lesson no
telling teaches: the **geodesic**, solid — the image of the straight line in
the world between the two marks, which bows on a curved sheet because that is
what straight things genuinely look like across a wide field — and the
**chord**, faint — the ruler-straight line your flat-page schooling insists
on. Near the middle of a narrow view they lie on top of each other, which is
why the belief survives; open the field and watch them part company.

### Standing it in the real room

There are two ways into a real space here and they are not equal.

The **primary** one is the phone's own. Press the AR control and the scene is
written out as a `.usdz` and handed to AR Quick Look, which drops it on the
floor in front of you with full ARKit tracking: walk round it, kneel to it,
sight along it, and it stays exactly where you put it. That is not something a
web page can do for itself. Every browser-side attempt at it — a camera feed
behind a canvas, a gyroscope pretending to be a tracker, a six-degree pose
guessed from one sensor — is a worse version of a thing the device already does
properly, so the AR mode here is an **export**, and the tracking is Apple's.

Two details carry most of the value. The scene is anchored to a horizontal
plane, because a study composed on a metric ground grid belongs on the ground
rather than floating at whatever height the phone was held at. And it is opened
with `allowsContentScaling=0`, so a pinch cannot resize it: a perspective
reference you can scale is not a reference, and the entire point of standing a
2.1 m door in your hallway is that it is 2.1 m.

The room and the lamps stay behind. You are already in a room, and a second one
dropped over it puts walls through the walls; Quick Look lights what it places
from an estimate of the real light in front of it, which beats any lamp aimed
at a virtual sun. What goes is the forms, in a plain unlit-by-us material —
the ink shaders cannot travel, because they draw a line where a surface turns
edge-on to a *virtual* eye, and out there the eye is yours.

Where there is no system viewer — a desktop, an Android browser — the same
control writes the `.usdz` to disk instead, which is still the file you would
AirDrop to a phone. The button says which of the two it is about to do.

The **secondary** way is the gyroscope toggle beside it, which keeps its seat
for one honest reason: it works on the page you are already on, over the
curvilinear projections. Quick Look cannot draw a five-point sheet — it draws
the world through a camera's own rectilinear lens, and bending that would be a
perspective over a perspective. A second tap on it puts the **back camera**
under the drawing, faintly and masked at the corners: hold the phone up, turn
it, and the ruled sphere and the six points land over the real room, so a
corridor's own vanishing points can be read off the lines the tool is already
drawing rather than guessed at by holding a pencil up.

### A photograph under the drawing

The camera answers *what does the room I am standing in look like*. The seat
beside it answers the other half of the same question, which is the one an
illustrator actually has: **what does this look like** — a corridor somebody
photographed once, a street from a book, a still off a film, the room you were
in yesterday. Pick a picture and it goes into the same slot as the feed, over
the render at 42% behind the same radial mask, and the whole construction lands
on top of it: the eye level, the principal point's cross, the six rings.

Then you do not deduce where the photograph's horizon is. You slide your own
until the two agree — and the moment they do, the picture has told you where the
person holding the camera was standing, which is the thing every "how did they
draw that" question turns out to be about. The lesson's last card sends you here
for the one exercise that cannot be a page of cubes.

**Nothing tracks, scales, warps or corrects**, for the reason the feed gives:
a lens has a distortion this app's projection knows nothing about, and lining a
construction up against a bent corner is lining it up against a lie. It is a
backing sheet, and you move the sheet. It is `object-contain` rather than
`object-cover`, which is the one place it parts company with the feed — a live
camera *is* the frame and cropping it is what a viewfinder does, while a
photograph has edges somebody composed, and cropping them off cuts away exactly
the corners the composition card is about.

It is held as an object URL and **dies with the tab**: not written into the
browser, not put on the shelf, not saved into a scene. An imported mesh is kept
because a saved scene that cannot find its geometry is a broken scene; a
photograph is not part of any scene, it is a thing you sight against for ten
minutes, and keeping it would mean a picture of somebody's living room living in
their browser until they went looking for the switch.

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
**lock the size**, lift it off the floor, change its surface, open the knobs
that rule that surface, switch its own vanishing points on, export the mesh at
the size you settled on, delete.

The copy command used to sit here, and its seat became the way into the
surface's knobs. Nothing replaced the entry point, so for a while there was a
verb nobody could press; it has been taken out. Placing the same thing twice
does the job, and each placement lands clear of what is already standing there.

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

## The room, which is gone

There were four walls and a ceiling to stand the scene inside — a ladder of
off, the lines, the walls — with its own seat, its own drag-to-size, its own
clamp inside the opening framing, and a whole chapter here arguing for it as
the five-point exercise: floor lines to the point under your feet, ceiling
lines to the one overhead, wall corners out to the four on the horizon.

The argument was sound and nobody ever stood in it. The tool grew a yard, a
real sky and an apron instead, and a box of three flat greys under a noon
with weather in it stopped being an exercise and became furniture from an
older idea of what this app was. The lesson teaches the five points now, on
cards that take the tool over and work it, which is a better teacher than a
room you had to already understand to want. It went the way of the tour and
the deal button: removed whole — the component, the seat, the sizing hook,
the store fields, the framing clamp — rather than left as a rung nobody
steps on. Old scenes and settings that mention it load fine; the keys are
simply no longer read.

## How solid a thing is drawn

Every box and every placed mesh carries its own surface, so a scene can have a
solid car standing inside a wire box on a floor of inked ones. Four rungs,
ordered by how much has been taken away:

- **solid** — as the thing is: a box in plain white, a mesh in the materials its
  file was authored with
- **matte** — opaque, plain white, no texture. Photographed skin and fabric is a
  lot of information to draw past; stripped out, a figure reads as form and
  value only, which is what it is doing in a scene full of white boxes

- **brush** — the same drawing with its blacks spotted in. Everything turned
  from the sun floods solid ink, the pen's own lines run in *paper* through the
  fill — drawn around, not painted over — and the cast shadow goes down as a
  near-solid shape. Where ink is the pen underdrawing, this is the finished
  brush page: line and flat black and nothing between, which is the page a
  brush-and-ink spread actually is. Swing the sun and the blacks sweep with it,
  live. This is the one the tool opens on
- **marker** — the same page with one flat colour laid in the band between the
  spotted blacks and the bare paper. Ink first, then a marker over it, which is
  the order it is really done in and why the colour never has to describe the
  form: three values on the page and no fourth. Its hue and how far up the light
  it reaches are two knobs of its own
- **hatch** — the etched page, with no fill anywhere: the value is built out of
  ruled strokes that cross a second and a third time as the light goes out, and
  the paper between them does the rest. Five knobs, and its own section below

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
mesh skips wire, having no cage to fall back on. The button in the panel
steps the whole scene at once and stamps everything standing in it, in one
undoable move.

## Ink

The other four rungs answer *what is this object made of*. A perspective study
never asks that. **Ink** answers the only question it does ask — where would the
pen go — and it is the shader everything the tool opens on is drawn with.

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

### Five pages, dealt in the gaps

**The tool opens on the same page every time**, and it is the brush page on
black. It used to deal one off the deck at start-up. The argument for that was
good and it was the wrong argument for a start-up: it is about what a viewer
needs *after* they know the tool, not in the first second of it. What a start-up
needs is to be the same. Opening on a different surface, sheet, mount and light
each time is a tool with no face, where you cannot tell a setting you changed
from a page you were dealt, cannot compare today's study with yesterday's, and
every screenshot anybody takes is of a different app. The opening *mesh* lost
exactly this argument years ago for exactly this reason, and the page should
have lost it at the same time.

The deck is not gone. It deals itself in the gaps between working, once you are
here and drawing, which is where the comparison it offers is worth something.
What has gone is the die on the front door.

Everything in this tool is a knob, and a tool that is all knobs is a tool nobody
ever sees the range of. Most of what it can do lives in *combinations*: the
etched page wants a low raking sun, the toned sheet wants a stain rather than a
wash, the lit room wants a floor to throw a shadow across. Any of those is a
minute of fiddling to find and a second to lose.

So there are whole pages — surface, sheet, mount, light, the pen and the floor,
chosen together:

| Card | What it is |
| --- | --- |
| **Brush page on black** | line and spotted black, white sheet, black mount — where the tool opens |
| **Copperplate** | the etched page: every value built out of ranks crossing |
| **Chalk on slate** | the sheet gone dark, and the whole page inverting with it |
| **Sanguine** | one stain laid over the ink, on a toned sheet |
| **Long shadows** | not a drawing at all — the objects, lit, standing on a floor |

**There was a button for this, and it was the wrong shape for what it did.**
The argument above is about somebody who does not yet know the knobs exist, and
it was answered with a control in the fourth row of a menu two taps down — which
is to say, with a control only somebody who already knew the knobs would ever
find. Everyone it was for pressed it zero times; everyone it was not for pressed
it once, wondered what had happened to their page, and never pressed it again.

So it deals itself. Not while you are working — that would be the tool changing
the drawing under your hand, which is the one thing it must never do — but in
the gaps: put the phone down, look at the model, come back, and it is the same
scene from the same place drawn a different way. Which is exactly the comparison
the deck was always for, arriving when it *is* a comparison rather than an
interruption. Four minutes between deals, and only after three quarters of a
minute with nothing touched, nothing selected and no panel open. It takes a
history step like any other page change, so one undo puts back the rungs it
moved. `lib/autoDeal.ts`.

**It was twenty-five, and that was the problem.** A deck grows by one every
time a page turns out well, and what it grew into was a button you press four
times to find the etched page again: five plates apart by a crossing angle,
five markers apart by a hue, four lit rooms apart by an hour. Every one was a
real page and none was a different *answer*. Five is one apiece of the things
this material can be — every rung of the surface ladder but plain `original`, a
sheet at each end of the ramp and one in the middle, a mount that is the sheet
itself and mounts that are not. The knobs walk anywhere else from there, which
is what the panel is for: a card is a place to start from, not a place to
arrive at.

**Nothing in a page touches the view.** Not the scene, not where you are
standing, and not the lens, the projection, the guides, the grid, the cage or
the walls either. They used to carry a lens and a projection each, and dealing
one threw the view away: you would set up a shot, press the button to see it in
ink, and get somebody else's 420° cylindrical frieze. Two of them existed *only*
for their lens — a five-point hemisphere and that frieze — and those are lessons
about the projection, which is a control on the panel with its own name on it,
not something to be handed a page at a time. The comparison a deal is for is
the same view drawn several ways, and that is only a comparison if the view
holds still.

**Nor does a page move a simulated sun.** Every card names a light, and that is
most of what makes a card a card — but with the sky simulated the light is not a
look, it is a reading, and a page that moved it would be a page that changed the
hour. The card keeps the one part of the light that is a drawing decision —
whether and how the shadows fall — and the rest stays the sky's.

They are dealt in one `set()`, so a page lands on a single frame rather than
arriving as six separate changes the renderer has to chase. And it never deals
the page you are already on: a deal that can hand you back your own hand looks
broken half the time on a list this short.

### Hatching that describes, rather than shades

The first version of this ruled its strokes on the screen, and it was worth
throwing away. Screen-space hatching cannot describe anything: the lines run
dead straight over a sphere, a cliff and a fold alike, so the only thing they
carry is a value — which is a texture with a tone knob, not a drawing. Look at
any Zorn plate and the opposite is true: you can read the whole form off the
line *direction*, with every trace of tone removed. The strokes bend over a
shoulder, run round a cylinder, crowd where the surface swings away and open
out where it turns to face you.

So the mechanism here is a burin's. A family of parallel **planes in the
world**, cut against the surface; the curve where a plane meets the object is
one stroke. That gives all of it for free and for the right reason:

- on a flat wall the strokes are straight and evenly spaced;
- on a sphere they are circles of latitude, bunching towards the rim;
- over a fold they bend exactly as the fold bends;
- and everywhere they crowd as the surface turns edge-on, because equal steps
  in the world are shrinking steps on the page. **That crowding is
  foreshortening, drawn** — it is the thing that makes the shading describe
  rather than merely darken, and no screen-space rule can produce it.

Three problems have to be solved for it to be usable.

**The planes must not swim.** Their axis is built from the fragment's own ray
out of the eye and world up — two things that change when you *walk* and not
when you *turn*. That is also exactly the right dependency for the renderer,
which redraws the six cube faces on a move and not on a turn, and it means all
six faces rule one continuous set of strokes with no seam.

**The spacing must hold on the page.** Planes at a fixed spacing in metres
close into solid black as an object recedes, which is what makes naive
world-space hatching unusable. An engraver answers that by cutting fewer lines
on the small far thing and more on the big near one — the same decision taken
again at every scale — so the spacing is quantised to powers of two of the
distance and two neighbouring rungs are crossfaded. Every second line simply
fades in as you walk closer, and no stroke ever slides.

**Two bugs made it a scribble on a real mesh.** The stroke-break period was
computed as spacing × ratio, which is fine while both coordinates are metres
and nonsense the moment they are not — on the form field the spacing is in
facing-ratio units and the run is in metres, so every stroke was chopped at an
arbitrary interval. And the spacing itself was worked out per pixel from the
screen derivative of the facing ratio, which jumps at every facet edge of a
decimated mesh, so the level of detail flipped from pixel to pixel. The break
period is now given in the same units as the coordinate it measures, and the
form field is ruled at a **fixed number of strokes** instead — which is also
the truer idea: an engraver ruling a sphere does not measure a gap, they cut so
many lines from the rim to the middle and let the form space them.

**Tone must be weight, not opacity.** A burin cut deeper is a cut wider, and
that is the whole of how an engraved passage darkens: the same lines, in the
same places, fatter — until at the bottom they touch and the passage is solid.
Nothing here fades. A stroke is either not yet cut, at width zero and genuinely
absent, or it is a line at some weight, and the ramp between is a ramp in
width. Fading ink instead is exactly what makes shading read as a screen laid
over a picture rather than as the picture. Three families: only the first is
laid everywhere there is shade, the second crosses it once the first has said
all it can, the third only in the last fifth — and past its nominal full weight
the first keeps swelling, so the darkest passages close rather than staying a
lattice. Every stroke is cut to length and tapered, because a needle enters and
leaves the wax, and the lift closes as the passage darkens, because an
engraver's black is continuous cutting.

Two bugs in that machinery were worth the hunt and are worth recording. The
per-stroke grain was keyed on a stroke's offset in metres, so neighbours
differed by a hundredth and `sin()` of two inputs that close together returns
two nearly equal numbers — the "random" phase drifted smoothly along the rank
instead of scattering, every few strokes lifted in the same place, and the
coincidence marched pale blotches diagonally through every midtone. It counts
in five-millimetre units now, so neighbours differ by two or more and the hash
actually hashes, while the same physical stroke still gets the same number at
either level of detail. And the mark itself was drawn with the shader's
hairline routine, which ramps smoothly from the centre out and is therefore
only fully black on the line's axis — asked for six pixels it gave a soft
six-pixel gradient with a grey middle, which is why the darks could not close
however far the weight was pushed. A stroke has a solid core and about a pixel
of edge now, so the width is the width.

Four knobs: which way the strokes run, how far apart they stand, how heavy each
one is, and how long it runs before it lifts. There was a fifth, for how far the
crossing layers were turned off the first, and it went when the crossing did —
it had been wired to a uniform no shader reads for three changes, and measured
against the drawing it moved nothing at all. They are knobs rather than a preset
because the difference between a good hatch and a bad one is those numbers, and
shipping one
guess would be shipping one etching.

### The sheet and the page it is mounted on

The sheet the drawing is made of and the field behind it used to be one colour,
necessarily: paper filled the frame, so the sky *was* the paper. That is one
picture you can have and it is not the best one. A drawing on white paper
mounted on black is the oldest way of presenting a drawing there is, and it is
the strongest — the mount does not compete for value, so the sheet reads as
lit, the drawing's blacks read as the darkest thing in it, and the edge where
the two meet is the picture's frame rather than an accident of the window.

So they are two tones now. `backdrop` is either `'paper'`, meaning what it
always did — the page is the sheet, one colour edge to edge — or a grey from 0
to 255 that the page takes instead. The sheet keeps `backgroundGray`. The **page
button** in the panel taps through *sheet → black → white* and drags for any
grey in between, exactly like the light control does for the sheet.

Everything that is *furniture* moved onto the page and everything that is
*drawing* stayed on the sheet. The floor grid, the guides, the construction
cages, the measure haloes, the cast shadow, the chrome's own light-or-dark and
the phone's status bar all read against the page, because they are the things
sitting behind and around the drawing. The pen, the fill, the terminator and the
paper the object is drawn on read against the sheet. It is the same split a real
mounted drawing has, and drawing it any other way gives you chalk guides that
vanish into a white mount or ink guides that disappear into a black one.

The chrome follows the page, not the sheet, which is why sweeping the sheet
under a black mount leaves the buttons dark: the buttons are over the mount.

**A mount is neutral, and black really is black.** The page went through the
warm paper ramp at first, which was the obvious thing to reuse and the wrong
thing to reuse: that ramp is warm on purpose, because no sheet is neutral and a
drawing surface has a colour, and its own black end is `#15171b` — a perfectly
good drawing board, and visibly a dark blue when what you asked for was black.
A mount is not a sheet. Its whole job is to be what the sheet is not, and it has
no hue to have an opinion about, so a numeric backdrop is a flat neutral grey
end to end: 0 is `#000000`, 255 is `#ffffff`, and the ramp is left to the thing
it was built for. `'paper'` still means the page *is* the sheet, warmth and all.

One consequence worth stating: there is now exactly one function that answers
"what colour is behind everything" — `pageToneOf` in the store, pushed to
`lib/inkMaterial.ts` by the same subscription that sets the sheet. The canvas,
the frame around it in the DOM, and the phone's status bar all quote that one
answer instead of each re-deriving it from the ramp and hoping the three agree.

**A note on where the two tones are pushed.** Both live in module state inside
`lib/inkMaterial.ts`, because a hundred materials and a dozen components all
need the same answer and threading it through props would mean threading it
through everything. The trap is that `pageHex()` and `constructionInk()` are
read *during render*, so writing them from a `useLayoutEffect` — which runs
after — makes every one of them exactly one change stale: tap the page to white
and the frame stays black until the next unrelated redraw. They are written from
a `useStore.subscribe` at the bottom of `store.ts` instead, which fires
synchronously inside the `set` call, strictly before any component re-renders.
This also fixed a latent version of the same bug on the sheet, where the last
frame of a drag kept the second-to-last value.

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

There is a second problem underneath that one, and it is not about corrupt
values: **a returning visitor is holding the old opening in their hands.** When
the tool changed what it opens on — the brush rung, hard shadows, the black
mount — everyone who had ever loaded it once would have come back to plain ink
on white paper and never seen the change, because their browser had faithfully
kept every one of those fields. So the handful that describe *how the picture
looks* rather than *what is in it* — the field, the guides, the construction,
the surface, the eye level, the page — carry a generation number with them. Bump
it and exactly those go back to the defaults on the next visit, while the scene,
the room and everything the visitor actually built come back untouched. It is
the difference between "we changed the tool" and "we threw away your work", and
the whole mechanism is one integer and a list of six key names.

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

The scene library (the frames icon on the dock) keeps whole compositions in the
browser: the boxes, every placed mesh with its position, bearing and size, the
eye level, the lens, the sun, and the spot you were standing on. Each one is a
thumbnail of the view it was saved from and a name you can type over — `Scene 1`
until you call it something.

**Saving writes into the project that is open.** It used to add a new entry
every time, on the argument that a roll of views loses nothing; what that
actually produced was four near-identical thumbnails of one afternoon's work and
no way to say which was the live one. A project is a thing you come back to, so
the disk icon updates it — the button says which, `Update Scene 3` rather than
`Save this scene` — and the card of the open one is marked. The **plus** at the
head of the row is how you deliberately start another, and it is the only thing
here that adds a card. Clearing the scene or importing a file lets go of the
open project, so neither can overwrite it by accident. Deleting takes two taps.

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
npm test        # playwright; builds and serves the app itself
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

The animals went through a step further, because of what this tool draws. Only
the solid surface ever samples a texture at all: on ink, brush, marker and
hatch the material is a shader that reads geometry and light, and never a map.
So the normal, metallic-roughness, occlusion and emissive maps are dropped
outright rather than resized — three 4096² maps apiece is 268 MB of video
memory per animal, every byte of it invisible on four surfaces out of five —
the base colour comes down to 1024 JPEG, and the geometry is welded and
decimated to 14 %. Each arrives at 433k triangles and 15 MB and ships at 60k
and about 1.5 MB, in line with the chairs. The trotting foal is a hand-built
mesh rather than a scan and arrived clean at 50k triangles, so it is not
decimated at all — only its maps are dropped, and it ships at 1.07 MB, the
smallest thing on the shelf that is not a primitive.

Dropping a map means owning the **factor it was overriding**, which is the step
that is easy to miss and turns everything black. glTF defaults `metallicFactor`
to 1, and a fully metallic surface has no diffuse term at all — albedo × (1 −
metalness) is zero — so the base colour never reaches a pixel and all that is
left is a rough specular off whatever analytic lights there are. With no
environment map that is very nearly black. Nothing looks wrong until the map
that had been overriding the factor per texel is the one you just deleted: the
chairs and the car still ship a metal-roughness map and so were never affected,
which is exactly why four dark animals beside them read as four bad meshes
rather than as one missing line in the bake.

## Tests

`npm test` builds the app, serves the build on port 4319, runs Playwright
against it and takes the server down again. Nothing to start first, and no
`playwright install` — the browsers are already on the machine and the
dependency is pinned to the version they belong to.

```
tests/harness.ts     the fixture and the helpers
tests/smoke.spec.ts  proof that the harness works end to end
tests/sky.spec.ts    the two claims about the air a screenshot cannot settle
```

The sky spec is worth a note. Most of the sky is a picture and a picture is
checked by looking at it; these two are the claims the air knob makes that
looking cannot settle, and both are the kind of thing that goes quietly wrong —
a fog that reaches nothing, a star pass that never runs. Take the air away and
the frame has to *change* and still have a range in it (a vacuum is not an off
switch), and turning the catalogue off at the bottom of that knob has to change
the frame again — because if it does not, the stars were never being drawn.

**What is covered:** whatever the specs in `tests/` assert, and nothing else.
This suite began as a net under work that had none — the per-object
materials, the stepped wash, the preset deck, the ground plane — so treat a
green run as "the things somebody wrote down still work", not as "the app
works".

**What is not covered, and will not be by anything in here:** two thumbs at
once. The suite drives a mouse-shaped pointer at phone size, which exercises
the pointer-event paths every input shares, but look-and-walk together is the
one gesture this tool is built around and Playwright moves one pointer at a
time. Nothing here says whether that still works.

Two things about the app make it awkward to test, and the harness answers each
of them rather than working around them:

- **It is one canvas.** Most of what this tool does leaves no DOM behind at
  all. So `fingerprint()` reads the canvas back — coarse cell averages, which
  the renderer's `preserveDrawingBuffer` makes possible — and that is the only
  assertion that covers the shader, the ink, the wash and the page.
- **The exact answer is in the file.** `readSceneBundle()` exports the scene
  through the app's own button and parses the PSPV manifest in node, which is
  how a spec says a box is 2.5 m rather than "the picture changed". The
  dev-only handles this README describes above (`window.__store`, `__pick`,
  `__forceMesh`) are **not** there: the suite runs against a production build,
  which is the thing that ships.
- **Some of it happens on a timer.** The deck deals itself, so for a spec the
  page can change while it waits for anything at all. There is a localStorage
  key for it (`kjg-perspective-deal`), the same seam the opening page's own pin
  already uses: the harness stands the dealer down for every spec, and the two
  specs that are *about* the deck step it one deal at a time through the same
  key. That is also the only way in — there is no button any more, and no store
  handle in a production build.

The rest of `harness.ts` is a list of ways this app can be tested wrongly, each
with the reason attached: the page has to be pinned before the app reads its own
storage, the chrome fades after six seconds and a click on it lands on
the scene instead, "Tools" is a toggle, the same `aria-label` is on two
different buttons, a Scrub is dragged and reads out only while held, a box is
two drags and both have to land on the floor. Read them before writing a spec;
every one of them cost a run before it was written down.

There are no retries, on purpose. A test that only passes sometimes teaches
people that red means nothing, which is worse than not having the test.

Which is exactly how five of them came to be ignored. `blockOutABox` lifts its
strokes clear of whatever the panel slot is holding, and it found that panel
with `closest('div[class*="rounded-"]')` — a **substring** match on the class
attribute. The dock's clusters carry
`[@media(max-height:560px)]:rounded-[1.125rem]`: a rule that is inert on any
screen taller than 560 px, on an element that is `display: contents` and
therefore reports a zero-sized rect at the origin. So the ceiling came back as
−30, every stroke was lifted six hundred pixels to clear a panel at the top of
the screen that does not exist, both ends landed off the glass, and five specs
failed with "a stroke missed the floor" — which was true, unhelpful, and had
nothing to do with the software renderer they were blamed on for weeks. A
zero-height ancestor is not a panel.
