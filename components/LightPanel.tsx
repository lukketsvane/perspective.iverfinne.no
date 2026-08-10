import React from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { Scrub } from './controls';
import { ACTIVE, iconButton } from './ui';
import { SHADOW_KINDS, type LampData, type SunState } from '../types';

/**
 * Every light in the scene, in one place.
 *
 * There used to be two panels' worth of two different ideas. The sun and the
 * fill were *settings*, edited here; a placed lamp was a scene *object*, edited
 * from the selection bar when you happened to have it in your hand. Which
 * meant the answer to "how bright is this room" was in two places, the two
 * kinds of light had two different sets of knobs for the same four numbers,
 * and there was no view of the lighting as a whole - which is the only view
 * that matters when you are lighting something.
 *
 * So it is one list. The rail across the top is every light there is: the key,
 * the fill, and each lamp you have stood somewhere. Tap one to bring it under
 * the knobs. The knobs are the same knobs for all of them, because a light is
 * a light - the only genuine difference is that a sun is *aimed*, being
 * infinitely far away, and a lamp is *placed*, so a sun has a bearing and a
 * height above the horizon where a lamp has a spot on the floor and a cone.
 *
 * The two that are there when the tool opens are not privileged. They are the
 * two lights the opening scene happens to contain, with the same controls and
 * the same switch as anything you add.
 */

/** One light's knobs. The four every light has, then what only some have. */
const Knobs: React.FC<{
  light: SunState;
  dark: boolean;
  onChange: (light: Partial<SunState>) => void;
  /** A key light's shadows step off / hard / soft; nothing else casts any. */
  shadows?: boolean;
  /** Aimed rather than placed: a sun has a height above the horizon. */
  aimed?: boolean;
}> = ({ light, dark, onChange, shadows = false, aimed = true }) => {
  const skin = { dark, touch: true };
  return (
    // Wrapping: five knobs at their smallest are a whisker over a 320 px
    // screen, and a knob pushed off the edge is not a knob.
    <div className="flex flex-wrap items-center justify-center gap-1">
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
      {aimed && (
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
      )}
      <Scrub
        skin={skin}
        icon={I.strength}
        label="Strength"
        reading={light.intensity.toFixed(1)}
        value={light.intensity}
        min={0}
        max={aimed ? 12 : 60}
        step={aimed ? 0.1 : 0.5}
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
          onClick={() =>
            onChange({
              shadows: SHADOW_KINDS[(SHADOW_KINDS.indexOf(light.shadows) + 1) % SHADOW_KINDS.length],
            })
          }
          aria-label={`Cast shadows: ${light.shadows}`}
          className={`${iconButton(dark)} ${light.shadows !== 'off' ? ACTIVE : 'opacity-40'}`}
        >
          <Icon path={light.shadows === 'hard' ? I.shadowHard : I.shadow} className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

/** A lamp, said in the sun's own four numbers so one set of knobs fits both. */
const asLight = (lamp: LampData): SunState => ({
  azimuth: (lamp.aim * 180) / Math.PI,
  elevation: 45,
  intensity: lamp.intensity,
  temperature: lamp.temperature,
  shadows: 'off',
});

export const LightPanel: React.FC = () => {
  const dark = useStore((s) => s.theme) === 'dark';
  const sun = useStore((s) => s.sun);
  const setSun = useStore((s) => s.setSun);
  const fill = useStore((s) => s.fill);
  const setFill = useStore((s) => s.setFill);
  const lamps = useStore((s) => s.lamps);
  const updateLamp = useStore((s) => s.updateLamp);
  const removeLamp = useStore((s) => s.removeLamp);
  const selectLamp = useStore((s) => s.selectLamp);
  const selectedLampId = useStore((s) => s.selectedLampId);

  /*
   * Which light is under the knobs.
   *
   * A lamp taken hold of in the scene is the one being edited here too - the
   * panel and the selection are one idea. With nothing in hand it falls back
   * to the key light, which is the one anybody reaching for a light panel
   * wants first.
   */
  const [picked, setPicked] = React.useState<'sun' | 'fill'>('sun');
  const lamp = lamps.find((l) => l.id === selectedLampId) ?? null;
  const chip = (on: boolean) =>
    `${iconButton(dark)} shrink-0 ${on ? ACTIVE : 'opacity-45'}`;

  return (
    <div className="flex flex-col gap-1 max-w-full min-w-0">
      {/* Every light there is, in one rail. It scrolls, because a scene may
          have a dozen lamps in it and a rail that wraps would push the knobs
          off the bottom of the phone. */}
      <div className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setPicked('sun'); selectLamp(null); }}
          aria-label="The key light"
          aria-pressed={!lamp && picked === 'sun'}
          className={chip(!lamp && picked === 'sun')}
        >
          <Icon path={I.light} className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setPicked('fill'); selectLamp(null); }}
          aria-label="The fill light"
          aria-pressed={!lamp && picked === 'fill'}
          className={chip(!lamp && picked === 'fill')}
        >
          <Icon path={I.fill} className="w-5 h-5" />
        </button>
        <div className={`w-px self-stretch my-1.5 shrink-0 ${dark ? 'bg-white/15' : 'bg-black/10'}`} />
        {lamps.map((l, i) => (
          <button
            key={l.id}
            onClick={() => selectLamp(l.id)}
            aria-label={`Lamp ${i + 1}`}
            aria-pressed={lamp?.id === l.id}
            className={chip(lamp?.id === l.id)}
          >
            <Icon path={l.kind === 'spot' ? I.lampSpot : I.lampBulb} className="w-5 h-5" />
          </button>
        ))}
        {lamps.length === 0 && (
          <span className={`px-2 text-[11px] whitespace-nowrap ${dark ? 'text-white/35' : 'text-black/35'}`}>
            <Icon path={I.lampBulb} className="w-4 h-4 inline-block align-[-3px] mr-1" />
            +
          </span>
        )}
      </div>

      <div className={`h-px mx-6 ${dark ? 'bg-white/15' : 'bg-black/10'}`} />

      {/* ...and the one that is picked, under the same knobs whichever it is. */}
      {lamp ? (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            onClick={() => updateLamp(lamp.id, { enabled: !lamp.enabled })}
            aria-label="Lamp on"
            aria-pressed={lamp.enabled}
            className={`${iconButton(dark)} ${lamp.enabled ? ACTIVE : 'opacity-40'}`}
          >
            <Icon path={I.power} className="w-5 h-5" />
          </button>
          <button
            onClick={() => updateLamp(lamp.id, { kind: lamp.kind === 'spot' ? 'bulb' : 'spot' })}
            aria-label={lamp.kind === 'spot' ? 'A spot, throwing a cone' : 'A bulb, shining every way'}
            className={iconButton(dark)}
          >
            <Icon path={lamp.kind === 'spot' ? I.lampSpot : I.lampBulb} className="w-5 h-5" />
          </button>
          <div className={lamp.enabled ? '' : 'opacity-30 pointer-events-none'}>
            <Knobs
              light={asLight(lamp)}
              dark={dark}
              aimed={false}
              onChange={(next) => {
                if (next.azimuth !== undefined) updateLamp(lamp.id, { aim: (next.azimuth * Math.PI) / 180 });
                if (next.intensity !== undefined) updateLamp(lamp.id, { intensity: next.intensity });
                if (next.temperature !== undefined) updateLamp(lamp.id, { temperature: next.temperature });
              }}
            />
          </div>
          <button
            onClick={() => removeLamp(lamp.id)}
            aria-label="Delete"
            className={`${iconButton(dark)} !text-red-500`}
          >
            <Icon path={I.trash} className="w-5 h-5" />
          </button>
        </div>
      ) : picked === 'fill' ? (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            onClick={() => setFill({ enabled: !fill.enabled })}
            aria-label="Second light"
            aria-pressed={fill.enabled}
            className={`${iconButton(dark)} ${fill.enabled ? ACTIVE : 'opacity-40'}`}
          >
            <Icon path={I.power} className="w-5 h-5" />
          </button>
          <div className={fill.enabled ? '' : 'opacity-30 pointer-events-none'}>
            <Knobs light={fill} dark={dark} onChange={setFill} />
          </div>
        </div>
      ) : (
        <Knobs light={sun} dark={dark} onChange={setSun} shadows />
      )}
    </div>
  );
};
