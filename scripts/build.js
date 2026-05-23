// Build pipeline for seoscore.tools
//
// Produces minified bundles consumed by index.html and generates the
// site-side copy of check-metadata.js from the worker source-of-truth.
//
// Inputs (committed):
//   src/site/app.js
//   src/site/i18n.js
//   src/site/style.css
//   src/site/blog.css
//   src/worker/check-metadata.js   (single source for the metadata table)
//
// Outputs (gitignored, regenerated on every build):
//   src/site/app.min.js
//   src/site/i18n.min.js
//   src/site/check-metadata.js
//   src/site/check-metadata.min.js
//   src/site/style.min.css
//   src/site/blog.min.css
//
// JS files are minified WITHOUT bundling so top-level functions stay on the
// global scope — `index.html` calls a number of them from inline onclick
// handlers (`setTheme`, `trackEvent`, etc.) and bundling would wrap the
// module in an IIFE and break those calls.

const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'src', 'site');
const WORKER = path.join(ROOT, 'src', 'worker');

function generateSiteCheckMetadata() {
  // Worker version is an ES module that exports both data
  // (`checkMetadata`, `priorityLevels`) and functions
  // (`getCheckMetadata`, `getQuickWins`). The site loads this as a
  // classic <script>, so every `export` must be stripped — otherwise
  // the browser hits a parse error and the helpers never get bound to
  // the global scope (the symptom is "getCheckMetadata is not defined"
  // when running a scan).
  const src = fs.readFileSync(path.join(WORKER, 'check-metadata.js'), 'utf8');
  const transformed = src.replace(/^export\s+(const|function|let|var)\b/gm, '$1');
  if (!/^const checkMetadata\b/m.test(transformed)) {
    throw new Error('check-metadata transform failed: no top-level `const checkMetadata` in output');
  }
  if (!/^function getCheckMetadata\b/m.test(transformed)) {
    throw new Error('check-metadata transform failed: no top-level `function getCheckMetadata` in output');
  }
  const banner = '/* AUTO-GENERATED from src/worker/check-metadata.js — do not edit by hand. */\n';
  fs.writeFileSync(path.join(SITE, 'check-metadata.js'), banner + transformed);
}

async function buildAll() {
  generateSiteCheckMetadata();

  const jsTargets = [
    { in: 'app.js', out: 'app.min.js' },
    { in: 'i18n.js', out: 'i18n.min.js' },
    { in: 'check-metadata.js', out: 'check-metadata.min.js' },
  ];
  const cssTargets = [
    { in: 'style.css', out: 'style.min.css' },
    { in: 'blog.css', out: 'blog.min.css' },
  ];

  await Promise.all([
    ...jsTargets.map(t =>
      esbuild.build({
        entryPoints: [path.join(SITE, t.in)],
        outfile: path.join(SITE, t.out),
        minify: true,
        bundle: false,
        target: ['es2018'],
        legalComments: 'none',
        logLevel: 'error',
      })
    ),
    ...cssTargets.map(t =>
      esbuild.build({
        entryPoints: [path.join(SITE, t.in)],
        outfile: path.join(SITE, t.out),
        minify: true,
        bundle: false,
        loader: { '.css': 'css' },
        legalComments: 'none',
        logLevel: 'error',
      })
    ),
  ]);

  for (const t of [...jsTargets, ...cssTargets]) {
    const inSize = fs.statSync(path.join(SITE, t.in)).size;
    const outSize = fs.statSync(path.join(SITE, t.out)).size;
    const pct = (100 - (outSize / inSize) * 100).toFixed(1);
    console.log(`  ${t.in.padEnd(20)} ${inSize.toString().padStart(7)} -> ${outSize.toString().padStart(7)} bytes  (-${pct}%)`);
  }
}

buildAll().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
