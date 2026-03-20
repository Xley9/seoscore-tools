/**
 * seoscore.tools — Cloudflare Worker
 * Serves static site + /api/scan endpoint
 */

import { runSeoChecks } from './scanner.js';
import { runAeoChecks } from './aeo-checks.js';
import { runGeoChecks } from './geo-checks.js';
import { detectSiteType } from './site-detector.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API: Global scan counter (read)
    if (url.pathname === '/api/scan-count' && request.method === 'GET') {
      const count = parseInt(await env.SCAN_COUNTER.get('total_scans') || '0');
      return jsonResponse({ count }, 200, corsHeaders);
    }

    // API: Scan endpoint
    if (url.pathname === '/api/scan' && request.method === 'POST') {
      try {
        const { url: targetUrl } = await request.json();

        if (!targetUrl) {
          return jsonResponse({ error: 'URL is required' }, 400, corsHeaders);
        }

        // Normalize URL
        let scanUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(scanUrl)) scanUrl = 'https://' + scanUrl;

        try { new URL(scanUrl); } catch {
          return jsonResponse({ error: 'Invalid URL' }, 400, corsHeaders);
        }

        // Fetch the page
        const pageResponse = await fetch(scanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEOScoreBot/1.0; +https://seoscore.tools)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
          cf: { cacheTtl: 0 },
        });

        if (!pageResponse.ok) {
          return jsonResponse({ error: `Could not reach ${scanUrl} (HTTP ${pageResponse.status})` }, 422, corsHeaders);
        }

        const html = await pageResponse.text();
        const finalUrl = pageResponse.url;
        const headers = Object.fromEntries(pageResponse.headers.entries());

        // Detect site type
        const siteType = detectSiteType(html, finalUrl);

        const pageData = { html, url: finalUrl, headers, statusCode: pageResponse.status, siteType };

        // Run all checks in parallel
        const [seo, aeo, geo] = await Promise.all([
          runSeoChecks(pageData),
          runAeoChecks(pageData),
          runGeoChecks(pageData),
        ]);

        // Increment global scan counter
        ctx.waitUntil((async () => {
          const current = parseInt(await env.SCAN_COUNTER.get('total_scans') || '0');
          await env.SCAN_COUNTER.put('total_scans', (current + 1).toString());
        })());

        return jsonResponse({ url: finalUrl, siteType, seo, aeo, geo, scannedAt: new Date().toISOString() }, 200, corsHeaders);

      } catch (err) {
        return jsonResponse({ error: err.message || 'Scan failed' }, 500, corsHeaders);
      }
    }

    // Redirect /{lang}/ to /?lang={lang} (homepage uses query param, not path prefix)
    const langRootMatch = url.pathname.match(/^\/(de|tr|ru|es)\/?$/);
    if (langRootMatch) {
      return Response.redirect(`${url.origin}/?lang=${langRootMatch[1]}`, 302);
    }

    // Serve static files with SSR language meta-tag replacement
    if (!env.ASSETS) {
      return new Response('Not Found', { status: 404 });
    }

    const response = await env.ASSETS.fetch(request);

    // Impact affiliate verification header + prevent CDN caching for HTML
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Impact-Site-Verification', 'f5e0ddd2-cb2f-4246-a7b2-060b1c624b61');
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      newHeaders.set('Cache-Control', 'public, max-age=60, s-maxage=0');
    }

    // Blog language handling — redirect + language switcher injection
    const pathname = url.pathname;
    const isBlog = pathname.startsWith('/blog/') || /^\/(de|tr|ru|es)\/blog\//.test(pathname);

    if (isBlog && contentType.includes('text/html') && response.status === 200) {
      let html = await response.text();
      const langMatch = pathname.match(/^\/(de|tr|ru|es)\//);
      const blogLang = langMatch ? langMatch[1] : 'en';
      const slug = pathname.replace(/^\/(de|tr|ru|es)\//, '/');

      // For English blog pages: auto-redirect if user has a different language preference
      if (blogLang === 'en') {
        const redirectScript = `<script>!function(){var l=localStorage.getItem("seoscore-lang");if(l&&"en"!==l&&/^(de|tr|ru|es)$/.test(l))location.replace("/"+l+location.pathname)}();</script>`;
        html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + redirectScript);
      } else {
        // For language-specific blog pages: save the language preference
        const saveScript = `<script>localStorage.setItem("seoscore-lang","${blogLang}")</script>`;
        html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + saveScript);
      }

      // Inject language switcher into nav (before theme toggle)
      const langSwitcher = buildBlogLangSwitcher(blogLang, slug);
      html = html.replace(
        '<button class="theme-toggle"',
        langSwitcher + '\n        <button class="theme-toggle"'
      );

      // Add click-outside handler to close dropdown
      const dropdownScript = `<script>document.addEventListener("click",function(e){if(!e.target.closest(".lang-switcher")){var d=document.querySelector(".lang-dropdown");if(d)d.classList.remove("open")}});</script>`;
      html = html.replace('</body>', dropdownScript + '\n</body>');

      return new Response(html, { status: response.status, headers: newHeaders });
    }

    // Homepage/other pages: SSR language meta-tag replacement
    const lang = url.searchParams.get('lang');
    if (lang && LANG_META[lang] && contentType.includes('text/html')) {
      let html = await response.text();
      const meta = LANG_META[lang];
      html = html
        .replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
        .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
        .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${meta.description}"`)
        .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${meta.og_title}"`)
        .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${meta.og_description}"`)
        .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${meta.og_title}"`)
        .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${meta.og_description}"`);

      return new Response(html, {
        status: response.status,
        headers: newHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};

// SSR language meta data for Google/crawlers
const LANG_META = {
  de: {
    title: 'SEO Score Tools \u2014 Kostenloser SEO, AEO & GEO Scanner | seoscore.tools',
    description: 'Das einzige kostenlose Tool, das SEO, AEO & GEO in einem Scan bewertet. Ohne Anmeldung. 136+ Checks.',
    og_title: 'SEO Score Tools \u2014 Kostenloser SEO, AEO & GEO Scanner',
    og_description: 'Das einzige kostenlose Tool, das SEO, AEO & GEO in einem Scan bewertet. 136+ Checks. Ohne Anmeldung.',
  },
  tr: {
    title: 'SEO Score Tools \u2014 \u00dccretsiz SEO, AEO & GEO Taray\u0131c\u0131 | seoscore.tools',
    description: 'SEO, AEO ve GEO puanlar\u0131n\u0131z\u0131 tek taramada g\u00f6steren tek \u00fccretsiz ara\u00e7. Kay\u0131t gerektirmez. 136+ kontrol.',
    og_title: 'SEO Score Tools \u2014 \u00dccretsiz SEO, AEO & GEO Taray\u0131c\u0131',
    og_description: 'SEO, AEO ve GEO puanlar\u0131n\u0131z\u0131 tek taramada g\u00f6steren tek \u00fccretsiz ara\u00e7. 136+ kontrol.',
  },
  ru: {
    title: 'SEO Score Tools \u2014 \u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 SEO, AEO & GEO \u0441\u043a\u0430\u043d\u0435\u0440 | seoscore.tools',
    description: '\u0415\u0434\u0438\u043d\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442 \u0434\u043b\u044f \u043e\u0446\u0435\u043d\u043a\u0438 SEO, AEO \u0438 GEO. \u0411\u0435\u0437 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438. 136+ \u043f\u0440\u043e\u0432\u0435\u0440\u043e\u043a.',
    og_title: 'SEO Score Tools \u2014 \u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 SEO, AEO & GEO \u0441\u043a\u0430\u043d\u0435\u0440',
    og_description: '\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 SEO, AEO \u0438 GEO \u0441\u043a\u0430\u043d\u0435\u0440. 136+ \u043f\u0440\u043e\u0432\u0435\u0440\u043e\u043a. \u0411\u0435\u0437 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438.',
  },
  es: {
    title: 'SEO Score Tools \u2014 Esc\u00e1ner SEO, AEO & GEO Gratuito | seoscore.tools',
    description: 'La \u00fanica herramienta gratuita que eval\u00faa SEO, AEO y GEO en un escaneo. Sin registro. 136+ verificaciones.',
    og_title: 'SEO Score Tools \u2014 Esc\u00e1ner SEO, AEO & GEO Gratuito',
    og_description: 'Eval\u00faa SEO, AEO y GEO en un escaneo. 136+ verificaciones. Sin registro.',
  },
};

function buildBlogLangSwitcher(currentLang, slug) {
  const langs = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'ru', label: 'Русский' },
    { code: 'es', label: 'Español' },
  ];

  const options = langs.map(l => {
    const href = l.code === 'en' ? slug : `/${l.code}${slug}`;
    const active = l.code === currentLang ? ' active' : '';
    return `<a href="${href}" class="lang-option${active}" onclick="localStorage.setItem('seoscore-lang','${l.code}')">${l.label}</a>`;
  }).join('\n            ');

  return `<div class="lang-switcher">
          <button class="lang-btn" aria-label="Change language" onclick="this.nextElementSibling.classList.toggle('open')">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c-2 2-2 11 0 13M8 1.5c2 2 2 11 0 13"/></svg>
            <span id="langCurrent">${currentLang.toUpperCase()}</span>
          </button>
          <div class="lang-dropdown">
            ${options}
          </div>
        </div>`;
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
