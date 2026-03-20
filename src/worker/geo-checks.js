/**
 * GEO Check Engine — 46 checks
 * Generative Engine Optimization
 * Evaluates readiness for Google AI Overview, Bing Copilot, Perplexity
 */

import { NA_CHECKS } from './site-detector.js';

export function runGeoChecks(pageData) {
  const { html, url, siteType } = pageData;
  const detectedType = siteType?.siteType || 'default';
  const naCheckIds = NA_CHECKS[detectedType]?.geo || [];
  const checks = [];

  function metaContent(name) {
    const tagRe = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*>`, 'i');
    const tag = (html.match(tagRe) || [''])[0];
    if (!tag) return '';
    const cm = tag.match(/content="([^"]*)"/i) || tag.match(/content='([^']*)'/i);
    return cm ? cm[1] : '';
  }

  const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const wordCount = textContent.split(/\s+/).length;
  const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const paragraphTexts = paragraphs.map(p => p.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 10);
  const parsedUrl = new URL(url);

  // ==========================================
  // AI OVERVIEW ELIGIBILITY (8 checks)
  // ==========================================

  // 1. Featured Snippet Format (concise definitions)
  const definitionPattern = /\bis a\b|\bare\b.*\bthat\b|\brefers to\b|\bmeans\b|\bdefined as\b|\bist ein\b|\bsind\b|\bbedeutet\b/i;
  const hasDefinitions = definitionPattern.test(textContent);
  checks.push({
    id: 'geo_definitions',
    label: hasDefinitions ? 'Definition-style content found — featured snippet candidate' : 'No clear definitions — add "X is..." patterns for AI Overview',
    pass: hasDefinitions,
    severity: 'warning',
    category: 'overview',
  });

  // 2. People Also Ask format (Q&A pattern)
  const qaPattern = /<h[2-4][^>]*>[^<]*\?[^<]*<\/h[2-4]>/gi;
  const qaCount = (html.match(qaPattern) || []).length;
  checks.push({
    id: 'geo_paa_format',
    label: qaCount >= 2 ? `${qaCount} question headings — matches "People Also Ask" format` : 'Few question headings — add Q&A headings for AI Overview',
    pass: qaCount >= 2,
    severity: 'warning',
    category: 'overview',
  });

  // 3. Content freshness signals
  const hasDateModified = /"dateModified"/i.test(html);
  const currentYear = new Date().getFullYear().toString();
  const hasCurrentYear = textContent.includes(currentYear) || textContent.includes((parseInt(currentYear) - 1).toString());
  checks.push({
    id: 'geo_freshness',
    label: (hasDateModified || hasCurrentYear) ? 'Content freshness signals detected' : 'No freshness signals — add dates, update timestamps',
    pass: hasDateModified || hasCurrentYear,
    severity: 'warning',
    category: 'overview',
  });

  // 4. Comprehensive content depth
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  checks.push({
    id: 'geo_content_depth',
    label: wordCount >= 800 && h2Count >= 3 ? `Comprehensive content (${wordCount} words, ${h2Count} sections)` : `Content may be too thin for AI Overview (${wordCount} words, ${h2Count} sections)`,
    pass: wordCount >= 800 && h2Count >= 3,
    severity: 'warning',
    category: 'overview',
  });

  // 5. Search intent clarity (clear topic focus)
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') || '';
  const titleH1Match = title && h1 && (title.toLowerCase().includes(h1.toLowerCase().substring(0, 20)) || h1.toLowerCase().includes(title.toLowerCase().substring(0, 20)));
  checks.push({
    id: 'geo_intent_clarity',
    label: titleH1Match ? 'Title and H1 are aligned — clear topic focus' : 'Title and H1 don\'t align — confusing for AI topic matching',
    pass: !!titleH1Match,
    severity: 'warning',
    category: 'overview',
  });

  // 6. Structured answer blocks
  const hasOrderedList = /<ol[^>]*>/i.test(html);
  const hasSteps = /step\s*\d|schritt\s*\d|adım\s*\d/i.test(textContent);
  checks.push({
    id: 'geo_structured_answers',
    label: (hasOrderedList || hasSteps) ? 'Step-by-step content detected — AI Overview friendly' : 'No step-by-step content — add numbered guides for AI',
    pass: hasOrderedList || hasSteps,
    severity: 'warning',
    category: 'overview',
  });

  // 7. Content Hierarchy Depth (H2 + H3 + H4)
  const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;
  const h4Count = (html.match(/<h4[^>]*>/gi) || []).length;
  const hierarchyDepth = (h2Count > 0 ? 1 : 0) + (h3Count > 0 ? 1 : 0) + (h4Count > 0 ? 1 : 0);
  checks.push({
    id: 'geo_hierarchy_depth',
    label: hierarchyDepth >= 2 ? `${hierarchyDepth}-level heading hierarchy — deep content structure` : 'Flat heading structure — add H3/H4 subheadings for depth',
    pass: hierarchyDepth >= 2,
    severity: 'warning',
    category: 'overview',
  });

  // 8. Paragraph Length Optimization
  const optimalParagraphs = paragraphTexts.filter(p => {
    const words = p.split(/\s+/).length;
    return words >= 20 && words <= 80;
  }).length;
  const optimalRatio = paragraphTexts.length > 0 ? (optimalParagraphs / paragraphTexts.length * 100).toFixed(0) : 0;
  checks.push({
    id: 'geo_paragraph_length',
    label: optimalRatio >= 60 ? `${optimalRatio}% optimal paragraphs (20-80 words) — AI-friendly` : `${optimalRatio}% optimal paragraphs — aim for 20-80 words per paragraph`,
    pass: optimalRatio >= 60,
    severity: 'warning',
    category: 'overview',
  });

  // ==========================================
  // CONTENT AUTHORITY (10 checks)
  // ==========================================

  // 9. Author Schema
  const hasAuthorSchema = /"author"\s*:\s*\{/i.test(html);
  checks.push({
    id: 'geo_author_schema',
    label: hasAuthorSchema ? 'Author schema markup found' : 'No author schema — add for AI trust signals',
    pass: hasAuthorSchema,
    category: 'authority',
  });

  // 10. Source citations in content
  const citationPatterns = /according to|source:|study|research|survey|report by|data from|based on|published in/i;
  const hasCitations = citationPatterns.test(textContent);
  checks.push({
    id: 'geo_citations',
    label: hasCitations ? 'Source citations found — increases AI trust' : 'No source citations — reference studies and data for authority',
    pass: hasCitations,
    severity: 'warning',
    category: 'authority',
  });

  // 11. Trust elements
  const trustElements = [
    /testimonial|review|bewertung|yorum/i.test(html),
    /certification|certified|zertifiziert|sertifika/i.test(html),
    /award|auszeichnung|ödül/i.test(html),
    /"aggregateRating"|"Review"/i.test(html),
    /trust|güven|vertrauen/i.test(html),
  ];
  const trustCount = trustElements.filter(Boolean).length;
  checks.push({
    id: 'geo_trust',
    label: trustCount >= 2 ? `${trustCount}/5 trust signals found` : `Only ${trustCount}/5 trust signals — add reviews, certifications`,
    pass: trustCount >= 2,
    severity: 'warning',
    category: 'authority',
  });

  // 12. Brand consistency
  const ogSiteName = metaContent('og:site_name');
  const hasOrgSchema = /"Organization"|"LocalBusiness"/i.test(html);
  checks.push({
    id: 'geo_brand',
    label: (ogSiteName && hasOrgSchema) ? 'Brand identity consistent (OG + Schema)' : 'Incomplete brand identity — add og:site_name + Organization schema',
    pass: !!(ogSiteName && hasOrgSchema),
    severity: 'warning',
    category: 'authority',
  });

  // 13. Unique/original content signals
  const hasOriginalData = /our (data|research|study|analysis)|we (found|discovered|analyzed)|our (team|experts)/i.test(textContent);
  checks.push({
    id: 'geo_original',
    label: hasOriginalData ? 'Original research/data signals found' : 'No original data signals — "our research shows..." boosts AI citation',
    pass: hasOriginalData,
    severity: 'warning',
    category: 'authority',
  });

  // 14. Expert Quotes
  const hasExpertQuotes = /<blockquote/i.test(html) || /"[^"]{20,200}"\s*[-—]\s*[A-Z]/m.test(textContent) || /says |states |explains |notes /i.test(textContent);
  checks.push({
    id: 'geo_expert_quotes',
    label: hasExpertQuotes ? 'Expert quotes or testimonials found — authority signal' : 'No expert quotes — add professional opinions for credibility',
    pass: hasExpertQuotes,
    severity: 'warning',
    category: 'authority',
  });

  // 15. Case Study / Example Patterns
  const hasCaseStudy = /case study|example|for instance|real-world|use case|fallbeispiel|beispiel|örnek/i.test(textContent);
  checks.push({
    id: 'geo_case_study',
    label: hasCaseStudy ? 'Case study or examples found — AI values concrete examples' : 'No examples or case studies — add real-world examples',
    pass: hasCaseStudy,
    severity: 'warning',
    category: 'authority',
  });

  // 16. Industry Terminology
  const industryTerms = /SEO|API|CMS|UX|UI|CTA|ROI|KPI|SERP|CTR|bounce rate|conversion|analytics|algorithm|machine learning|AI|optimization/gi;
  const termMatches = (textContent.match(industryTerms) || []).length;
  const uniqueTerms = [...new Set((textContent.match(industryTerms) || []).map(t => t.toLowerCase()))].length;
  checks.push({
    id: 'geo_industry_terms',
    label: uniqueTerms >= 3 ? `${uniqueTerms} industry terms used — domain expertise signal` : 'Few industry terms — use relevant jargon for topical authority',
    pass: uniqueTerms >= 3,
    severity: 'warning',
    category: 'authority',
  });

  // 17. External Link Quality (links to authoritative domains)
  const externalLinks = [];
  const linkRegex = /<a[^>]*href=["'](https?:\/\/[^"']*)["']/gi;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    try {
      const linkHost = new URL(linkMatch[1]).hostname;
      if (linkHost !== parsedUrl.hostname) externalLinks.push(linkHost);
    } catch {}
  }
  const authorityDomains = /google|microsoft|wikipedia|github|w3\.org|schema\.org|moz\.com|developer\.|docs\./i;
  const authorityLinks = externalLinks.filter(h => authorityDomains.test(h)).length;
  checks.push({
    id: 'geo_authority_links',
    label: authorityLinks >= 1 ? `${authorityLinks} links to authoritative sources — boosts credibility` : 'No links to authoritative sources — cite Google, Schema.org, etc.',
    pass: authorityLinks >= 1,
    severity: 'warning',
    category: 'authority',
  });

  // 18. Source Diversity (multiple external domains)
  const uniqueDomains = [...new Set(externalLinks)].length;
  checks.push({
    id: 'geo_source_diversity',
    label: uniqueDomains >= 3 ? `${uniqueDomains} unique external domains — diverse sources` : 'Few external source domains — diversify your references',
    pass: uniqueDomains >= 3,
    severity: 'warning',
    category: 'authority',
  });

  // ==========================================
  // CONTENT FORMAT (12 checks)
  // ==========================================

  // 19. FAQ Schema
  const hasFaqSchema = /FAQPage/i.test(html);
  checks.push({
    id: 'geo_faq_schema',
    label: hasFaqSchema ? 'FAQ Schema (FAQPage) found' : 'No FAQ Schema — add for Google rich results + AI Overview',
    pass: hasFaqSchema,
    category: 'format',
  });

  // 20. HowTo Schema
  const hasHowTo = /HowTo/i.test(html);
  checks.push({
    id: 'geo_howto_schema',
    label: hasHowTo ? 'HowTo Schema found' : 'No HowTo Schema — add for step-by-step rich results',
    pass: hasHowTo,
    severity: 'warning',
    category: 'format',
  });

  // 21. Comparison/Pro-Con content
  const hasComparison = /vs\.?|versus|compared to|comparison|vergleich|karşılaştırma|pro\s*&?\s*con|vor-?\s*und\s*nachteile/i.test(textContent);
  checks.push({
    id: 'geo_comparison',
    label: hasComparison ? 'Comparison content detected — AI loves comparing' : 'No comparison content — add vs. sections for AI recommendations',
    pass: hasComparison,
    severity: 'warning',
    category: 'format',
  });

  // 22. Summary/TL;DR
  const hasSummary = /summary|key takeaway|tl;?dr|fazit|zusammenfassung|özet|conclusion|in short|bottom line/i.test(textContent);
  checks.push({
    id: 'geo_summary',
    label: hasSummary ? 'Summary/conclusion section found' : 'No summary section — add Key Takeaways or TL;DR for AI',
    pass: hasSummary,
    severity: 'warning',
    category: 'format',
  });

  // 23. Visual content with ALT (filter JS-template img tags, allow empty alt="" for decorative)
  const images = (html.match(/<img[^>]*>/gi) || []).filter(img => !/src=["']\s*['+]/.test(img));
  const imagesWithAlt = images.filter(img => /alt\s*=/i.test(img));
  checks.push({
    id: 'geo_visual',
    label: images.length > 0 && imagesWithAlt.length === images.length
      ? `${images.length} images all with ALT text — AI can understand visuals`
      : images.length === 0 ? 'No images — add visuals with descriptive ALT text' : `${images.length - imagesWithAlt.length} images missing ALT text`,
    pass: images.length > 0 && imagesWithAlt.length === images.length,
    severity: 'warning',
    category: 'format',
  });

  // 24. Breadcrumb schema
  const hasBreadcrumb = /BreadcrumbList/i.test(html);
  checks.push({
    id: 'geo_breadcrumb',
    label: hasBreadcrumb ? 'BreadcrumbList schema found — helps AI understand site structure' : 'No BreadcrumbList schema — add for better AI context',
    pass: hasBreadcrumb,
    severity: 'warning',
    category: 'format',
  });

  // 25. Data Visualization Hints (tables, charts references)
  const hasDataViz = /<table[^>]*>/i.test(html) || /chart|graph|diagram|infographic|visualization/i.test(html);
  checks.push({
    id: 'geo_data_viz',
    label: hasDataViz ? 'Data visualization elements found (tables/charts)' : 'No data tables or charts — add structured data visualizations',
    pass: hasDataViz,
    severity: 'warning',
    category: 'format',
  });

  // 26. Lists Variety (both ordered and unordered)
  const hasUL = /<ul[^>]*>/i.test(html);
  const hasOL = /<ol[^>]*>/i.test(html);
  checks.push({
    id: 'geo_list_variety',
    label: (hasUL && hasOL) ? 'Both ordered and unordered lists used — content variety' : hasUL || hasOL ? 'Only one list type — use both <ul> and <ol> for content variety' : 'No lists found — add lists for structured content',
    pass: hasUL && hasOL,
    severity: 'warning',
    category: 'format',
  });

  // 27. Content Formatting Variety
  const formatElements = [
    /<strong|<b>/i.test(html),
    /<em|<i>/i.test(html),
    /<(ul|ol)[^>]*>/i.test(html),
    /<table[^>]*>/i.test(html),
    /<blockquote/i.test(html),
    /<code|<pre/i.test(html),
  ];
  const formatCount = formatElements.filter(Boolean).length;
  checks.push({
    id: 'geo_format_variety',
    label: formatCount >= 3 ? `${formatCount}/6 formatting types used — rich content` : `Only ${formatCount}/6 formatting types — use bold, lists, tables, quotes, code`,
    pass: formatCount >= 3,
    severity: 'warning',
    category: 'format',
  });

  // 28. Multi-Perspective Content
  const hasMultiPerspective = /on the other hand|however|alternatively|some (people|experts)|while others|in contrast|conversely/i.test(textContent);
  checks.push({
    id: 'geo_multi_perspective',
    label: hasMultiPerspective ? 'Multi-perspective content found — balanced analysis' : 'Single-perspective content — add "on the other hand..." for balance',
    pass: hasMultiPerspective,
    severity: 'warning',
    category: 'format',
  });

  // 29. Actionable Content
  const hasActionable = /you (can|should|need to|must)|try |start by |make sure|don't forget|tip:|pro tip|best practice/i.test(textContent);
  checks.push({
    id: 'geo_actionable',
    label: hasActionable ? 'Actionable advice found — AI prefers practical content' : 'No actionable content — add "you should...", "try...", tips',
    pass: hasActionable,
    severity: 'warning',
    category: 'format',
  });

  // 30. Conclusion/Recommendation
  const hasConclusion = /recommend|our pick|best choice|winner|verdict|conclusion|final thoughts|empfehlung|fazit|sonuç/i.test(textContent);
  checks.push({
    id: 'geo_conclusion',
    label: hasConclusion ? 'Conclusion/recommendation found — helps AI provide answers' : 'No conclusion — add recommendations or a verdict section',
    pass: hasConclusion,
    severity: 'warning',
    category: 'format',
  });

  // ==========================================
  // ENTITY & SEMANTIC (8 checks)
  // ==========================================

  // 31. Entity Markup (schema Person, Product, Organization, etc.)
  const entitySchemas = ['"Person"', '"Product"', '"Organization"', '"LocalBusiness"', '"Article"', '"BlogPosting"', '"WebApplication"', '"SoftwareApplication"'];
  const foundEntities = entitySchemas.filter(e => html.includes(e));
  checks.push({
    id: 'geo_entity_markup',
    label: foundEntities.length >= 1 ? `${foundEntities.length} entity types in Schema — AI can classify content` : 'No entity Schema types — add Person, Product, or Organization schema',
    pass: foundEntities.length >= 1,
    category: 'semantic',
  });

  // 32. Semantic HTML Depth
  const semanticTags = ['<article', '<section', '<main', '<nav', '<aside', '<header', '<footer', '<figure', '<figcaption', '<details', '<summary', '<time', '<mark', '<address'];
  const semanticCount = semanticTags.filter(tag => html.toLowerCase().includes(tag)).length;
  checks.push({
    id: 'geo_semantic_depth',
    label: semanticCount >= 5 ? `${semanticCount}/14 semantic HTML5 elements — deep semantic structure` : `${semanticCount}/14 semantic elements — add <article>, <figure>, <time>, etc.`,
    pass: semanticCount >= 5,
    severity: 'warning',
    category: 'semantic',
  });

  // 33. Time Elements
  const hasTimeTag = /<time[^>]*>/i.test(html);
  checks.push({
    id: 'geo_time_element',
    label: hasTimeTag ? '<time> element found — machine-readable dates' : 'No <time> elements — wrap dates in <time datetime="...">',
    pass: hasTimeTag,
    severity: 'warning',
    category: 'semantic',
  });

  // 34. Numerical Data Density
  const numberMatches = textContent.match(/\d+[\.,]?\d*\s*(%|px|ms|MB|GB|KB|users|sites|checks|seconds|minutes|countries)/gi) || [];
  checks.push({
    id: 'geo_numerical_density',
    label: numberMatches.length >= 3 ? `${numberMatches.length} data points with units — highly citable` : 'Few data points with units — add specific numbers (e.g., "300+ users")',
    pass: numberMatches.length >= 3,
    severity: 'warning',
    category: 'semantic',
  });

  // 35. Key Phrase Prominence (important terms early in content)
  const first200Words = textContent.split(/\s+/).slice(0, 200).join(' ').toLowerCase();
  const titleWords = title.replace(/<[^>]+>/g, '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const prominentKeywords = titleWords.filter(w => first200Words.includes(w)).length;
  const prominenceRatio = titleWords.length > 0 ? Math.round((prominentKeywords / titleWords.length) * 100) : 0;
  checks.push({
    id: 'geo_keyword_prominence',
    label: prominenceRatio >= 60 ? `${prominenceRatio}% title keywords in first 200 words — good prominence` : `${prominenceRatio}% title keywords in first 200 words — front-load key terms`,
    pass: prominenceRatio >= 60,
    severity: 'warning',
    category: 'semantic',
  });

  // 36. Cross-Reference Patterns (internal contextual links)
  const contextualLinks = (html.match(/<a[^>]*href=["'][^"']*["'][^>]*>[^<]{5,50}<\/a>/gi) || []).length;
  checks.push({
    id: 'geo_cross_references',
    label: contextualLinks >= 5 ? `${contextualLinks} contextual links — good cross-referencing` : 'Few contextual links — interlink related content',
    pass: contextualLinks >= 5,
    severity: 'warning',
    category: 'semantic',
  });

  // 37. Content Categorization (clear topic signals)
  const hasCategories = /category|tag|topic|kategorie|thema|konu/i.test(html);
  const hasBreadcrumbNav = /breadcrumb|aria-label=["']breadcrumb/i.test(html);
  checks.push({
    id: 'geo_categorization',
    label: (hasCategories || hasBreadcrumbNav) ? 'Content categorization found — clear topic classification' : 'No categorization signals — add breadcrumbs or category labels',
    pass: hasCategories || hasBreadcrumbNav,
    severity: 'warning',
    category: 'semantic',
  });

  // 38. Subheadings per Section (topic depth indicator)
  const h2Sections = html.split(/<h2[^>]*>/gi);
  const sectionsWithH3 = h2Sections.slice(1).filter(s => /<h3[^>]*>/i.test(s)).length;
  checks.push({
    id: 'geo_subtopic_depth',
    label: sectionsWithH3 >= 2 ? `${sectionsWithH3} sections have subtopics (H3) — deep coverage` : 'Few sections have subtopics — add H3 subheadings for depth',
    pass: sectionsWithH3 >= 2,
    severity: 'warning',
    category: 'semantic',
  });

  // ==========================================
  // TECHNICAL GEO (8 checks)
  // ==========================================

  // 39. Mobile-friendly
  const hasViewport = /name=["']viewport["']/i.test(html);
  checks.push({
    id: 'geo_mobile',
    label: hasViewport ? 'Mobile-friendly (viewport set)' : 'Not mobile-friendly — Google AI Overview prefers mobile-ready pages',
    pass: hasViewport,
    category: 'technical',
  });

  // 40. HTTPS
  checks.push({
    id: 'geo_https',
    label: url.startsWith('https') ? 'HTTPS secure — trusted by AI systems' : 'No HTTPS — AI systems deprioritize insecure sites',
    pass: url.startsWith('https'),
    category: 'technical',
  });

  // 41. Page size reasonable
  const pageSize = html.length;
  checks.push({
    id: 'geo_page_size',
    label: pageSize < 500000 ? `Page size: ${(pageSize / 1024).toFixed(0)} KB — reasonable` : `Page size: ${(pageSize / 1024).toFixed(0)} KB — very large, may slow AI crawling`,
    pass: pageSize < 500000,
    severity: 'warning',
    category: 'technical',
  });

  // 42. Open Graph completeness
  const ogTitle = metaContent('og:title');
  const ogDesc = metaContent('og:description');
  const ogImage = metaContent('og:image');
  const ogComplete = !!(ogTitle && ogDesc && ogImage);
  checks.push({
    id: 'geo_og_complete',
    label: ogComplete ? 'Open Graph fully configured (title, description, image)' : 'Incomplete Open Graph tags — AI uses these for context',
    pass: ogComplete,
    severity: 'warning',
    category: 'technical',
  });

  // 43. Canonical URL
  const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
  checks.push({
    id: 'geo_canonical',
    label: hasCanonical ? 'Canonical URL set — prevents AI from citing duplicates' : 'No canonical URL — AI may index duplicate versions',
    pass: hasCanonical,
    severity: 'warning',
    category: 'technical',
  });

  // 44. Robots Accessibility
  const robotsMeta = metaContent('robots');
  const allowsAI = !robotsMeta.toLowerCase().includes('noindex') && !robotsMeta.toLowerCase().includes('nosnippet');
  checks.push({
    id: 'geo_robots_ai',
    label: allowsAI ? 'Page allows AI indexing (no noindex/nosnippet)' : 'Page restricts AI access — noindex or nosnippet detected',
    pass: allowsAI,
    severity: allowsAI ? undefined : 'error',
    category: 'technical',
  });

  // 45. Structured Data Completeness
  const jsonldBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const schemaTypes = [];
  for (const block of jsonldBlocks) {
    const content = block.replace(/<\/?script[^>]*>/gi, '');
    try {
      const parsed = JSON.parse(content);
      if (parsed['@type']) schemaTypes.push(parsed['@type']);
      if (Array.isArray(parsed['@graph'])) {
        parsed['@graph'].forEach(item => { if (item['@type']) schemaTypes.push(item['@type']); });
      }
    } catch {}
  }
  checks.push({
    id: 'geo_schema_richness',
    label: schemaTypes.length >= 3 ? `${schemaTypes.length} Schema types — rich structured data` : `Only ${schemaTypes.length} Schema type(s) — add more for AI context`,
    pass: schemaTypes.length >= 3,
    severity: 'warning',
    category: 'technical',
  });

  // 46. Language Consistency
  const htmlLang = html.match(/<html[^>]*lang=["']([^"']+)["']/i)?.[1] || '';
  const ogLocale = metaContent('og:locale');
  checks.push({
    id: 'geo_lang_consistency',
    label: htmlLang ? (ogLocale ? 'Language + OG locale set — clear language signal' : `HTML lang="${htmlLang}" set (add og:locale for completeness)`) : 'No HTML lang attribute — AI needs language context',
    pass: !!htmlLang,
    severity: 'warning',
    category: 'technical',
  });

  // Mark N/A checks for detected site type
  checks.forEach(c => {
    if (naCheckIds.includes(c.id)) {
      c.applicable = false;
    }
  });

  // E-Commerce Bonus Checks (2)
  if (detectedType === 'ecommerce') {
    // B1. Product Entity in Schema.org
    const hasProductEntity = /"@type"\s*:\s*"Product"/i.test(html) && /"@context"\s*:\s*"https?:\/\/schema\.org"/i.test(html);
    checks.push({
      id: 'ecom_product_entity',
      label: hasProductEntity ? 'Product Entity in Schema.org — AI can classify this content' : 'No Product Entity in Schema.org — add for AI classification',
      pass: hasProductEntity,
      category: 'ecommerce',
    });

    // B2. Brand Schema
    const hasBrandSchema = /"brand"\s*:\s*\{/i.test(html) || /itemprop=["']brand["']/i.test(html);
    checks.push({
      id: 'ecom_brand_schema',
      label: hasBrandSchema ? 'Brand information in Schema — helps AI identify products' : 'No brand in Schema — add brand info for AI product identification',
      pass: hasBrandSchema,
      severity: 'warning',
      category: 'ecommerce',
    });
  }

  // Adaptive scoring: only count applicable checks
  const applicableChecks = checks.filter(c => c.applicable !== false);
  const passed = applicableChecks.filter(c => c.pass).length;
  const score = Math.round((passed / applicableChecks.length) * 100);

  return { score, checks, passed, total: applicableChecks.length };
}
