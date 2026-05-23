const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set viewport to OG image size
  await page.setViewport({ width: 1200, height: 630 });

  // Load the HTML file
  const htmlPath = 'file://' + path.resolve(__dirname, 'src/site/og-image.html');
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });

  // Take screenshot
  await page.screenshot({
    path: 'src/site/og-image.png',
    type: 'png'
  });

  console.log('✓ OG image generated: src/site/og-image.png');

  await browser.close();
})();
