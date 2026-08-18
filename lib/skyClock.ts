import { useEffect } from 'react';
import { useStore } from '../store';
import { SERIES_LIFE } from './sky';

/**
 * The thing that makes the sky a simulation rather than a slider.
 *
 * Three jobs, all of them on the same beat:
 *
 *   the clock     while the sky is running, the moment moves - at whatever
 *                 multiple of real time the rate knob says
 *   the hour      when that moment crosses into a new hour, the weather for
 *                 the new hour is read out of the series already held. No
 *                 request: one fetch covers five days, and scrubbing across
 *                 an afternoon should not be five requests
 *   the forecast  and once in a while, the series itself is fetched again, so
 *                 a sky left up on a desk goes on being the sky outside
 *
 * WHY IT IS AN INTERVAL AND NOT A FRAME LOOP. Everything else in this tool
 * that moves is drawn every frame because it is being dragged. Nothing here is
 * being dragged: the sun crosses a quarter of a degree a minute in real time,
 * and each change of it redraws a four-megapixel shadow map. Twice a second is
 * already finer than the shadows can show, and it is two orders of magnitude
 * cheaper than the frame loop.
 */

/** How often the moment is moved on. */
const TICK = 500;

export const useSkyClock = () => {
  useEffect(() => {
    /*
     * Whatever was live before is fetched again as the tool opens.
     *
     * Not a location prompt: the place is already stored, and this only asks
     * the forecast about it. Somebody who left the tool showing the real sky
     * over their street should find the real sky over their street when they
     * come back, not the one from Tuesday.
     */
    const opening = useStore.getState();
    if (opening.sky.simulate && opening.sky.located) void opening.observeSky();

    let hour = Math.floor(useStore.getState().sky.time / 3600000);
    let refreshed = Date.now();
    let last = Date.now();

    const beat = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - last;
      last = now;

      const state = useStore.getState();
      const { sky } = state;
      if (!sky.simulate) return;

      if (sky.running) {
        /*
         * Clamped to a few beats' worth. A tab in the background gets no
         * timers at all on a phone, so a tool put away at four and picked up
         * at nine would otherwise catch up five hours in one step - and the
         * catch-up is not the point, the moving sun is. Coming back to five
         * o'clock is a truer answer than being shown a smeared sunset.
         */
        const step = Math.min(elapsed, TICK * 4) * sky.rate;
        state.setSky({ time: sky.time + step });
      }

      const moment = useStore.getState().sky;

      // A new hour: read it off the series in hand, which costs nothing.
      const nowHour = Math.floor(moment.time / 3600000);
      if (nowHour !== hour) {
        hour = nowHour;
        if (moment.observed === 'live') void state.observeSky();
      }

      // ...and once in a while, ask again for the series itself.
      if (moment.observed === 'live' && now - refreshed > SERIES_LIFE) {
        refreshed = now;
        void state.observeSky(true);
      }
    }, TICK);

    return () => window.clearInterval(beat);
  }, []);
};
