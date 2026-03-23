import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 560 } });

await page.goto('http://localhost:4242');

// Attend que l'app soit chargée
await page.waitForSelector('text=Oh my AI!');

// Active le thème Paper via localStorage avant le rechargement
await page.evaluate(() => {
	localStorage.setItem('colorTheme', 'paper');
	localStorage.setItem('isDark', 'false');
});

// Recharge pour appliquer le thème
await page.reload();
await page.waitForSelector('text=Oh my AI!');

// Petit délai pour laisser les transitions CSS finir
await page.waitForTimeout(500);

await page.screenshot({ path: 'static/screenshot-desktop.png', fullPage: false });

console.log('Screenshot Paper sauvegardé dans static/screenshot-desktop.png');

await browser.close();
