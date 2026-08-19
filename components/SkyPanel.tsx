import React from 'react';
import { useStore } from '../store';
import { Icon, I } from './icons';
import { Scrub } from './controls';
import { ACTIVE, iconButton } from './ui';
import { SKY_LIMITS } from '../types';
import { clockName, dateName } from '../lib/sky';
import { useSkyMoment } from './SkyDome';

/**
 * The knobs the sky brought with it.
 *
 * It only exists when the sky is on, and it is reached from the button beside
 * the one that switches it - the same shape as the drawn page's own settings,
 * which appear beside the surface they belong to and are absent on the rungs
 * that have none. A control that does nothing is worse than a missing one.
 *
 * TWO ROWS, AND THE DIVIDER MEANS SOMETHING.
 *
 * Above it is the air and the weather: what is between you and the far end of
 * the picture, and what is overhead. Those are the two that change the drawing.
 *
 * Below it is where and when: a latitude, a date and an hour, and the switch
 * that hands the sun over to them. Those change where the light comes FROM,
 * which is a different question and one most people never get to ask, because
 * the honest answer needs an ephemeris and nobody has one to hand.
 */
export const SkyPanel: React.FC = () => {
  const dark = useStore((s) => s.theme) === 'dark';
  const sky = useStore((s) => s.sky);
  const setSky = useStore((s) => s.setSky);
  const skin = { dark, touch: true };
  const moment = useSkyMoment();

  /** How the air reads: a vacuum at the bottom, a wall of white at the top. */
  const airReading =
    sky.air <= 0.001
      ? 'Vakuum'
      : sky.air < 0.7
        ? `Tynn luft ${sky.air.toFixed(2)}`
        : sky.air > 1.6
          ? `Dis ${sky.air.toFixed(2)}`
          : `Luft ${sky.air.toFixed(2)}`;

  const cloudReading =
    sky.cloud <= 0.001
      ? 'Klårt'
      : sky.cloud > 0.85
        ? 'Overskya'
        : `Skyer ${Math.round(sky.cloud * 100)}%`;

  return (
    <div className="flex flex-col gap-1 max-w-full min-w-0">
      {/* What is between you and the picture, and what is over it. */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Scrub
          skin={skin}
          icon={I.air}
          // The label is the machine-readable one and stays English, like every
          // other label in the app; the reading over the thumb is the one a
          // person reads, and that is nynorsk like every other reading.
          label={`Air: ${sky.air <= 0.001 ? 'vacuum' : sky.air.toFixed(2)}`}
          reading={airReading}
          value={sky.air}
          min={0}
          max={SKY_LIMITS.air}
          step={0.05}
          accent={sky.air <= 0.001}
          onChange={(air) => setSky({ air })}
        />
        <Scrub
          skin={skin}
          icon={I.cloud}
          label={`Weather: ${sky.cloud <= 0.001 ? 'clear' : `${Math.round(sky.cloud * 100)}% cover`}`}
          reading={cloudReading}
          value={sky.cloud}
          min={0}
          max={1}
          step={0.02}
          onChange={(cloud) => setSky({ cloud })}
        />
        <Scrub
          skin={skin}
          icon={I.cloudBase}
          label={`Cloud height: ${Math.round(sky.cloudBase)} m`}
          reading={sky.cloudBase >= 1000 ? `${(sky.cloudBase / 1000).toFixed(1)} km` : `${Math.round(sky.cloudBase)} m`}
          value={sky.cloudBase}
          min={SKY_LIMITS.lowCloud}
          max={SKY_LIMITS.highCloud}
          step={50}
          onChange={(cloudBase) => setSky({ cloudBase })}
        />
        <Scrub
          skin={skin}
          icon={I.skylight}
          label={`Sky light: ${Math.round(sky.skylight * 100)}%`}
          reading={sky.skylight <= 0.001 ? 'Av' : `${Math.round(sky.skylight * 100)}%`}
          value={sky.skylight}
          min={0}
          max={1}
          step={0.02}
          onChange={(skylight) => setSky({ skylight })}
        />
        <Scrub
          skin={skin}
          icon={I.stars}
          label={`Stars: ${sky.stars <= 0.001 ? 'off' : Math.round(sky.stars * 100) + '%'}`}
          reading={sky.stars <= 0.001 ? 'Av' : `${Math.round(sky.stars * 100)}%`}
          value={sky.stars}
          min={0}
          max={1}
          step={0.02}
          onChange={(stars) => setSky({ stars })}
        />
        <button
          onClick={() => setSky({ figures: !sky.figures })}
          aria-label="Constellation figures"
          aria-pressed={sky.figures}
          className={`${iconButton(dark)} ${sky.figures ? ACTIVE : 'opacity-40'}`}
        >
          <Icon path={I.figures} className="w-5 h-5" />
        </button>
      </div>

      <div className={`h-px mx-6 ${dark ? 'bg-white/15' : 'bg-black/10'}`} />

      {/* Where, and when. */}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Scrub
          skin={skin}
          icon={I.latitude}
          label={`Latitude: ${Math.abs(Math.round(sky.latitude))} degrees ${sky.latitude < 0 ? 'south' : 'north'}`}
          reading={`${Math.abs(Math.round(sky.latitude))}°${sky.latitude < 0 ? 'S' : 'N'}`}
          value={sky.latitude}
          min={-90}
          max={90}
          step={1}
          onChange={(latitude) => setSky({ latitude })}
        />
        <Scrub
          skin={skin}
          icon={I.calendar}
          label={`Date: day ${Math.round(sky.day)} of the year`}
          reading={dateName(sky.day)}
          value={sky.day}
          min={1}
          max={365}
          step={1}
          wrap
          /* A wrap comes back inside [0, 365), and there is no day nought.
             Sending it round to the last of December instead makes the dial a
             real year: every day reachable, and New Year's Eve next to New
             Year's Day where it belongs. */
          onChange={(day) => setSky({ day: day < 1 ? 365 : day })}
        />
        <Scrub
          skin={skin}
          icon={I.clock}
          label={`Hour: ${clockName(sky.hour)}`}
          reading={clockName(sky.hour)}
          value={sky.hour}
          min={0}
          max={24}
          step={0.25}
          wrap
          onChange={(hour) => setSky({ hour })}
        />
        <button
          onClick={() => setSky({ clock: !sky.clock })}
          aria-label="The clock aims the sun"
          aria-pressed={sky.clock}
          className={`${iconButton(dark)} ${sky.clock ? ACTIVE : 'opacity-40'}`}
        >
          <Icon path={I.clockSun} className="w-5 h-5" />
        </button>
        {/*
          * Where the sun actually is, at that place and that hour.
          *
          * A read-out and not a control, and it is here even when the clock is
          * not driving anything - because the answer is the interesting part.
          * At sixty north on midsummer's night the sun is six degrees under
          * the horizon and it never gets dark; ten degrees further up it never
          * sets at all. Neither of those is a thing you can talk somebody into
          * believing, and both of them are one drag of the date away.
          */}
        <span
          aria-label={`The sun stands ${Math.round(moment.sun.elevation)} degrees up, bearing ${Math.round(moment.sun.azimuth)}`}
          className={`px-2 h-11 flex items-center text-[11px] tabular-nums whitespace-nowrap ${
            dark ? 'text-white/45' : 'text-black/45'
          }`}
        >
          {Math.round(moment.sun.azimuth)}° / {moment.sun.elevation >= 0 ? '+' : ''}
          {Math.round(moment.sun.elevation)}°
        </span>
      </div>
    </div>
  );
};
