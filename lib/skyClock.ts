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

/**
 * How often the BOOKKEEPING runs: the hour turning, the forecast going stale.
 *
 * Not the clock itself. The moment is moved on every animation frame, for the
 * reason under `useSkyClock` below.
 */
const TICK = 1000;

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

    /*
     * THE CLOCK RUNS ON THE FRAME, NOT ON A TIMER.
     *
     * It used to step twice a second, and twice a second is not a clock, it is
     * a metronome: at ten minutes of sky per second the sun jumped a degree
     * and a quarter every step, and the whole point of watching the light move
     * is that it MOVES. A slide you can see the steps in is worse than no
     * slide at all, because it draws attention to the mechanism.
     *
     * What made that seem necessary was cost, and the cost was never here. It
     * was the shadow map, which the sun invalidated on every change of bearing
     * - so a finer clock meant a four-megapixel pass per frame. That is fixed
     * where it lives, in components/Scene.tsx: the lamp now moves every frame
     * and the map is redrawn eight times a second. With that separated, the
     * clock is free to be a clock.
     */
    let last = performance.now();
    let frame = 0;
    /*
     * COUNTED ON THE FRAME, COMMITTED TEN TIMES A SECOND.
     *
     * A store write is not free the way a uniform write is: every component
     * subscribed to the sky or the sun renders again, and setSky also works
     * the sun's position out of the ephemeris. Sixty of those a second put a
     * visible drag on the whole tool - the panel most of all, since watching
     * the clock run is exactly when it is open. Ten a second moves the sun
     * 0.004 degrees a step at the default rate, an order below the quarter
     * degree the dome itself quantises to, so nothing on screen knows the
     * difference; the frames between commits are accumulated, not dropped.
     */
    let carried = 0;
    let committed = performance.now();
    const run = () => {
      frame = requestAnimationFrame(run);
      const state = useStore.getState();
      const { sky } = state;
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      if (!sky.simulate || !sky.running) {
        carried = 0;
        return;
      }
      /*
       * Clamped to a quarter second's worth. A tab in the background gets no
       * frames at all, so a tool put away at four and picked up at nine would
       * otherwise catch up five hours in one step - and the catch-up is not
       * the point, the moving sun is. Coming back to five o'clock is a truer
       * answer than being shown a smeared sunset.
       */
      carried += Math.min(elapsed, 250) * sky.rate;
      if (now - committed < 100) return;
      committed = now;
      state.setSky({ time: sky.time + carried });
      carried = 0;
    };
    frame = requestAnimationFrame(run);

    const beat = window.setInterval(() => {
      const state = useStore.getState();
      const moment = state.sky;
      if (!moment.simulate) return;
      const now = Date.now();

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

    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(beat);
    };
  }, []);
};
