/**
 * SEO Check Engine — 50 checks
 * Parses HTML and evaluates SEO quality
 */

export function runSeoChecks(pageData) {
  const { html, url, headers, siteType } = pageData;
  const isEcommerce = siteType?.siteType === 'ecommerce';
  const checks = [];

  // Helper: extract content between tags
  function extract(tag, attr) {
    if (attr) {
      const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["']`, 'i');
      const m = html.match(re);
      return m ? m[1] : '';
    }
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const m = html.match(re);
    return m ? m[1].trim() : '';
  }

  function metaContent(name) {
    // Find the meta tag first, then extract content (handles apostrophes in values)
    const tagRe = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*>`, 'i');
    const tag = (html.match(tagRe) || [''])[0];
    if (!tag) return '';
    const cm = tag.match(/content="([^"]*)"/i) || tag.match(/content='([^']*)'/i);
    return cm ? cm[1] : '';
  }

  const parsedUrl = new URL(url);

  // ==========================================
  // META TAGS (12 checks)
  // ==========================================

  // 1. Title Tag
  const title = extract('title');
  checks.push({
    id: 'title_exists',
    label: title ? `Title tag found: "${title.substring(0, 60)}${title.length > 60 ? '...' : ''}"` : 'Missing title tag',
    pass: !!title,
    category: 'meta',
  });

  // 2. Title Length
  if (title) {
    const len = title.length;
    checks.push({
      id: 'title_length',
      label: `Title length: ${len} characters ${len >= 30 && len <= 60 ? '(optimal)' : len < 30 ? '(too short, aim for 30-60)' : '(too long, keep under 60)'}`,
      pass: len >= 30 && len <= 65,
      severity: len > 65 ? 'error' : 'warning',
      category: 'meta',
    });
  }

  // 3. Meta Description
  const desc = metaContent('description');
  checks.push({
    id: 'desc_exists',
    label: desc ? `Meta description found (${desc.length} chars)` : 'Missing meta description',
    pass: !!desc,
    category: 'meta',
  });

  // 4. Description Length
  if (desc) {
    const len = desc.length;
    checks.push({
      id: 'desc_length',
      label: `Description length: ${len} chars ${len >= 120 && len <= 160 ? '(optimal)' : len < 120 ? '(too short)' : '(too long)'}`,
      pass: len >= 120 && len <= 165,
      severity: 'warning',
      category: 'meta',
    });
  }

  // 5. Duplicate Title Tags
  const titleMatches = html.match(/<title[^>]*>/gi) || [];
  if (titleMatches.length > 1) {
    checks.push({
      id: 'duplicate_title',
      label: `${titleMatches.length} title tags found — should be exactly 1`,
      pass: false,
      severity: 'error',
      category: 'meta',
    });
  }

  // 6. Duplicate Meta Descriptions
  const descMatches = html.match(/<meta[^>]*name=["']description["']/gi) || [];
  if (descMatches.length > 1) {
    checks.push({
      id: 'duplicate_desc',
      label: `${descMatches.length} meta descriptions found — should be exactly 1`,
      pass: false,
      severity: 'error',
      category: 'meta',
    });
  }

  // 7. Meta Viewport
  const hasViewport = /name=["']viewport["']/i.test(html);
  checks.push({
    id: 'viewport',
    label: hasViewport ? 'Viewport meta tag found (mobile-friendly)' : 'Missing viewport meta tag — not mobile-friendly',
    pass: hasViewport,
    category: 'meta',
  });

  // 8. Charset
  const hasCharset = /charset=["']?utf-8/i.test(html);
  checks.push({
    id: 'charset',
    label: hasCharset ? 'UTF-8 charset declared' : 'Missing or non-UTF-8 charset',
    pass: hasCharset,
    severity: 'warning',
    category: 'meta',
  });

  // 9. Language Attribute
  const hasLang = /<html[^>]*lang=["'][^"']+["']/i.test(html);
  checks.push({
    id: 'lang_attr',
    label: hasLang ? 'Language attribute set on HTML tag' : 'Missing language attribute on HTML tag',
    pass: hasLang,
    severity: 'warning',
    category: 'meta',
  });

  // 10. Theme Color
  const themeColor = metaContent('theme-color');
  checks.push({
    id: 'theme_color',
    label: themeColor ? `Theme color set: ${themeColor}` : 'No theme-color meta tag — improves mobile browser appearance',
    pass: !!themeColor,
    severity: 'warning',
    category: 'meta',
  });

  // 11. Meta Refresh Redirect
  const hasMetaRefresh = /<meta[^>]*http-equiv=["']refresh["']/i.test(html);
  checks.push({
    id: 'meta_refresh',
    label: hasMetaRefresh ? 'Meta refresh redirect detected — use 301 redirects instead' : 'No meta refresh redirect (good)',
    pass: !hasMetaRefresh,
    severity: 'warning',
    category: 'meta',
  });

  // 12. Robots Meta
  const robotsMeta = metaContent('robots');
  const isNoindex = robotsMeta.toLowerCase().includes('noindex');
  checks.push({
    id: 'robots_meta',
    label: isNoindex ? 'Page has noindex — it will NOT appear in search results!' : robotsMeta ? `Robots: "${robotsMeta}"` : 'No robots meta tag (default: index, follow)',
    pass: !isNoindex,
    severity: isNoindex ? 'error' : undefined,
    category: 'meta',
  });

  // ==========================================
  // CONTENT (10 checks)
  // ==========================================

  // 13. H1 Tag
  const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
  checks.push({
    id: 'h1_exists',
    label: h1Matches.length === 1 ? 'Single H1 tag found' : h1Matches.length === 0 ? 'No H1 tag found' : `${h1Matches.length} H1 tags found (should be exactly 1)`,
    pass: h1Matches.length === 1,
    category: 'content',
  });

  // 14. H2 Tags
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  checks.push({
    id: 'h2_exists',
    label: h2Count >= 2 ? `${h2Count} H2 tags found` : h2Count === 1 ? '1 H2 tag found (add more for structure)' : 'No H2 tags found',
    pass: h2Count >= 2,
    severity: 'warning',
    category: 'content',
  });

  // 15. Heading Hierarchy
  const headings = [];
  const hRe = /<h([1-6])[^>]*>/gi;
  let hm;
  while ((hm = hRe.exec(html)) !== null) headings.push(parseInt(hm[1]));
  let hierarchyOk = true;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i-1] + 1) { hierarchyOk = false; break; }
  }
  checks.push({
    id: 'heading_hierarchy',
    label: hierarchyOk ? 'Heading hierarchy is correct' : 'Heading hierarchy has gaps (e.g. H1 to H3 without H2)',
    pass: hierarchyOk,
    severity: 'warning',
    category: 'content',
  });

  // 16. Word Count
  const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(/\s+/).length;
  checks.push({
    id: 'word_count',
    label: wordCount >= 300 ? `${wordCount} words on page (good content depth)` : `Only ${wordCount} words — thin content may rank poorly`,
    pass: wordCount >= 300,
    severity: 'warning',
    category: 'content',
  });

  // 17. Images with ALT (filter out JS-template img tags and allow empty alt="" for decorative images)
  const imgAll = (html.match(/<img[^>]*>/gi) || []).filter(img => !/src=["']\s*['+]/.test(img));
  const imgNoAlt = imgAll.filter(img => !/alt\s*=/i.test(img));
  const altRatio = imgAll.length > 0 ? ((imgAll.length - imgNoAlt.length) / imgAll.length * 100).toFixed(0) : 100;
  checks.push({
    id: 'img_alt',
    label: imgAll.length === 0
      ? 'No images found on page'
      : imgNoAlt.length === 0
        ? `All ${imgAll.length} images have ALT text`
        : `${imgNoAlt.length} of ${imgAll.length} images missing ALT text (${altRatio}% have it)`,
    pass: imgNoAlt.length === 0,
    severity: imgNoAlt.length > 3 ? 'error' : 'warning',
    category: 'content',
  });

  // 18. Image Dimensions (CLS prevention)
  const imgNoDimensions = imgAll.filter(img => !/width=/i.test(img) || !/height=/i.test(img));
  checks.push({
    id: 'img_dimensions',
    label: imgAll.length === 0
      ? 'No images to check for dimensions'
      : imgNoDimensions.length === 0
        ? `All ${imgAll.length} images have width/height attributes (prevents CLS)`
        : `${imgNoDimensions.length} images missing width/height — causes layout shift (CLS)`,
    pass: imgAll.length === 0 || imgNoDimensions.length === 0,
    severity: 'warning',
    category: 'content',
  });

  // 19. Image Lazy Loading (native attributes OR JS-based lazy loading)
  const imgBelowFold = imgAll.slice(1); // skip first image (likely hero/logo)
  const imgNoLazy = imgBelowFold.filter(img => !/loading=["']lazy["']/i.test(img));
  const hasLazyLoadScript = /lazyload|lazy-load|lazysizes|lozad|loading.*['"]lazy['"]/i.test(html);
  checks.push({
    id: 'img_lazy',
    label: imgBelowFold.length === 0
      ? 'No below-fold images to lazy load'
      : hasLazyLoadScript
        ? 'JS-based lazy loading detected'
        : imgNoLazy.length === 0
          ? 'All below-fold images use native lazy loading'
          : `${imgNoLazy.length} images could use loading="lazy" for better performance`,
    pass: imgBelowFold.length === 0 || hasLazyLoadScript || imgNoLazy.length <= 1,
    severity: 'warning',
    category: 'content',
  });

  // 20. Internal Links
  const linkMatches = html.match(/<a[^>]*href=["']([^"'#]*)["']/gi) || [];
  let internalLinks = 0, externalLinks = 0;
  const emptyHrefs = (html.match(/<a[^>]*href=""\s*/gi) || []).length + (html.match(/<a[^>]*href=''\s*/gi) || []).length;
  for (const link of linkMatches) {
    const href = link.match(/href=["']([^"'#]*)["']/i)?.[1] || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === parsedUrl.hostname) internalLinks++;
      else externalLinks++;
    } catch { /* skip invalid URLs */ }
  }
  checks.push({
    id: 'internal_links',
    label: internalLinks >= 3 ? `${internalLinks} internal links found` : `Only ${internalLinks} internal links — add more for better crawling`,
    pass: internalLinks >= 3,
    severity: 'warning',
    category: 'content',
  });

  // 21. External Links
  checks.push({
    id: 'external_links',
    label: externalLinks > 0 ? `${externalLinks} external links found` : 'No external links — consider linking to authoritative sources',
    pass: externalLinks > 0,
    severity: 'warning',
    category: 'content',
  });

  // 22. Empty/Broken Anchor Links
  checks.push({
    id: 'empty_hrefs',
    label: emptyHrefs === 0 ? 'No empty href attributes found' : `${emptyHrefs} empty href attributes — fix or remove these links`,
    pass: emptyHrefs === 0,
    severity: 'warning',
    category: 'content',
  });

  // ==========================================
  // SOCIAL / OPEN GRAPH (10 checks)
  // ==========================================

  // 23. Open Graph Title
  const ogTitle = metaContent('og:title');
  checks.push({
    id: 'og_title',
    label: ogTitle ? 'Open Graph title found' : 'Missing og:title — poor social sharing',
    pass: !!ogTitle,
    severity: 'warning',
    category: 'social',
  });

  // 24. Open Graph Description
  const ogDesc = metaContent('og:description');
  checks.push({
    id: 'og_desc',
    label: ogDesc ? 'Open Graph description found' : 'Missing og:description',
    pass: !!ogDesc,
    severity: 'warning',
    category: 'social',
  });

  // 25. Open Graph Image
  const ogImage = metaContent('og:image');
  checks.push({
    id: 'og_image',
    label: ogImage ? 'Open Graph image found' : 'Missing og:image — social shares will lack visuals',
    pass: !!ogImage,
    severity: 'warning',
    category: 'social',
  });

  // 26. Open Graph URL
  const ogUrl = metaContent('og:url');
  checks.push({
    id: 'og_url',
    label: ogUrl ? 'Open Graph URL found' : 'Missing og:url — social platforms may use wrong URL',
    pass: !!ogUrl,
    severity: 'warning',
    category: 'social',
  });

  // 27. Open Graph Type
  const ogType = metaContent('og:type');
  checks.push({
    id: 'og_type',
    label: ogType ? `og:type set to "${ogType}"` : 'Missing og:type — defaults to "website"',
    pass: !!ogType,
    severity: 'warning',
    category: 'social',
  });

  // 28. Open Graph Site Name
  const ogSiteName = metaContent('og:site_name');
  checks.push({
    id: 'og_site_name',
    label: ogSiteName ? `og:site_name: "${ogSiteName}"` : 'Missing og:site_name — helps brand recognition in shares',
    pass: !!ogSiteName,
    severity: 'warning',
    category: 'social',
  });

  // 29. Twitter Card
  const twitterCard = metaContent('twitter:card');
  checks.push({
    id: 'twitter_card',
    label: twitterCard ? `Twitter Card: "${twitterCard}"` : 'Missing twitter:card meta tag',
    pass: !!twitterCard,
    severity: 'warning',
    category: 'social',
  });

  // 30. Twitter Title
  const twitterTitle = metaContent('twitter:title');
  checks.push({
    id: 'twitter_title',
    label: twitterTitle ? 'Twitter title found' : 'Missing twitter:title',
    pass: !!twitterTitle,
    severity: 'warning',
    category: 'social',
  });

  // 31. Twitter Description
  const twitterDesc = metaContent('twitter:description');
  checks.push({
    id: 'twitter_desc',
    label: twitterDesc ? 'Twitter description found' : 'Missing twitter:description',
    pass: !!twitterDesc,
    severity: 'warning',
    category: 'social',
  });

  // 32. Twitter Image
  const twitterImage = metaContent('twitter:image');
  checks.push({
    id: 'twitter_image',
    label: twitterImage ? 'Twitter image found' : 'Missing twitter:image',
    pass: !!twitterImage,
    severity: 'warning',
    category: 'social',
  });

  // ==========================================
  // TECHNICAL (10 checks)
  // ==========================================

  // 33. HTTPS
  checks.push({
    id: 'https',
    label: url.startsWith('https') ? 'HTTPS enabled' : 'Not using HTTPS — critical for SEO',
    pass: url.startsWith('https'),
    category: 'technical',
  });

  // 34. Canonical Tag (handle href before or after rel)
  const canonicalTag = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i)?.[0] || '';
  const canonicalHref = canonicalTag ? (canonicalTag.match(/href="([^"]*)"/i) || canonicalTag.match(/href='([^']*)'/i)) : null;
  checks.push({
    id: 'canonical',
    label: canonicalHref ? 'Canonical tag found' : 'Missing canonical tag — risk of duplicate content',
    pass: !!canonicalHref,
    category: 'technical',
  });

  // 35. Favicon
  const hasFavicon = /<link[^>]*rel=["'](icon|shortcut icon|apple-touch-icon)["']/i.test(html);
  checks.push({
    id: 'favicon',
    label: hasFavicon ? 'Favicon found' : 'No favicon detected',
    pass: hasFavicon,
    severity: 'warning',
    category: 'technical',
  });

  // 36. Apple Touch Icon
  const hasAppleTouchIcon = /<link[^>]*rel=["']apple-touch-icon["']/i.test(html);
  checks.push({
    id: 'apple_touch_icon',
    label: hasAppleTouchIcon ? 'Apple touch icon found' : 'No apple-touch-icon — iOS home screen will lack custom icon',
    pass: hasAppleTouchIcon,
    severity: 'warning',
    category: 'technical',
  });

  // 37. Compression (content-encoding OR vary: accept-encoding as proxy — CF Workers strips encoding after decompression)
  const encoding = headers['content-encoding'] || '';
  const varyHeader = (headers['vary'] || '').toLowerCase();
  const hasCompression = !!encoding || varyHeader.includes('accept-encoding');
  checks.push({
    id: 'compression',
    label: hasCompression
      ? `Compression: ${encoding || 'enabled (vary: accept-encoding)'}`
      : 'No compression detected (gzip/brotli recommended)',
    pass: hasCompression,
    severity: 'warning',
    category: 'technical',
  });

  // 38. URL Length
  const urlLength = url.length;
  checks.push({
    id: 'url_length',
    label: urlLength <= 75 ? `URL length: ${urlLength} chars (good)` : urlLength <= 120 ? `URL length: ${urlLength} chars (acceptable)` : `URL length: ${urlLength} chars — too long, keep under 75`,
    pass: urlLength <= 120,
    severity: 'warning',
    category: 'technical',
  });

  // 39. URL uses hyphens (not underscores)
  const urlPath = parsedUrl.pathname;
  const hasUnderscores = /_/.test(urlPath);
  checks.push({
    id: 'url_hyphens',
    label: hasUnderscores ? 'URL uses underscores — Google recommends hyphens instead' : 'URL uses hyphens or no separators (good)',
    pass: !hasUnderscores,
    severity: 'warning',
    category: 'technical',
  });

  // 40. Hreflang Tags
  const hreflangTags = html.match(/<link[^>]*hreflang=["'][^"']+["']/gi) || [];
  checks.push({
    id: 'hreflang',
    label: hreflangTags.length > 0 ? `${hreflangTags.length} hreflang tags found (multi-language)` : 'No hreflang tags — add if targeting multiple languages',
    pass: hreflangTags.length > 0,
    severity: 'warning',
    category: 'technical',
  });

  // 41. Deprecated HTML Tags
  const deprecatedTags = ['<font', '<center', '<marquee', '<blink', '<big', '<strike', '<frame', '<frameset'];
  const foundDeprecated = deprecatedTags.filter(tag => html.toLowerCase().includes(tag));
  checks.push({
    id: 'deprecated_html',
    label: foundDeprecated.length === 0 ? 'No deprecated HTML tags found' : `Deprecated HTML tags found: ${foundDeprecated.join(', ')}`,
    pass: foundDeprecated.length === 0,
    severity: 'warning',
    category: 'technical',
  });

  // 42. Text-to-HTML Ratio
  const textLength = textContent.length;
  const htmlLength = html.length;
  const textRatio = htmlLength > 0 ? ((textLength / htmlLength) * 100).toFixed(1) : 0;
  checks.push({
    id: 'text_html_ratio',
    label: textRatio >= 10 ? `Text-to-HTML ratio: ${textRatio}% (good)` : `Text-to-HTML ratio: ${textRatio}% — too code-heavy, add more content`,
    pass: textRatio >= 10,
    severity: 'warning',
    category: 'technical',
  });

  // ==========================================
  // PERFORMANCE (5 checks)
  // ==========================================

  // 43. Inline CSS Amount
  const inlineStyles = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const inlineCssSize = inlineStyles.reduce((sum, s) => sum + s.length, 0);
  checks.push({
    id: 'inline_css',
    label: inlineCssSize < 15000 ? `Inline CSS: ${(inlineCssSize / 1024).toFixed(1)} KB (acceptable)` : `Inline CSS: ${(inlineCssSize / 1024).toFixed(1)} KB — too much, move to external stylesheet`,
    pass: inlineCssSize < 15000,
    severity: 'warning',
    category: 'performance',
  });

  // 44. Inline JS Amount
  const inlineScripts = (html.match(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi) || []);
  const inlineJsSize = inlineScripts.reduce((sum, s) => sum + s.length, 0);
  checks.push({
    id: 'inline_js',
    label: inlineJsSize < 20000 ? `Inline JS: ${(inlineJsSize / 1024).toFixed(1)} KB (acceptable)` : `Inline JS: ${(inlineJsSize / 1024).toFixed(1)} KB — too much, use external scripts`,
    pass: inlineJsSize < 20000,
    severity: 'warning',
    category: 'performance',
  });

  // 45. Script defer/async
  const externalScripts = html.match(/<script[^>]*src=[^>]*>/gi) || [];
  const blockingScripts = externalScripts.filter(s => !/defer|async|type=["']module["']/i.test(s));
  checks.push({
    id: 'script_defer',
    label: externalScripts.length === 0
      ? 'No external scripts'
      : blockingScripts.length === 0
        ? `All ${externalScripts.length} external scripts use defer/async`
        : `${blockingScripts.length} render-blocking scripts — add defer or async attribute`,
    pass: blockingScripts.length === 0,
    severity: 'warning',
    category: 'performance',
  });

  // 46. Font Preload/Preconnect
  const hasFontPreload = /<link[^>]*rel=["'](preload|preconnect)["'][^>]*(font|googleapis|gstatic)/i.test(html);
  checks.push({
    id: 'font_preload',
    label: hasFontPreload ? 'Font preload/preconnect found — faster font loading' : 'No font preload/preconnect — add for faster rendering',
    pass: hasFontPreload,
    severity: 'warning',
    category: 'performance',
  });

  // 47. Cache-Control Header
  const cacheControl = headers['cache-control'] || '';
  checks.push({
    id: 'cache_control',
    label: cacheControl ? `Cache-Control: ${cacheControl.substring(0, 60)}` : 'No Cache-Control header — browser cannot cache effectively',
    pass: !!cacheControl,
    severity: 'warning',
    category: 'performance',
  });

  // ==========================================
  // SECURITY (3 checks)
  // ==========================================

  // 48. HSTS Header
  const hsts = headers['strict-transport-security'] || '';
  checks.push({
    id: 'hsts',
    label: hsts ? 'HSTS header present — enforces HTTPS' : 'No Strict-Transport-Security header',
    pass: !!hsts,
    severity: 'warning',
    category: 'security',
  });

  // 49. X-Content-Type-Options
  const xContentType = headers['x-content-type-options'] || '';
  checks.push({
    id: 'x_content_type',
    label: xContentType ? 'X-Content-Type-Options: nosniff' : 'Missing X-Content-Type-Options header',
    pass: !!xContentType,
    severity: 'warning',
    category: 'security',
  });

  // 50. Content-Security-Policy
  const csp = headers['content-security-policy'] || '';
  checks.push({
    id: 'csp',
    label: csp ? 'Content-Security-Policy header present' : 'No Content-Security-Policy header — XSS risk',
    pass: !!csp,
    severity: 'warning',
    category: 'security',
  });

  // ==========================================
  // SCHEMA (existing checks moved here)
  // ==========================================

  // JSON-LD Schema (counted as part of the 50)
  const jsonldMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  checks.push({
    id: 'jsonld',
    label: jsonldMatches.length > 0 ? `${jsonldMatches.length} JSON-LD schema block(s) found` : 'No JSON-LD structured data found',
    pass: jsonldMatches.length > 0,
    category: 'schema',
  });

  // Schema Types
  const schemaTypes = [];
  for (const block of jsonldMatches) {
    const content = block.replace(/<\/?script[^>]*>/gi, '');
    try {
      const parsed = JSON.parse(content);
      const types = Array.isArray(parsed) ? parsed.map(p => p['@type']) : [parsed['@type']];
      schemaTypes.push(...types.filter(Boolean));
    } catch { /* skip invalid JSON-LD */ }
  }
  if (jsonldMatches.length > 0) {
    checks.push({
      id: 'schema_types',
      label: schemaTypes.length > 0 ? `Schema types: ${schemaTypes.join(', ')}` : 'JSON-LD found but no @type detected',
      pass: schemaTypes.length > 0,
      severity: 'warning',
      category: 'schema',
    });
  }

  // ==========================================
  // E-COMMERCE BONUS CHECKS (5 checks)
  // ==========================================
  if (isEcommerce) {
    // Detect if this is a single product detail page (vs category/listing page)
    // Category pages have multiple products with prices/cards — don't flag those for Product Schema
    const hasProductSchemaType = /"@type"\s*:\s*"Product"/i.test(html);
    const hasOgProduct = /og:type["']\s*content=["']product/i.test(html);
    const addToCartCount = (html.match(/add.to.cart|addtocart|add_to_cart|sepete.ekle|in.den.warenkorb|ajouter.au.panier|agregar.al.carrito/gi) || []).length;
    const productCardCount = (html.match(/single-product|product-thumb|product-card|product-item|product-layout/gi) || []).length;
    const isListingPage = addToCartCount > 2 || productCardCount > 3;
    const isProductPage = hasProductSchemaType || hasOgProduct || (!isListingPage && /itemprop=["']price["']/i.test(html));

    // B1. Product Schema (only applicable on product pages)
    const hasProductSchema = /"@type"\s*:\s*"Product"/i.test(html);
    checks.push({
      id: 'ecom_product_schema',
      label: hasProductSchema ? 'Product Schema markup found' : 'No Product Schema — add for rich results',
      pass: hasProductSchema,
      applicable: isProductPage,
      category: 'ecommerce',
    });

    // B2. Price Markup (only applicable on product pages)
    const hasPriceMarkup = /itemprop=["']price["']|"price"\s*:\s*["'\d]/i.test(html);
    checks.push({
      id: 'ecom_price_markup',
      label: hasPriceMarkup ? 'Price in structured data — enables rich snippets' : 'No price in Schema — add offers.price for rich results',
      pass: hasPriceMarkup,
      applicable: isProductPage,
      category: 'ecommerce',
    });

    // B3. Availability (only applicable on product pages)
    const hasAvailability = /InStock|OutOfStock|PreOrder|availability/i.test(html);
    checks.push({
      id: 'ecom_availability',
      label: hasAvailability ? 'Product availability status found' : 'No availability info — add InStock/OutOfStock to Schema',
      pass: hasAvailability,
      applicable: isProductPage,
      category: 'ecommerce',
    });

    // B4. Reviews / AggregateRating
    const hasReviews = /"AggregateRating"|"Review"|itemprop=["']ratingValue["']/i.test(html);
    checks.push({
      id: 'ecom_reviews',
      label: hasReviews ? 'Review/Rating Schema found — enables star snippets' : 'No Review Schema — add for star ratings in search',
      pass: hasReviews,
      category: 'ecommerce',
    });

    // B5. Breadcrumb
    const hasBreadcrumb = /"BreadcrumbList"/i.test(html);
    checks.push({
      id: 'ecom_breadcrumb',
      label: hasBreadcrumb ? 'BreadcrumbList Schema — good navigation signal' : 'No BreadcrumbList Schema — helps search engines show category path',
      pass: hasBreadcrumb,
      category: 'ecommerce',
    });
  }

  // Filter out non-applicable checks (e.g. product-only checks on category pages)
  const applicableChecks = checks.filter(c => c.applicable !== false);

  // Calculate score
  const passed = applicableChecks.filter(c => c.pass).length;
  const score = Math.round((passed / applicableChecks.length) * 100);

  return { score, checks: applicableChecks, passed, total: applicableChecks.length };
}
