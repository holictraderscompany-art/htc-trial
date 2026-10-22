// Browser comparison runs only inside the private loopback of a hosted Linux runner.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
assert.equal(process.env.GITHUB_ACTIONS, 'true'); assert.equal(process.platform, 'linux');
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const u = new URL(route.request().url());
      return u.hostname === '127.0.0.1' && ['3105', '3106'].includes(u.port) ? route.continue() : route.abort();
    });
    for (const path of ['/', '/sign-in', '/sign-in?error=failed']) {
      const snapshots = [];
      for (const port of [3106, 3105]) {
        const page = await context.newPage();
        const failures = []; page.on('pageerror', error => failures.push(error.name));
        const response = await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        await page.locator('h1').waitFor();
        assert(await page.locator('.brand').isVisible());
        assert(await page.locator('nav[aria-label="Main navigation"]').isVisible());
        assert(await page.locator('main').isVisible());
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        assert.deepEqual(failures, []);
        if (path.startsWith('/sign-in')) {
          assert.equal(await page.locator('form').getAttribute('action'), '/auth/start');
          assert(await page.getByRole('button', { name: 'Continue with Google' }).isVisible());
        }
        if (path.includes('error=')) assert.match(await page.getByRole('alert').innerText(), /Sign-in did not complete/);
        const text = await page.locator('body').innerText();
        const links = await page.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
        const image = await page.screenshot({ fullPage: true });
        snapshots.push({ text, links, image: crypto.createHash('sha256').update(image).digest('hex') });
        await page.close();
      }
      assert.equal(snapshots[1].text, snapshots[0].text, 'Worker/reference visible text mismatch');
      assert.deepEqual(snapshots[1].links, snapshots[0].links, 'Worker/reference navigation mismatch');
      assert.equal(snapshots[1].image, snapshots[0].image, 'Worker/reference rendered screenshot mismatch');
      results.push({ width, path, status: 'PASS', renderedScreenshotSHA256: snapshots[1].image, matchesNextReference: true });
    }
    await context.close();
  }
  fs.writeFileSync('validation/cloudflare/ui-cloud.json', JSON.stringify({ status: 'PASS', results,
    label: 'CLOUD LOOPBACK — anonymous render and responsive comparison, no real OAuth', externalBrowserRequestsBlocked: true }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', comparisons: results.length }));
} finally { await browser.close(); }
