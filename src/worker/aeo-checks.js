/**
 * AEO Check Engine — 40 checks
 * Answer Engine Optimization
 * Evaluates AI-readiness for ChatGPT, Perplexity, Claude, Gemini
 */

import { NA_CHECKS } from './site-detector.js';

export function runAeoChecks(pageData) {
  const { html, url, siteType } = pageData;
  const detectedType = siteType?.siteType || 'default';
  const naCheckIds = NA_CHECKS[detectedType]?.aeo || [];
  const checks = [];

  function metaContent(name) {
    const tagRe = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*>`, 'i');
    const tag = (html.match(tagRe) || [''])[0];
    if (!tag) return '';
    const cm = tag.match(/content="([^"]*)"/i) || tag.match(/content='([^']*)'/i);
    return cm ? cm[1] : '';
  }

  // Extract text content (no scripts/styles)
  const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const wordCount = textContent.split(/\s+/).length;

  // Extract all headings text
  const headingText = (html.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi) || []).join(' ');
  const headingTextClean = headingText.replace(/<[^>]+>/g, '');

  // Extract paragraphs
  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const paragraphTexts = paragraphs.map(p => p.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 10);

  // Extract sentences
  const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 5);

  // ==========================================
  // AI DISCOVERABILITY (10 checks)
  // ==========================================

  // 1. Structured Data exists
  const hasJsonLd = /<script[^>]*type=["']application\/ld\+json["']/i.test(html);
  checks.push({
    id: 'aeo_structured_data',
    label: hasJsonLd ? 'Structured data found — AI can understand your content' : 'No structured data — AI systems struggle to categorize your page',
    pass: hasJsonLd,
    category: 'discoverability',
  });

  // 2. Content in HTML (not JS-only)
  const scriptTags = (html.match(/<script/gi) || []).length;
  checks.push({
    id: 'aeo_html_content',
    label: wordCount > 100 ? `${wordCount} words in HTML — good content for AI parsing` : 'Very little HTML content — AI crawlers may not find useful text',
    pass: wordCount > 100,
    category: 'discoverability',
  });

  // 3. Clean URL structure
  const urlPath = new URL(url).pathname;
  const hasCleanUrl = /^[\w\-\/\.]+$/.test(urlPath);
  checks.push({
    id: 'aeo_clean_url',
    label: hasCleanUrl ? 'Clean URL structure' : 'URL contains special characters or parameters',
    pass: hasCleanUrl,
    severity: 'warning',
    category: 'discoverability',
  });

  // 4. Semantic HTML5
  const semanticTags = ['<article', '<section', '<main', '<nav', '<aside', '<header', '<footer'];
  const semanticCount = semanticTags.filter(tag => html.toLowerCase().includes(tag)).length;
  checks.push({
    id: 'aeo_semantic_html',
    label: semanticCount >= 3 ? `${semanticCount} semantic HTML5 elements found` : `Only ${semanticCount} semantic elements — add <article>, <section>, <main>`,
    pass: semanticCount >= 3,
    severity: 'warning',
    category: 'discoverability',
  });

  // 5. Content Segmentation (sections/articles)
  const sectionCount = (html.match(/<(section|article)[^>]*>/gi) || []).length;
  checks.push({
    id: 'aeo_segmentation',
    label: sectionCount >= 3 ? `${sectionCount} content sections — well-structured for AI` : `Only ${sectionCount} content sections — segment your content better`,
    pass: sectionCount >= 3,
    severity: 'warning',
    category: 'discoverability',
  });

  // 6. Meta Topic Signals (description + OG align)
  const desc = metaContent('description');
  const ogDesc = metaContent('og:description');
  const hasTopicAlignment = desc && ogDesc;
  checks.push({
    id: 'aeo_topic_signals',
    label: hasTopicAlignment ? 'Description + OG description both present — clear topic signals' : 'Missing meta description or og:description — unclear topic for AI',
    pass: !!hasTopicAlignment,
    severity: 'warning',
    category: 'discoverability',
  });

  // 7. Named Entities (brand names, places, people, technologies)
  const entityPatterns = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+|Google|Microsoft|Apple|Amazon|OpenAI|ChatGPT|Cloudflare|WordPress|Shopify/g;
  const entities = (textContent.match(entityPatterns) || []);
  const uniqueEntities = [...new Set(entities)].length;
  checks.push({
    id: 'aeo_named_entities',
    label: uniqueEntities >= 3 ? `${uniqueEntities} named entities found — helps AI understand context` : 'Few named entities — mention brands, tools, or standards for AI context',
    pass: uniqueEntities >= 3,
    severity: 'warning',
    category: 'discoverability',
  });

  // 8. Internal Linking Signals
  const parsedUrl = new URL(url);
  const internalLinks = (html.match(/<a[^>]*href=["']([^"'#]*)["']/gi) || [])
    .filter(link => {
      const href = link.match(/href=["']([^"'#]*)["']/i)?.[1] || '';
      try { return new URL(href, url).hostname === parsedUrl.hostname; } catch { return false; }
    }).length;
  checks.push({
    id: 'aeo_internal_links',
    label: internalLinks >= 3 ? `${internalLinks} internal links — good topic cluster signal` : 'Few internal links — AI values interconnected content',
    pass: internalLinks >= 3,
    severity: 'warning',
    category: 'discoverability',
  });

  // 9. Definition Lists
  const dlCount = (html.match(/<dl[^>]*>/gi) || []).length;
  const dtCount = (html.match(/<dt[^>]*>/gi) || []).length;
  checks.push({
    id: 'aeo_definition_lists',
    label: (dlCount > 0 || dtCount > 0) ? `Definition list found (${dtCount} terms) — ideal for AI extraction` : 'No definition lists (<dl>) — great for term/value pairs',
    pass: dlCount > 0 || dtCount > 0,
    severity: 'warning',
    category: 'discoverability',
  });

  // 10. Code Blocks
  const codeBlocks = (html.match(/<(code|pre)[^>]*>/gi) || []).length;
  checks.push({
    id: 'aeo_code_blocks',
    label: codeBlocks > 0 ? `${codeBlocks} code/pre blocks found — technical content AI can cite` : 'No code blocks — add <code>/<pre> for technical content',
    pass: codeBlocks > 0,
    severity: 'warning',
    category: 'discoverability',
  });

  // ==========================================
  // CONTENT STRUCTURE (10 checks)
  // ==========================================

  // 11. FAQ content
  const hasFaqHtml = /<(details|summary)|class=["'][^"']*faq/i.test(html);
  const hasFaqSchema = /FAQPage/i.test(html);
  const hasFaqContent = hasFaqHtml || hasFaqSchema;
  checks.push({
    id: 'aeo_faq',
    label: hasFaqContent ? 'FAQ content detected — great for AI answers' : 'No FAQ section found — add Q&A content for AI citation',
    pass: hasFaqContent,
    category: 'structure',
  });

  // 12. Question-in-Heading pattern
  const hasQuestionHeadings = /\?|how |what |why |when |where |who |which |nasıl|nedir|neden|hangi|can |does |is |are |should /i.test(headingTextClean);
  checks.push({
    id: 'aeo_question_headings',
    label: hasQuestionHeadings ? 'Question-style headings found — ideal for AI snippets' : 'No question-style headings — try "How to...", "What is..."',
    pass: hasQuestionHeadings,
    severity: 'warning',
    category: 'structure',
  });

  // 13. Lists (ordered/unordered)
  const listCount = (html.match(/<(ol|ul)[^>]*>/gi) || []).length;
  checks.push({
    id: 'aeo_lists',
    label: listCount >= 2 ? `${listCount} lists found — structured content for AI` : 'Few or no lists — add bullet/numbered lists for better AI parsing',
    pass: listCount >= 2,
    severity: 'warning',
    category: 'structure',
  });

  // 14. Tables
  const tableCount = (html.match(/<table[^>]*>/gi) || []).length;
  checks.push({
    id: 'aeo_tables',
    label: tableCount > 0 ? `${tableCount} data table(s) found` : 'No data tables — tables help AI compare and cite data',
    pass: tableCount > 0,
    severity: 'warning',
    category: 'structure',
  });

  // 15. Direct answer paragraphs (first paragraph after H2/H3 is concise)
  const directAnswerPattern = /<h[2-3][^>]*>[^<]*<\/h[2-3]>\s*<p[^>]*>(.{40,200})<\/p>/i;
  const hasDirectAnswers = directAnswerPattern.test(html);
  checks.push({
    id: 'aeo_direct_answers',
    label: hasDirectAnswers ? 'Concise answer paragraphs after headings — great for AI citation' : 'No concise answer paragraphs detected — add short summaries after headings',
    pass: hasDirectAnswers,
    severity: 'warning',
    category: 'structure',
  });

  // 16. Numbered Steps
  const hasNumberedSteps = /step\s*\d|step\s*[one|two|three|four|five]|schritt\s*\d|adım\s*\d|\d+\.\s+[A-Z]/i.test(textContent);
  const hasOrderedList = /<ol[^>]*>/i.test(html);
  checks.push({
    id: 'aeo_numbered_steps',
    label: (hasNumberedSteps || hasOrderedList) ? 'Step-by-step content detected — AI loves procedural answers' : 'No numbered steps or ordered lists — add for "how to" AI answers',
    pass: hasNumberedSteps || hasOrderedList,
    severity: 'warning',
    category: 'structure',
  });

  // 17. Short Sentences Ratio
  const shortSentences = sentences.filter(s => s.split(/\s+/).length <= 20).length;
  const shortRatio = sentences.length > 0 ? (shortSentences / sentences.length * 100).toFixed(0) : 0;
  checks.push({
    id: 'aeo_short_sentences',
    label: shortRatio >= 50 ? `${shortRatio}% short sentences — easy for AI to extract` : `${shortRatio}% short sentences — shorten sentences for better AI parsing`,
    pass: shortRatio >= 50,
    severity: 'warning',
    category: 'structure',
  });

  // 18. Concise Paragraphs Ratio (under 100 words each)
  const conciseParagraphs = paragraphTexts.filter(p => p.split(/\s+/).length <= 100).length;
  const conciseRatio = paragraphTexts.length > 0 ? (conciseParagraphs / paragraphTexts.length * 100).toFixed(0) : 100;
  checks.push({
    id: 'aeo_concise_paragraphs',
    label: conciseRatio >= 80 ? `${conciseRatio}% concise paragraphs — scannable for AI` : `${conciseRatio}% concise paragraphs — break up long paragraphs`,
    pass: conciseRatio >= 80,
    severity: 'warning',
    category: 'structure',
  });

  // 19. Key-Value Patterns (strong/bold labels followed by content)
  const keyValuePatterns = (html.match(/<(strong|b)>[^<]+<\/(strong|b)>\s*[:\-—]\s*/gi) || []).length;
  checks.push({
    id: 'aeo_key_value',
    label: keyValuePatterns >= 2 ? `${keyValuePatterns} key-value patterns found — structured data AI can parse` : 'Few key-value patterns — use "**Label:** value" format for AI',
    pass: keyValuePatterns >= 2,
    severity: 'warning',
    category: 'structure',
  });

  // 20. Content Length per Section
  const h2Sections = html.split(/<h2[^>]*>/gi);
  const sectionLengths = h2Sections.slice(1).map(s => {
    const sectionText = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return sectionText.split(/\s+/).length;
  });
  const avgSectionLength = sectionLengths.length > 0 ? Math.round(sectionLengths.reduce((a, b) => a + b, 0) / sectionLengths.length) : 0;
  checks.push({
    id: 'aeo_section_depth',
    label: avgSectionLength >= 50 ? `Avg ${avgSectionLength} words/section — sufficient depth` : `Avg ${avgSectionLength} words/section — expand sections for AI comprehension`,
    pass: avgSectionLength >= 50,
    severity: 'warning',
    category: 'structure',
  });

  // ==========================================
  // CITATION READINESS (10 checks)
  // ==========================================

  // 21. Author information
  const hasAuthor = /author|verfasser|yazar/i.test(html) && /<(span|div|a|p|meta)[^>]*>(.*?)(author|by\s|von\s|yazar)/i.test(html);
  const hasAuthorSchema = /"author"/i.test(html);
  checks.push({
    id: 'aeo_author',
    label: (hasAuthor || hasAuthorSchema) ? 'Author information found — builds E-E-A-T' : 'No author information — AI values attributed content',
    pass: hasAuthor || hasAuthorSchema,
    severity: 'warning',
    category: 'citation',
  });

  // 22. Publication date
  const hasDate = /"datePublished"|"dateModified"|datetime=|class=["'][^"']*date/i.test(html);
  checks.push({
    id: 'aeo_date',
    label: hasDate ? 'Publication/modification date found' : 'No date information — AI prefers fresh, dated content',
    pass: hasDate,
    severity: 'warning',
    category: 'citation',
  });

  // 23. Statistics/numbers in content
  const statsPattern = /\d+%|\$[\d,]+|\d+\.\d+|\d{4,}|\d+\s*(million|billion|users|customers|percent|countries|checks)/i;
  const hasStats = statsPattern.test(textContent);
  checks.push({
    id: 'aeo_statistics',
    label: hasStats ? 'Statistics and data found in content — highly citable' : 'No statistics or data — add numbers and facts for AI citation',
    pass: hasStats,
    severity: 'warning',
    category: 'citation',
  });

  // 24. Organization/brand identity
  const hasOrgSchema = /"Organization"|"LocalBusiness"|"Corporation"/i.test(html);
  checks.push({
    id: 'aeo_org_schema',
    label: hasOrgSchema ? 'Organization schema found — AI can identify your brand' : 'No Organization schema — AI may not recognize your brand',
    pass: hasOrgSchema,
    category: 'citation',
  });

  // 25. E-E-A-T signals
  const eeatSignals = [
    /about[\s-]us|uber[\s-]uns|hakkimizda/i.test(html),
    /privacy|datenschutz|gizlilik/i.test(html),
    /contact|kontakt|iletisim/i.test(html),
    hasAuthorSchema,
    hasOrgSchema,
  ];
  const eeatScore = eeatSignals.filter(Boolean).length;
  checks.push({
    id: 'aeo_eeat',
    label: eeatScore >= 3 ? `${eeatScore}/5 E-E-A-T signals present` : `Only ${eeatScore}/5 E-E-A-T signals — add about, contact, author info`,
    pass: eeatScore >= 3,
    severity: 'warning',
    category: 'citation',
  });

  // 26. Source Citations
  const citationPatterns = /according to|source:|study|research shows|survey|report by|data from|based on/i;
  const hasCitations = citationPatterns.test(textContent);
  checks.push({
    id: 'aeo_citations',
    label: hasCitations ? 'Source citations found — increases AI trust' : 'No source citations — reference studies and data for authority',
    pass: hasCitations,
    severity: 'warning',
    category: 'citation',
  });

  // 27. External Authority Links
  const externalLinks = (html.match(/<a[^>]*href=["'](https?:\/\/[^"']*)["']/gi) || [])
    .filter(link => {
      const href = link.match(/href=["'](https?:\/\/[^"']*)["']/i)?.[1] || '';
      try { return new URL(href).hostname !== parsedUrl.hostname; } catch { return false; }
    }).length;
  checks.push({
    id: 'aeo_authority_links',
    label: externalLinks >= 2 ? `${externalLinks} external links — references authoritative sources` : 'Few external links — cite authoritative sources for AI trust',
    pass: externalLinks >= 2,
    severity: 'warning',
    category: 'citation',
  });

  // 28. Content Freshness
  const currentYear = new Date().getFullYear();
  const hasCurrentYear = textContent.includes(currentYear.toString()) || textContent.includes((currentYear - 1).toString());
  checks.push({
    id: 'aeo_freshness',
    label: hasCurrentYear ? `Content references ${currentYear}/${currentYear - 1} — fresh content` : 'No recent year mentioned — AI prefers up-to-date content',
    pass: hasCurrentYear,
    severity: 'warning',
    category: 'citation',
  });

  // 29. Topic Focus Score (title keywords in content)
  const titleText = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, '');
  const titleWords = titleText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const titleWordsInContent = titleWords.filter(w => textContent.toLowerCase().includes(w)).length;
  const topicScore = titleWords.length > 0 ? Math.round((titleWordsInContent / titleWords.length) * 100) : 0;
  checks.push({
    id: 'aeo_topic_focus',
    label: topicScore >= 70 ? `Topic focus: ${topicScore}% — title keywords found in content` : `Topic focus: ${topicScore}% — content doesn't match title keywords well`,
    pass: topicScore >= 70,
    severity: 'warning',
    category: 'citation',
  });

  // 30. Answer Box Format (bold + paragraph pattern)
  const answerBoxPattern = /<(strong|b)>[^<]{10,80}<\/(strong|b)>[\s\S]{0,20}<p[^>]*>/i;
  const hasAnswerBox = answerBoxPattern.test(html) || paragraphTexts.some(p => p.length >= 40 && p.length <= 200);
  checks.push({
    id: 'aeo_answer_box',
    label: hasAnswerBox ? 'Answer-box-ready content found (40-200 char answers)' : 'No concise answer-ready paragraphs — add 1-2 sentence answers',
    pass: hasAnswerBox,
    severity: 'warning',
    category: 'citation',
  });

  // ==========================================
  // VOICE / CONVERSATIONAL (10 checks)
  // ==========================================

  // 31. Speakable Schema
  const hasSpeakable = /Speakable|speakable/i.test(html);
  checks.push({
    id: 'aeo_speakable',
    label: hasSpeakable ? 'Speakable schema found — voice search ready' : 'No Speakable schema — add for voice assistant optimization',
    pass: hasSpeakable,
    category: 'voice',
  });

  // 32. Conversational content tone
  const conversationalWords = /\byou\b|\byour\b|\bwe\b|\bour\b|\blet's\b|\bhere's\b|\byou'll\b|\bit's easy\b|\bsimply\b|\bjust\b/gi;
  const conversationalMatches = (textContent.match(conversationalWords) || []).length;
  checks.push({
    id: 'aeo_conversational',
    label: conversationalMatches >= 5 ? `${conversationalMatches} conversational words — good for AI summaries` : 'Formal tone — use more "you", "your", "we" for AI readability',
    pass: conversationalMatches >= 5,
    severity: 'warning',
    category: 'voice',
  });

  // 33. Concise first paragraph (snippet-ready)
  const firstParagraph = html.match(/<p[^>]*>(.{1,500}?)<\/p>/i);
  const firstParaWords = firstParagraph ? firstParagraph[1].replace(/<[^>]+>/g, '').split(/\s+/).length : 0;
  checks.push({
    id: 'aeo_snippet_ready',
    label: firstParaWords >= 20 && firstParaWords <= 60 ? 'First paragraph is snippet-ready (20-60 words)' : firstParaWords < 20 ? 'First paragraph too short for AI snippets' : 'First paragraph too long — aim for 20-60 words for AI citations',
    pass: firstParaWords >= 20 && firstParaWords <= 60,
    severity: 'warning',
    category: 'voice',
  });

  // 34. WebSite + SearchAction schema
  const hasSearchAction = /SearchAction/i.test(html);
  checks.push({
    id: 'aeo_search_action',
    label: hasSearchAction ? 'SearchAction schema found — sitelinks search box enabled' : 'No SearchAction schema — add for enhanced search presence',
    pass: hasSearchAction,
    severity: 'warning',
    category: 'voice',
  });

  // 35. Reading Level (average words per sentence)
  const avgWordsPerSentence = sentences.length > 0 ? Math.round(sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length) : 0;
  checks.push({
    id: 'aeo_reading_level',
    label: avgWordsPerSentence > 0 && avgWordsPerSentence <= 20 ? `Avg ${avgWordsPerSentence} words/sentence — easy reading level` : avgWordsPerSentence > 20 ? `Avg ${avgWordsPerSentence} words/sentence — simplify for AI and voice` : 'Could not determine reading level',
    pass: avgWordsPerSentence > 0 && avgWordsPerSentence <= 20,
    severity: 'warning',
    category: 'voice',
  });

  // 36. Active Voice (heuristic: few passive patterns)
  const passivePatterns = /\b(is|are|was|were|been|be|being)\s+(being\s+)?\w+ed\b/gi;
  const passiveCount = (textContent.match(passivePatterns) || []).length;
  const passiveRatio = sentences.length > 0 ? (passiveCount / sentences.length * 100).toFixed(0) : 0;
  checks.push({
    id: 'aeo_active_voice',
    label: passiveRatio <= 20 ? `Active voice dominant (${passiveRatio}% passive) — AI-friendly` : `${passiveRatio}% passive voice — use more active voice for AI clarity`,
    pass: passiveRatio <= 20,
    severity: 'warning',
    category: 'voice',
  });

  // 37. Pronoun Density (you/your per 100 words)
  const pronounMatches = (textContent.match(/\b(you|your|you're|yours)\b/gi) || []).length;
  const pronounPer100 = wordCount > 0 ? (pronounMatches / wordCount * 100).toFixed(1) : 0;
  checks.push({
    id: 'aeo_pronoun_density',
    label: pronounPer100 >= 1 ? `Pronoun density: ${pronounPer100}% — engaging, user-focused` : `Pronoun density: ${pronounPer100}% — add more "you/your" for engagement`,
    pass: pronounPer100 >= 1,
    severity: 'warning',
    category: 'voice',
  });

  // 38. Summary Paragraphs (TL;DR, summary, key takeaways)
  const hasSummary = /summary|key takeaway|tl;?dr|fazit|zusammenfassung|özet|conclusion|in short|bottom line/i.test(textContent);
  checks.push({
    id: 'aeo_summary',
    label: hasSummary ? 'Summary/conclusion section found — AI can extract key points' : 'No summary section — add Key Takeaways for AI extraction',
    pass: hasSummary,
    severity: 'warning',
    category: 'voice',
  });

  // 39. Heading Keyword Density (headings use relevant terms)
  const h2h3Count = (html.match(/<h[2-3][^>]*>/gi) || []).length;
  checks.push({
    id: 'aeo_heading_density',
    label: h2h3Count >= 4 ? `${h2h3Count} H2/H3 headings — good content structure for AI` : `Only ${h2h3Count} H2/H3 headings — add more to structure your content`,
    pass: h2h3Count >= 4,
    severity: 'warning',
    category: 'voice',
  });

  // 40. Structured Q&A Blocks (question heading + answer paragraph pair)
  const qaBlocks = (html.match(/<h[2-4][^>]*>[^<]*\?[\s\S]*?<\/h[2-4]>\s*<p[^>]*>/gi) || []).length;
  checks.push({
    id: 'aeo_qa_blocks',
    label: qaBlocks >= 2 ? `${qaBlocks} Q&A blocks — perfect format for AI extraction` : 'Few Q&A blocks — add question headings followed by answer paragraphs',
    pass: qaBlocks >= 2,
    severity: 'warning',
    category: 'voice',
  });

  // Mark N/A checks for detected site type
  checks.forEach(c => {
    if (naCheckIds.includes(c.id)) {
      c.applicable = false;
    }
  });

  // E-Commerce Bonus Checks (3)
  if (detectedType === 'ecommerce') {
    // B1. Product data AI-parseable
    const hasProductStructured = /"@type"\s*:\s*"Product"/i.test(html) && /"name"/i.test(html) && /"description"/i.test(html);
    checks.push({
      id: 'ecom_product_structured',
      label: hasProductStructured ? 'Product data is AI-parseable (name + description in Schema)' : 'Product Schema lacks name or description — AI cannot parse product info',
      pass: hasProductStructured,
      category: 'ecommerce',
    });

    // B2. Price visible in HTML (not JS-only)
    const priceInHtml = /itemprop=["']price["']|class=["'][^"']*price[^"']*["'][^>]*>[^<]*[\d.,]+/i.test(html);
    checks.push({
      id: 'ecom_price_visible',
      label: priceInHtml ? 'Price visible in HTML — AI crawlers can read it' : 'Price may be JS-only — ensure price is in HTML for AI crawlers',
      pass: priceInHtml,
      category: 'ecommerce',
    });

    // B3. Specs table
    const hasSpecsTable = (/<table[^>]*>/i.test(html) && /spec|feature|özellik|eigenschaft|detail/i.test(html)) || /<dl[^>]*>/i.test(html);
    checks.push({
      id: 'ecom_specs_table',
      label: hasSpecsTable ? 'Product specs in structured format (table/list)' : 'No structured specs — add a specifications table for AI parsing',
      pass: hasSpecsTable,
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
