const https = require('https');

function scanSite(url) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ url });
    const req = https.request('https://seoscore.tools/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const sites = ['https://seoscore.tools', 'https://seoscore.tools/seo-autopilot/', 'https://medboost.net'];

  for (const site of sites) {
    console.log('\n=== ' + site + ' ===');
    try {
      const r = await scanSite(site);
      console.log('SEO:', r.seo.score, '(' + r.seo.total + ' checks) | AEO:', r.aeo.score, '| GEO:', r.geo.score);

      const fails = r.seo.checks.filter(c => !c.pass);
      console.log('Failing SEO (' + fails.length + '):');
      fails.forEach(c => console.log('  ' + c.id + ': ' + c.label.substring(0, 85)));
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
}

main();
