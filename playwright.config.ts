import { defineConfig, devices } from '@playwright/test';

/**
 * The regression net, and why it is @playwright/test rather than a script.
 *
 * The choice was a plain node runner importing the global playwright at
 * /opt/node22/lib/node_modules against @playwright/test as the first testing
 * dependency this project has ever had. The dependency won, and the argument
 * is short: everything the fourteen throwaway drivers got wrong is something
 * a runner already solves.
 *
 *   - A driver that drives ONE browser tab from top to bottom shares its
 *     localStorage with everything it did before, and settings persist here
 *     (store.ts writes 'kjg-perspective-settings' on every knob). Half those
 *     drivers were poisoned by their own earlier steps. A runner gives every
 *     test its own context, which makes isolation the default rather than a
 *     thing you remember.
 *   - Every assertion in this app is "after the frame has caught up". Hand
 *     rolling that is how you get sleeps, and sleeps are how you get flake.
 *     expect() retries until the deadline, which is the honest version of the
 *     same wait.
 *   - The suite has to build and serve the app and then stop serving it. That
 *     is `webServer` here, and it is thirty lines of process babysitting and
 *     one stray port in a script.
 *   - Four cores means four browsers, and the fixture already knows how to
 *     make one. Parallelism is free here and is a rewrite in a script.
 *   - When something does go red at 11pm, a trace of the failing run is worth
 *     more than any amount of console.log we would have written instead.
 *
 * Pinned to 1.56.1 - exactly the global playwright's version, because the
 * browsers at PLAYWRIGHT_BROWSERS_PATH are the build that version ships with
 * (chromium-1194) and a floating range would eventually ask for a build that
 * is not on this machine. We never run `playwright install`; the pin is what
 * keeps us from needing to.
 */

/**
 * Not 4173.
 *
 * 4173 is `vite preview`'s own default, so it is exactly the port somebody has
 * taken when they are looking at a build by hand - and --strictPort means the
 * suite would not shrug at that, it would fail the whole run. This port is
 * nobody's default.
 */
const PORT = 4319;
export const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests',

  /*
   * A test may not decide it has finished before the drawing has: the opening
   * mesh is three megabytes over the wire and stands up under a software
   * rasteriser here, and a run under load can spend a couple of seconds inside
   * a single drag. Sixty seconds is the point past which something is wrong
   * rather than slow.
   */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  /*
   * NO RETRIES, ANYWHERE.
   *
   * The brief for this suite is that a flaky test is worse than no test, and
   * retries are how a flaky test survives long enough to teach people that red
   * means nothing. If something here fails once in ten runs we want to be told
   * the first time, while the cause is still the thing we just wrote.
   */
  retries: 0,

  /*
   * Every test gets its own context, so they are independent by construction -
   * and independent tests may as well run at once. Held to two workers because
   * each one is a full chromium rendering this scene in software: four of them
   * on four cores turns a two-second frame into an eight-second one, and slow
   * frames are where the timing assumptions in these tests start to wobble.
   */
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,

    /*
     * A phone, because that is what this tool is used on: 390x844 is the
     * frame the dock, the panel and the safe areas were all laid out against,
     * and several of them wrap differently on a desktop viewport.
     *
     * Mouse-shaped pointers, though, and it is worth being straight about it:
     * hasTouch would give us touch events but not the two-thumb gestures that
     * matter most on a phone - look and walk at once - because Playwright
     * drives one touch point at a time. So this suite covers the pointer-event
     * paths every input shares, and multi-touch is not covered by anything
     * here. Say so out loud rather than letting the green tick imply it.
     */
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    /*
     * Pinned rather than inherited: the app derives its own theme from the
     * stored backdrop and not from the OS, but everything else on the page is
     * Tailwind, and a suite whose colours depend on the machine's setting is a
     * suite that fingerprints differently on somebody else's laptop.
     */
    colorScheme: 'dark',

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',

    launchOptions: {
      /*
       * There is no GPU here, and chromium has begun refusing to fall back to
       * SwiftShader without being asked. Without this the canvas comes up
       * black and every fingerprint assertion is a lie.
       */
      args: ['--enable-unsafe-swiftshader'],
    },
  },

  /*
   * The suite serves the app itself, from a real build, and takes the server
   * down with it.
   *
   * reuseExistingServer is off in both directions on purpose. A server already
   * up on this port is serving SOME build - probably the one from before the
   * change you are testing - and a green run against yesterday's dist is the
   * single most expensive kind of wrong answer a test suite can give. Ten
   * seconds of vite build is cheaper than that, every time.
   */
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
