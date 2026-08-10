import React from 'react';
import { useStore } from '../store';
import { I } from './icons';
import { Scrub } from './controls';

/**
 * The drawn page's own settings.
 *
 * Two of the five surface rungs are not one look but a family of them, and the
 * difference between a good hatch and a bad one is four numbers. Guessing them
 * once and shipping the guess would be shipping one etching; the point of an
 * instrument is that you can find the one the drawing wants.
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
export const MaterialPanel: React.FC = () => {
  const dark = useStore((s) => s.theme) === 'dark';
  const surface = useStore((s) => s.surface);
  const marker = useStore((s) => s.marker);
  const hatch = useStore((s) => s.hatch);
  const setMarker = useStore((s) => s.setMarker);
  const setHatch = useStore((s) => s.setHatch);
  const skin = { dark, touch: true };

  if (surface === 'marker') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Scrub
          skin={skin}
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
          icon={I.wash}
          label="How far up the light the colour goes"
          reading={`${Math.round(marker.high * 100)}%`}
          value={marker.high}
          min={0.02}
          max={0.98}
          step={0.01}
          onChange={(high) => setMarker({ high })}
        />
      </div>
    );
  }

  if (surface === 'hatch') {
    return (
      // Wrapping, because five knobs at their smallest are a whisker over a
      // 320 px screen and a knob pushed off the edge is not a knob.
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Scrub
          skin={skin}
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
          icon={I.hatchCross}
          label="How far the crossing layers are turned off the first"
          reading={`${Math.round(hatch.cross)}°`}
          value={hatch.cross}
          min={8}
          max={90}
          step={1}
          onChange={(cross) => setHatch({ cross })}
        />
        <Scrub
          skin={skin}
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
          icon={I.hatchWidth}
          label="How heavy each stroke is"
          reading={hatch.width.toFixed(2)}
          value={hatch.width}
          min={0.25}
          max={3}
          step={0.05}
          onChange={(width) => setHatch({ width })}
        />
        <Scrub
          skin={skin}
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
      </div>
    );
  }

  return null;
};
