<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Perspective reference

A reference guide for practising perspective, set up the way Kim Jung Gi teaches
it in his lectures: real-world metres, boxes, and a camera that stands where a
person stands.

## The drills

Setup opens on a row of studies. Each one loads as a whole shot — geometry, eye
level, lens and where to stand, because one-point only looks like one-point from
square on:

| Study | What it is for |
| --- | --- |
| **The horizon** | A cube below, at and above eye level. The top face closes to a line as it reaches the horizon, then opens again as the underside. |
| **Two point street** | Every box shares one pair of vanishing points; any two parallel edges meet on the horizon, left and right. |
| **One point corridor** | Square to the boxes, one pair of edges stops converging altogether and everything else runs to a single point ahead. |
| **Every box its own pair** | Eight cubes on eight headings — eight pairs of vanishing points, all landing on the same horizon. |
| **Looking up** | Off eye level with the gaze tilted: verticals stop being vertical and run to a third point overhead. |
| **Foreshortening ladder** | The same 1 m cube at 2, 4, 8, 16 and 32 m. Doubling the distance halves the height. |
| **A room at 1:1** | A 0.75 m table, a 0.45 m seat, a 2.0 m door — everyday sizes, to check the ones in your head against. |

**Sandbox** goes back to the eleven loose cubes.

## The defaults

Open it and you get cubes, nothing else. Everything past that is a deliberate
switch in the **Practice** panel (the sliders icon in the right rail).

| | Default | Why |
| --- | --- | --- |
| Geometry | 1 × 1 × 1 m cubes | The cube is the unit you measure a drawing with. Slabs, pillars, beams and blocks are one tap away, but you have to ask. |
| Eye level | 1.90 m above the ground | A tall standing observer. Presets for 1.2 m (seated), 1.6 m (average standing), 1.9 m and 2.5 m (raised), plus a free slider up to 6 m. |
| Gaze | Locked level | Camera and orbit target sit at the same height, so the line of sight is horizontal: verticals stay vertical and the scene reads as clean 2-point perspective with the horizon on your eye level. Unlock it to climb off eye level and pick up the third vanishing point. |
| Projection | Straight lines | Rectilinear perspective, the thing you actually rule on paper. The 5-point curvilinear projection is a mode you switch into. |
| Lens | 60° | The cone of vision. Past roughly 90° the edges stretch, which is where curvilinear starts to earn its keep. |
| Guides | Horizon line, 1 m ground grid, 1.75 m figure | The horizon is drawn at the camera's own height, so every horizontal vanishing point in the scene sits on it. The 60° cone of vision is there too, one tap away. |
| Edits | Snap to 0.25 m | A box ends up 1.75 m tall rather than 1.73 — the difference between a reference you can measure against and one you cannot. Switch to free sizing in the panel. |

How you have the tool set up — eye level, guides, theme, lens, snap — is remembered
between sessions. What is in the scene is not: reload and you are back to the
cubes, in straight-line perspective, with the camera off.

The opening arrangement is fixed rather than random, so it works as a reference:
most cubes are grid-aligned and share one pair of vanishing points, two are
turned off-axis with their own pairs, a three-cube stack crosses the horizon so
you can watch a top face flip to an underside, and one cube sits far back as a
foreshortening check.

## On a phone

Add it to the Home Screen and it runs full screen with its own icon. The bar
along the bottom is the whole interface: add a cube where you are looking, walk
the scene, open the mesh library, setup, more. No words on any of it.

There is no AR. Safari has no WebXR, and the AR Quick Look route - export a
USDZ, hand it to Apple's viewer - was tried and taken back out: it leaves the
app, and what comes back is not the tool.

## Walking it at 1:1

The figure icon in the right rail drops you into the scene in first person, at
whatever eye height is set — so the reference stops being a model on a screen
and becomes a room you are standing in. Turn with the phone (iOS asks for motion
permission on the way in; refuse it and you get drag-to-look), walk with the
thumbstick or WASD, and the horizon stays pinned to your eyes as you move. The
stick appears wherever your left thumb lands and the right side of the screen
looks, so both work at once; with the camera on, the virtual lens is matched to
the real one so the cubes stay planted as you turn.

### Matching the room

With the camera on, the virtual lens has to match the real one or the cubes
slide against the floor every time you turn. Three things do that, under the
sun icon:

- **Height** — where the phone actually is off the floor, to the centimetre.
  This is what sets the virtual floor onto the real one.
- **Lens** — the angle the camera covers. No browser reports focal length, so
  it starts at 63° (a phone main camera) and is adjustable by hand until a real
  edge and the grid agree. The crop matters as much as the angle: the video is
  painted object-cover, so a 640 × 480 stream in a portrait window is showing
  less than half its width, and the match accounts for that.
- **Recentre** — drops the study's origin under your feet and re-zeros the
  compass, which is the whole of the alignment that can be done without
  positional tracking.

The **lock** freezes the framed view: the phone can be turned, put down or drawn
from and the scene holds still.

Precision has a ceiling here, and it is worth being plain about it. The phone
reports orientation, not position, so turning is tracked and *walking is not* —
step sideways and the scene does not shift with parallax. That is a limit of
what a browser can see, not a setting.

The bottom bar has the things you need standing up:

- **Height** — tap to cycle 1.2 / 1.6 / 1.9 / 2.5 m, or set it exactly under the
  sun icon.
- **Camera** — the live rear camera behind the scene. Off by default, in every
  mode: the reference reads better on a clean field, and the camera is there
  for when you want the metric grid and the horizon lying over the actual floor
  you are standing on. Needs https and permission.
- **Exit** — back to the drawing board (Escape works too).

The link carries the study, so a scene composed on a laptop opens on the phone:
*Send link* in More, then open it there. Nothing is uploaded — it rides in the
URL fragment.

## Meshes

The centre button opens the library: nine figures to drop into the scene, and a
tile for your own files. Import as many at once as you like — **GLB/glTF** or
USDZ — and nothing lands on top of anything else; each one takes the nearest
free spot to where you are looking.

The library files are all normalised to exactly 1.70 m tall whatever the pose,
which is meaningless for anything that is not standing up — a figure kneeling
face-down is about a metre tall, and at face value it arrives as a giant. So
each one carries the height its pose really has (1.15 m squatting, 1.00 m folded
forward, 1.25 m seated, 1.30 m kneeling upright, 1.70 m standing) and is scaled
to it on the way in.

**Matte**, at the top of the library, replaces model materials with plain white.
Photographed skin and fabric is a lot of information to draw past; switched off,
a figure reads as form and value only, which is what it is doing in a scene full
of white boxes.

Models arrive at the size the file says, which is often not the size you want,
so a selected model gets a scale slider in the selection bar with its height in
metres above it. Double-click the slider to go back to 1:1. Drag a model to
slide it along the floor, and turn it with the arrows.

Nothing is uploaded anywhere — files are read in the browser. three.js only
reads the ASCII flavour of USDZ, so a binary *crate* USDZ will not draw; use
GLB.

## Handling

- **Orbit / zoom** — drag, scroll or pinch.
- **Add a cube** — double-tap the ground. New cubes land grid-aligned, so they
  share the scene's vanishing points.
- **Resize** — tap a box to select it, then drag a face to push or pull it. Its
  size in metres counts up under your thumb in the selection bar, snapped to
  0.25 m.
- **Turn** — the arrows in the selection bar, or `R` / `shift+R`, in 15° steps.
  A box off the grid gets its own pair of vanishing points, which is half of
  what makes a box study worth drawing. `Delete` removes the selection,
  `Escape` clears it.
- **Save the view** — writes the frame to a PNG so you can draw from it on paper
  or a second screen. The 3D guides are in the image; the on-screen chrome is not.
- **Lens** — 3-finger vertical drag changes the field of view. Curvature is only
  ever a deliberate mode switch, never a side effect.
- **Reset to cubes** — bottom of the Practice panel.

Image and text prompts (the sparkle and pen icons) build denser scenes with
Gemini. Those are opt-in too, and they append to whatever is already there.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
   (only needed for the image and text prompt features)
3. Run the app:
   `npm run dev`

View the app in AI Studio: https://ai.studio/apps/drive/1bMglJLnxs7e9Sk7vwzxeWNT7TQFtmiJF
