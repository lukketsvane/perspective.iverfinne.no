import React from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { Scrub } from './controls';
import { ACTIVE, iconButton } from './ui';
import { SHADOW_KINDS, SKY_LIMITS, type LampData, type SkyState, type SunState } from '../types';
import { atHour, momentOf, reading } from '../lib/clock';

/**
 * The light, and the lamps you have stood about beside it.
 *
 * There used to be two panels' worth of two different ideas. The sun and the
 * fill were *settings*, edited here; a placed lamp was a scene *object*, edited
 * from the selection bar when you happened to have it in your hand. Which
 * meant the answer to "how bright is this room" was in two places, the two
 * kinds of light had two different sets of knobs for the same four numbers,
 * and there was no view of the lighting as a whole - which is the only view
 * that matters when you are lighting something.
 *
 * Then it was one list, and the list had three things on it that were not
 * three things. The rail carried a KEY light, a FILL light and a SKY, and a
 * viewer had to work out for themselves that the third was not a light at all
 * but a second way of aiming the first, and that the middle one was the reason
 * the first was called "key". Three seats, one sun, and every one of the
 * complaints about this panel was some version of that.
 *
 * SO THERE IS ONE LIGHT. The rail is the light and the lamps; the fill is
 * gone entirely, because a tool whose whole argument is that one hard light is
 * what makes a box read as a box should not ship a second one to wash that
 * out; and the sky is a MODE of the one light rather than a seat beside it.
 * Press the sky on and the light stops being four numbers you drag and becomes
 * a reading - it is where the sun is over a real place at a real hour - and
 * the sky's own controls come up in the four knobs' place. Press it off and
 * you have the four knobs back, starting from exactly where the sky left them.
 * That is the whole panel.
 *
 * A LAMP IS STILL A LAMP. Placed rather than aimed, with a spot on the floor
 * and a cone, and it keeps its own seat on the rail and its own controls.
 */

/** One light's knobs. The four every light has, then what only some have. */
const Knobs: React.FC<{
  light: SunState;
  dark: boolean;
  onChange: (light: Partial<SunState>) => void;
  /** The sun's shadows step off / hard / soft; a lamp casts none. */
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
   * now they leave - and what comes up in the space they vacate is the hour
   * and the day, which is where those four numbers are actually being decided.
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
          phone. The hour beside them is where those numbers are being decided;
          what is left here is the one thing still yours to set. */}
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

/* ----------------------------------------------------------- the sky's half */

/**
 * A moment, said in the two numbers anybody actually thinks in.
 *
 * The store holds one epoch millisecond, which is the only representation that
 * can be compared, saved and handed to the solar equations without a timezone
 * argument. Nobody sets a light by typing an epoch millisecond. So the pane
 * offers the hour and the day.
 *
 * BOTH ON THE CLOCK OF THE PLACE THE SUN IS STANDING OVER, which is the only
 * arrangement in which the two hands agree. They were the browser's own local
 * time once, on the reasoning that "four o'clock" means four o'clock where the
 * person is - true exactly as long as the place being computed for is also
 * where the person is, which a map pin used to arrange and nothing does now.
 * Then they were UTC over Greenwich, which agreed with itself and put the sky
 * somewhere nobody using this is standing. They are Oslo's now, place and
 * hour together, daylight saving and all: see lib/clock.ts, which owns both.
 */
const hourOf = (time: number) => {
  const said = reading(time);
  return said.hour + said.minute / 60;
};

const withHour = (time: number, hour: number) =>
  atHour(time, Math.floor(hour), Math.round((hour % 1) * 60));

const dayOf = (time: number) => {
  const said = reading(time);
  return (
    Math.round(
      (Date.UTC(said.year, said.month - 1, said.day) - Date.UTC(said.year, 0, 1)) / 86400000
    ) + 1
  );
};

const withDay = (time: number, day: number) => {
  const said = reading(time);
  // January the three-hundredth is what a day of the year is, and Date rolls
  // it into the month it lands in - including into the next year, which is why
  // the year is read back off the result rather than kept.
  const moved = new Date(Date.UTC(said.year, 0, Math.round(day)));
  return momentOf({
    year: moved.getUTCFullYear(),
    month: moved.getUTCMonth() + 1,
    day: moved.getUTCDate(),
    hour: said.hour,
    minute: said.minute,
  });
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const clockReading = (time: number) => {
  const said = reading(time);
  return `${String(said.hour).padStart(2, '0')}:${String(said.minute).padStart(2, '0')}`;
};

const dateReading = (time: number) => {
  const said = reading(time);
  return `${said.day} ${MONTHS[said.month - 1]}`;
};

/**
 * What one number of weather means, in the three the picture actually has.
 *
 * There were four knobs here - cover, cloud base, wind speed, wind bearing -
 * and they were four ways of asking one question, which is how rough a day it
 * is. So it is one axis now, clear to overcast, and the other numbers ride
 * it: a heavier sky is a lower deck (scattered fair-weather puffs sit high,
 * stratus sits low) and a windier one, because that is how the three arrive
 * together in the world. The bearing keeps whatever the default last said - a
 * direction is scenery, not weather.
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
 * The one light, and the sky as the other way of aiming it.
 *
 * The four knobs above are the right control for a DRAWING - put the light
 * where the drawing wants it - and the wrong control for the thing people
 * bring a perspective tool to settle, which is not "what does 286 degrees at
 * 14 look like" but "what will this look like at four o'clock, in October".
 *
 * So this seat answers the second question, and answering it takes the first
 * one's controls away: press the sky on and the light's bearing, height,
 * strength and colour stop being yours to set and become readings of where the
 * sun IS. What comes up in their place is what actually decides them -
 *
 *   the moment   an hour and a day over Oslo, on Oslo's own clock. See the
 *                helpers above for why the clock is the place's and not
 *                yours.
 *   the weather  cloud cover, and how high the deck sits and what the wind is
 *                doing to it, all on the one axis
 *
 * The second of those is the one worth being careful about. Cover is not a
 * dimmer: it moves the deck overhead, which throws its own shadows across the
 * scene, and it changes the sun's strength and colour underneath - a covered
 * noon is dimmer AND less warm than a clear one, because the reddening happens
 * along a path the cloud has already scattered. One number, three consequences,
 * which is what makes it a condition rather than a knob.
 *
 * THE TOGGLE WRITES TWO THINGS, AND HAS TO. The sky aiming the sun and the sky
 * being DRAWN are two booleans in the store, and they always were - the second
 * one blacks the background, hangs the dome and hands an imported mesh its
 * authored surface back. Nothing forced them to agree, and gating the dome's
 * own switch behind the simulation without tying them together would have made
 * "drawn, but not aiming anything" a state you could walk into and not walk
 * out of: a sky overhead, a hand-aimed sun, and the only control that could
 * have turned the dome off now hidden behind the toggle that put it there. One
 * press, both booleans, and the switch under it stays for the one case that is
 * genuinely worth having - a real sun over a paper page, with no sky drawn.
 */
const TheLight: React.FC<{
  sun: SunState;
  sky: SkyState;
  dark: boolean;
  onSun: (light: Partial<SunState>) => void;
}> = ({ sun, sky, dark, onSun }) => {
  const skin = { dark, touch: true };
  const setSky = useStore((s) => s.setSky);
  const drawn = useStore((s) => s.sunEnvironment);
  const drawSky = useStore((s) => s.toggleSunEnvironment);

  const seat = (on: boolean) => `${iconButton(dark)} ${on ? ACTIVE : 'opacity-40'}`;

  return (
    <div className="flex flex-col gap-1">
      {/* The light itself: the switch, then either its four numbers or the
          hour that is working them out, then the one decision that stays
          yours under a simulated sun. */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          onClick={() => {
            const on = !sky.simulate;
            setSky({ simulate: on });
            if (drawn !== on) drawSky();
          }}
          aria-label="The sky lights the scene and is drawn behind it"
          aria-pressed={sky.simulate}
          className={seat(sky.simulate)}
        >
          <Icon path={I.simulate} className="w-5 h-5" />
        </button>
        {sky.simulate && (
          <>
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
          </>
        )}
        <Knobs light={sun} dark={dark} onChange={onSun} shadows reading={sky.simulate} />
      </div>

      {/* ...and what is IN the sky, which only exists while there is one.

          It hung below the fold at all times before, on the reasoning that the
          dome is drawn whether or not it aims anything. True, and it cost
          three controls of a phone's panel to the case nobody was in. */}
      {sky.simulate && (
        <>
          <div className={`h-px mx-6 ${dark ? 'bg-white/15' : 'bg-black/10'}`} />
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
              * reading. At the bottom of it there is none at all: black sky,
              * stars at noon, a hard white sun and nothing filling the
              * shadows, which is the moon. The stars need no knob for the same
              * reason: they are always up there, and they show exactly when
              * the air or the daylight stops drowning them.
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
        </>
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
   * panel and the selection are one idea. There used to be a `picked` beside
   * this, three ways, because the rail had three built-in seats; with one
   * light left, whether a lamp is in hand IS the whole question.
   */
  const lamp = lamps.find((l) => l.id === selectedLampId) ?? null;
  const chip = (on: boolean) =>
    `${iconButton(dark)} shrink-0 ${on ? ACTIVE : 'opacity-45'}`;

  return (
    <div className="flex flex-col gap-1 max-w-full min-w-0">
      {/* Every light there is, in one rail. It scrolls, because a scene may
          have a dozen lamps in it and a rail that wraps would push the knobs
          off the bottom of the phone.

          One built-in seat, which looks like a rail that has lost its reason
          to exist and has not: it is the way BACK from a lamp, and the divider
          beside it is what stops the light reading as lamp zero. */}
      <div className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-none">
        <button
          onClick={() => selectLamp(null)}
          aria-label="The light"
          aria-pressed={!lamp}
          className={chip(!lamp)}
        >
          <Icon path={I.light} className="w-5 h-5" />
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

      {/* ...and either the lamp in your hand or the light itself. */}
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
      ) : (
        <TheLight sun={sun} sky={sky} dark={dark} onSun={setSun} />
      )}
    </div>
  );
};
