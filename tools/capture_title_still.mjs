// Takes the still shown on the title screen while the game loads: the scene a new arrival first sees, exactly as the
// loaded title screen shows it (ink post-processing and vignette included, title and entries hidden), so that the
// loading screen and the loaded one are the same picture.
//
// Run by hand after the gate scene or the ink look changes, with the local server up (python serve.py):
//   node tools/capture_title_still.mjs <path to playwright index.mjs> [baseUrl]
//   python tools/encode_title_still.py
// It uses its own playtest save and does not touch player saves.
import {pathToFileURL, fileURLToPath} from 'node:url';

const [playwrightPath, base = 'http://127.0.0.1:8091/'] = process.argv.slice(2);
if (!playwrightPath) { console.error('usage: node tools/capture_title_still.mjs <playwright index.mjs> [baseUrl]'); process.exit(2); }
const {chromium} = await import(pathToFileURL(playwrightPath).href);
const out = fileURLToPath(new URL('../.artifacts/title-still.png', import.meta.url));
const browser = await chromium.launch({executablePath: process.env.TITLE_STILL_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=d3d11']});
try {
  const page = await (await browser.newContext({viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1})).newPage();
  await page.goto(base + '?playtest=title-still-' + Date.now());
  // The entries appear once everything, people included, has loaded.
  await page.waitForSelector('#welcome:not(.loading) #start', {state: 'visible', timeout: 120000});
  await page.waitForTimeout(2500);
  await page.addStyleTag({content: '#welcome{visibility:hidden}'});
  await page.waitForTimeout(300);
  await page.screenshot({path: out});
  console.log(out);
} finally { await browser.close(); }
