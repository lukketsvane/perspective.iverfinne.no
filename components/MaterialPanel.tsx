import React from 'react';
import { useStore } from '../store';
import { I } from './icons';
import { Scrub } from './controls';
import { selectionMaterial, type Surface } from '../types';

/**
 * The drawn page's own settings, for one rung of the ladder.
 *
 * Two of the five surface rungs are not one look but a family of them, and the
 * difference between a good hatch and a bad one is four numbers. Guessing them
 * once and shipping the guess would be shipping one etching; the point of an
 * instrument is that you can find the one the drawing wants.
 *
 * WHICH rung is the caller's to say, and it is not always the scene's. The
 * knobs are reached from two places now - the tools band, where the question is
 * what the whole page is made of, and the selection bar, where it is what the
 * thing in your hand is drawn on - and those two disagree the moment an object
 * overrules the scene. Reading the scene's rung here would have answered the
 * second question with the first one's answer, and shown an empty panel
 * whenever the scene was on a rung with nothing to set.
 *
 * What it edits is the page's either way: one hue, one hatch rule, ruling every
 * stroke in the scene drawn on that rung. Opening them from an object is a way
 * of reaching them, not a claim that they belong to it.
 *
 * Every control is the same drag as the lights': the reading appears over the
 * thumb while it moves and is gone when it lifts, so there is no writing on
 * the screen at rest.
 *
 * It stands in the same slot as the tools and the lights, which is the same
 * argument all three make - you cannot judge a hatch angle from a menu, only
 * from the drawing behind it, so the drawing has to stay visible and live
 * while the thumb is down.
 */
export const MaterialPanel: React.FC<{ surface: Surface; from: 'scene' | 'selection' }> = ({
  surface,
  from,
}) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const scenePen = useStore((s) => s.pen);
  const sceneWash = useStore((s) => s.wash);
  const sceneMarker = useStore((s) => s.marker);
  const sceneHatch = useStore((s) => s.hatch);
  const own = useStore(selectionMaterial);
  const setSceneMarker = useStore((s) => s.setMarker);
  const setSceneHatch = useStore((s) => s.setHatch);
  const setScenePen = useStore((s) => s.setPen);
  const setSceneWash = useStore((s) => s.setWash);
  const setSelectionMaterial = useStore((s) => s.setSelectionMaterial);
  const followPageMaterial = useStore((s) => s.followPageMaterial);
  const beginChange = useStore((s) => s.beginChange);
  const skin = { dark, touch: true };

  /*
   * WHOSE SETTINGS THESE ARE.
   *
   * The same panel, opened from two places that mean two different questions.
   * From the tools band it is the page: one write, every object that has not
   * been set apart follows. From the selection bar it is the thing in your
   * hand, and turning a knob there copies the page's settings onto it and
   * edits the copy - so setting the hatch angle on one figure stops setting it
   * on every figure in the scene drawn that way.
   *
   * Reading is the same shape as `selectionSurface` one level up: its own if
   * it has one, the page's behind it. So the knobs never jump when an object
   * steps off the page - what it was already being drawn with is exactly what
   * it starts from.
   */
  const mine = from === 'selection';
  const pen = (mine && own?.pen) || scenePen;
  const marker = (mine && own?.marker) || sceneMarker;
  const hatch = (mine && own?.hatch) || sceneHatch;
  const wash = (mine && own?.wash) || sceneWash;

  /*
   * One history step for a whole drag, taken as it starts.
   *
   * An object's settings are part of the scene, so they belong in the undo
   * stack - and a drag writes on every frame, so recording inside the write
   * would put two hundred steps in it. Same bracket every other drag in the
   * app uses. The page's own settings take none, being settings rather than
   * scene, which is how the backdrop and the lamps behave too.
   */
  const start = () => { if (mine) beginChange(); };
  const setPen = (p: Parameters<typeof setScenePen>[0]) =>
    mine ? setSelectionMaterial({ pen: p }) : setScenePen(p);
  const setMarker = (m: Parameters<typeof setSceneMarker>[0]) =>
    mine ? setSelectionMaterial({ marker: m }) : setSceneMarker(m);
  const setHatch = (h: Parameters<typeof setSceneHatch>[0]) =>
    mine ? setSelectionMaterial({ hatch: h }) : setSceneHatch(h);
  const setWash = (w: Parameters<typeof setSceneWash>[0]) =>
    mine ? setSelectionMaterial({ wash: w }) : setSceneWash(w);

  /*
   * The one control that only exists when the selection has stepped off.
   *
   * Without it a thing touched once is set apart for good, and the only way
   * back would be matching the page's numbers by eye. It also does the work of
   * SAYING that it has stepped off: the knobs look identical either way, so
   * this appearing is how you know the drag you just made changed one object
   * rather than the page.
   */
  const rejoin = mine && own && (
    <button
      onClick={followPageMaterial}
      aria-label="Draw this with the page's own settings again"
      className={`h-11 px-3 rounded-full border text-[11px] tracking-wide ${
        dark
          ? 'border-white/15 text-white/70 hover:text-white'
          : 'border-black/15 text-black/60 hover:text-black'
      }`}
    >
      follows its own
    </button>
  );

  /*
   * The pen, on every drawn page, above whatever that page lays under it.
   *
   * The line is one shader across brush, marker and hatch - they differ only
   * in what goes UNDER it - so these four are the same four wherever they are
   * opened from, and changing them on the etched page changes the brush page
   * too. One hand, one pen.
   *
   * They were constants until now, which meant the mark that carries a drawing
   * more than any other was the one thing about it nobody could set.
   */
  const nib = (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <Scrub
        skin={skin}
        onFirstChange={start}
        icon={I.outline}
        // Zero is not "very thin": it lifts the contour off the page entirely,
        // which on an etched page is the tonal engraving whose every edge is
        // found by where the strokes stop.
        label="How heavy the outline is"
        reading={pen.outline < 0.01 ? 'none' : pen.outline.toFixed(1)}
        value={pen.outline}
        min={0}
        max={7}
        step={0.1}
        onChange={(outline) => setPen({ outline })}
      />
      <Scrub
        skin={skin}
        onFirstChange={start}
        icon={I.formLines}
        label="How many lines follow the form"
        reading={pen.formCount < 0.5 ? 'none' : Math.round(pen.formCount).toString()}
        value={pen.formCount}
        min={0}
        max={6}
        step={1}
        onChange={(formCount) => setPen({ formCount })}
      />
      <Scrub
        skin={skin}
        onFirstChange={start}
        icon={I.formLines}
        // The pen offered a weight for the outline and only a strength for the
        // other two, which reads as though the other two have no weight. It
        // does not start at zero: below 0.35 it meets the shader's own clamp
        // and stops changing, and a dead bottom is the lie the stroke weight
        // told for a year.
        label="How heavy those lines are"
        reading={pen.formWidth.toFixed(2)}
        value={pen.formWidth}
        min={0.4}
        max={3}
        step={0.05}
        onChange={(formWidth) => setPen({ formWidth })}
      />
      <Scrub
        skin={skin}
        onFirstChange={start}
        icon={I.wash}
        label="How dark those lines are"
        reading={`${Math.round(pen.formStrength * 100)}%`}
        value={pen.formStrength}
        min={0}
        max={1}
        step={0.01}
        onChange={(formStrength) => setPen({ formStrength })}
      />
      <Scrub
        skin={skin}
        onFirstChange={start}
        icon={I.terminator}
        label="How strongly the light's edge is drawn"
        reading={pen.terminator < 0.01 ? 'none' : `${Math.round(pen.terminator * 100)}%`}
        value={pen.terminator}
        min={0}
        max={1}
        step={0.01}
        onChange={(terminator) => setPen({ terminator })}
      />
      <Scrub
        skin={skin}
        onFirstChange={start}
        icon={I.terminator}
        // A whole mark rather than a thickness on the rungs that spot their
        // blacks in: the fill's edge sits on the same crossing and the pen runs
        // in paper inside it, so this widens a paired ink-and-white line into a
        // drawn core shadow. It cannot be taken to none - the strength beside
        // it is still the off switch.
        label="How heavy the light's edge is"
        reading={pen.terminatorWidth.toFixed(1)}
        value={pen.terminatorWidth}
        min={0.5}
        max={5}
        step={0.1}
        onChange={(terminatorWidth) => setPen({ terminatorWidth })}
      />
      {rejoin}
    </div>
  );

  /** The pen above, the page's own below, with a hairline between. */
  const page = (own?: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      {nib}
      {own && (
        <div
          className={`flex flex-wrap items-center justify-center gap-1 border-t pt-1 ${
            dark ? 'border-white/10' : 'border-black/10'
          }`}
        >
          {own}
        </div>
      )}
    </div>
  );

  if (surface === 'marker') {
    return page(
      <>
        <Scrub
          skin={skin}
          onFirstChange={start}
          icon={I.hue}
          label="The marker's colour"
          reading={`${Math.round(marker.hue)}°`}
          value={marker.hue}
          min={0}
          max={360}
          step={1}
          wrap
          onChange={(hue) => setMarker({ hue })}
        />
        <Scrub
          skin={skin}
          onFirstChange={start}
          icon={I.wash}
          label="How far up the light the colour goes"
          reading={`${Math.round(marker.high * 100)}%`}
          value={marker.high}
          min={0.02}
          max={0.98}
          step={0.01}
          onChange={(high) => setMarker({ high })}
        />
        <Scrub
          skin={skin}
          onFirstChange={start}
          icon={I.wash}
          // Not to zero: at nothing the stain is a neutral grey and the hue
          // beside it stops meaning anything, which is a knob that does nothing
          // sitting next to one that works.
          label="How much colour is in it"
          reading={`${Math.round(marker.chroma * 100)}%`}
          value={marker.chroma}
          min={0.05}
          max={0.85}
          step={0.01}
          onChange={(chroma) => setMarker({ chroma })}
        />
      </>
    );
  }

  /*
   * The flat tone under the line, on the two rungs it draws on.
   *
   * Deliberately NOT on marker: the stain covers everything below its own
   * threshold and the tone is largest in exactly that band, so the knob would
   * be a knob that does nothing - which is the complaint this panel has just
   * been through twice.
   */
  const washKnobs = (
    <>
      <Scrub
        skin={skin}
        onFirstChange={start}
        icon={I.ground}
        // Under about 0.2 the shader's own 0.16 ceiling puts it below three per
        // cent ink and it is invisible, so that is where the reading says none.
        label="How much flat tone lies under the line"
        reading={wash.amount < 0.2 ? 'none' : `${Math.round(wash.amount * 100)}%`}
        value={wash.amount}
        min={0}
        max={1}
        step={0.01}
        onChange={(amount) => setWash({ amount })}
      />
      <Scrub
        skin={skin}
        onFirstChange={start}
        icon={I.hatchWidth}
        label="How many steps it is laid in"
        reading={Math.round(wash.steps).toString()}
        value={wash.steps}
        min={1}
        max={6}
        step={1}
        onChange={(steps) => setWash({ steps })}
      />
    </>
  );

  if (surface === 'brush') return page(washKnobs);

  if (surface === 'hatch') {
    // Both rows wrap: five of these at their smallest were already a whisker
    // over a 320 px screen, and the pen's four sit above them now.
    return page(
      <>
        <Scrub
          skin={skin}
          onFirstChange={start}
          icon={I.hatchAngle}
          label="Which way the strokes run"
          reading={`${Math.round(hatch.angle)}°`}
          value={hatch.angle}
          min={0}
          max={180}
          step={1}
          wrap
          onChange={(angle) => setHatch({ angle })}
        />
        <Scrub
          skin={skin}
          onFirstChange={start}
          icon={I.hatchCross}
          // Held off 0 and 90's far side: at nothing the second pass lands on
          // the first and the shadow just thickens, which is the zebra this
          // crossing exists to replace. Near square is the engraver's lattice,
          // shallow is a pen's directional weave - the range is the two hands.
          label="How far the crossing turns"
          reading={`${Math.round(hatch.cross ?? 68)}°`}
          value={hatch.cross ?? 68}
          min={12}
          max={90}
          step={1}
          onChange={(cross) => setHatch({ cross })}
        />
        <Scrub
          skin={skin}
          onFirstChange={start}
          icon={I.hatchSpacing}
          label="How far apart the strokes are"
          reading={hatch.spacing.toFixed(1)}
          value={hatch.spacing}
          min={2}
          max={22}
          step={0.5}
          onChange={(spacing) => setHatch({ spacing })}
        />
        <Scrub
          skin={skin}
          onFirstChange={start}
          icon={I.hatchWidth}
          // From ONE, not from a quarter. The shader takes max(hatchWidth, 1.0)
          // - one page pixel is where a line stops being a suggestion of a line
          // - so everything from 0.25 to 1.0 drew at one identical weight, and
          // a quarter of this knob's travel did nothing at all. Two pages in
          // the old deck sat in that dead band and were the same page.
          label="How heavy each stroke is"
          reading={hatch.width.toFixed(2)}
          value={hatch.width}
          min={1}
          max={3}
          step={0.05}
          onChange={(width) => setHatch({ width })}
        />
        <Scrub
          skin={skin}
          onFirstChange={start}
          icon={I.hatchLength}
          // Zero is the unbroken rule, which is why the range starts there
          // rather than at the shortest stroke worth drawing.
          label="How long each stroke runs before it lifts"
          reading={hatch.length < 1 ? '∞' : Math.round(hatch.length).toString()}
          value={hatch.length}
          min={0}
          max={160}
          step={2}
          onChange={(length) => setHatch({ length })}
        />
        {washKnobs}
      </>
    );
  }

  // The two solid rungs: whatever the file says, or that with the texture off.
  // Neither is drawn, so neither has a pen.
  return page();
};
