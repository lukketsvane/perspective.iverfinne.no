import { test, expect, clickIn, find, readSceneBundle, blockOutABox } from './harness';

const openShelf = async (page: any) => {
  const cube = find(page, 'anywhere', 'Add cube');
  if ((await cube.count()) === 0) await clickIn(page, 'anywhere', 'Add model');
  await expect(cube).toBeVisible();
};

test('probe', async ({ app }) => {
  await openShelf(app);
  for (let i = 0; i < 3; i++) await clickIn(app, 'anywhere', 'Add cube');
  const afterCubes = await readSceneBundle(app);
  console.log('BOXES', JSON.stringify(afterCubes.boxes.map((b) => [b.position, b.scale])));
  console.log('INSTANCES', JSON.stringify(afterCubes.instances.map((i) => [i.name, i.position, i.size, i.scale, i.kind])));
  console.log('VIEW', JSON.stringify(afterCubes.view));

  await openShelf(app);
  for (let i = 0; i < 3; i++) await clickIn(app, 'anywhere', 'Add light');
  const afterLamps = await readSceneBundle(app);
  console.log('LAMPS', JSON.stringify(afterLamps.lamps?.map((l) => l.position)));

  await openShelf(app);
  await clickIn(app, 'anywhere', 'Cylinder');
  await app.waitForTimeout(1500);
  const afterMesh = await readSceneBundle(app);
  console.log('INSTANCES2', JSON.stringify(afterMesh.instances.map((i) => [i.name, i.position, i.size, i.scale])));
  console.log('BOXES2', JSON.stringify(afterMesh.boxes.map((b) => [b.position, b.scale])));
});

test('probe blocked box', async ({ app }) => {
  await blockOutABox(app);
  const after = await readSceneBundle(app);
  console.log('DRAWNBOX', JSON.stringify(after.boxes.map((b) => [b.position, b.scale])));
});
