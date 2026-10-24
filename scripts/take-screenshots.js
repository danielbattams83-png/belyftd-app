const fs = require('node:fs/promises');
const path = require('node:path');
const puppeteer = require('puppeteer');

const baseUrl = process.env.SCREENSHOT_BASE_URL || process.env.BASE_URL || 'http://localhost:4200';
const outputDir = path.resolve(process.cwd(), 'screenshots');
const routes = [
  ['home', '/'],
  ['courses', '/courses'],
  ['mentors', '/mentors'],
  ['growth-quests', '/quests'],
  ['coach-spark', '/coach-spark'],
  ['hype-wall', '/hype-wall'],
  ['partners', '/partners'],
  ['profile', '/profile'],
];

async function main() {
  await fs.mkdir(outputDir, {recursive: true});
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({width: 390, height: 844, deviceScaleFactor: 2, isMobile: true});
  await page.emulateMediaFeatures([{name: 'prefers-color-scheme', value: 'light'}]);

  try {
    for (const [name, route] of routes) {
      const url = new URL(route, baseUrl).toString();
      console.log(`Capturing ${name}: ${url}`);
      await page.goto(url, {waitUntil: 'networkidle0', timeout: 60000});
      await page.evaluate(() => document.fonts?.ready);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await page.screenshot({
        path: path.join(outputDir, `${name}.png`),
        fullPage: true,
      });
    }
  } finally {
    await browser.close();
  }

  console.log(`Saved ${routes.length} mobile screenshots to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
