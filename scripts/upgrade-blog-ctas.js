/**
 * upgrade-blog-ctas.js
 * Replaces link-based CTAs in all blog articles with inline scan forms.
 * Usage: node scripts/upgrade-blog-ctas.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'src', 'site');
const DRY_RUN = process.argv.includes('--dry-run');

// Language-specific form texts (placeholder + button)
const LANG_TEXTS = {
  en: { placeholder: 'Enter your website URL...', button: 'Scan Now &rarr;' },
  de: { placeholder: 'Ihre Website-URL eingeben...', button: 'Jetzt scannen &rarr;' },
  tr: { placeholder: 'Web sitenizin URL\'sini girin...', button: 'Taramay\u0131 Ba\u015flat &rarr;' },
  ru: { placeholder: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 URL \u0432\u0430\u0448\u0435\u0433\u043e \u0441\u0430\u0439\u0442\u0430...', button: '\u0421\u043a\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u0442\u044c &rarr;' },
  es: { placeholder: 'Ingrese la URL de su sitio...', button: 'Escanear ahora &rarr;' },
};

// Detect language from file path
function detectLang(filePath) {
  const rel = path.relative(SITE_DIR, filePath).replace(/\\/g, '/');
  if (rel.startsWith('de/')) return 'de';
  if (rel.startsWith('tr/')) return 'tr';
  if (rel.startsWith('ru/')) return 'ru';
  if (rel.startsWith('es/')) return 'es';
  return 'en';
}

// Collect all blog article index.html files (not blog listing index.html)
function collectBlogFiles() {
  const files = [];
  const langDirs = ['blog', 'de/blog', 'tr/blog', 'ru/blog', 'es/blog'];

  for (const langDir of langDirs) {
    const blogDir = path.join(SITE_DIR, langDir);
    if (!fs.existsSync(blogDir)) continue;

    const entries = fs.readdirSync(blogDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const indexPath = path.join(blogDir, entry.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        files.push(indexPath);
      }
    }
  }
  return files;
}

// Build the replacement HTML for a CTA block
// Keeps existing h3 and p, replaces the <a> link with a <form>
function buildScanForm(h3Content, pContent, lang) {
  const { placeholder, button } = LANG_TEXTS[lang];
  return `<div class="article-cta article-cta-scan">
              <h3>${h3Content}</h3>
              <p>${pContent}</p>
              <form class="cta-scan-form" action="https://seoscore.tools/" method="GET">
                <div class="cta-input-wrapper">
                  <input type="url" name="url" class="cta-scan-input" placeholder="${placeholder}" required>
                  <button type="submit" class="btn btn-primary cta-scan-btn">${button}</button>
                </div>
              </form>
            </div>`;
}

// Regex to match existing CTA blocks
// Matches: <div class="article-cta"> ... <h3>...</h3> ... <p>...</p> ... <a href=...>...</a> ... </div>
const CTA_REGEX = /<div class="article-cta">\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<a\s+href="[^"]*"\s+class="btn btn-primary">[^<]*<\/a>\s*<\/div>/g;

function processFile(filePath) {
  const lang = detectLang(filePath);
  let html = fs.readFileSync(filePath, 'utf8');
  let count = 0;

  const newHtml = html.replace(CTA_REGEX, (match, h3Content, pContent) => {
    count++;
    return buildScanForm(h3Content.trim(), pContent.trim(), lang);
  });

  if (count === 0) {
    console.log(`  SKIP (no CTAs found): ${path.relative(SITE_DIR, filePath)}`);
    return { file: filePath, replaced: 0 };
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, newHtml, 'utf8');
  }
  console.log(`  ${DRY_RUN ? '[DRY] ' : ''}${count} CTAs upgraded: ${path.relative(SITE_DIR, filePath)}`);
  return { file: filePath, replaced: count };
}

// Main
console.log(`\n=== Blog CTA Upgrade Script ===`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no files changed)' : 'LIVE (writing files)'}\n`);

const files = collectBlogFiles();
console.log(`Found ${files.length} blog article files.\n`);

let totalReplaced = 0;
let filesProcessed = 0;
let filesSkipped = 0;

for (const file of files) {
  const result = processFile(file);
  totalReplaced += result.replaced;
  if (result.replaced > 0) filesProcessed++;
  else filesSkipped++;
}

console.log(`\n=== Summary ===`);
console.log(`Files processed: ${filesProcessed}`);
console.log(`Files skipped:   ${filesSkipped}`);
console.log(`Total CTAs upgraded: ${totalReplaced}`);
if (DRY_RUN) console.log(`\nRe-run without --dry-run to apply changes.`);
console.log('');
