import { chromium } from 'playwright';
import { spawn } from 'child_process';

const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
  cwd: '/Users/omer/Desktop/alaca2',
  stdio: 'pipe',
});

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Server start timeout')), 10000);
  server.stdout.on('data', (d) => {
    if (d.toString().includes('4173')) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.stderr.on('data', (d) => {
    // ignore benign stderr
  });
});

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Screenshot 00: Start menu
  await page.screenshot({ path: '/Users/omer/Desktop/alaca2/screenshots/00_start_menu.png' });

  // Start game (also unlocks & preloads real CC0 audio buffers)
  await page.click('[data-action="start"]');
  await page.waitForTimeout(1100);

  // Verify all 17 audio files return HTTP 200 on preview server
  const audioStatus = await page.evaluate(async () => {
    const names = [
      'ambient_birds.mp3', 'ambient_wind.mp3',
      'footstep_stone_0.mp3', 'footstep_stone_1.mp3',
      'footstep_wood_0.mp3', 'footstep_wood_1.mp3',
      'door_open.mp3', 'door_close.mp3', 'water_splash.mp3',
      'punch.mp3', 'knife.mp3', 'pistol.mp3', 'smg.mp3',
      'reload.mp3', 'npc_react.mp3', 'cat_meow_0.mp3', 'cat_meow_1.mp3',
    ];
    const results = await Promise.all(names.map(async (n) => (await fetch(`./audio/${n}`)).status));
    return results.every((s) => s === 200) ? `ALL_17_OK` : `FAILED:${JSON.stringify(results)}`;
  });
  console.log('AUDIO_FILES_CHECK:', audioStatus);

  const initialState = await page.evaluate(() => window.__ALACA_GAME__.getState());
  console.log('INITIAL_STATE:', JSON.stringify(initialState));

  const snap = async (filename, camPos, target) => {
    await page.evaluate(
      ([p, t]) => window.__ALACA_GAME__.setCameraView(p, t),
      [camPos, target]
    );
    await page.waitForTimeout(250);
    await page.screenshot({ path: `/Users/omer/Desktop/alaca2/screenshots/${filename}` });
  };

  // 1. Mosque main facade (North courtyard, Alaca Çeşme, Şadırvan, Son Cemaat 3 arches)
  await snap('01_mosque_main_facade.png', [1.5, 4.2, -31.5], [0, 3.2, -6.5]);

  // 2. Mosque left side (East facade + relationship to House 1)
  await snap('02_mosque_left_side.png', [10.5, 5.2, -16.0], [3.5, 3.8, -1.0]);

  // 3. Minaret & roof details (Seljuk brick shaft, şerefe, octagonal drum, conical tiled cap)
  await snap('03_mosque_minaret_roof.png', [-14.0, 12.5, -16.5], [-3.2, 10.5, -1.5]);

  // 4. First two houses together (from north street looking South-East)
  await snap('04_first_two_houses.png', [19.5, 5.8, -24.5], [19.5, 3.6, -4.0]);

  // 5. House 1 exterior close-up (stone base, hinged front door, cumba, windows)
  await snap('05_house1_exterior_closeup.png', [11.2, 3.4, -17.5], [14.0, 3.0, -7.5]);

  // Test Mosque sealed interior collision
  await page.evaluate(() => {
    window.__ALACA_GAME__.clearCameraOverride();
    window.__ALACA_GAME__.teleportPlayer(0, 0, -7.5);
  });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyW');
  const afterMosquePush = await page.evaluate(() => window.__ALACA_GAME__.getState());
  console.log('AFTER_MOSQUE_PUSH:', JSON.stringify(afterMosquePush));

  // Test entering House 1: teleport to front stoop, open door with E, walk inside
  await page.evaluate(() => window.__ALACA_GAME__.teleportPlayer(12.6, 0, -10.2));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__ALACA_GAME__.triggerInteract()); // Open door
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__ALACA_GAME__.teleportPlayer(12.6, 0.22, -6.5)); // Inside GF
  await page.waitForTimeout(250);
  const insideGF = await page.evaluate(() => window.__ALACA_GAME__.getState());
  console.log('INSIDE_GF:', JSON.stringify(insideGF));

  // 6. House 1 ground floor interior
  await snap('06_house1_ground_floor.png', [12.0, 2.35, -7.2], [14.2, 1.1, -1.8]);

  // Test walking up the stairs all the way from ground floor (y=0.22) to 2nd floor (y=3.3)
  await page.evaluate(() => {
    window.__ALACA_GAME__.clearCameraOverride();
    window.__ALACA_GAME__.teleportPlayer(17.4, 0.22, -6.2);
  });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3400);
  await page.keyboard.up('KeyW');
  const afterStairs = await page.evaluate(() => window.__ALACA_GAME__.getState());
  console.log('AFTER_STAIRS_WALK:', JSON.stringify(afterStairs));

  // 7. House 1 second floor interior (standing on 2nd floor looking toward cumba & sedir)
  await page.evaluate(() => window.__ALACA_GAME__.teleportPlayer(15.5, 3.35, -2.5));
  await snap('07_house1_second_floor.png', [16.2, 5.2, -0.4], [13.0, 4.1, -6.8]);

  // 11. House 1 2nd floor: NPC lying on bed watching movie on phone (side & front-diagonal views)
  await snap('11_house1_phone_npc.png', [10.6, 4.45, -3.15], [10.55, 4.05, -1.15]);
  await snap('11b_house1_phone_npc_front.png', [12.35, 4.75, -1.55], [10.35, 4.1, -1.15]);

  // Test entering House 2: open door, step inside, climb stairs to 2nd floor
  await page.evaluate(() => {
    window.__ALACA_GAME__.clearCameraOverride();
    window.__ALACA_GAME__.teleportPlayer(23.2, 0, -10.4);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__ALACA_GAME__.triggerInteract()); // Open House 2 door
  await page.waitForTimeout(450);
  await page.evaluate(() => window.__ALACA_GAME__.teleportPlayer(23.2, 0.22, -7.2));
  await page.waitForTimeout(200);
  const insideH2GF = await page.evaluate(() => window.__ALACA_GAME__.getState());
  console.log('INSIDE_H2_GF:', JSON.stringify(insideH2GF));

  // Walk up House 2 stairs (h2X=25.2, h2Z=-4.2, stairX=3.05 => world x=28.25, z=-6.2 to -1.2)
  await page.evaluate(() => window.__ALACA_GAME__.teleportPlayer(28.25, 0.22, -6.1));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3500);
  await page.keyboard.up('KeyW');
  const afterH2Stairs = await page.evaluate(() => window.__ALACA_GAME__.getState());
  console.log('AFTER_H2_STAIRS:', JSON.stringify(afterH2Stairs));

  // 12. House 2 2nd floor: Photo-matched Gaming PC Setup + Carpet + Oak floor
  await page.evaluate(() => window.__ALACA_GAME__.teleportPlayer(25.2, 3.35, -3.2));
  await snap('12_house2_pc_setup.png', [24.2, 4.9, -4.7], [21.7, 4.05, -6.9]);

  // Wait so handsome NPC gets off bed, walks across room, and sits at the PC setup!
  await page.waitForTimeout(9000);
  await snap('13_house2_npc_at_pc.png', [24.3, 4.9, -4.4], [22.2, 4.1, -6.9]);

  // 8. Street, NPCs, Cats & Weapon test
  await page.evaluate(() => {
    window.__ALACA_GAME__.clearCameraOverride();
    window.__ALACA_GAME__.teleportPlayer(0.5, 0, -25.0);
  });
  await page.keyboard.press('Digit3'); // Pistol
  await page.waitForTimeout(250);
  await page.mouse.move(640, 360);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const ammoAfterPistol = await page.locator('[data-weapon-ammo]').textContent();
  console.log('AMMO_AFTER_PISTOL_SHOT:', ammoAfterPistol);

  await page.keyboard.press('Digit4'); // SMG
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.mouse.up();
  await page.waitForTimeout(150);
  const ammoAfterSmg = await page.locator('[data-weapon-ammo]').textContent();
  console.log('AMMO_AFTER_SMG_BURST:', ammoAfterSmg);

  await snap('08_street_and_npcs.png', [8.0, 4.5, -29.0], [-1.0, 1.6, -21.0]);

  // 10. Close-up of street cat using live cat position
  const catPos = await page.evaluate(() => window.__ALACA_GAME__.getState().catPositions[1]);
  await snap('10_cats_closeup.png', [catPos[0] + 0.9, 0.55, catPos[2] - 0.9], [catPos[0], 0.22, catPos[2]]);

  // Close desktop page before opening mobile WebGL context cleanly
  await page.close();

  // 9. Mobile landscape viewport check
  const mobileCtx = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const mPage = await mobileCtx.newPage();
  mPage.on('pageerror', (err) => errors.push(`mobile pageerror: ${err.message}`));
  await mPage.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await mPage.waitForSelector('[data-action="start"]');
  await mPage.click('[data-action="start"]');
  await mPage.waitForTimeout(700);
  await mPage.screenshot({ path: '/Users/omer/Desktop/alaca2/screenshots/09_mobile_view.png' });
  await mobileCtx.close();

  console.log('CONSOLE_ERRORS:', JSON.stringify(errors));
} finally {
  await browser.close();
  server.kill();
}
