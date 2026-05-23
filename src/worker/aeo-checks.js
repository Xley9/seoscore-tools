/**
 * AEO Check Engine — 56 checks
 * Answer Engine Optimization
 * Evaluates AI-readiness for ChatGPT, Perplexity, Claude, Gemini
 */

import { NA_CHECKS } from './site-detector.js';

export function runAeoChecks(pageData) {
  const { html, url, siteType, headers, llmsTxt, robotsTxt } = pageData;
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
    label: hasFaqContent ? 'FAQ content detected — great for AI answers (Note: FAQ rich results limited to gov/health sites since Aug 2023)' : 'No FAQ section found — add Q&A content for AI citation',
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
  const hasNumberedSteps = /step\s*\d|step\s*(one|two|three|four|five)|schritt\s*\d|adım\s*\d|\d+\.\s+[A-Z]/i.test(textContent);
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

  // 30. Answer Box Format — requires concise paragraph right after a heading
  const answerAfterHeading = /<h[2-4][^>]*>[^<]*<\/h[2-4]>\s*<p[^>]*>([^<]{40,200})<\/p>/gi;
  const answerBoxMatches = html.match(answerAfterHeading) || [];
  const hasAnswerBox = answerBoxMatches.length >= 2;
  checks.push({
    id: 'aeo_answer_box',
    label: hasAnswerBox ? `${answerBoxMatches.length} answer-box-ready paragraphs found after headings` : `Only ${answerBoxMatches.length} concise answer paragraph(s) after headings — add 2+ short summaries (40-200 chars) right after H2/H3 tags`,
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

  // ==========================================
  // EXTENDED AEO CHECKS (3 checks)
  // ==========================================

  // 41. AI Robots Meta — no noai/noimageai blocking
  const robotsMeta = metaContent('robots');
  const hasNoAi = /noai|noimageai/i.test(robotsMeta);
  checks.push({
    id: 'aeo_ai_robots',
    label: hasNoAi ? 'AI crawling blocked (noai/noimageai in robots meta) — AI cannot index your content' : 'No AI-blocking robots directives — AI crawlers can access content',
    pass: !hasNoAi,
    severity: hasNoAi ? 'error' : undefined,
    category: 'discoverability',
  });

  // 42. Last-Modified / dateModified freshness signal
  const lastModifiedHeader = (headers || {})['last-modified'] || '';
  const hasDateModified = /"dateModified"/i.test(html);
  checks.push({
    id: 'aeo_last_modified',
    label: (lastModifiedHeader || hasDateModified) ? 'Freshness signal found (Last-Modified header or dateModified)' : 'No Last-Modified header or dateModified — AI prefers content with freshness signals',
    pass: !!(lastModifiedHeader || hasDateModified),
    severity: 'warning',
    category: 'citation',
  });

  // 43. llms.txt exists (AI crawling standard)
  if (llmsTxt !== undefined) {
    const llmsExists = llmsTxt !== null && llmsTxt.length > 0;
    checks.push({
      id: 'aeo_llms_txt',
      label: llmsExists ? '/llms.txt found — AI crawlers can discover your content guidelines' : 'No /llms.txt found — add one to guide AI crawlers (emerging standard)',
      pass: llmsExists,
      severity: 'warning',
      category: 'discoverability',
    });
  }

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

  // ══════════════════════════════════════════
  // RESEARCH-BASED AEO CHECKS (4)
  // Based on AirOps 48-Point Checklist + Citation Research
  // ══════════════════════════════════════════

  // 44. AI Crawlers Allowed — robots.txt explicitly allows GPTBot, ClaudeBot, PerplexityBot
  if (robotsTxt !== undefined) {
    const robotsLower = (robotsTxt || '').toLowerCase();
    const aiBots = ['gptbot', 'claudebot', 'perplexitybot', 'google-extended'];
    let aiCrawlersFound = 0;
    for (const bot of aiBots) {
      if (robotsLower.includes(bot)) aiCrawlersFound++;
    }
    const hasGlobalDisallow = /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/mi.test(robotsTxt || '');
    const aiCrawlersOk = aiCrawlersFound >= 2 || (!hasGlobalDisallow && robotsTxt !== null);
    checks.push({
      id: 'aeo_ai_crawlers',
      label: aiCrawlersOk
        ? `AI crawlers allowed in robots.txt (${aiCrawlersFound}/4 explicitly listed)`
        : 'robots.txt does not explicitly allow AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)',
      pass: aiCrawlersOk,
      severity: 'warning',
      category: 'discoverability',
    });
  }

  // 45. SameAs Links — Organization/Person schema has sameAs social links
  let sameasCount = 0;
  const ldJsons = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of ldJsons) {
    const content = block.replace(/<\/?script[^>]*>/gi, '');
    try {
      const data = JSON.parse(content);
      if (data.sameAs && Array.isArray(data.sameAs)) sameasCount = Math.max(sameasCount, data.sameAs.length);
      if (data['@graph']) {
        for (const item of data['@graph']) {
          if (item.sameAs && Array.isArray(item.sameAs)) sameasCount = Math.max(sameasCount, item.sameAs.length);
        }
      }
    } catch (e) {}
  }
  checks.push({
    id: 'aeo_sameas_links',
    label: sameasCount >= 2
      ? `${sameasCount} sameAs social links in schema — strong brand signal for AI`
      : 'No sameAs links in schema — add social profiles for brand recognition',
    pass: sameasCount >= 2,
    severity: 'info',
    category: 'citation',
  });

  // 46. Brand Consistency — brand name matches across title, og:site_name, Organization.name
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/si);
  const titleTag = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').toLowerCase().trim() : '';
  const ogSiteName = metaContent('og:site_name').toLowerCase().trim();
  let orgName = '';
  for (const block of ldJsons) {
    const content = block.replace(/<\/?script[^>]*>/gi, '');
    try {
      const data = JSON.parse(content);
      const checkOrg = (item) => {
        if (item['@type'] && ['Organization', 'LocalBusiness', 'Corporation'].includes(item['@type'])) {
          orgName = (item.name || '').toLowerCase().trim();
        }
      };
      if (Array.isArray(data)) {
        data.forEach(checkOrg);
      } else {
        checkOrg(data);
        if (Array.isArray(data['@graph'])) data['@graph'].forEach(checkOrg);
      }
    } catch (e) {}
  }
  let brandSignals = 0;
  const brandRef = ogSiteName || orgName;
  if (brandRef) {
    if (titleTag.includes(brandRef)) brandSignals++;
    if (ogSiteName && ogSiteName === brandRef) brandSignals++;
    if (orgName && orgName === brandRef) brandSignals++;
  }
  checks.push({
    id: 'aeo_brand_consistency',
    label: brandSignals >= 2
      ? `Brand name consistent across ${brandSignals}/3 signals (title, OG, schema)`
      : 'Brand name inconsistent — align site name across title, og:site_name, Organization schema',
    pass: brandSignals >= 2,
    severity: 'info',
    category: 'citation',
  });

  // 47. Update Recency — content modified within 90 days (3.2x more AI citations)
  let isRecent = false;
  const lastModHeader = headers?.['last-modified'] || '';
  const dateModifiedMatch = html.match(/"dateModified"\s*:\s*"([^"]+)"/i);
  const metaModified = metaContent('article:modified_time');
  const modDateStr = dateModifiedMatch?.[1] || metaModified || lastModHeader;
  if (modDateStr) {
    const modDate = new Date(modDateStr);
    const daysDiff = (Date.now() - modDate.getTime()) / (1000 * 60 * 60 * 24);
    isRecent = daysDiff <= 90 && daysDiff >= 0;
  }
  checks.push({
    id: 'aeo_update_recency',
    label: isRecent
      ? 'Content updated within 90 days — fresh content gets 3.2x more AI citations'
      : 'Content not updated in 90+ days — stale content loses AI visibility',
    pass: isRecent,
    severity: 'warning',
    category: 'citation',
  });

  // ══════════════════════════════════════════
  // AI CONTENT OPTIMIZATION (4)
  // Unique checks no other scanner has
  // ══════════════════════════════════════════

  // 48. Table of Contents Detection
  const hasToc = /table.of.contents|toc["'\s>]|inhaltsverzeichnis|i[çc]indekiler|содержание/i.test(html) ||
    (html.match(/<a[^>]*href=["']#[^"']+["'][^>]*>[^<]{3,}<\/a>/gi) || []).length >= 4;
  checks.push({
    id: 'aeo_toc',
    label: hasToc ? 'Table of Contents detected — helps AI navigate long content' : 'No Table of Contents — add jump links for AI content navigation',
    pass: hasToc,
    severity: 'warning',
    category: 'structure',
  });

  // 49. Video / Multimedia Content + VideoObject Schema
  const hasVideo = /<video[^>]*>|<iframe[^>]*src=["'][^"']*(youtube|vimeo|wistia|dailymotion)/i.test(html);
  const hasVideoSchema = /"VideoObject"/i.test(html);
  checks.push({
    id: 'aeo_video',
    label: hasVideo
      ? (hasVideoSchema ? 'Video content with VideoObject schema — AI-optimized multimedia' : 'Video found but no VideoObject schema — add for AI video discovery')
      : 'No video content — multimedia increases AI engagement and citation rate',
    pass: hasVideo,
    severity: 'warning',
    category: 'discoverability',
  });

  // 50. Data Attribution (statistics with source references)
  const statsWithSrc = /(\d+%|\d+\s*(x|times|users|more))\s*.{0,80}(according to|source:|from |by |\(.*\d{4}\)|study|research)/i;
  const hasAttributedData = statsWithSrc.test(textContent);
  checks.push({
    id: 'aeo_data_attribution',
    label: hasAttributedData ? 'Statistics with source attribution — highly credible for AI citation' : 'Statistics lack source references — attribute data to boost AI trust',
    pass: hasAttributedData,
    severity: 'warning',
    category: 'citation',
  });

  // 51. Collapsible Content (<details>/<summary>)
  const detailsEls = (html.match(/<details[^>]*>/gi) || []).length;
  checks.push({
    id: 'aeo_collapsible',
    label: detailsEls > 0 ? `${detailsEls} collapsible section(s) (<details>) — interactive AI-friendly content` : 'No <details>/<summary> elements — use for expandable Q&A content',
    pass: detailsEls > 0,
    severity: 'warning',
    category: 'structure',
  });

  // 52. Entity/Brand Name Consistency
  const ogSiteNameRaw = metaContent('og:site_name');
  if (ogSiteNameRaw && ogSiteNameRaw.length >= 2) {
    const brandName = ogSiteNameRaw.trim();
    const brandLower = brandName.toLowerCase();
    const brandRegex = new RegExp(brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const brandMentions = (textContent.match(brandRegex) || []).length;
    const brandWords = brandLower.split(/\s+/);
    const partialMentions = brandWords.length > 1
      ? (textContent.toLowerCase().match(new RegExp(brandWords[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length - brandMentions
      : 0;
    const isConsistent = brandMentions >= 2 && partialMentions <= brandMentions;
    checks.push({
      id: 'aeo_entity_consistency',
      label: isConsistent
        ? `Brand "${brandName}" used consistently (${brandMentions} mentions)`
        : brandMentions < 2
          ? `Brand "${brandName}" mentioned only ${brandMentions} time(s) — repeat for entity recognition`
          : `Brand name used inconsistently (${partialMentions} partial vs ${brandMentions} full) — standardize`,
      pass: isConsistent,
      severity: 'warning',
      category: 'citation',
    });
  }

  // Adaptive scoring: only count applicable checks
  const applicableChecks = checks.filter(c => c.applicable !== false);
  const passed = applicableChecks.filter(c => c.pass).length;
  const score = applicableChecks.length > 0 ? Math.round((passed / applicableChecks.length) * 100) : 0;

  return { score, checks, passed, total: applicableChecks.length };
}
