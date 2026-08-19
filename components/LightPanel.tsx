import React from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { Scrub } from './controls';
import { ACTIVE, iconButton } from './ui';
import { SHADOW_KINDS, SKY_LIMITS, type LampData, type SkyState, type SunState } from '../types';

/**
 * Every light in the scene, in one place - and the sky the whole scene stands
 * under, which is the other way of setting the biggest one of them.
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
 * the fill, the sky, and each lamp you have stood somewhere. Tap one to bring
 * it under the knobs. The knobs are the same knobs for all of them, because a
 * light is a light - the only genuine difference is that a sun is *aimed*,
 * being infinitely far away, and a lamp is *placed*, so a sun has a bearing
 * and a height above the horizon where a lamp has a spot on the floor and a
 * cone.
 *
 * THE SKY IS ON THAT RAIL AND IT IS NOT A LIGHT. It is there because it is the
 * other way of aiming the key - not by dragging it to where the drawing wants
 * it, but by naming a place and a moment and letting the sun be where the sun
 * actually is. See SkyKnobs below for what that costs and what it buys.
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
  /**
   * Whether these four numbers are being worked out rather than set.
   *
   * A simulated sun's bearing, height, strength and colour are all readings -
   * they say where the sun IS over that place at that moment. They used to
   * stay up, dimmed, as the clearest statement of what the light was doing;
   * four dead scrubs turned out to be four controls in the way on a phone, so
   * now they leave, and the sky pane - the place those numbers are actually
   * being decided - is their statement.
   */
  reading?: boolean;
}> = ({ light, dark, onChange, shadows = false, aimed = true, reading = false }) => {
  const skin = { dark, touch: true };
  return (
    // Wrapping: five knobs at their smallest are a whisker over a 320 px
    // screen, and a knob pushed off the edge is not a knob.
    <div className="flex flex-wrap items-center justify-center gap-1">
      {/* While the sky is aiming this light the four numbers are its readings,
          not yours, and four dead scrubs were four controls to read past on a
          phone. The pane above is where those numbers are being decided; what
          is left here is the one thing still yours to set. */}
      {!reading && (
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
      </div>
      )}
      {/* Outside the dead block on purpose: whether and how the shadows fall
          is a drawing decision, and it stays yours under a simulated sun. */}
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

/* ------------------------------------------------------------- the sky pane */

/**
 * A moment, said in the two numbers anybody actually thinks in.
 *
 * The store holds one epoch millisecond, which is the only representation that
 * can be compared, saved and handed to the solar equations without a timezone
 * argument. Nobody sets a light by typing an epoch millisecond. So the pane
 * offers the hour and the day, both read and written in LOCAL time, because
 * "four o'clock" means four o'clock where the person is - and the place the
 * sun is being computed for is, nine times in ten, the place they are sitting.
 */
const hourOf = (time: number) => {
  const at = new Date(time);
  return at.getHours() + at.getMinutes() / 60;
};

const withHour = (time: number, hour: number) => {
  const at = new Date(time);
  at.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return at.getTime();
};

const dayOf = (time: number) => {
  const at = new Date(time);
  const start = new Date(at.getFullYear(), 0, 1);
  return Math.round((at.getTime() - start.getTime()) / 86400000) + 1;
};

const withDay = (time: number, day: number) => {
  const at = new Date(time);
  const moved = new Date(at.getFullYear(), 0, Math.round(day));
  moved.setHours(at.getHours(), at.getMinutes(), 0, 0);
  return moved.getTime();
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const clockReading = (time: number) => {
  const at = new Date(time);
  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
};

const dateReading = (time: number) => {
  const at = new Date(time);
  return `${at.getDate()} ${MONTHS[at.getMonth()]}`;
};

/**
 * What one number of weather means, in the three the picture actually has.
 *
 * There were four knobs here - cover, cloud base, wind speed, wind bearing -
 * and they were four ways of asking one question, which is how rough a day it
 * is. So it is one axis now, clear to overcast, and the other numbers ride
 * it: a heavier sky is a lower deck (scattered fair-weather puffs sit high,
 * stratus sits low) and a windier one, because that is how the three arrive
 * together in the world. The bearing keeps whatever the forecast or the
 * default last said - a direction is scenery, not weather. And the real
 * forecast still writes all four raw numbers underneath, so a live sky is as
 * exact as it ever was; this axis is only what the FINGER reaches.
 */
const weatherFor = (cover: number) => ({
  cover,
  base: Math.round(8200 - 6400 * cover),
  wind: Math.round((2 + 12 * cover) * 10) / 10,
});

const weatherReading = (cover: number) =>
  cover < 0.05
    ? 'Klårt'
    : cover < 0.35
      ? `Lettskya ${Math.round(cover * 100)} %`
      : cover < 0.7
        ? `Halvskya ${Math.round(cover * 100)} %`
        : cover < 0.92
          ? `Skya ${Math.round(cover * 100)} %`
          : 'Overskya';

/**
 * The sky: a place, a moment, and what the sky over that place is doing.
 *
 * This is the answer to the question the two sun knobs cannot be asked. They
 * are the right control for a DRAWING - put the light where the drawing wants
 * it - and the wrong control for the thing people bring a perspective tool to
 * settle, which is not "what does 286 degrees at 14 look like" but "what will
 * this look like HERE, at four o'clock, in October". So:
 *
 *   the place    a default that is somebody else's until you press the pin,
 *                at which point it is a real fix and the sun is your sun
 *   the moment   an hour and a day, and a switch that lets them run - which
 *                is the whole difference between a lighting setup and a
 *                rehearsal of what the light is going to do
 *   the weather  cloud cover, how high the deck is and what the wind is doing
 *                to it, either set by hand or fetched for that place and hour
 *
 * The last of those is the one worth being careful about. Cover is not a
 * dimmer: it moves the deck overhead, which throws its own shadows across the
 * scene, and it changes the sun's strength and colour underneath - a covered
 * noon is dimmer AND less warm than a clear one, because the reddening happens
 * along a path the cloud has already scattered. One number, three consequences,
 * which is what makes it a condition rather than a knob.
 */
const SkyKnobs: React.FC<{ sky: SkyState; dark: boolean }> = ({ sky, dark }) => {
  const skin = { dark, touch: true };
  const setSky = useStore((s) => s.setSky);
  const locateSky = useStore((s) => s.locateSky);
  const drawn = useStore((s) => s.sunEnvironment);
  const drawSky = useStore((s) => s.toggleSunEnvironment);

  const seat = (on: boolean) => `${iconButton(dark)} ${on ? ACTIVE : 'opacity-40'}`;

  return (
    <div className="flex flex-col gap-1">
      {/* WHERE AND WHEN. The half that decides what the light does. */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          onClick={() => setSky({ simulate: !sky.simulate })}
          aria-label="Aim the sun from a place and a moment"
          aria-pressed={sky.simulate}
          className={seat(sky.simulate)}
        >
          <Icon path={I.simulate} className="w-5 h-5" />
        </button>
        <div className={sky.simulate ? 'flex flex-wrap items-center justify-center gap-1' : 'flex flex-wrap items-center justify-center gap-1 opacity-40 pointer-events-none'}>
          <Scrub
            skin={skin}
            icon={I.hour}
            label="Time of day"
            reading={clockReading(sky.time)}
            value={hourOf(sky.time)}
            min={0}
            max={24}
            step={1 / 60}
            wrap
            onChange={(hour) => setSky({ time: withHour(sky.time, hour) })}
          />
          <Scrub
            skin={skin}
            icon={I.day}
            label="Day of the year"
            reading={dateReading(sky.time)}
            value={dayOf(sky.time)}
            min={1}
            max={365}
            step={1}
            wrap
            onChange={(day) => setSky({ time: withDay(sky.time, day) })}
          />
          {/* Runs at ten minutes a second - the rate a moving shadow reads
              at. It had a knob of its own; a knob for how fast a rehearsal
              plays is a setting about a setting, and it went in the cull. */}
          <button
            onClick={() => setSky({ running: !sky.running })}
            aria-label={sky.running ? 'Stop the clock' : 'Let the hour run'}
            aria-pressed={sky.running}
            className={seat(sky.running)}
          >
            <Icon path={sky.running ? I.pause : I.play} className="w-5 h-5" />
          </button>
          {/* The pin is what turns somebody else's sky into yours: a real fix,
              the hour set to now, and the real conditions over it fetched, all
              in one press. Fetching used to be a second seat beside this one,
              and it was this press's second half wearing its own button. It is
              the only control here that asks the browser for a permission,
              which is why it is a press and never a default. */}
          <button
            onClick={() => void locateSky()}
            aria-label={sky.located ? 'Using where this device is' : 'Use where this device is'}
            aria-pressed={sky.located}
            className={`${seat(sky.located)} ${sky.observed === 'failed' ? '!text-red-500' : ''}`}
          >
            <Icon path={I.place} className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className={`h-px mx-6 ${dark ? 'bg-white/15' : 'bg-black/10'}`} />

      {/* WHAT IS IN IT. The half you can see. */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          onClick={drawSky}
          aria-label="Draw the sky"
          aria-pressed={drawn}
          className={seat(drawn)}
        >
          <Icon path={I.air} className="w-5 h-5" />
        </button>
        {/*
          * HOW MUCH AIR, which is the other perspective and not a weather
          * reading - the forecast has nothing to say about it. At the bottom
          * of it there is none at all: black sky, stars at noon, a hard white
          * sun and nothing filling the shadows, which is the moon. The stars
          * need no knob for the same reason: they are always up there, and
          * they show exactly when the air or the daylight stops drowning them.
          */}
        <Scrub
          skin={skin}
          icon={I.haze}
          label={`Air: ${sky.air <= 0.001 ? 'vacuum' : sky.air.toFixed(2)}`}
          reading={
            sky.air <= 0.001
              ? 'Vakuum'
              : sky.air < 0.7
                ? `Tynn luft ${sky.air.toFixed(2)}`
                : sky.air > 1.6
                  ? `Dis ${sky.air.toFixed(2)}`
                  : `Luft ${sky.air.toFixed(2)}`
          }
          value={sky.air}
          min={0}
          max={SKY_LIMITS.air}
          step={0.05}
          accent={sky.air <= 0.001}
          onChange={(air) => setSky({ air })}
        />
        {/* One axis of weather, clear to overcast. See weatherFor above for
            where the other three numbers went. */}
        <Scrub
          skin={skin}
          icon={I.cover}
          label={`Weather: ${weatherReading(sky.cover)}`}
          reading={weatherReading(sky.cover)}
          value={sky.cover}
          min={0}
          max={1}
          step={0.01}
          onChange={(cover) => setSky(weatherFor(cover))}
        />
      </div>
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
  const sky = useStore((s) => s.sky);
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
  const [picked, setPicked] = React.useState<'sun' | 'fill' | 'sky'>('sun');
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
        {/* Not a light, and next to the lights because it is the other way of
            setting the biggest one. Accented while it is in charge of the sun,
            so the rail says at a glance why the key's knobs are dead. */}
        <button
          onClick={() => { setPicked('sky'); selectLamp(null); }}
          aria-label="The sky, the hour and the weather"
          aria-pressed={!lamp && picked === 'sky'}
          className={chip(!lamp && picked === 'sky')}
        >
          <Icon path={I.sky} className="w-5 h-5" />
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
      ) : picked === 'sky' ? (
        <SkyKnobs sky={sky} dark={dark} />
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
        <Knobs light={sun} dark={dark} onChange={setSun} shadows reading={sky.simulate} />
      )}
    </div>
  );
};
