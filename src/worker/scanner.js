/**
 * SEO Check Engine — 142 checks
 * Parses HTML and evaluates SEO quality
 */

import { NA_CHECKS } from './site-detector.js';

export function runSeoChecks(pageData) {
  const { html, url, headers, siteType, robotsTxt, sitemapXml, brokenLinks, keyphrase } = pageData;
  const isEcommerce = siteType?.siteType === 'ecommerce';
  const detectedType = siteType?.siteType || 'default';
  const naCheckIds = NA_CHECKS[detectedType]?.seo || [];
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
      label: `Title length: ${len} characters ${len >= 30 && len <= 60 ? '(optimal)' : len < 30 ? '(too short, aim for 30-60)' : len <= 65 ? '(slightly long — aim for under 60)' : '(too long, keep under 60)'}`,
      pass: len >= 30 && len <= 65,
      severity: len > 65 ? 'error' : 'warning',
      category: 'meta',
    });
  }

  // Date Manipulation Detection — year in title without dateModified
  if (title) {
    const yearInTitle = title.match(/20(2[3-9]|[3-9]\d)/);
    if (yearInTitle) {
      const hasDateModified = /"dateModified"/i.test(html);
      checks.push({
        id: 'date_freshness',
        label: hasDateModified
          ? `Year ${yearInTitle[0]} in title with dateModified — legitimate freshness signal`
          : `Year ${yearInTitle[0]} in title but no dateModified in schema — may be flagged as date manipulation`,
        pass: hasDateModified,
        severity: 'warning',
        category: 'meta',
      });
    }
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

  // Meta Keywords Warning (deprecated since 2009)
  const metaKeywords = metaContent('keywords');
  if (metaKeywords) {
    checks.push({
      id: 'meta_keywords',
      label: 'meta keywords tag found — deprecated since 2009, Google ignores it. Remove to keep HTML clean',
      pass: true,
      severity: 'warning',
      category: 'meta',
    });
  }

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

  // Title-H1 Alignment
  if (title && h1Matches.length === 1) {
    const h1Text = h1Matches[0].replace(/<[^>]+>/g, '').trim().toLowerCase();
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const h1Words = h1Text.split(/\s+/).filter(w => w.length > 3);
    if (titleWords.length > 0 && h1Words.length > 0) {
      const overlap = titleWords.filter(w => h1Words.includes(w)).length;
      const overlapRatio = Math.round((overlap / Math.max(titleWords.length, h1Words.length)) * 100);
      const isIdentical = title.trim().toLowerCase() === h1Text;
      checks.push({
        id: 'title_h1_alignment',
        label: isIdentical
          ? 'Title and H1 are identical — consider differentiating slightly for broader keyword coverage'
          : overlapRatio >= 50
            ? `Title-H1 alignment: ${overlapRatio}% word overlap (good)`
            : `Title-H1 alignment: ${overlapRatio}% word overlap — title and H1 should share key terms`,
        pass: overlapRatio >= 50,
        severity: 'warning',
        category: 'content',
      });
    }
  }

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
  const wordCount = textContent ? textContent.split(/\s+/).filter(Boolean).length : 0;
  checks.push({
    id: 'word_count',
    label: wordCount >= 300 ? `${wordCount} words on page (good content depth)` : `Only ${wordCount} words — thin content may rank poorly`,
    pass: wordCount >= 300,
    severity: 'warning',
    category: 'content',
  });

  // Readability — Flesch Reading Ease (language-aware: EN, TR/Ateşman, DE/Amstad)
  if (wordCount >= 100) {
    const textSentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const totalSentences = textSentences.length || 1;
    const words = textContent.split(/\s+/).filter(Boolean);
    const totalWords = words.length || 1;
    // Detect language from html lang attribute
    const pageLang = (html.match(/<html[^>]*\blang=["']([a-z]{2})/i) || [])[1] || 'en';
    // Syllable estimation: count vowel groups per word (multilingual)
    const trVowels = /[aeıioöuüAEIİOÖUÜ]/g;
    const countSyllables = (word) => {
      if (pageLang === 'tr') {
        // Turkish: simply count vowels (each vowel = 1 syllable in Turkish)
        const vowels = word.match(trVowels);
        return vowels ? vowels.length : 1;
      }
      word = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
      if (word.length <= 3) return 1;
      word = word.replace(/(?:[^laeiouyäöü]es|ed|[^laeiouyäöü]e)$/, '');
      word = word.replace(/^y/, '');
      const m = word.match(/[aeiouyäöü]{1,2}/g);
      return m ? m.length : 1;
    };
    const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    const syllablesPerWord = totalSyllables / totalWords;
    const wordsPerSentence = totalWords / totalSentences;
    let flesch;
    if (pageLang === 'tr') {
      // Ateşman (1997) Turkish Readability Formula
      flesch = Math.round(198.825 - 40.175 * syllablesPerWord - 2.610 * wordsPerSentence);
    } else if (pageLang === 'de') {
      // Amstad (1978) German Readability Formula
      flesch = Math.round(180 - 58.5 * syllablesPerWord - 1.0 * wordsPerSentence);
    } else {
      // Standard Flesch Reading Ease (English)
      flesch = Math.round(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord);
    }
    const fleschClamped = Math.max(0, Math.min(100, flesch));
    checks.push({
      id: 'readability_score',
      label: fleschClamped >= 60 ? `Readability: ${fleschClamped} (easy to read)` : fleschClamped >= 30 ? `Readability: ${fleschClamped} (moderate — aim for 60+)` : `Readability: ${fleschClamped} (difficult — simplify language)`,
      pass: fleschClamped >= 30,
      severity: fleschClamped < 30 ? 'error' : 'warning',
      category: 'content',
    });

    // Sentence Length Distribution
    const longSentences = textSentences.filter(s => s.split(/\s+/).length > 20).length;
    const longRatio = Math.round((longSentences / totalSentences) * 100);
    checks.push({
      id: 'sentence_length',
      label: longRatio <= 30 ? `${longRatio}% long sentences (>20 words) — good readability` : `${longRatio}% long sentences (>20 words) — break up for readability`,
      pass: longRatio <= 30,
      severity: 'warning',
      category: 'content',
    });
  }

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

  // Image Format — WebP/AVIF vs legacy formats
  if (imgAll.length > 0) {
    // Extract <picture> elements to identify imgs with modern format sources
    const pictureBlocks = html.match(/<picture[^>]*>[\s\S]*?<\/picture>/gi) || [];
    const imgsInPicture = new Set();
    pictureBlocks.forEach(block => {
      const hasModernSource = /<source[^>]*type=["'](image\/webp|image\/avif)["']/i.test(block)
        || /<source[^>]*srcset=["'][^"']*\.(webp|avif)/i.test(block);
      if (hasModernSource) {
        const innerImg = (block.match(/<img[^>]*src=["']([^"']+)["']/i) || [])[1];
        if (innerImg) imgsInPicture.add(innerImg);
      }
    });
    const legacyImgs = imgAll.filter(img => {
      const src = (img.match(/src=["']([^"']+)["']/i) || [])[1] || '';
      if (imgsInPicture.has(src)) return false; // has WebP/AVIF via <picture>
      return /\.(jpg|jpeg|png|gif|bmp)(\?|$)/i.test(src);
    });
    const hasPicture = pictureBlocks.length > 0;
    const legacyRatio = Math.round((legacyImgs.length / imgAll.length) * 100);
    checks.push({
      id: 'img_modern_format',
      label: legacyImgs.length === 0
        ? `All images use modern formats (WebP/AVIF/SVG)${hasPicture ? ' with <picture> fallback' : ''}`
        : `${legacyImgs.length} of ${imgAll.length} images use legacy formats (JPG/PNG/GIF) — convert to WebP/AVIF for 25-50% smaller files`,
      pass: legacyRatio <= 30,
      severity: 'warning',
      category: 'content',
    });
  }

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

  // Non-Descriptive Anchor Text
  if (linkMatches.length > 3) {
    const genericAnchors = [];
    const anchorRe = /<a[^>]*href=["'][^"'#]+["'][^>]*>([\s\S]*?)<\/a>/gi;
    let am;
    while ((am = anchorRe.exec(html)) !== null) {
      const text = am[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
      if (/^(click here|read more|learn more|more|here|this|link|go|see more|details|info|weiterlesen|mehr erfahren|devamını oku)$/i.test(text)) {
        genericAnchors.push(text);
      }
    }
    if (genericAnchors.length > 0) {
      checks.push({
        id: 'descriptive_anchors',
        label: `${genericAnchors.length} non-descriptive link text(s) found ("${genericAnchors[0]}"...) — use descriptive anchor text for SEO`,
        pass: false,
        severity: 'warning',
        category: 'content',
      });
    } else {
      checks.push({
        id: 'descriptive_anchors',
        label: 'All link texts are descriptive (no "click here" or "read more")',
        pass: true,
        category: 'content',
      });
    }
  }

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

  // Canonical Self-Reference Check
  if (canonicalHref) {
    const canonicalUrl = canonicalHref[1];
    const normalizeUrl = (u) => {
      try { const p = new URL(u); return (p.origin + p.pathname).replace(/\/$/, ''); } catch { return u.replace(/\/$/, ''); }
    };
    const isSelfRef = normalizeUrl(canonicalUrl) === normalizeUrl(url);
    checks.push({
      id: 'canonical_self',
      label: isSelfRef
        ? 'Canonical tag is self-referencing (correct)'
        : `Canonical points to different URL: ${canonicalUrl.substring(0, 80)} — verify this is intentional`,
      pass: true,
      severity: isSelfRef ? undefined : 'warning',
      category: 'technical',
    });
  }

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

  // URL Uppercase Detection
  if (urlPath !== '/' && urlPath.length > 1) {
    const hasUppercase = /[A-Z]/.test(urlPath);
    checks.push({
      id: 'url_lowercase',
      label: hasUppercase
        ? 'URL contains uppercase characters — use lowercase for consistency and to avoid duplicate content'
        : 'URL is lowercase (good)',
      pass: !hasUppercase,
      severity: 'warning',
      category: 'technical',
    });
  }

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
  // E-E-A-T TRUST PAGES (5 checks)
  // ==========================================

  // About Page
  const hasAboutLink = /href=["'][^"']*(about|ueber-uns|uber-uns|hakkimizda|a-propos|sobre-nosotros|about-us|chi-siamo|o-nas|impressum|imprint|team|wer-wir-sind|quienes-somos)/i.test(html);
  checks.push({
    id: 'trust_about',
    label: hasAboutLink ? 'About page link found — builds trust and E-E-A-T' : 'No About page link detected — add for credibility',
    pass: hasAboutLink,
    severity: 'warning',
    category: 'trust',
  });

  // Contact Page
  const hasContactLink = /href=["'][^"']*(contact|kontakt|iletisim|contacto|contatti|contato|kontakty)/i.test(html) || /href=["']mailto:/i.test(html);
  checks.push({
    id: 'trust_contact',
    label: hasContactLink ? 'Contact page/email link found' : 'No Contact page link detected — add for trust signals',
    pass: hasContactLink,
    severity: 'warning',
    category: 'trust',
  });

  // Privacy Policy
  const hasPrivacyLink = /href=["'][^"']*(privacy|datenschutz|gizlilik|privacidad|politique-de-confidentialite|informativa-privacy)/i.test(html);
  checks.push({
    id: 'trust_privacy',
    label: hasPrivacyLink ? 'Privacy Policy link found' : 'No Privacy Policy link — required by GDPR and improves trust',
    pass: hasPrivacyLink,
    severity: 'warning',
    category: 'trust',
  });

  // Terms of Service
  const hasTermsLink = /href=["'][^"']*(terms|agb|nutzungsbedingungen|kullanim-kosullari|terminos|conditions-generales|terms-of-service|terms-of-use|tos|legal|rechtliches|juridique)/i.test(html) || />Terms/i.test(html);
  checks.push({
    id: 'trust_terms',
    label: hasTermsLink ? 'Terms of Service link found' : 'No Terms of Service link — add for legal compliance and trust',
    pass: hasTermsLink,
    severity: 'warning',
    category: 'trust',
  });

  // Author Byline Detection
  const authorPatterns = /\b(by|author|written by|posted by|von|verfasst von|yazar|reviewed by|fact[- ]checked by|médico revisor)\b/i;
  const hasAuthorByline = authorPatterns.test(textContent);
  const hasAuthorSchema = /"author"\s*:/i.test(html);
  const hasReviewedBy = /reviewed by|fact[- ]checked by|médico revisor|geprüft von/i.test(textContent);
  checks.push({
    id: 'author_byline',
    label: hasAuthorByline || hasAuthorSchema
      ? `Author byline found${hasReviewedBy ? ' + expert review attribution' : ''}${hasAuthorSchema ? ' + author in schema' : ''}`
      : 'No author byline — add "By [Name]" for E-E-A-T trust',
    pass: hasAuthorByline || hasAuthorSchema,
    severity: 'warning',
    category: 'trust',
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

  // Schema Types — extract @type from all JSON-LD structures including @graph arrays
  const schemaTypes = [];
  for (const block of jsonldMatches) {
    const content = block.replace(/<\/?script[^>]*>/gi, '');
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        parsed.forEach(p => { if (p['@type']) schemaTypes.push(p['@type']); });
      } else {
        if (parsed['@type']) schemaTypes.push(parsed['@type']);
        if (Array.isArray(parsed['@graph'])) {
          parsed['@graph'].forEach(item => { if (item['@type']) schemaTypes.push(item['@type']); });
        }
      }
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

  // Schema Over-Use Warning
  if (jsonldMatches.length > 0) {
    const totalSchemaSize = jsonldMatches.reduce((sum, block) => sum + block.length, 0);
    const totalSizeKB = (totalSchemaSize / 1024).toFixed(1);
    if (jsonldMatches.length > 5 || totalSchemaSize > 10240) {
      checks.push({
        id: 'schema_overuse',
        label: `Schema may be excessive: ${jsonldMatches.length} JSON-LD blocks, ${totalSizeKB} KB total — consider consolidating`,
        pass: false,
        severity: 'warning',
        category: 'schema',
      });
    }
  }

  // ==========================================
  // EXTENDED CHECKS (11 checks)
  // ==========================================

  // E1. HTML Doctype
  const hasDoctype = /<!DOCTYPE\s+html/i.test(html.substring(0, 200));
  checks.push({
    id: 'html_doctype',
    label: hasDoctype ? '<!DOCTYPE html> declared' : 'Missing <!DOCTYPE html> — required for standards mode',
    pass: hasDoctype,
    severity: hasDoctype ? undefined : 'error',
    category: 'technical',
  });

  // E2. Mixed Content (HTTP resources on HTTPS page)
  if (url.startsWith('https')) {
    const httpResources = (html.match(/(?:src|href|action)=["']http:\/\/[^"']+["']/gi) || [])
      .filter(m => !/http:\/\/schema\.org/i.test(m)); // exclude schema.org
    checks.push({
      id: 'mixed_content',
      label: httpResources.length === 0 ? 'No mixed content — all resources use HTTPS' : `${httpResources.length} HTTP resource(s) on HTTPS page — security risk`,
      pass: httpResources.length === 0,
      severity: httpResources.length > 0 ? 'error' : undefined,
      category: 'technical',
    });
  }

  // E3. Duplicate Canonical Tags
  const canonicalTags = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/gi) || [];
  if (canonicalTags.length > 1) {
    checks.push({
      id: 'duplicate_canonical',
      label: `${canonicalTags.length} canonical tags found — should be exactly 1`,
      pass: false,
      severity: 'error',
      category: 'technical',
    });
  }

  // E4. Structured Data Validation (JSON-LD syntax check)
  if (jsonldMatches.length > 0) {
    let jsonErrors = 0;
    for (const block of jsonldMatches) {
      const content = block.replace(/<\/?script[^>]*>/gi, '');
      try { JSON.parse(content); } catch { jsonErrors++; }
    }
    checks.push({
      id: 'structured_data_valid',
      label: jsonErrors === 0 ? `All ${jsonldMatches.length} JSON-LD block(s) have valid syntax` : `${jsonErrors} JSON-LD block(s) with syntax errors — fix invalid JSON`,
      pass: jsonErrors === 0,
      severity: jsonErrors > 0 ? 'error' : undefined,
      category: 'schema',
    });
  }

  // E5. Font Display Swap
  const hasFontDisplay = /font-display\s*:\s*swap/i.test(html) || /<link[^>]*display=swap/i.test(html);
  const usesWebFonts = /fonts\.googleapis|fonts\.gstatic|@font-face/i.test(html);
  if (usesWebFonts) {
    checks.push({
      id: 'font_display',
      label: hasFontDisplay ? 'font-display: swap detected — prevents invisible text' : 'Web fonts without font-display: swap — may cause FOIT',
      pass: hasFontDisplay,
      severity: 'warning',
      category: 'performance',
    });
  }

  // E6. Meta Viewport Content (width=device-width)
  if (hasViewport) {
    const viewportTag = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i)?.[0] || '';
    const hasDeviceWidth = /width=device-width/i.test(viewportTag);
    checks.push({
      id: 'meta_viewport_content',
      label: hasDeviceWidth ? 'Viewport includes width=device-width (responsive)' : 'Viewport missing width=device-width — not properly responsive',
      pass: hasDeviceWidth,
      severity: hasDeviceWidth ? undefined : 'warning',
      category: 'meta',
    });
  }

  // E7. robots.txt exists and no Disallow: /
  if (robotsTxt !== undefined) {
    const robotsExists = robotsTxt !== null;
    // Parse robots.txt properly: only check User-agent: * block for Disallow: /
    let blocksAll = false;
    if (robotsExists) {
      const blocks = robotsTxt.split(/(?=^User-agent:)/mi);
      const wildcardBlock = blocks.find(b => /^User-agent:\s*\*\s*$/mi.test(b));
      if (wildcardBlock) {
        blocksAll = /Disallow:\s*\/\s*(?:#|$)/mi.test(wildcardBlock) && !/Allow:\s*\/\s*(?:#|$)/mi.test(wildcardBlock);
      }
    }
    checks.push({
      id: 'robots_txt',
      label: !robotsExists ? 'No /robots.txt found — create one to guide crawlers' : blocksAll ? 'robots.txt blocks all crawlers (Disallow: /) — site will not be indexed!' : 'robots.txt found and allows crawling',
      pass: robotsExists && !blocksAll,
      severity: blocksAll ? 'error' : !robotsExists ? 'warning' : undefined,
      category: 'technical',
    });
  }

  // E8. robots.txt references Sitemap
  if (robotsTxt) {
    const hasSitemapRef = /Sitemap:\s*https?:\/\//im.test(robotsTxt);
    checks.push({
      id: 'robots_txt_sitemap',
      label: hasSitemapRef ? 'robots.txt includes Sitemap reference' : 'robots.txt does not reference Sitemap — add Sitemap: URL',
      pass: hasSitemapRef,
      severity: 'warning',
      category: 'technical',
    });
  }

  // AI Crawler Robots.txt — detect blocked AI bots
  if (robotsTxt) {
    const robotsLower = robotsTxt.toLowerCase();
    const trainingBots = ['gptbot', 'chatgpt-user', 'google-extended', 'claudebot', 'anthropic-ai', 'ccbot', 'bytespider'];
    const searchBots = ['oai-searchbot', 'perplexitybot'];
    // Parse robots.txt into per-bot blocks for accurate detection
    const robotsBlocks = robotsTxt.split(/(?=^User-agent:)/mi);
    function isBotBlocked(botName) {
      const block = robotsBlocks.find(b => new RegExp(`^User-agent:\\s*${botName}\\s*$`, 'mi').test(b));
      if (!block) return false;
      const hasDisallow = /Disallow:\s*\/\s*(?:#|$)/mi.test(block);
      const hasAllow = /Allow:\s*\/\s*(?:#|$)/mi.test(block);
      return hasDisallow && !hasAllow;
    }
    const blockedTraining = trainingBots.filter(isBotBlocked);
    const blockedSearch = searchBots.filter(isBotBlocked);
    if (blockedSearch.length > 0) {
      checks.push({
        id: 'ai_crawlers_blocked',
        label: `AI search bots blocked: ${blockedSearch.join(', ')} — you will NOT appear in AI search results`,
        pass: false,
        severity: 'error',
        category: 'technical',
      });
    } else if (blockedTraining.length > 0) {
      checks.push({
        id: 'ai_crawlers_blocked',
        label: `AI training bots blocked: ${blockedTraining.join(', ')} — training blocked, search still works`,
        pass: true,
        severity: 'warning',
        category: 'technical',
      });
    } else {
      checks.push({
        id: 'ai_crawlers_blocked',
        label: 'No AI crawlers blocked in robots.txt — AI search and training can access content',
        pass: true,
        category: 'technical',
      });
    }
  }

  // E9. sitemap.xml exists and valid XML
  if (sitemapXml !== undefined) {
    const sitemapExists = sitemapXml !== null;
    const validXml = sitemapExists && /<urlset|<sitemapindex/i.test(sitemapXml);
    checks.push({
      id: 'sitemap_xml',
      label: !sitemapExists ? 'No /sitemap.xml found — create one for better crawling' : !validXml ? 'sitemap.xml found but not valid XML format' : 'sitemap.xml found with valid format',
      pass: sitemapExists && validXml,
      severity: !sitemapExists ? 'warning' : !validXml ? 'error' : undefined,
      category: 'technical',
    });
  }

  // E10. Sitemap has URLs
  if (sitemapXml && /<urlset|<sitemapindex/i.test(sitemapXml)) {
    const sitemapUrls = (sitemapXml.match(/<loc>/gi) || []).length;
    checks.push({
      id: 'sitemap_urls',
      label: sitemapUrls > 0 ? `Sitemap contains ${sitemapUrls} URL(s)` : 'Sitemap has no URLs — add <loc> entries',
      pass: sitemapUrls > 0,
      severity: sitemapUrls === 0 ? 'warning' : undefined,
      category: 'technical',
    });
  }

  // E11. Broken Internal Links
  if (brokenLinks && brokenLinks.checked > 0) {
    checks.push({
      id: 'broken_links',
      label: brokenLinks.broken === 0
        ? `All ${brokenLinks.checked} checked internal links are working`
        : `${brokenLinks.broken} of ${brokenLinks.checked} internal links are broken`,
      pass: brokenLinks.broken === 0,
      severity: brokenLinks.broken > 0 ? 'error' : undefined,
      category: 'content',
    });
  }

  // ==========================================
  // EXTENDED CHECKS 2 (7 checks)
  // ==========================================

  // E12. X-Robots-Tag HTTP Header
  const xRobotsTag = headers['x-robots-tag'] || '';
  if (xRobotsTag) {
    const xNoindex = /noindex/i.test(xRobotsTag);
    checks.push({
      id: 'x_robots_tag',
      label: xNoindex ? 'X-Robots-Tag contains noindex — page will NOT be indexed!' : `X-Robots-Tag: "${xRobotsTag.substring(0, 60)}"`,
      pass: !xNoindex,
      severity: xNoindex ? 'error' : undefined,
      category: 'technical',
    });
  }

  // E13. Nofollow Link Ratio
  const allLinksForNf = html.match(/<a[^>]*href=["'][^"'#]+["'][^>]*>/gi) || [];
  const nofollowLinks = allLinksForNf.filter(l => /rel=["'][^"']*nofollow/i.test(l));
  if (allLinksForNf.length > 5) {
    const nfRatio = Math.round((nofollowLinks.length / allLinksForNf.length) * 100);
    checks.push({
      id: 'nofollow_ratio',
      label: nfRatio <= 30 ? `${nfRatio}% nofollow links (${nofollowLinks.length}/${allLinksForNf.length}) — good link equity flow` : `${nfRatio}% nofollow links — too many, losing link equity`,
      pass: nfRatio <= 30,
      severity: 'warning',
      category: 'content',
    });
  }

  // E14. OG Image URL Validation
  if (ogImage) {
    const ogImgAbsolute = /^https?:\/\//i.test(ogImage);
    checks.push({
      id: 'og_image_url',
      label: ogImgAbsolute ? 'OG image uses absolute URL (correct)' : 'og:image must be an absolute URL (start with https://)',
      pass: ogImgAbsolute,
      severity: 'warning',
      category: 'social',
    });
  }

  // E15. Keyword in URL Slug
  if (title && parsedUrl.pathname !== '/') {
    const titleKw = title.toLowerCase().replace(/<[^>]+>/g, '').split(/[\s\-|—:,]+/).filter(w => w.length > 3 && !/^(the|and|for|with|this|that|from|your|our|best|free|how|what|why|when|page|home|site)$/.test(w));
    const urlSlug = parsedUrl.pathname.toLowerCase().replace(/[\/\-_\.]/g, ' ');
    const kwInUrl = titleKw.filter(w => urlSlug.includes(w)).length;
    const kwUrlRatio = titleKw.length > 0 ? Math.round((kwInUrl / titleKw.length) * 100) : 0;
    checks.push({
      id: 'keyword_in_url',
      label: kwUrlRatio >= 25 ? `URL contains title keywords (${kwUrlRatio}% match)` : 'URL lacks title keywords — use a descriptive URL slug',
      pass: kwUrlRatio >= 25,
      severity: 'warning',
      category: 'technical',
    });
  }

  // E16. External Links Security (rel=noopener)
  const blankLinks = html.match(/<a[^>]*target=["']_blank["'][^>]*>/gi) || [];
  const unsafeBlank = blankLinks.filter(l => !/rel=["'][^"']*(noopener|noreferrer)/i.test(l));
  if (blankLinks.length > 0) {
    checks.push({
      id: 'link_noopener',
      label: unsafeBlank.length === 0 ? `All ${blankLinks.length} target="_blank" links have rel="noopener"` : `${unsafeBlank.length} target="_blank" links missing rel="noopener" — security risk`,
      pass: unsafeBlank.length === 0,
      severity: 'warning',
      category: 'security',
    });
  }

  // E17. Web App Manifest (PWA)
  const hasManifest = /<link[^>]*rel=["']manifest["']/i.test(html);
  checks.push({
    id: 'web_manifest',
    label: hasManifest ? 'Web App Manifest found (PWA-ready)' : 'No Web App Manifest — add for installability and modern web signals',
    pass: hasManifest,
    severity: 'warning',
    category: 'technical',
  });

  // E18. Resource Hints (dns-prefetch/preconnect)
  const prefetchCount = (html.match(/<link[^>]*rel=["'](dns-prefetch|preconnect)["']/gi) || []).length;
  checks.push({
    id: 'resource_hints',
    label: prefetchCount > 0 ? `${prefetchCount} resource hint(s) (dns-prefetch/preconnect) — faster loading` : 'No dns-prefetch or preconnect hints — add for faster third-party loading',
    pass: prefetchCount > 0,
    severity: 'warning',
    category: 'performance',
  });

  // ==========================================
  // PHASE 2: ADVANCED CHECKS
  // ==========================================

  // P2. Focus Keyphrase Analysis (7 checks, only when keyphrase provided)
  if (keyphrase) {
    const kpLower = keyphrase.toLowerCase();

    // KP1: Keyphrase in Title
    const kpInTitle = title && title.toLowerCase().includes(kpLower);
    checks.push({ id: 'kp_in_title', label: kpInTitle ? `Keyphrase "${keyphrase}" found in title` : `Keyphrase "${keyphrase}" not in title — add for relevance`, pass: !!kpInTitle, category: 'keyphrase' });

    // KP2: Keyphrase in H1
    const h1Text2 = h1Matches.length > 0 ? h1Matches[0].replace(/<[^>]+>/g, '').toLowerCase() : '';
    checks.push({ id: 'kp_in_h1', label: h1Text2.includes(kpLower) ? 'Keyphrase found in H1' : 'Keyphrase not in H1 — include for on-page relevance', pass: h1Text2.includes(kpLower), category: 'keyphrase' });

    // KP3: Keyphrase in Meta Description
    const kpInDesc = desc && desc.toLowerCase().includes(kpLower);
    checks.push({ id: 'kp_in_desc', label: kpInDesc ? 'Keyphrase found in meta description' : 'Keyphrase not in meta description — add for CTR', pass: !!kpInDesc, category: 'keyphrase' });

    // KP4: Keyphrase in URL
    const kpInUrl = parsedUrl.pathname.toLowerCase().includes(kpLower.replace(/\s+/g, '-'));
    checks.push({ id: 'kp_in_url', label: kpInUrl ? 'Keyphrase found in URL slug' : 'Keyphrase not in URL — use descriptive URL', pass: kpInUrl, category: 'keyphrase' });

    // KP5: Keyphrase in First Paragraph
    const fpMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const kpInIntro = fpMatch ? fpMatch[1].replace(/<[^>]+>/g, '').toLowerCase().includes(kpLower) : false;
    checks.push({ id: 'kp_in_intro', label: kpInIntro ? 'Keyphrase found in first paragraph' : 'Keyphrase not in first paragraph — mention it early', pass: kpInIntro, category: 'keyphrase' });

    // KP6: Keyphrase Density
    const kpRegex = new RegExp(kpLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const kpCount = (textContent.match(kpRegex) || []).length;
    const kpDensity = wordCount > 0 ? ((kpCount / wordCount) * 100).toFixed(1) : 0;
    checks.push({
      id: 'kp_density',
      label: kpDensity >= 0.5 && kpDensity <= 3 ? `Keyphrase density: ${kpDensity}% (optimal)` : kpDensity > 3 ? `Keyphrase density: ${kpDensity}% — keyword stuffing risk (aim 0.5-3%)` : `Keyphrase density: ${kpDensity}% — too low (aim 0.5-3%)`,
      pass: kpDensity >= 0.5 && kpDensity <= 3,
      severity: kpDensity > 3 ? 'error' : 'warning',
      category: 'keyphrase',
    });

    // KP7: Keyphrase in Image Alt
    const kpInAlt = imgAll.some(img => {
      const alt = (img.match(/alt=["']([^"']*)["']/i) || [])[1] || '';
      return alt.toLowerCase().includes(kpLower);
    });
    checks.push({ id: 'kp_in_alt', label: kpInAlt ? 'Keyphrase found in image alt text' : 'Keyphrase not in any image alt — add for image SEO', pass: kpInAlt, severity: 'warning', category: 'keyphrase' });
  }

  // P2. Schema Required Properties Validation
  if (jsonldMatches.length > 0) {
    const requiredProps = {
      'Product': ['name', 'image'], 'Article': ['headline', 'author', 'datePublished'],
      'BlogPosting': ['headline', 'author', 'datePublished'], 'Organization': ['name', 'url'],
      'LocalBusiness': ['name', 'address'], 'BreadcrumbList': ['itemListElement'],
      'FAQPage': ['mainEntity'], 'HowTo': ['name', 'step'],
      'VideoObject': ['name', 'description', 'thumbnailUrl', 'uploadDate'],
      'Review': ['itemReviewed', 'author'],
    };
    const missingProps = [];
    for (const block of jsonldMatches) {
      const content = block.replace(/<\/?script[^>]*>/gi, '');
      try {
        const parsed = JSON.parse(content);
        const checkItem = (item) => {
          const type = item['@type'];
          if (type && requiredProps[type]) {
            const missing = requiredProps[type].filter(p => !item[p]);
            if (missing.length > 0) missingProps.push(`${type}: ${missing.join(', ')}`);
          }
        };
        if (Array.isArray(parsed)) parsed.forEach(checkItem);
        else { checkItem(parsed); if (Array.isArray(parsed['@graph'])) parsed['@graph'].forEach(checkItem); }
      } catch {}
    }
    checks.push({
      id: 'schema_required_props',
      label: missingProps.length === 0 ? 'All schema types have required properties' : `Schema missing required props: ${missingProps.slice(0, 3).join('; ')}`,
      pass: missingProps.length === 0,
      severity: missingProps.length > 0 ? 'error' : undefined,
      category: 'schema',
    });
  }

  // P2. JS-Dependent Content Detection
  const hasNoscript = /<noscript[^>]*>/i.test(html);
  const jsOnlyNav = (html.match(/<a[^>]*href=["']#["'][^>]*onclick/gi) || []).length;
  const spaRoot = /<div[^>]*id=["'](app|root|__next|__nuxt)["'][^>]*>\s*<\/div>/i.test(html);
  const jsFramework = /data-reactroot|data-v-|ng-app|_nuxt/i.test(html);
  if (spaRoot || (jsFramework && wordCount < 100)) {
    checks.push({ id: 'js_content', label: 'Page is JS-rendered SPA — content may not be visible to search engines', pass: false, severity: 'error', category: 'technical' });
  } else if (jsOnlyNav > 3) {
    checks.push({ id: 'js_content', label: `${jsOnlyNav} JS-only nav links (href="#" + onclick) — bad for crawling`, pass: false, severity: 'warning', category: 'technical' });
  }

  // P2. Ad Density Detection
  const adPatterns = /adsbygoogle|ad-slot|ad-unit|googletag\.cmd|doubleclick\.net|adnxs\.com|amazon-adsystem|data-ad-client|data-ad-slot/gi;
  const adMatches = (html.match(adPatterns) || []).length;
  if (adMatches > 0) {
    const stickyAds = /position:\s*(?:fixed|sticky)[^}]*(?:ad|banner|sponsor)/i.test(html);
    checks.push({
      id: 'ad_density',
      label: adMatches <= 6 ? `${adMatches} ad element(s) (moderate)${stickyAds ? ' + sticky ad' : ''}` : adMatches <= 10 ? `${adMatches} ad elements — high ad density may hurt rankings` : `${adMatches} ad elements — excessive ads (ranking penalty risk)`,
      pass: adMatches <= 6, severity: adMatches > 10 ? 'error' : 'warning', category: 'content',
    });
  }

  // P2. Stock Image Detection
  const stockDomains = /shutterstock|istockphoto|gettyimages|adobestock|depositphotos|dreamstime|bigstockphoto|123rf|stock-photo-|stock_photo/i;
  const stockImgs = imgAll.filter(img => stockDomains.test(img));
  if (stockImgs.length > 0) {
    checks.push({ id: 'stock_images', label: `${stockImgs.length} stock image(s) detected — original images rank better`, pass: false, severity: 'warning', category: 'content' });
  }

  // P2. First-Person Pronoun Density (E-E-A-T experience signal)
  if (wordCount >= 300) {
    const firstPersonMatches = (textContent.match(/\b(I|me|my|mine|we|us|our|ours|myself|ourselves)\b/g) || []).length;
    checks.push({
      id: 'first_person',
      label: firstPersonMatches >= 10 ? `${firstPersonMatches} first-person pronouns — strong personal experience` : firstPersonMatches >= 3 ? `${firstPersonMatches} first-person pronouns — some experience shown` : `Only ${firstPersonMatches} first-person pronouns — add personal experience (E-E-A-T)`,
      pass: firstPersonMatches >= 3, severity: 'warning', category: 'content',
    });
  }

  // P2. Transition Words
  if (wordCount >= 100) {
    const transWords = /\b(however|therefore|moreover|furthermore|consequently|nevertheless|additionally|in addition|as a result|for example|for instance|in contrast|on the other hand|similarly|likewise|meanwhile|accordingly|thus|hence|in conclusion|to summarize|specifically|in particular|notably|although|because|since|while|whereas|dolayısıyla|buna ek olarak|sonuç olarak|ancak|böylece|üstelik|öte yandan|bu nedenle|buna rağmen|ayrıca|bunun yanı sıra|kısacası|özellikle|örneğin|bunun sonucunda|başka bir deyişle|özetle|bunun yerine|sonuç itibarıyla|nitekim|dahası|bununla birlikte|çünkü|fakat|yani|halbuki|oysa|aksine|gerçekten|ise|zira|ne var ki|şöyle ki|diğer taraftan|bir başka açıdan|buna karşın|ilk olarak|ikinci olarak|son olarak|jedoch|daher|außerdem|darüber hinaus|folglich|dennoch|zusätzlich|zum Beispiel|im Gegensatz|einerseits|andererseits|insbesondere|zusammenfassend|obwohl|allerdings|однако|поэтому|кроме того|следовательно|например|в результате|тем не менее|в частности|кроме того|таким образом)\b/i;
    const textSents = textContent.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const sentsWithTrans = textSents.filter(s => transWords.test(s)).length;
    const transRatio = textSents.length > 0 ? Math.round((sentsWithTrans / textSents.length) * 100) : 0;
    checks.push({
      id: 'transition_words',
      label: transRatio >= 20 ? `${transRatio}% sentences use transition words (good flow)` : `${transRatio}% sentences use transition words — aim for 20%+`,
      pass: transRatio >= 20, severity: 'warning', category: 'content',
    });
  }

  // P2. Hreflang ISO Validation + x-default
  if (hreflangTags.length > 0) {
    const validLangs = new Set(['aa','ab','af','ak','am','an','ar','as','av','ay','az','ba','be','bg','bh','bi','bm','bn','bo','br','bs','ca','ce','ch','co','cr','cs','cu','cv','cy','da','de','dv','dz','ee','el','en','eo','es','et','eu','fa','ff','fi','fj','fo','fr','fy','ga','gd','gl','gn','gu','gv','ha','he','hi','ho','hr','ht','hu','hy','hz','ia','id','ie','ig','ii','ik','in','io','is','it','iu','ja','jv','ka','kg','ki','kj','kk','kl','km','kn','ko','kr','ks','ku','kv','kw','ky','la','lb','lg','li','ln','lo','lt','lu','lv','mg','mh','mi','mk','ml','mn','mo','mr','ms','mt','my','na','nb','nd','ne','ng','nl','nn','no','nr','nv','ny','oc','oj','om','or','os','pa','pi','pl','ps','pt','qu','rm','rn','ro','ru','rw','sa','sc','sd','se','sg','si','sk','sl','sm','sn','so','sq','sr','ss','st','su','sv','sw','ta','te','tg','th','ti','tk','tl','tn','to','tr','ts','tt','tw','ty','ug','uk','ur','uz','ve','vi','vo','wa','wo','xh','yi','yo','za','zh','zu','x-default']);
    const hrefCodes = hreflangTags.map(t => { const m = t.match(/hreflang=["']([^"']+)["']/i); if (!m) return ''; const v = m[1].toLowerCase(); return v === 'x-default' ? 'x-default' : v.split('-')[0]; }).filter(Boolean);
    const invalidCodes = hrefCodes.filter(c => !validLangs.has(c));
    checks.push({ id: 'hreflang_valid', label: invalidCodes.length === 0 ? `All ${hrefCodes.length} hreflang codes are valid ISO 639-1` : `Invalid hreflang: ${invalidCodes.join(', ')}`, pass: invalidCodes.length === 0, severity: invalidCodes.length > 0 ? 'error' : undefined, category: 'technical' });
    const hasXDefault = hreflangTags.some(t => /hreflang=["']x-default["']/i.test(t));
    checks.push({ id: 'hreflang_xdefault', label: hasXDefault ? 'hreflang x-default found — proper language fallback' : 'Missing hreflang x-default — add fallback for unmatched languages', pass: hasXDefault, severity: 'warning', category: 'technical' });
  }

  // P2. Responsive Images (srcset)
  if (imgAll.length > 2) {
    const responsiveImgs = imgAll.filter(img => /srcset=/i.test(img));
    const pictureEls = (html.match(/<picture[^>]*>/gi) || []).length;
    const responsiveRatio = Math.round(((responsiveImgs.length + pictureEls) / imgAll.length) * 100);
    checks.push({
      id: 'img_responsive',
      label: responsiveRatio >= 50 ? `${responsiveRatio}% responsive images (srcset/picture)` : `Only ${responsiveRatio}% responsive images — add srcset for mobile`,
      pass: responsiveRatio >= 30, severity: 'warning', category: 'content',
    });
  }

  // P2. Lazy-Loaded LCP Image Warning
  if (imgAll.length > 0 && /loading=["']lazy["']/i.test(imgAll[0])) {
    checks.push({ id: 'lcp_lazy', label: 'Hero image has loading="lazy" — delays LCP! Remove lazy from above-fold images', pass: false, severity: 'error', category: 'performance' });
  }

  // P2. Hidden Text Detection (spam signal — excludes accessibility patterns)
  // Check each style attribute individually to avoid cross-matching
  const styleAttrs = html.match(/style="[^"]*"/gi) || [];
  const styleBlocks = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join(' ');
  let hiddenTextSpam = false;
  // Check for font-size:0 (not 0.5rem etc) in style attrs or CSS blocks
  const allStyles = styleAttrs.join(' ') + ' ' + styleBlocks;
  if (/font-size\s*:\s*0(?![.\d])\s*(?:px|em|rem|%)?\s*[;}"'\s](?![^}]*(?:sr-only|visually-hidden|screen-reader))/i.test(allStyles)) hiddenTextSpam = true;
  // Check for same-color text — must be in SAME style attribute (color:white + background:white)
  for (const attr of styleAttrs) {
    const hasWhiteText = /color\s*:\s*(?:white|#fff(?:fff)?|rgba?\(\s*255)/i.test(attr);
    const hasWhiteBg = /background(?:-color)?\s*:\s*(?:white|#fff(?:fff)?|rgba?\(\s*255)/i.test(attr);
    if (hasWhiteText && hasWhiteBg) { hiddenTextSpam = true; break; }
  }
  // Check for suspicious display:none usage
  if (/display\s*:\s*none[^}]*(?:seo|keyword|hidden-text)/i.test(allStyles)) hiddenTextSpam = true;
  if (hiddenTextSpam) {
    checks.push({ id: 'hidden_text', label: 'Possible hidden text detected (font-size:0 or same-color text) — Google spam violation', pass: false, severity: 'error', category: 'technical' });
  }

  // ==========================================
  // PHASE 3: EXTENDED ANALYSIS
  // ==========================================

  // P3. Title Separator Analysis
  if (title && title.includes('|')) {
    checks.push({ id: 'title_separator', label: 'Title uses "|" separator — Google may rewrite it; consider using "—" instead', pass: true, severity: 'warning', category: 'meta' });
  }

  // P3. Clickbait Title Detection
  if (title && /\b(shocking|unbelievable|you won't believe|mind-blowing|jaw-dropping|insane|incredible secret|this one trick|doctors hate)\b/i.test(title)) {
    checks.push({ id: 'clickbait_title', label: 'Title may contain clickbait language — Google can demote clickbait', pass: false, severity: 'warning', category: 'meta' });
  }

  // P3. max-image-preview Meta Tag (Google Discover)
  const hasMaxImgPreview = /max-image-preview\s*:\s*large/i.test(robotsMeta || '');
  checks.push({
    id: 'max_image_preview',
    label: hasMaxImgPreview ? 'max-image-preview:large — eligible for Google Discover large images' : 'No max-image-preview:large — add to robots meta for Google Discover',
    pass: hasMaxImgPreview, severity: 'warning', category: 'meta',
  });

  // P3. Event Schema Detection
  if (jsonldMatches.length > 0 && /\b(event|conference|webinar|workshop|meetup|concert|seminar|veranstaltung|etkinlik)\b/i.test(textContent)) {
    const hasEventSchema = schemaTypes.some(t => t === 'Event');
    if (!hasEventSchema) {
      checks.push({ id: 'event_schema', label: 'Event content found but no Event schema — add for event rich results', pass: false, severity: 'warning', category: 'schema' });
    }
  }

  // P3. Logo in Organization Schema
  if (jsonldMatches.length > 0) {
    let hasLogo = false;
    const hasOrgType = schemaTypes.some(t => ['Organization', 'LocalBusiness', 'Corporation'].includes(t));
    if (hasOrgType) {
      for (const block of jsonldMatches) {
        const content = block.replace(/<\/?script[^>]*>/gi, '');
        try {
          const parsed = JSON.parse(content);
          const cl = (item) => { if (item['@type'] && ['Organization','LocalBusiness','Corporation'].includes(item['@type']) && item.logo) hasLogo = true; };
          if (Array.isArray(parsed)) parsed.forEach(cl); else { cl(parsed); if (Array.isArray(parsed['@graph'])) parsed['@graph'].forEach(cl); }
        } catch {}
      }
      checks.push({ id: 'org_logo', label: hasLogo ? 'Organization schema includes logo' : 'Organization schema missing logo — add for knowledge panel', pass: hasLogo, severity: 'warning', category: 'schema' });
    }
  }

  // P3. Additional Security Headers
  if (!headers['x-frame-options']) {
    checks.push({ id: 'x_frame_options', label: 'Missing X-Frame-Options — clickjacking risk', pass: false, severity: 'warning', category: 'security' });
  }
  checks.push({ id: 'referrer_policy', label: headers['referrer-policy'] ? `Referrer-Policy: ${(headers['referrer-policy']||'').substring(0, 40)}` : 'No Referrer-Policy header — may leak URL data', pass: !!headers['referrer-policy'], severity: 'warning', category: 'security' });
  checks.push({ id: 'permissions_policy', label: headers['permissions-policy'] ? 'Permissions-Policy header present' : 'No Permissions-Policy — restrict camera/mic/geo access', pass: !!headers['permissions-policy'], severity: 'warning', category: 'security' });

  // P3. Paragraph Length Warning
  if (wordCount >= 300) {
    const paraMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
    const paraTexts = paraMatches.map(p => p.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 10);
    const longParas = paraTexts.filter(p => p.split(/\s+/).length > 150);
    if (longParas.length > 0) {
      checks.push({ id: 'paragraph_length', label: `${longParas.length} paragraph(s) exceed 150 words — break up for readability`, pass: false, severity: 'warning', category: 'content' });
    }
  }

  // P3. Descriptive Image Filenames
  if (imgAll.length > 0) {
    const genericNames = imgAll.filter(img => {
      const src = (img.match(/src=["']([^"']+)["']/i) || [])[1] || '';
      const filename = src.split('/').pop().split('?')[0];
      return /^(img|image|photo|picture|pic|dsc|dscn|dcim|screenshot|untitled|bildschirmfoto|foto|_mg_|sam_)\d*\./i.test(filename) || /^\d{5,}\./i.test(filename);
    });
    if (genericNames.length > 0) {
      checks.push({ id: 'img_filenames', label: `${genericNames.length} image(s) with generic filenames — use descriptive names for image SEO`, pass: false, severity: 'warning', category: 'content' });
    }
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

  // ==========================================
  // PHASE 4: QUALITY & ACCESSIBILITY (+15 checks)
  // ==========================================

  // P4-1. H1 Length — optimal 20-70 characters
  if (h1Matches.length === 1) {
    const h1Txt = h1Matches[0].replace(/<[^>]+>/g, '').trim();
    const h1Len = h1Txt.length;
    checks.push({
      id: 'h1_length',
      label: h1Len >= 20 && h1Len <= 70
        ? `H1 length: ${h1Len} characters (optimal)`
        : h1Len < 20 ? `H1 length: ${h1Len} characters — too short, aim for 20-70`
        : `H1 length: ${h1Len} characters — too long, keep under 70`,
      pass: h1Len >= 20 && h1Len <= 70,
      severity: 'warning', category: 'content',
    });
  }

  // P4-2. Title = Description duplicate
  if (title && metaContent('description')) {
    const descText = metaContent('description').trim().toLowerCase();
    const titleText = title.trim().toLowerCase();
    const isDuplicate = titleText === descText || (titleText.length > 10 && descText.includes(titleText));
    checks.push({
      id: 'title_desc_duplicate',
      label: isDuplicate
        ? 'Title and meta description are identical — each should be unique'
        : 'Title and meta description are different (good)',
      pass: !isDuplicate,
      severity: 'warning', category: 'meta',
    });
  }

  // P4-3. OG URL matches Canonical
  const ogUrlP4 = metaContent('og:url');
  const canonicalVal = canonicalHref ? canonicalHref[1] : '';
  if (ogUrlP4 && canonicalVal) {
    const ogNorm = ogUrlP4.replace(/\/+$/, '').toLowerCase();
    const canNorm = canonicalVal.replace(/\/+$/, '').toLowerCase();
    checks.push({
      id: 'og_canonical_match',
      label: ogNorm === canNorm
        ? 'OG URL matches canonical URL (consistent)'
        : `OG URL (${ogUrlP4}) differs from canonical (${canonicalVal}) — should match`,
      pass: ogNorm === canNorm,
      severity: 'warning', category: 'social',
    });
  }

  // P4-4. Viewport Zoom — user-scalable=no or maximum-scale=1 is bad for accessibility
  const viewportContent = metaContent('viewport');
  if (viewportContent) {
    const zoomDisabled = /user-scalable\s*=\s*no/i.test(viewportContent) ||
      /maximum-scale\s*=\s*1(?:\.0)?(?:\s|,|$)/i.test(viewportContent);
    checks.push({
      id: 'viewport_zoom',
      label: zoomDisabled
        ? 'Viewport disables zoom — bad for accessibility (WCAG 1.4.4)'
        : 'Viewport allows zoom (good for accessibility)',
      pass: !zoomDisabled,
      severity: 'warning', category: 'accessibility',
    });
  }

  // P4-5. Excessive Links (>100 per page)
  const allPageLinks = html.match(/<a[^>]*href/gi) || [];
  const linkCount = allPageLinks.length;
  checks.push({
    id: 'excessive_links',
    label: linkCount <= 100
      ? `${linkCount} links on page (within limit)`
      : `${linkCount} links on page — exceeds 100 limit, may dilute link equity`,
    pass: linkCount <= 100,
    severity: 'warning', category: 'content',
  });

  // P4-6. DOM Size estimation (count HTML tags)
  const allTags = html.match(/<[a-z][a-z0-9]*[\s>]/gi) || [];
  const domSize = allTags.length;
  checks.push({
    id: 'dom_size',
    label: domSize <= 1500
      ? `DOM size: ~${domSize} elements (good)`
      : `DOM size: ~${domSize} elements — exceeds 1500, may slow rendering`,
    pass: domSize <= 1500,
    severity: domSize > 3000 ? 'error' : 'warning', category: 'performance',
  });

  // P4-7. nosnippet / data-nosnippet blocking
  const hasNosnippet = /nosnippet/i.test(robotsMeta);
  const hasDataNosnippet = /data-nosnippet/i.test(html);
  checks.push({
    id: 'nosnippet_blocking',
    label: hasNosnippet
      ? 'nosnippet in robots meta — Google/AI cannot show snippets from this page!'
      : hasDataNosnippet
        ? 'data-nosnippet found — some content hidden from search snippets'
        : 'No snippet blocking detected (good — content is fully accessible)',
    pass: !hasNosnippet,
    severity: hasNosnippet ? 'error' : 'warning', category: 'technical',
  });

  // P4-8. Trailing Slash Consistency (canonical vs actual URL)
  if (canonicalVal && parsedUrl.pathname !== '/') {
    const urlHasSlash = parsedUrl.pathname.endsWith('/');
    const canPath = new URL(canonicalVal, url).pathname;
    const canHasSlash = canPath.endsWith('/');
    if (urlHasSlash !== canHasSlash) {
      checks.push({
        id: 'trailing_slash',
        label: `Trailing slash mismatch: URL ${urlHasSlash ? 'has' : 'lacks'} slash, canonical ${canHasSlash ? 'has' : 'lacks'} slash`,
        pass: false,
        severity: 'warning', category: 'technical',
      });
    } else {
      checks.push({
        id: 'trailing_slash',
        label: 'Trailing slash consistent between URL and canonical',
        pass: true,
        category: 'technical',
      });
    }
  }

  // P4-9. Schema Date Consistency — datePublished <= dateModified
  const datePublished = (html.match(/"datePublished"\s*:\s*"([^"]+)"/i) || [])[1];
  const dateModified = (html.match(/"dateModified"\s*:\s*"([^"]+)"/i) || [])[1];
  if (datePublished && dateModified) {
    const pubDate = new Date(datePublished);
    const modDate = new Date(dateModified);
    const isConsistent = modDate >= pubDate;
    checks.push({
      id: 'schema_date_consistency',
      label: isConsistent
        ? `Schema dates consistent: published ${datePublished}, modified ${dateModified}`
        : `Schema date error: dateModified (${dateModified}) is BEFORE datePublished (${datePublished})`,
      pass: isConsistent,
      severity: 'warning', category: 'schema',
    });
  }

  // P4-10. Render-Blocking Resources — CSS/JS in <head> without async/defer
  const headHtml = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  const headScriptsP4 = headHtml.match(/<script[^>]*src=["'][^"']+["'][^>]*>/gi) || [];
  const blockingScriptsP4 = headScriptsP4.filter(s => !/defer|async/i.test(s) && !/type=["']application\/ld\+json["']/i.test(s));
  checks.push({
    id: 'render_blocking',
    label: blockingScriptsP4.length === 0
      ? 'No render-blocking scripts in head (good)'
      : `${blockingScriptsP4.length} render-blocking script(s) in head — add defer or async`,
    pass: blockingScriptsP4.length === 0,
    severity: 'warning', category: 'performance',
  });

  // P4-11. Third-Party Script Count
  const allScriptSrcs = (html.match(/<script[^>]*src=["']([^"']+)["']/gi) || [])
    .map(s => { try { return new URL((s.match(/src=["']([^"']+)["']/i) || [])[1], url).hostname; } catch(e) { return ''; } })
    .filter(h => h && h !== parsedUrl.hostname);
  const uniqueThirdParty = [...new Set(allScriptSrcs)];
  checks.push({
    id: 'third_party_scripts',
    label: uniqueThirdParty.length <= 5
      ? `${uniqueThirdParty.length} third-party script domain(s) (acceptable)`
      : `${uniqueThirdParty.length} third-party script domains — may slow page load (${uniqueThirdParty.slice(0, 3).join(', ')}...)`,
    pass: uniqueThirdParty.length <= 5,
    severity: 'warning', category: 'performance',
  });

  // P4-12. ARIA Landmarks + Skip Link
  const hasMainLandmark = /<main[\s>]/i.test(html) || /role=["']main["']/i.test(html);
  const hasNavLandmark = /<nav[\s>]/i.test(html) || /role=["']navigation["']/i.test(html);
  const hasSkipLink = /<a[^>]*href=["']#(main|content|skip)[^"']*["'][^>]*>/i.test(html);
  const landmarkScore = (hasMainLandmark ? 1 : 0) + (hasNavLandmark ? 1 : 0) + (hasSkipLink ? 1 : 0);
  checks.push({
    id: 'aria_landmarks',
    label: landmarkScore >= 2
      ? `ARIA landmarks present: ${[hasMainLandmark && 'main', hasNavLandmark && 'nav', hasSkipLink && 'skip-link'].filter(Boolean).join(', ')}`
      : `Missing ARIA landmarks — add <main>, <nav>, and skip-to-content link for accessibility`,
    pass: landmarkScore >= 2,
    severity: 'warning', category: 'accessibility',
  });

  // P4-13. Form Labels — inputs without associated labels
  const formInputs = html.match(/<input[^>]*type=["'](?:text|email|password|search|tel|url|number)["'][^>]*>/gi) || [];
  const inputsWithoutLabel = formInputs.filter(inp => {
    const id = (inp.match(/id=["']([^"']+)["']/i) || [])[1];
    const hasAriaLabel = /aria-label(ledby)?=/i.test(inp);
    const hasPlaceholder = /placeholder=/i.test(inp);
    const hasLabel = id && new RegExp(`<label[^>]*for=["']${id}["']`, 'i').test(html);
    return !hasAriaLabel && !hasLabel && !hasPlaceholder;
  });
  checks.push({
    id: 'form_labels',
    label: inputsWithoutLabel.length === 0
      ? `All ${formInputs.length} form input(s) have labels or aria-labels`
      : `${inputsWithoutLabel.length} form input(s) without labels — bad for accessibility and screen readers`,
    pass: inputsWithoutLabel.length === 0,
    severity: 'warning', category: 'accessibility',
  });

  // P4-14. Duplicate IDs in HTML
  const allIds = html.match(/\bid=["']([^"']+)["']/gi) || [];
  const idValues = allIds.map(m => (m.match(/id=["']([^"']+)["']/i) || [])[1]).filter(Boolean);
  const idCounts = {};
  idValues.forEach(id => { idCounts[id] = (idCounts[id] || 0) + 1; });
  const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
  checks.push({
    id: 'duplicate_ids',
    label: duplicateIds.length === 0
      ? `No duplicate IDs found (${idValues.length} unique IDs)`
      : `${duplicateIds.length} duplicate ID(s) found: ${duplicateIds.slice(0, 3).map(([id, c]) => `"${id}" (${c}x)`).join(', ')} — must be unique per HTML spec`,
    pass: duplicateIds.length === 0,
    severity: 'warning', category: 'accessibility',
  });

  // P4-15. iframe Security — iframes without sandbox
  const iframes = html.match(/<iframe[^>]*>/gi) || [];
  const unsafeIframes = iframes.filter(f => !/sandbox/i.test(f));
  // YouTube/Vimeo embeds are common and safe even without sandbox
  const trulyUnsafe = unsafeIframes.filter(f => !/youtube|vimeo|google\.com\/maps/i.test(f));
  checks.push({
    id: 'iframe_sandbox',
    label: iframes.length === 0
      ? 'No iframes on page'
      : trulyUnsafe.length === 0
        ? `${iframes.length} iframe(s) — all safe (known providers or sandboxed)`
        : `${trulyUnsafe.length} iframe(s) without sandbox attribute — security risk`,
    pass: trulyUnsafe.length === 0,
    severity: 'warning', category: 'security',
  });

  // ==========================================
  // PHASE 4: DISCOVERY & STRUCTURE CHECKS
  // ==========================================

  // P4-16. Pagination rel=next/prev
  const hasRelNext = /<link[^>]*rel=["']next["']/i.test(html);
  const hasRelPrev = /<link[^>]*rel=["']prev["']/i.test(html);
  const hasPagination = /\/page\/\d|[?&]page=\d|[?&]p=\d|class=["'][^"']*pagination/i.test(html);
  if (hasPagination) {
    checks.push({
      id: 'pagination_rel',
      label: (hasRelNext || hasRelPrev)
        ? `Pagination markup found (${hasRelNext ? 'rel=next' : ''}${hasRelNext && hasRelPrev ? ' + ' : ''}${hasRelPrev ? 'rel=prev' : ''})`
        : 'Paginated page without rel=next/prev — add for proper crawl chain',
      pass: hasRelNext || hasRelPrev,
      severity: 'warning',
      category: 'technical',
    });
  }

  // P4-17. RSS/Atom Feed Discovery
  const hasRssFeed = /<link[^>]*type=["']application\/rss\+xml["']/i.test(html);
  const hasAtomFeed = /<link[^>]*type=["']application\/atom\+xml["']/i.test(html);
  const hasJsonFeed = /<link[^>]*type=["']application\/feed\+json["']/i.test(html);
  const feedCount = [hasRssFeed, hasAtomFeed, hasJsonFeed].filter(Boolean).length;
  checks.push({
    id: 'rss_feed',
    label: feedCount > 0
      ? `${feedCount} feed(s) discovered (${[hasRssFeed ? 'RSS' : '', hasAtomFeed ? 'Atom' : '', hasJsonFeed ? 'JSON' : ''].filter(Boolean).join(', ')}) — aids content discovery`
      : 'No RSS/Atom feed in <head> — add for content discovery by aggregators and AI',
    pass: feedCount > 0,
    severity: 'warning',
    category: 'technical',
  });

  // P4-18. IndexNow Support
  const hasIndexNow = /<meta[^>]*name=["']indexnow["']/i.test(html) ||
    /<link[^>]*href=["'][^"']*indexnow["']/i.test(html);
  // Also check for IndexNow key in common locations via HTML hint
  const indexNowInHead = /indexnow/i.test(html.match(/<head[\s\S]*?<\/head>/i)?.[0] || '');
  checks.push({
    id: 'indexnow',
    label: (hasIndexNow || indexNowInHead)
      ? 'IndexNow support detected — faster indexing for Bing & Yandex'
      : 'No IndexNow integration — add for instant Bing/Yandex indexing on content changes',
    pass: hasIndexNow || indexNowInHead,
    severity: 'warning',
    category: 'technical',
  });

  // P4-19. Section Depth (word count per H2 section)
  const h2Sections = html.split(/<h2[^>]*>/i);
  if (h2Sections.length > 2) { // at least 2 H2 sections
    const sectionWords = [];
    for (let i = 1; i < h2Sections.length; i++) {
      const sectionHtml = h2Sections[i].split(/<h2[^>]*>/i)[0] || h2Sections[i];
      const sectionText = sectionHtml.replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      sectionWords.push(sectionText.split(/\s+/).filter(w => w.length > 0).length);
    }
    const thinSections = sectionWords.filter(w => w < 50).length;
    const avgWords = Math.round(sectionWords.reduce((a, b) => a + b, 0) / sectionWords.length);
    checks.push({
      id: 'section_depth',
      label: thinSections === 0
        ? `All ${sectionWords.length} H2 sections have sufficient depth (avg ${avgWords} words)`
        : `${thinSections} of ${sectionWords.length} H2 sections have < 50 words — add more content or merge thin sections`,
      pass: thinSections === 0,
      severity: 'warning',
      category: 'content',
    });
  }

  // Mark N/A checks for detected site type
  checks.forEach(c => {
    if (naCheckIds.includes(c.id)) {
      c.applicable = false;
    }
  });

  // Filter out non-applicable checks (e.g. product-only checks on category pages)
  const applicableChecks = checks.filter(c => c.applicable !== false);

  // Calculate score
  const passed = applicableChecks.filter(c => c.pass).length;
  const score = applicableChecks.length > 0 ? Math.round((passed / applicableChecks.length) * 100) : 0;

  return { score, checks: applicableChecks, passed, total: applicableChecks.length };
}
