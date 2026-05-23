/**
 * seoscore.tools — Cloudflare Worker
 * Serves static site + /api/scan endpoint
 */

import { runSeoChecks } from './scanner.js';
import { runAeoChecks } from './aeo-checks.js';
import { runGeoChecks } from './geo-checks.js';
import { runCwvChecks } from './cwv-checks.js';
import { detectSiteType } from './site-detector.js';
import { REPORT_STYLES } from './report-styles.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 301 Redirect: www → non-www (canonical domain)
    if (url.hostname === 'www.seoscore.tools') {
      url.hostname = 'seoscore.tools';
      return new Response(null, {
        status: 301,
        headers: { 'Location': url.toString() }
      });
    }

    // 301 Redirect: HTTP → HTTPS (belt-and-suspenders, Cloudflare usually handles this)
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return new Response(null, {
        status: 301,
        headers: { 'Location': url.toString() }
      });
    }

    // REMOVED 2026-05-08: Cannibalization redirect was costing 550+ Impressions/Mo for
    // "perplexity seo checker" keyword (GSC data). The two pages target different
    // search intent: perplexity-seo (strategy) vs perplexity-seo-checker (tool).
    // Both should rank independently. Internal linking + canonical tags handle
    // any residual cannibalization concern.

    // CORS headers
    const allowedOrigins = ['https://seoscore.tools', 'https://www.seoscore.tools'];
    const origin = request.headers.get('Origin') || '';
    const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://seoscore.tools';
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
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
        // Rate limit: 5 scans per IP per minute (atomic counter)
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const now = Date.now();
        const minuteSlot = Math.floor(now / 60000);
        const rateLimitKey = `rate:${clientIP}:${minuteSlot}`;
        const currentCount = parseInt(await env.SCAN_COUNTER.get(rateLimitKey) || '0');
        if (currentCount >= 5) {
          return jsonResponse({ error: 'Rate limit exceeded — please wait a moment before scanning again.' }, 429, corsHeaders);
        }
        ctx.waitUntil(env.SCAN_COUNTER.put(rateLimitKey, (currentCount + 1).toString(), { expirationTtl: 120 }));

        const { url: targetUrl, keyphrase } = await request.json();

        if (!targetUrl) {
          return jsonResponse({ error: 'URL is required' }, 400, corsHeaders);
        }

        // Normalize URL
        let scanUrl = targetUrl.trim();
        if (!/^https?:\/\//i.test(scanUrl)) scanUrl = 'https://' + scanUrl;

        // URL length limit
        if (scanUrl.length > 2048) {
          return jsonResponse({ error: 'URL too long (max 2048 characters)' }, 400, corsHeaders);
        }

        try { new URL(scanUrl); } catch {
          return jsonResponse({ error: 'Invalid URL' }, 400, corsHeaders);
        }

        // Block private/internal URLs (SSRF protection)
        const scanParsed = new URL(scanUrl);
        const hn = scanParsed.hostname;
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '169.254.169.254', 'metadata.google.internal'];
        if (blockedHosts.includes(hn) || isPrivateHostname(hn)) {
          return jsonResponse({ error: 'Cannot scan private or internal URLs' }, 400, corsHeaders);
        }

        // Target-URL rate limit: max 10 scans per target domain per hour (atomic counter)
        const targetDomain = new URL(scanUrl).hostname;
        const hourSlot = Math.floor(now / 3600000);
        const targetRateKey = `trate:${targetDomain}:${hourSlot}`;
        const targetCount = parseInt(await env.SCAN_COUNTER.get(targetRateKey) || '0');
        if (targetCount >= 30) {
          return jsonResponse({ error: 'This domain has been scanned too frequently. Please try again later.' }, 429, corsHeaders);
        }
        ctx.waitUntil(env.SCAN_COUNTER.put(targetRateKey, (targetCount + 1).toString(), { expirationTtl: 7200 }));

        // Self-scan: use env.ASSETS directly to avoid Worker deadlock (HTTP 522)
        const isSelfScan = scanParsed.hostname === 'seoscore.tools' || scanParsed.hostname === 'www.seoscore.tools';

        let html, finalUrl, headers, statusCode;

        if (isSelfScan && env.ASSETS) {
          const assetReq = new Request(scanUrl, {
            headers: { 'Accept': 'text/html' },
          });
          const assetResp = await env.ASSETS.fetch(assetReq);
          html = await assetResp.text();
          finalUrl = scanUrl;
          statusCode = 200;
          headers = {
            'content-type': 'text/html',
            'content-encoding': 'gzip',
            'cache-control': 'public, max-age=60, s-maxage=0',
            'strict-transport-security': 'max-age=31536000; includeSubDomains',
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'SAMEORIGIN',
            'referrer-policy': 'strict-origin-when-cross-origin',
            'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://utt.impactcdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://analytics.google.com",
            'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
          };
        } else {
          // Fetch external page with 30s timeout
          const fetchController = new AbortController();
          const fetchTimeout = setTimeout(() => fetchController.abort(), 30000);
          // Follow redirects manually to validate each hop against SSRF blocklist
          let pageResponse;
          let currentUrl = scanUrl;
          const maxRedirects = 5;
          try {
            for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
              pageResponse = await fetch(currentUrl, {
                signal: fetchController.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; SEOScoreBot/1.0; +https://seoscore.tools)',
                  'Accept': 'text/html,application/xhtml+xml',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Accept-Encoding': 'gzip, br',
                },
                redirect: 'manual',
                cf: { cacheTtl: 0 },
              });

              // If not a redirect, break
              if (pageResponse.status < 300 || pageResponse.status >= 400) break;

              // Validate redirect target against SSRF blocklist
              const location = pageResponse.headers.get('location');
              if (!location) break;
              try {
                const redirectUrl = new URL(location, currentUrl);
                const rhn = redirectUrl.hostname;
                if (blockedHosts.includes(rhn) || isPrivateHostname(rhn)) {
                  return jsonResponse({ error: 'Redirect target is a private or internal URL' }, 400, corsHeaders);
                }
                currentUrl = redirectUrl.href;
              } catch {
                return jsonResponse({ error: 'Invalid redirect URL' }, 422, corsHeaders);
              }

              if (redirectCount === maxRedirects) {
                return jsonResponse({ error: 'Too many redirects' }, 422, corsHeaders);
              }
            }
          } catch (fetchErr) {
            clearTimeout(fetchTimeout);
            return jsonResponse({ error: fetchErr.name === 'AbortError' ? 'Page took too long to respond (30s timeout)' : 'Could not reach the URL (connection failed)' }, 422, corsHeaders);
          }
          clearTimeout(fetchTimeout);

          if (!pageResponse.ok) {
            return jsonResponse({ error: `Page returned HTTP ${pageResponse.status}` }, 422, corsHeaders);
          }

          // Validate content type — only scan HTML pages
          const respContentType = (pageResponse.headers.get('content-type') || '').toLowerCase();
          if (!respContentType.includes('text/html') && !respContentType.includes('application/xhtml+xml') && !respContentType.includes('text/xml')) {
            return jsonResponse({ error: 'URL does not return HTML content. Only HTML pages can be scanned.' }, 422, corsHeaders);
          }

          html = await pageResponse.text();

          // HTML size limit — prevent Worker memory issues
          if (html.length > 5 * 1024 * 1024) {
            return jsonResponse({ error: 'Page too large to scan (over 5 MB)' }, 422, corsHeaders);
          }

          finalUrl = pageResponse.url;
          statusCode = pageResponse.status;
          headers = Object.fromEntries(pageResponse.headers.entries());
        }

        // Detect site type
        const siteType = detectSiteType(html, finalUrl);

        // Detect SPA / client-side rendered pages with very thin HTML content
        const strippedText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const textWordCount = strippedText ? strippedText.split(/\s+/).filter(Boolean).length : 0;
        const isSpaLikely = textWordCount < 30 && (/<div\s+id=["'](root|app|__next)["']/i.test(html) || /__NEXT_DATA__|window\.__NUXT__|window\.__remixContext/i.test(html));
        if (isSpaLikely) {
          siteType.spaWarning = 'This page appears to be client-side rendered. Scores may be incomplete — content loaded via JavaScript is not visible to the scanner.';
        }

        // Build base URL for extra fetches
        const scanBase = new URL(finalUrl);
        const baseUrl = `${scanBase.protocol}//${scanBase.hostname}`;

        // Helper: fetch text with timeout
        const fetchText = async (fetchUrl, timeoutMs = 5000) => {
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), timeoutMs);
            const resp = await fetch(fetchUrl, {
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOScoreBot/1.0; +https://seoscore.tools)' },
              cf: { cacheTtl: 0 },
            });
            clearTimeout(tid);
            return resp.ok ? await resp.text() : null;
          } catch { return null; }
        };

        // For self-scan, use env.ASSETS for static files
        const fetchAsset = async (path) => {
          if (isSelfScan && env.ASSETS) {
            try {
              const resp = await env.ASSETS.fetch(new Request(`https://seoscore.tools${path}`));
              return resp.ok ? await resp.text() : null;
            } catch { return null; }
          }
          return fetchText(`${baseUrl}${path}`);
        };

        // Fetch extras + PSI + broken links — all in parallel
        const [robotsTxt, sitemapXml, llmsTxt, cwvRaw, brokenLinks] = await Promise.all([
          fetchAsset('/robots.txt'),
          fetchAsset('/sitemap.xml'),
          fetchAsset('/llms.txt'),
          // PSI API with 15s timeout. PSI_API_KEY (wrangler secret) lifts
          // the anonymous public quota — without it the API returns 429
          // once the shared free pool is drained.
          (async () => {
            try {
              const psiKeyParam = env.PSI_API_KEY ? `&key=${env.PSI_API_KEY}` : '';
              const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(finalUrl)}&strategy=mobile${psiKeyParam}`;
              const controller = new AbortController();
              const tid = setTimeout(() => controller.abort(), 15000);
              const resp = await fetch(psiUrl, { signal: controller.signal });
              clearTimeout(tid);
              return resp.ok ? await resp.json() : null;
            } catch { return null; }
          })(),
          // Broken links: HEAD check up to 5 internal links
          (async () => {
            if (isSelfScan) return { checked: 0, broken: 0, urls: [] };
            const re = /<a[^>]*href=["']([^"'#]+)["']/gi;
            const found = new Set();
            let m;
            while ((m = re.exec(html)) !== null && found.size < 10) {
              const href = m[1];
              if (/^(javascript|mailto|tel):/.test(href)) continue;
              try {
                const lu = new URL(href, finalUrl);
                if (lu.hostname === scanBase.hostname && lu.href !== finalUrl) found.add(lu.href);
              } catch {}
            }
            const toCheck = [...found].slice(0, 5);
            if (!toCheck.length) return { checked: 0, broken: 0, urls: [] };
            const results = await Promise.all(toCheck.map(async u => {
              try {
                const c = new AbortController();
                const t = setTimeout(() => c.abort(), 3000);
                const r = await fetch(u, { method: 'HEAD', signal: c.signal, redirect: 'follow', cf: { cacheTtl: 0 } });
                clearTimeout(t);
                return { url: u, ok: r.ok };
              } catch { return { url: u, ok: false }; }
            }));
            const broken = results.filter(r => !r.ok);
            return { checked: results.length, broken: broken.length, urls: broken.map(r => r.url) };
          })(),
        ]);

        // Extract ALL internal links (for crawl feature)
        const internalLinkSet = new Set();
        const ilRe = /<a[^>]*href=["']([^"'#]+)["']/gi;
        let ilm;
        while ((ilm = ilRe.exec(html)) !== null) {
          const href = ilm[1];
          if (/^(javascript|mailto|tel):/.test(href)) continue;
          try {
            const lu = new URL(href, finalUrl);
            if (lu.hostname === scanBase.hostname && lu.href !== finalUrl) {
              lu.hash = '';
              internalLinkSet.add(lu.href);
            }
          } catch {}
        }
        const internalLinks = [...internalLinkSet].slice(0, 50);

        const pageData = { html, url: finalUrl, headers, statusCode, siteType, robotsTxt, sitemapXml, llmsTxt, brokenLinks, keyphrase: (keyphrase || '').substring(0, 100) };

        // Run all check engines in parallel
        const [seo, aeo, geo] = await Promise.all([
          runSeoChecks(pageData),
          runAeoChecks(pageData),
          runGeoChecks(pageData),
        ]);

        // CWV checks (separate, may be null)
        const cwv = runCwvChecks(cwvRaw);

        // Increment global scan counter
        ctx.waitUntil((async () => {
          const current = parseInt(await env.SCAN_COUNTER.get('total_scans') || '0');
          await env.SCAN_COUNTER.put('total_scans', (current + 1).toString());
        })());

        // Store public report in KV (non-blocking)
        ctx.waitUntil((async () => {
          if (env.SCAN_REPORTS) {
            try {
              const domainSlug = targetDomain.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
              const reportData = {
                domain: targetDomain,
                url: finalUrl,
                seo: { score: seo.score, passed: seo.passed, total: seo.total, checks: seo.checks.map(c => ({ id: c.id, label: c.label, pass: c.pass, category: c.category })) },
                aeo: { score: aeo.score, passed: aeo.passed, total: aeo.total, checks: aeo.checks.map(c => ({ id: c.id, label: c.label, pass: c.pass, category: c.category })) },
                geo: { score: geo.score, passed: geo.passed, total: geo.total, checks: geo.checks.map(c => ({ id: c.id, label: c.label, pass: c.pass, category: c.category })) },
                cwv: cwv ? { score: cwv.score } : null,
                siteType: siteType?.detectedCms || null,
                scannedAt: new Date().toISOString(),
              };
              await env.SCAN_REPORTS.put(`report:${domainSlug}`, JSON.stringify(reportData), { expirationTtl: 7776000 }); // 90 days
              // Update sitemap index
              if (env.REPORT_SITEMAP) {
                await env.REPORT_SITEMAP.put(`idx:${domainSlug}`, new Date().toISOString(), { expirationTtl: 7776000 });
              }
            } catch (e) {
              // Silent fail — report storage is non-critical
            }
          }
        })());

        return jsonResponse({ url: finalUrl, siteType, seo, aeo, geo, cwv, internalLinks, scannedAt: new Date().toISOString() }, 200, corsHeaders);

      } catch (err) {
        // Never expose internal error details to users
        return jsonResponse({ error: 'An unexpected error occurred. Please try again.' }, 500, corsHeaders);
      }
    }

    // Public Report Page: /report/{domain-slug}/
    const reportMatch = url.pathname.match(/^\/report\/([a-z0-9-]+)\/?$/);
    if (reportMatch && env.SCAN_REPORTS) {
      const slug = reportMatch[1];
      const reportJson = await env.SCAN_REPORTS.get(`report:${slug}`);
      if (!reportJson) {
        return new Response(generateReport404Html(slug), {
          status: 404,
          headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public, max-age=300' }
        });
      }
      const report = JSON.parse(reportJson);
      const reportHtml = generateReportHtml(report, slug);
      return new Response(reportHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
        }
      });
    }

    // Sitemap for reports: /sitemap-reports.xml
    if (url.pathname === '/sitemap-reports.xml' && env.REPORT_SITEMAP) {
      const keys = await env.REPORT_SITEMAP.list({ prefix: 'idx:' });
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      for (const key of keys.keys) {
        const slug = key.name.replace('idx:', '');
        const lastmod = key.metadata || new Date().toISOString().split('T')[0];
        xml += `  <url>\n    <loc>https://seoscore.tools/report/${slug}/</loc>\n    <lastmod>${typeof lastmod === 'string' ? lastmod.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
      }
      xml += '</urlset>';
      return new Response(xml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }
      });
    }

    // Redirect /{lang}/ to /?lang={lang} (homepage uses query param, not path prefix)
    const langRootMatch = url.pathname.match(/^\/(de|tr|ru|es)\/?$/);
    if (langRootMatch) {
      return Response.redirect(`${url.origin}/?lang=${langRootMatch[1]}`, 301);
    }

    // Serve static files with SSR language meta-tag replacement
    if (!env.ASSETS) {
      return new Response('Not Found', { status: 404 });
    }

    const response = await env.ASSETS.fetch(request);

    // Impact affiliate verification header + prevent CDN caching for HTML
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Impact-Site-Verification', 'f5e0ddd2-cb2f-4246-a7b2-060b1c624b61');
    newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://utt.impactcdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://analytics.google.com");
    newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
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
    description: 'Das einzige kostenlose Tool, das SEO, AEO & GEO in einem Scan bewertet. Ohne Anmeldung. 260+ Checks.',
    og_title: 'SEO Score Tools \u2014 Kostenloser SEO, AEO & GEO Scanner',
    og_description: 'Das einzige kostenlose Tool, das SEO, AEO & GEO in einem Scan bewertet. 260+ Checks. Ohne Anmeldung.',
  },
  tr: {
    title: 'SEO Score Tools \u2014 \u00dccretsiz SEO, AEO & GEO Taray\u0131c\u0131 | seoscore.tools',
    description: 'SEO, AEO ve GEO puanlar\u0131n\u0131z\u0131 tek taramada g\u00f6steren tek \u00fccretsiz ara\u00e7. Kay\u0131t gerektirmez. 260+ kontrol.',
    og_title: 'SEO Score Tools \u2014 \u00dccretsiz SEO, AEO & GEO Taray\u0131c\u0131',
    og_description: 'SEO, AEO ve GEO puanlar\u0131n\u0131z\u0131 tek taramada g\u00f6steren tek \u00fccretsiz ara\u00e7. 260+ kontrol.',
  },
  ru: {
    title: 'SEO Score Tools \u2014 \u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 SEO, AEO & GEO \u0441\u043a\u0430\u043d\u0435\u0440 | seoscore.tools',
    description: '\u0415\u0434\u0438\u043d\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442 \u0434\u043b\u044f \u043e\u0446\u0435\u043d\u043a\u0438 SEO, AEO \u0438 GEO. \u0411\u0435\u0437 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438. 260+ \u043f\u0440\u043e\u0432\u0435\u0440\u043e\u043a.',
    og_title: 'SEO Score Tools \u2014 \u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 SEO, AEO & GEO \u0441\u043a\u0430\u043d\u0435\u0440',
    og_description: '\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 SEO, AEO \u0438 GEO \u0441\u043a\u0430\u043d\u0435\u0440. 260+ \u043f\u0440\u043e\u0432\u0435\u0440\u043e\u043a. \u0411\u0435\u0437 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438.',
  },
  es: {
    title: 'SEO Score Tools \u2014 Esc\u00e1ner SEO, AEO & GEO Gratuito | seoscore.tools',
    description: 'La \u00fanica herramienta gratuita que eval\u00faa SEO, AEO y GEO en un escaneo. Sin registro. 260+ verificaciones.',
    og_title: 'SEO Score Tools \u2014 Esc\u00e1ner SEO, AEO & GEO Gratuito',
    og_description: 'Eval\u00faa SEO, AEO y GEO en un escaneo. 260+ verificaciones. Sin registro.',
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

// SSRF protection: check if hostname resolves to private/internal range
function isPrivateHostname(hostname) {
  const isPrivateIP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|fc00|fd00|fe80|::ffff:(?:10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.))/i.test(hostname);
  const isShortIP = /^\d+$/.test(hostname) || /^0x/i.test(hostname);
  return isPrivateIP || isShortIP;
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// --- Public Report HTML Generators ---

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scoreColor(score) {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function scoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Needs Work';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

function gradeFromScore(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function generateReportHtml(report, slug) {
  const domain = escapeHtml(report.domain);
  const scannedUrl = escapeHtml(report.url);
  const seo = report.seo || { score: 0, passed: 0, total: 0, checks: [] };
  const aeo = report.aeo || { score: 0, passed: 0, total: 0, checks: [] };
  const geo = report.geo || { score: 0, passed: 0, total: 0, checks: [] };
  const overall = Math.round(seo.score * 0.5 + aeo.score * 0.25 + geo.score * 0.25);
  const grade = gradeFromScore(overall);
  const scanDate = report.scannedAt ? new Date(report.scannedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
  const scanDateISO = report.scannedAt ? report.scannedAt.split('T')[0] : new Date().toISOString().split('T')[0];

  // Collect failed checks for Quick Wins
  const allChecks = [...(seo.checks || []), ...(aeo.checks || []), ...(geo.checks || [])];
  const failedChecks = allChecks.filter(c => !c.pass);
  const passedChecks = allChecks.filter(c => c.pass);
  const quickWins = failedChecks.slice(0, 5);
  const totalFails = failedChecks.length;

  // Meta
  const metaTitle = `${domain} SEO Score: ${overall}/100 — SEO, AEO &amp; GEO Audit | seoscore.tools`;
  const metaDesc = `${domain} scored ${seo.score}/100 SEO, ${aeo.score}/100 AEO, ${geo.score}/100 GEO. ${totalFails} issues found. Free scan at seoscore.tools`;
  const canonicalUrl = `https://seoscore.tools/report/${slug}/`;

  // Render check list HTML
  function renderCheckList(checks, category) {
    const passed = checks.filter(c => c.pass);
    const failed = checks.filter(c => !c.pass);
    let html = '';
    if (failed.length > 0) {
      html += '<div class="check-group"><h4 class="check-group-title fail-title">Failed Checks (' + failed.length + ')</h4><ul class="check-list">';
      for (const c of failed) {
        html += '<li class="check-item fail"><span class="check-icon">&#10007;</span><span class="check-label">' + escapeHtml(c.label) + '</span>';
        if (c.category) html += '<span class="check-cat">' + escapeHtml(c.category) + '</span>';
        html += '</li>';
      }
      html += '</ul></div>';
    }
    if (passed.length > 0) {
      html += '<div class="check-group"><h4 class="check-group-title pass-title">Passed Checks (' + passed.length + ')</h4><ul class="check-list">';
      for (const c of passed) {
        html += '<li class="check-item pass"><span class="check-icon">&#10003;</span><span class="check-label">' + escapeHtml(c.label) + '</span>';
        if (c.category) html += '<span class="check-cat">' + escapeHtml(c.category) + '</span>';
        html += '</li>';
      }
      html += '</ul></div>';
    }
    return html;
  }

  // Gauge CSS: conic-gradient based
  function gaugeStyle(score, color) {
    const deg = (score / 100) * 360;
    return `background: conic-gradient(${color} 0deg, ${color} ${deg}deg, rgba(128,128,128,0.15) ${deg}deg, rgba(128,128,128,0.15) 360deg);`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${metaTitle}</title>
<meta name="description" content="${escapeHtml(metaDesc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${domain} SEO Score: ${overall}/100 — Audit Report">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:site_name" content="seoscore.tools">
<meta property="og:image" content="https://seoscore.tools/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${domain} SEO Score: ${overall}/100">
<meta name="twitter:description" content="${escapeHtml(metaDesc)}">
<meta name="twitter:image" content="https://seoscore.tools/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": `${report.domain} SEO Audit Report — Score ${overall}/100`,
  "description": metaDesc.replace(/&amp;/g, '&'),
  "url": canonicalUrl,
  "datePublished": report.scannedAt || new Date().toISOString(),
  "dateModified": report.scannedAt || new Date().toISOString(),
  "publisher": {
    "@type": "Organization",
    "name": "seoscore.tools",
    "url": "https://seoscore.tools"
  },
  "about": {
    "@type": "WebSite",
    "name": report.domain,
    "url": report.url
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": overall,
    "bestRating": 100,
    "worstRating": 0,
    "ratingCount": allChecks.length
  }
})}
</script>
<style>${REPORT_STYLES}</style>
</head>
<body>
<div class="container">
  <header>
    <a href="/" class="logo"><span>seoscore</span>.tools</a>
    <div class="report-badge">Public Audit Report</div>
  </header>

  <div class="hero-report">
    <h1 class="domain-title">${domain}</h1>
    <div class="scanned-url">${scannedUrl}</div>
    <div class="scan-date">Scanned on ${escapeHtml(scanDate)}</div>
  </div>

  <div class="gauges">
    <div class="gauge gauge-overall" style="${gaugeStyle(overall, scoreColor(overall))}">
      <div class="gauge-inner">
        <div class="gauge-score" style="color:${scoreColor(overall)}">${overall}</div>
        <div class="gauge-label">Overall</div>
        <div class="grade" style="border-color:${scoreColor(overall)};color:${scoreColor(overall)}">${grade}</div>
      </div>
    </div>
    <div class="gauge" style="${gaugeStyle(seo.score, '#10B981')}">
      <div class="gauge-inner">
        <div class="gauge-score" style="color:#10B981">${seo.score}</div>
        <div class="gauge-label">SEO</div>
        <div class="gauge-sub">${seo.passed}/${seo.total} passed</div>
      </div>
    </div>
    <div class="gauge" style="${gaugeStyle(aeo.score, '#8B5CF6')}">
      <div class="gauge-inner">
        <div class="gauge-score" style="color:#8B5CF6">${aeo.score}</div>
        <div class="gauge-label">AEO</div>
        <div class="gauge-sub">${aeo.passed}/${aeo.total} passed</div>
      </div>
    </div>
    <div class="gauge" style="${gaugeStyle(geo.score, '#F59E0B')}">
      <div class="gauge-inner">
        <div class="gauge-score" style="color:#F59E0B">${geo.score}</div>
        <div class="gauge-label">GEO</div>
        <div class="gauge-sub">${geo.passed}/${geo.total} passed</div>
      </div>
    </div>
  </div>

  <div class="summary-stats">
    <div class="stat-item"><div class="stat-value" style="color:var(--green)">${passedChecks.length}</div><div class="stat-label">Passed</div></div>
    <div class="stat-item"><div class="stat-value" style="color:var(--red)">${totalFails}</div><div class="stat-label">Failed</div></div>
    <div class="stat-item"><div class="stat-value">${allChecks.length}</div><div class="stat-label">Total Checks</div></div>
    <div class="stat-item"><div class="stat-value">${scoreLabel(overall)}</div><div class="stat-label">Rating</div></div>
  </div>

  ${quickWins.length > 0 ? `<div class="section quick-wins">
    <h2 class="section-title">Quick Wins — Top ${quickWins.length} Issues to Fix</h2>
    <ul class="check-list">
      ${quickWins.map(c => `<li class="check-item fail"><span class="check-icon">&#10007;</span><span class="check-label">${escapeHtml(c.label)}</span>${c.category ? `<span class="check-cat">${escapeHtml(c.category)}</span>` : ''}</li>`).join('\n      ')}
    </ul>
  </div>` : ''}

  <details class="section category-details" open>
    <summary class="section-title"><span class="dot" style="background:#10B981"></span>SEO — ${seo.score}/100 <span class="issue-count">(${(seo.checks || []).filter(c => !c.pass).length} issues)</span></summary>
    ${renderCheckList(seo.checks || [], 'SEO')}
  </details>

  <details class="section category-details">
    <summary class="section-title"><span class="dot" style="background:#8B5CF6"></span>AEO — ${aeo.score}/100 <span class="issue-count">(${(aeo.checks || []).filter(c => !c.pass).length} issues)</span></summary>
    ${renderCheckList(aeo.checks || [], 'AEO')}
  </details>

  <details class="section category-details">
    <summary class="section-title"><span class="dot" style="background:#F59E0B"></span>GEO — ${geo.score}/100 <span class="issue-count">(${(geo.checks || []).filter(c => !c.pass).length} issues)</span></summary>
    ${renderCheckList(geo.checks || [], 'GEO')}
  </details>

  <div class="cta-card">
    <h3>Fix These Issues Automatically</h3>
    <p>Using WordPress? Install <strong>SEO Autopilot</strong> for one-click auto-fixes on 65+ issues — with full undo support.</p>
    <a href="/seo-autopilot/" class="btn btn-primary">Get SEO Autopilot Plugin</a>
  </div>

  <div class="actions">
    <a href="/?url=${encodeURIComponent(report.url)}" class="btn btn-secondary">Scan This Site Again</a>
    <a href="mailto:contact@seoscore.tools?subject=Remove%20report%20${encodeURIComponent(slug)}" class="btn btn-ghost remove-link">Request Report Removal</a>
  </div>

  <footer>
    <p>Generated by <a href="/">seoscore.tools</a> — Free SEO, AEO &amp; GEO Scanner with 260+ checks</p>
    <p style="margin-top:4px">Scores may change as the scanned site is updated. <a href="/">Scan your site now</a></p>
  </footer>
</div>
</body>
</html>`;
}

function generateReport404Html(slug) {
  // Convert slug back to approximate domain for display
  const domainGuess = slug.replace(/-/g, '.').replace(/\.\./g, '-');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Report Not Found | seoscore.tools</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0F172A;--bg-card:#1E293B;--text:#F1F5F9;--text-muted:#94A3B8;--border:#334155;--green:#10B981;--purple:#8B5CF6}
@media(prefers-color-scheme:light){:root{--bg:#F8FAFC;--bg-card:#FFFFFF;--text:#0F172A;--text-muted:#64748B;--border:#E2E8F0}}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
.logo{font-size:22px;font-weight:700;letter-spacing:-0.5px;margin-bottom:24px}
.logo span{background:linear-gradient(135deg,var(--green),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
h1{font-size:28px;margin-bottom:8px}
p{color:var(--text-muted);margin-bottom:24px;font-size:15px}
.btn{display:inline-block;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;background:linear-gradient(135deg,var(--green),#059669);color:#fff;text-decoration:none;transition:opacity 0.2s}
.btn:hover{opacity:0.9}
a{color:var(--green);text-decoration:none}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<div>
  <div class="logo"><a href="/"><span>seoscore</span>.tools</a></div>
  <h1>Report Not Found</h1>
  <p>No audit report exists for <strong>${escapeHtml(domainGuess)}</strong>.<br>It may have expired or the site was never scanned.</p>
  <a href="/?url=${encodeURIComponent('https://' + domainGuess)}" class="btn">Scan ${escapeHtml(domainGuess)} Now</a>
  <p style="margin-top:16px"><a href="/">Back to seoscore.tools</a></p>
</div>
</body>
</html>`;
}
