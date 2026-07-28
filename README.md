<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Perspective reference

A reference guide for practising perspective, set up the way Kim Jung Gi teaches
it in his lectures: real-world metres, boxes, and a camera that stands where a
person stands.

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
| Guides | Horizon line, 1 m ground grid, 1.75 m figure | The horizon is drawn at the camera's own height, so every horizontal vanishing point in the scene sits on it. |

The opening arrangement is fixed rather than random, so it works as a reference:
most cubes are grid-aligned and share one pair of vanishing points, two are
turned off-axis with their own pairs, a three-cube stack crosses the horizon so
you can watch a top face flip to an underside, and one cube sits far back as a
foreshortening check.

## Handling

- **Orbit / zoom** — drag, scroll or pinch.
- **Add a cube** — double-tap the ground. New cubes land grid-aligned, so they
  share the scene's vanishing points.
- **Resize** — tap a box to select it, then drag a face to push or pull it. The
  selected box's dimensions in metres show in the top-right readout.
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
