import { chromium } from '@playwright/test';
const OUT = process.env.OUT ?? '.';
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
await context.addInitScript(() => {
  localStorage.setItem('kjg-perspective-tour', JSON.stringify({ seen: 5 }));
  localStorage.setItem('kjg-perspective-page', 'Brush page on black');
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:5199');
await page.waitForSelector('canvas');
await page.waitForFunction(() => !!window.__store, null, { timeout: 30_000 });
await page.waitForTimeout(6000);
const S = (fn) => page.evaluate(fn);
await S(() => window.__store.getState().resetScene());
await page.waitForTimeout(600);
await S(() => {
  const s = window.__store.getState();
  s.addCube([0, 0, 3]);
  s.updateBox(s.selectedId, { scale: [2.4, 1, 1.6], position: [0, 0.5, 3], rotation: [0, 0.5, 0] });
  window.__walk.position.set(0, 0, 8);
  window.__walk.yaw = 0; window.__walk.pitch = -0.16; window.__walk.seeded = true;
  s.setLens(80);
});
await page.waitForTimeout(1500);
for (const level of [1, 2, 3]) {
  await S((n) => {
    const s = window.__store.getState();
    while (s.selectionGuides !== n) window.__store.getState().cycleSelectionGuides();
  }, level);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('[aria-label="Tools"]')
    ?.closest('div[class*="transition-opacity"]')
    ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })));
  await page.waitForTimeout(300);
  console.log(`level ${level}:`, await S(() => {
    const el = document.querySelector('[aria-label^="Construction on this one"]');
    return el ? el.getAttribute('aria-label') : 'no button';
  }));
  await page.screenshot({ path: `${OUT}/guides-${level}.png` });
}
await browser.close();
