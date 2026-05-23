// Auto-submit recently-changed URLs to IndexNow after every deploy.
//
// Reads sitemap.xml, pulls every <url> whose <lastmod> falls inside the
// last N days, and POSTs the batch to api.indexnow.org. That fans the
// notification out to Bing, Yandex, Naver, Seznam and Yep within seconds.
// Google has no equivalent API for general web pages — it is the only
// search engine where you still have to use Search Console manually.
//
// Designed to be a no-op when nothing recent changed and to fail silently
// so a flaky IndexNow endpoint never breaks a deploy.

const fs = require('node:fs');
const path = require('node:path');

const KEY = '41ef9d27fce0c183a798924d2b72db21';
const HOST = 'seoscore.tools';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const RECENT_DAYS = 7;
const MAX_PER_BATCH = 10000; // IndexNow spec limit
const SITEMAP_PATH = path.resolve(__dirname, '..', 'src', 'site', 'sitemap.xml');

function parseRecentUrls() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.warn(`IndexNow: sitemap not found at ${SITEMAP_PATH}, skipping`);
    return [];
  }
  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const cutoff = Date.now() - RECENT_DAYS * 86400 * 1000;
  const urls = [];

  // Non-greedy match on <url>...</url> blocks. Robust enough for the
  // hand-maintained sitemap; we don't pull in a full XML parser for
  // 200 lines of regular structure.
  const blockRegex = /<url>([\s\S]*?)<\/url>/g;
  let m;
  while ((m = blockRegex.exec(xml)) !== null) {
    const block = m[1];
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    if (!locMatch) continue;
    const loc = locMatch[1].trim();

    const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
    if (lastmodMatch) {
      const lastmod = Date.parse(lastmodMatch[1].trim());
      if (Number.isFinite(lastmod) && lastmod < cutoff) continue;
    }
    urls.push(loc);
  }
  return urls;
}

async function submit(urls) {
  if (!urls.length) {
    console.log(`IndexNow: no URLs with lastmod in last ${RECENT_DAYS} days. Nothing to submit.`);
    return;
  }
  if (urls.length > MAX_PER_BATCH) {
    console.warn(`IndexNow: ${urls.length} URLs exceeds ${MAX_PER_BATCH}-per-batch limit; truncating`);
    urls.length = MAX_PER_BATCH;
  }

  console.log(`IndexNow: submitting ${urls.length} URL(s) (lastmod within last ${RECENT_DAYS}d)`);
  for (const u of urls.slice(0, 10)) console.log(`  - ${u}`);
  if (urls.length > 10) console.log(`  ...and ${urls.length - 10} more`);

  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  });

  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
      },
      body,
    });
    if (res.status === 200 || res.status === 202) {
      console.log(`IndexNow: ✓ accepted — HTTP ${res.status}`);
      return;
    }
    let text = '';
    try { text = await res.text(); } catch {}
    console.warn(`IndexNow: ⚠ HTTP ${res.status}${text ? ' — ' + text.slice(0, 200) : ''}`);
  } catch (e) {
    console.error('IndexNow: request failed —', e.message || e);
  }
}

submit(parseRecentUrls()).catch(err => {
  // Never fail the deploy because of IndexNow.
  console.error('IndexNow: unexpected error —', err && err.message ? err.message : err);
  process.exit(0);
});
