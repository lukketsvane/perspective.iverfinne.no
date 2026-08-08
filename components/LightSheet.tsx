import React from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { Sheet } from './Sheet';
import { Scrub } from './controls';
import { ACTIVE, iconButton } from './ui';
import type { SunState } from '../types';

/**
 * The lights, taken apart.
 *
 * Everything about the sun was set by a three-finger drag, which could move it
 * and nothing else: no way to soften it, warm it, or turn its shadows off, and
 * no second light at all. This is that, as five controls each - bearing,
 * height, strength, colour temperature - laid out the same way for both lamps,
 * so the second reads as the same instrument as the first.
 *
 * Every control is a drag: the reading appears above the thumb while it moves
 * and goes when it lifts, so nothing is written on the screen at rest.
 */
const Lamp: React.FC<{
  light: SunState;
  dark: boolean;
  onChange: (light: Partial<SunState>) => void;
  /** The sun's shadows can be switched off; a fill never casts any. */
  shadows?: boolean;
}> = ({ light, dark, onChange, shadows = false }) => {
  const skin = { dark, touch: true };
  return (
    <div className="flex items-center justify-center gap-1">
      <Scrub
        skin={skin}
        icon={I.bearing}
        label="Bearing"
        reading={`${Math.round(light.azimuth)}°`}
        value={light.azimuth}
        min={0}
        max={360}
        step={1}
        wrap
        onChange={(azimuth) => onChange({ azimuth })}
      />
      <Scrub
        skin={skin}
        icon={I.elevation}
        label="Height above the horizon"
        reading={`${Math.round(light.elevation)}°`}
        value={light.elevation}
        min={2}
        max={89}
        step={1}
        onChange={(elevation) => onChange({ elevation })}
      />
      <Scrub
        skin={skin}
        icon={I.strength}
        label="Strength"
        reading={light.intensity.toFixed(1)}
        value={light.intensity}
        min={0}
        max={12}
        step={0.1}
        onChange={(intensity) => onChange({ intensity })}
      />
      <Scrub
        skin={skin}
        icon={I.kelvin}
        label="Colour temperature"
        reading={`${Math.round(light.temperature / 50) * 50}K`}
        value={light.temperature}
        min={1800}
        max={12000}
        step={50}
        onChange={(temperature) => onChange({ temperature })}
      />
      {shadows && (
        <button
          onClick={() => onChange({ shadows: !light.shadows })}
          aria-label="Cast shadows"
          className={`${iconButton(dark)} ${light.shadows ? ACTIVE : 'opacity-40'}`}
        >
          <Icon path={I.shadow} className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export const LightSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const dark = useStore((s) => s.theme) === 'dark';
  const sun = useStore((s) => s.sun);
  const setSun = useStore((s) => s.setSun);
  const fill = useStore((s) => s.fill);
  const setFill = useStore((s) => s.setFill);

  return (
    // Hugging: this is ten knobs in two rows and nothing else, so the panel is
    // ten knobs wide. It used to be a full-width sheet with the controls
    // huddled in the middle of it and forty pixels of nothing overhead, held
    // clear so a reading would not be clipped - which is a lot of the view to
    // cover up in order to move the sun.
    <Sheet onClose={onClose} hug>
      <div className="flex flex-col gap-1 px-2 pb-3">
        <Lamp light={sun} dark={dark} onChange={setSun} shadows />

        <div className={`h-px mx-6 ${dark ? 'bg-white/15' : 'bg-black/10'}`} />

        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setFill({ enabled: !fill.enabled })}
            aria-label="Second light"
            className={`${iconButton(dark)} ${fill.enabled ? ACTIVE : 'opacity-40'}`}
          >
            <Icon path={I.fill} className="w-5 h-5" />
          </button>
          <div className={fill.enabled ? '' : 'opacity-30 pointer-events-none'}>
            <Lamp light={fill} dark={dark} onChange={setFill} />
          </div>
        </div>
      </div>
    </Sheet>
  );
};
