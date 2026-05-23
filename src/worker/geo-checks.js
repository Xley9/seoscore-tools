/**
 * GEO Check Engine — 61 checks
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
  // Multilingual: EN, DE, TR, FR, ES
  const definitionPattern = /\bis a\b|\bare\b.*\bthat\b|\brefers to\b|\bmeans\b|\bdefined as\b|\bist ein\b|\bsind\b|\bbedeutet\b|ifade eder|anlam.na gelir|olarak tan.mlan|d[ıiuü]r\b|\best un\b|\best une\b|d[eé]signe|signifie|\bes un\b|\bes una\b|se refiere|significa/i;
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
  function decodeHtmlEntities(str) {
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n)).replace(/&nbsp;/g, ' ');
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') || '';
  const titleClean = decodeHtmlEntities(title).trim();
  const h1Clean = decodeHtmlEntities(h1).trim();
  const titleH1Match = titleClean && h1Clean && (titleClean.toLowerCase().includes(h1Clean.toLowerCase().substring(0, 20)) || h1Clean.toLowerCase().includes(titleClean.toLowerCase().substring(0, 20)));
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
  // Multilingual: EN, TR, DE, FR, ES
  const citationPatterns = /according to|source:|study|research|survey|report by|data from|based on|published in|g[oö]re|ara[sş]t[ıi]rma|kaynak|verileri|laut|studie|forschung|selon|[eé]tude|recherche|d'apr[eè]s|seg[uú]n|estudio|investigaci[oó]n|fuente/i;
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
  // Multilingual: EN, TR, DE, FR, ES
  const hasOriginalData = /our (data|research|study|analysis)|we (found|discovered|analyzed)|our (team|experts)|ekibimiz|uzmanlar[ıi]m[ıi]z|verilerimiz|analiz.*(ettik|g[oö]steriyor)|unsere (Daten|Forschung|Experten|Analyse)|wir haben|notre (équipe|analyse|recherche)|nos (experts|données)|nuestro equipo|nuestros (datos|expertos)/i.test(textContent);
  checks.push({
    id: 'geo_original',
    label: hasOriginalData ? 'Original research/data signals found' : 'No original data signals — "our research shows..." boosts AI citation',
    pass: hasOriginalData,
    severity: 'warning',
    category: 'authority',
  });

  // 14. Expert Quotes
  // Multilingual: EN, DE, TR, FR, ES
  const hasExpertQuotes = /<blockquote/i.test(html) || /"[^"]{20,200}"\s*[-—]\s*[A-Z]/m.test(textContent) || /says |states |explains |notes |sagt |erkl[aä]rt |diyor |a[cç][ıi]kl[ıi]yor |belirtiyor |dit |explique |d[eé]clare |dice |explica |se[nñ]ala /i.test(textContent);
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
  // Multilingual: EN, DE, TR, FR, ES
  const hasSummary = /summary|key takeaway|tl;?dr|fazit|zusammenfassung|[oö]zet|conclusion|in short|bottom line|sonu[cç]|k[ıi]saca|[oö]zetle|r[eé]sum[eé]|en r[eé]sum[eé]|en bref|resumen|en resumen/i.test(textContent);
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
  // Multilingual: EN, TR, DE, FR, ES
  const hasMultiPerspective = /on the other hand|however|alternatively|some (people|experts)|while others|in contrast|conversely|ancak|[oö]te yandan|bununla birlikte|di[gğ]er taraftan|buna kar[sş][ıi]n|andererseits|allerdings|jedoch|dennoch|cependant|en revanche|toutefois|n[eé]anmoins|sin embargo|por otro lado|no obstante|aunque/i.test(textContent);
  checks.push({
    id: 'geo_multi_perspective',
    label: hasMultiPerspective ? 'Multi-perspective content found — balanced analysis' : 'Single-perspective content — add "on the other hand..." for balance',
    pass: hasMultiPerspective,
    severity: 'warning',
    category: 'format',
  });

  // 29. Actionable Content
  // Multilingual: EN, TR, DE, FR, ES
  const hasActionable = /you (can|should|need to|must)|try |start by |make sure|don't forget|tip:|pro tip|best practice|yapabilirsiniz|yapmal[ıi]s[ıi]n[ıi]z|deneyin|unutmay[ıi]n|ipucu|dikkat edin|Sie (k[oö]nnen|sollten)|versuchen Sie|vergessen Sie nicht|tipp:|vous pouvez|essayez|n'oubliez pas|conseil|astuce|puede|intente|no olvide|consejo/i.test(textContent);
  checks.push({
    id: 'geo_actionable',
    label: hasActionable ? 'Actionable advice found — AI prefers practical content' : 'No actionable content — add "you should...", "try...", tips',
    pass: hasActionable,
    severity: 'warning',
    category: 'format',
  });

  // 30. Conclusion/Recommendation
  // Multilingual: EN, DE, TR, FR, ES
  const hasConclusion = /recommend|our pick|best choice|winner|verdict|conclusion|final thoughts|empfehlung|fazit|sonu[cç]|tavsiye|[oö]nerimiz|recommandation|notre choix|recomendaci[oó]n|nuestra elecci[oó]n|veredicto/i.test(textContent);
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
  // Multilingual units: EN + TR + DE + FR + ES
  const numberMatches = textContent.match(/\d+[\.,]?\d*\s*(%|px|ms|MB|GB|KB|users|sites|checks|seconds|minutes|countries|y[ıi]l|[uü]lke|m[uü][sş]teri|[uü]r[uü]n|ki[sş]i|dil|adet|saat|Jahre|Nutzer|L[aä]nder|ans|utilisateurs|pays|a[nñ]os|usuarios|pa[ií]ses)/gi) || [];
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
      if (Array.isArray(parsed)) {
        parsed.forEach(p => { if (p['@type']) schemaTypes.push(p['@type']); });
      } else {
        if (parsed['@type']) schemaTypes.push(parsed['@type']);
        if (Array.isArray(parsed['@graph'])) {
          parsed['@graph'].forEach(item => { if (item['@type']) schemaTypes.push(item['@type']); });
        }
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

  // ==========================================
  // EXTENDED GEO CHECKS (3 checks)
  // ==========================================

  // 47. ARIA Landmarks
  const ariaLandmarks = [
    /<main[^>]*>/i.test(html),
    /<nav[^>]*>/i.test(html),
    /<footer[^>]*>/i.test(html),
    /role=["'](main|navigation|banner|contentinfo|complementary|search)["']/i.test(html),
  ];
  const landmarkCount = ariaLandmarks.filter(Boolean).length;
  checks.push({
    id: 'geo_aria_landmarks',
    label: landmarkCount >= 2 ? `${landmarkCount} ARIA landmarks found — good accessibility for AI` : 'Few ARIA landmarks — add <main>, <nav>, <footer> or role attributes',
    pass: landmarkCount >= 2,
    severity: 'warning',
    category: 'technical',
  });

  // 48. Image ALT Text Quality (not just "image" or too short)
  const allImages = (html.match(/<img[^>]*>/gi) || []).filter(img => !/src=["']\s*['+]/.test(img));
  const imagesWithBadAlt = allImages.filter(img => {
    const altMatch = img.match(/alt=["']([^"']*)["']/i);
    if (!altMatch) return false; // no alt = handled by img_alt check
    const alt = altMatch[1].trim();
    return alt.length > 0 && (alt.length <= 5 || /^(image|photo|picture|img|pic|foto|bild|resim)$/i.test(alt));
  });
  if (allImages.length > 0) {
    checks.push({
      id: 'geo_img_alt_quality',
      label: imagesWithBadAlt.length === 0
        ? 'All image ALT texts are descriptive (>5 chars)'
        : `${imagesWithBadAlt.length} image(s) with generic/short ALT text — use descriptive text`,
      pass: imagesWithBadAlt.length === 0,
      severity: 'warning',
      category: 'format',
    });
  }

  // 49. Content Length for AI Depth (min 300 words)
  checks.push({
    id: 'geo_content_length',
    label: wordCount >= 300 ? `${wordCount} words — sufficient depth for AI analysis` : `Only ${wordCount} words — AI systems prefer content with 300+ words for comprehensive analysis`,
    pass: wordCount >= 300,
    severity: 'warning',
    category: 'overview',
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

  // ══════════════════════════════════════════
  // RESEARCH-BASED GEO CHECKS (4)
  // Based on Princeton/Georgia Tech GEO Paper + Google AI Overview Factors
  // ══════════════════════════════════════════

  // 50. First 200 Words — must contain primary keyword (AI extracts from start)
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/si);
  const h1Text = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').toLowerCase().trim() : '';
  const intro200Words = paragraphTexts.slice(0, 10).join(' ').split(/\s+/).slice(0, 200).join(' ').toLowerCase();
  const h1Words = h1Text.split(/\s+/).filter(w => w.length > 3);
  let h1In200 = 0;
  for (const w of h1Words) {
    if (intro200Words.includes(w)) h1In200++;
  }
  const kwRatio = h1Words.length > 0 ? h1In200 / h1Words.length : 0;
  const hasDef200 = /(is a|refers to|means|defined as|bezeichnet|bedeutet|представляет|является|es un)/i.test(intro200Words);
  const first200Ok = kwRatio >= 0.6 || hasDef200;
  checks.push({
    id: 'geo_first_200_words',
    label: first200Ok
      ? 'First 200 words contain topic keywords — AI extracts primarily from the start'
      : 'First 200 words lack topic keywords — AI may skip your content for extraction',
    pass: first200Ok,
    severity: 'warning',
    category: 'overview',
  });

  // 51. Featured snippet format — definition + structured list combo
  // Multilingual: EN, DE, TR, FR, ES (same as geo_definitions)
  const hasDefinition = /\bis a\b|\bare\b.*\bthat\b|\brefers to\b|\bdefined as\b|\bist ein\b|ifade eder|anlam.na gelir|d[ıiuü]r\b|\best un\b|\best une\b|\bes un\b|\bes una\b/i.test(textContent);
  const hasStructuredList = /<(ol|ul)[^>]*>/i.test(html);
  checks.push({
    id: 'geo_featured_snippet',
    label: (hasDefinition && hasStructuredList) ? 'Definition + list combo — strong featured snippet candidate' : 'Missing definition or list format — combine "X is..." with lists for snippets',
    pass: hasDefinition && hasStructuredList,
    severity: 'warning',
    category: 'overview',
  });

  // 52. Statistics Density — 5+ quantitative data points (Princeton: +30-40% visibility)
  // Multilingual units: EN + TR + DE + FR + ES
  const statsMatches = textContent.match(/\d+[\.,]?\d*\s*(%|\$|€|£|₺|users|visitors|customers|checks|sites|downloads|countries|million|billion|percent|m[uü][sş]teri|ziyaret[cç]i|[uü]r[uü]n|[uü]lke|milyon|milyar|ki[sş]i|y[ıi]l|adet|Kunden|Besucher|Millionen|clients|visiteurs|millions|clientes|visitantes|millones)/gi) || [];
  const statCount = Math.min(statsMatches.length, 50);
  checks.push({
    id: 'geo_statistics_density',
    label: statCount >= 5
      ? `${statCount} data points found — statistics boost AI visibility by 30-40%`
      : `Only ${statCount} data points — add 5+ statistics for +30-40% AI visibility (Princeton study)`,
    pass: statCount >= 5,
    severity: 'warning',
    category: 'authority',
  });

  // 53. Author Credentials — named author with bio/credentials (anonymous = GEO penalty)
  const authorSchemaMatch = html.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i);
  const authorMetaMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)/i);
  const authorName = authorSchemaMatch?.[1] || authorMetaMatch?.[1] || '';
  const hasNamedAuthor = authorName.length > 2 && !/^(admin|administrator|editor|author|team|staff|content)$/i.test(authorName);
  // Check for credential signals in author schema or nearby content
  const credentialWords = /(experience|expert|specialist|certified|years|professional|founder|CEO|CTO|Ph\.?D|manager|director|consultant|analyst)/i;
  const authorSchemaBlock = html.match(/"author"\s*:\s*\{[^}]*\}/i)?.[0] || '';
  const hasCredentials = hasNamedAuthor && credentialWords.test(authorSchemaBlock + ' ' + textContent.substring(0, 500));
  checks.push({
    id: 'geo_author_credentials',
    label: hasCredentials
      ? `Author "${authorName}" has credentials — strong E-E-A-T signal`
      : 'Author lacks credentials — anonymous content is a GEO penalty',
    pass: hasCredentials,
    severity: 'warning',
    category: 'authority',
  });

  // ══════════════════════════════════════════
  // AI VISIBILITY OPTIMIZATION (5)
  // Unique checks no other scanner has
  // ══════════════════════════════════════════

  // 54. AI Snippet Control (max-image-preview / max-snippet restrictions)
  const robotsLower = metaContent('robots').toLowerCase();
  const restrictedSnippet = /max-snippet:\s*\d/i.test(robotsLower) && !/max-snippet:\s*-1/i.test(robotsLower);
  const restrictedImage = /max-image-preview:\s*(none|standard)/i.test(robotsLower);
  const hasLargePreview = /max-image-preview:\s*large/i.test(robotsLower);
  checks.push({
    id: 'geo_snippet_control',
    label: restrictedSnippet || restrictedImage
      ? 'AI snippet/image restricted — may reduce AI Overview visibility'
      : hasLargePreview
        ? 'max-image-preview:large — optimal AI rich result display'
        : 'No snippet restrictions — AI can freely extract content (good)',
    pass: !restrictedSnippet && !restrictedImage,
    severity: restrictedSnippet || restrictedImage ? 'warning' : undefined,
    category: 'technical',
  });

  // 55. Citation Markup Quality (<blockquote> with cite attribute)
  const bqTags = html.match(/<blockquote[^>]*>/gi) || [];
  const citedBqs = bqTags.filter(bq => /cite=/i.test(bq));
  if (bqTags.length > 0) {
    checks.push({
      id: 'geo_citation_markup',
      label: citedBqs.length >= bqTags.length
        ? `All ${bqTags.length} blockquotes have cite attribute — proper attribution for AI`
        : `${bqTags.length - citedBqs.length} blockquote(s) missing cite attribute — add source URLs for AI trust`,
      pass: citedBqs.length >= Math.ceil(bqTags.length * 0.5),
      severity: 'warning',
      category: 'authority',
    });
  }

  // 56. Content Comprehensiveness (5W1H coverage in headings)
  const allHeadingText2 = (html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi) || [])
    .map(h => h.replace(/<[^>]+>/g, '').toLowerCase()).join(' ');
  // Multilingual 5W1H: EN, DE, TR, FR, ES
  const fiveW1H = [
    /what|was\b|ne\b|quel|qu['']est|qué|cuál/i.test(allHeadingText2),
    /why|warum|neden|ni[cç]in|pourquoi|por qu[eé]/i.test(allHeadingText2),
    /how|wie\b|nas[ıi]l|comment|c[oó]mo/i.test(allHeadingText2),
    /when|wann|ne zaman|quand|cu[aá]ndo/i.test(allHeadingText2),
    /where|wo\b|nerede|o[uù]|d[oó]nde/i.test(allHeadingText2),
    /who|wer\b|kim\b|qui\b|qui[eé]n/i.test(allHeadingText2),
  ];
  const w1hCount = fiveW1H.filter(Boolean).length;
  checks.push({
    id: 'geo_comprehensiveness',
    label: w1hCount >= 3 ? `${w1hCount}/6 question types (5W1H) in headings — comprehensive` : `Only ${w1hCount}/6 question types — add What, Why, How headings`,
    pass: w1hCount >= 3,
    severity: 'warning',
    category: 'overview',
  });

  // 57. Anchor Text Quality (not generic "click here")
  const anchorTexts = (html.match(/<a[^>]*>[^<]{2,60}<\/a>/gi) || [])
    .map(a => a.replace(/<[^>]+>/g, '').trim().toLowerCase())
    .filter(t => t.length > 1);
  // Multilingual: EN, DE, TR, FR, ES
  const genericAnchors = anchorTexts.filter(t => /^(click here|here|read more|more|link|this|learn more|hier klicken|hier|mehr|weiterlesen|buraya t[ıi]klay[ıi]n|devam[ıi] oku|daha fazla|cliquez ici|en savoir plus|lire la suite|haga clic|leer m[aá]s|m[aá]s)$/i.test(t));
  if (anchorTexts.length > 3) {
    checks.push({
      id: 'geo_anchor_quality',
      label: genericAnchors.length <= 2 ? 'Link anchor texts are descriptive — good AI context signal' : `${genericAnchors.length} generic anchor texts ("click here") — use descriptive link text for AI`,
      pass: genericAnchors.length <= 2,
      severity: 'warning',
      category: 'semantic',
    });
  }

  // 58. Image Captions (<figure> + <figcaption>)
  const figcaptionCount = (html.match(/<figcaption[^>]*>/gi) || []).length;
  if (allImages.length > 0) {
    checks.push({
      id: 'geo_image_captions',
      label: figcaptionCount > 0
        ? `${figcaptionCount} image caption(s) found — helps AI understand visual content`
        : 'No <figure>/<figcaption> — wrap images with descriptive captions for AI',
      pass: figcaptionCount > 0,
      severity: 'warning',
      category: 'format',
    });
  }

  // 59. Knowledge Graph Alignment (sameAs with authoritative URIs)
  const ldJsonBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  let kgSameAs = [];
  for (const block of ldJsonBlocks) {
    const content = block.replace(/<\/?script[^>]*>/gi, '');
    try {
      const data = JSON.parse(content);
      const extractSameAs = (item) => {
        if (item.sameAs) {
          const urls = Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs];
          kgSameAs.push(...urls);
        }
      };
      if (Array.isArray(data)) data.forEach(extractSameAs);
      else { extractSameAs(data); if (Array.isArray(data['@graph'])) data['@graph'].forEach(extractSameAs); }
    } catch {}
  }
  const kgDomains = /wikipedia\.org|wikidata\.org|crunchbase\.com|linkedin\.com|twitter\.com|x\.com|github\.com|youtube\.com/i;
  const kgAuthoritative = kgSameAs.filter(u => kgDomains.test(u));
  checks.push({
    id: 'geo_knowledge_graph',
    label: kgAuthoritative.length >= 2
      ? `${kgAuthoritative.length} authoritative sameAs links (Wikipedia, LinkedIn, etc.) — strong Knowledge Graph signal`
      : kgAuthoritative.length === 1
        ? `Only 1 authoritative sameAs link — add Wikipedia, LinkedIn, or Wikidata for Knowledge Graph`
        : 'No authoritative sameAs links — add Wikipedia/Wikidata/LinkedIn URIs to schema for Knowledge Graph alignment',
    pass: kgAuthoritative.length >= 2,
    severity: 'warning',
    category: 'authority',
  });

  // Adaptive scoring: only count applicable checks
  const applicableChecks = checks.filter(c => c.applicable !== false);
  const passed = applicableChecks.filter(c => c.pass).length;
  const score = applicableChecks.length > 0 ? Math.round((passed / applicableChecks.length) * 100) : 0;

  return { score, checks, passed, total: applicableChecks.length };
}
