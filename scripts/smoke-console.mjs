import { chromium } from 'playwright-core';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const paths = ['/', '/shop'];

const events = [];
const push = (evt) => events.push({ ts: new Date().toISOString(), ...evt });

async function launchBrowser() {
  const tries = [{ channel: 'chrome' }, { channel: 'msedge' }, {}];
  let lastError;
  for (const opts of tries) {
    try {
      return await chromium.launch({ headless: true, ...opts });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function main() {
  const browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    push({ type: 'console', level: msg.type(), text: msg.text(), location: msg.location() });
  });
  page.on('pageerror', (err) => {
    push({ type: 'pageerror', level: 'error', text: String(err) });
  });
  page.on('requestfailed', (req) => {
    push({ type: 'requestfailed', level: 'error', url: req.url(), failure: req.failure() });
  });

  async function goto(path) {
    const url = new URL(path, baseUrl).toString();
    push({ type: 'nav', level: 'info', url });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForTimeout(500);
  }

  let productPath = null;
  try {
    for (const path of paths) await goto(path);

    const href = await page.evaluate(() => {
      const a = document.querySelector('a[href^="/product/"]');
      return a ? a.getAttribute('href') : null;
    });

    if (href) {
      productPath = href;
      await goto(href);
    } else {
      push({ type: 'note', level: 'warn', text: 'No /product/ link found on /shop' });
    }
  } catch (err) {
    push({ type: 'runnererror', level: 'error', text: String(err) });
  } finally {
    await browser.close();
  }

  const interesting = events.filter((e) => {
    const lvl = String(e.level || '').toLowerCase();
    if (lvl === 'error') return true;
    if (lvl === 'warning' || lvl === 'warn') {
      const t = String(e.text || '').toLowerCase();
      return t.includes('[vue warn]') || t.includes('vue warn');
    }
    return false;
  });

  process.stdout.write(JSON.stringify({ ok: true, productPath, total: events.length, interesting }, null, 2));
}

main().catch((err) => {
  process.stdout.write(JSON.stringify({ ok: false, error: String(err) }, null, 2));
  process.exitCode = 1;
});

