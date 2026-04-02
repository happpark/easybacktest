import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = `file://${__dirname}/cards-instagram.html`;
const outDir = `${__dirname}/card-screenshots`;

import { mkdirSync } from 'fs';
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 10800, deviceScaleFactor: 1 });
await page.goto(htmlPath, { waitUntil: 'networkidle0' });

const cards = await page.$$('.card');
console.log(`Found ${cards.length} cards`);

for (let i = 0; i < cards.length; i++) {
  const card = cards[i];
  await card.screenshot({ path: `${outDir}/card-${String(i + 1).padStart(2, '0')}.png` });
  console.log(`Saved card ${i + 1}`);
}

await browser.close();
console.log(`\nDone! Saved to: ${outDir}`);
