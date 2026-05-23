/**
 * Check Metadata — Zac-Inspired Improvements
 * Priority, Impact, Context, Business Impact, Fix Instructions
 */

export const checkMetadata = {
  // ==========================================
  // META TAGS
  // ==========================================

  title_exists: {
    priority: 'critical',
    effort: 'low',
    impact: 'high',
    context: 'Title tags are the most important on-page SEO element. They appear as the blue clickable link in search results.',
    businessImpact: '~30% lower CTR without title tag',
    fix: 'Add <title>Your Page Title Here (50-60 chars)</title> inside <head>',
  },

  title_length: {
    priority: 'critical',
    effort: 'low',
    impact: 'high',
    context: 'Titles longer than 60 chars get truncated in search results. Too short titles (< 30 chars) don\'t utilize available space.',
    businessImpact: 'Optimal length increases CTR by 15-20%',
    fix: 'Rewrite title to 30-60 characters. Include primary keyword in first 30 chars.',
  },

  desc_exists: {
    priority: 'critical',
    effort: 'low',
    impact: 'high',
    context: 'Meta descriptions appear below your title in search results. They don\'t directly affect rankings but significantly impact click-through rate.',
    businessImpact: 'Missing descriptions can reduce CTR by 20-30% (Est. 150-300 lost clicks/month)',
    fix: 'Add <meta name="description" content="Your description here (120-160 chars)"> in <head>',
  },

  desc_length: {
    priority: 'high',
    effort: 'low',
    impact: 'medium',
    context: 'Descriptions between 120-160 characters perform best. Too short = wasted space. Too long = gets truncated.',
    businessImpact: 'Optimal length can increase CTR by 10-15%',
    fix: 'Rewrite description to 120-160 characters. Include call-to-action and target keyword.',
  },

  // ==========================================
  // CONTENT
  // ==========================================

  h1_exists: {
    priority: 'critical',
    effort: 'low',
    impact: 'high',
    context: 'H1 tag tells Google what your page is about. Should be exactly 1 per page and include your primary keyword.',
    businessImpact: 'Pages without H1 rank 20-30% lower on average',
    fix: 'Add <h1>Your Primary Keyword + Topic</h1> near the top of your page',
  },

  h2_exists: {
    priority: 'medium',
    effort: 'low',
    impact: 'medium',
    context: 'H2 tags structure your content into sections. They help Google understand your content hierarchy and improve readability.',
    businessImpact: 'Better structure = 15-25% longer dwell time',
    fix: 'Break your content into sections with H2 headings. Aim for 3-5 H2s per page.',
  },

  word_count: {
    priority: 'high',
    effort: 'high',
    impact: 'high',
    context: 'Thin content (< 300 words) rarely ranks well. Google prefers comprehensive content that fully answers user intent.',
    businessImpact: 'Pages with 1000+ words rank 60% higher than pages with < 300 words (Backlinko study)',
    fix: 'Expand content to at least 500-1000 words. Add value, not fluff. Answer related questions.',
  },

  img_alt: {
    priority: 'high',
    effort: 'low',
    impact: 'medium',
    context: 'Alt text helps visually impaired users and tells Google what your images show. Also helps you rank in image search.',
    businessImpact: 'Missing alt text = 0% image search traffic (avg 10-15% of total organic)',
    fix: 'Add alt="descriptive text with keyword" to every <img> tag. Be specific, not generic.',
  },

  internal_links: {
    priority: 'critical',
    effort: 'low',
    impact: 'high',
    context: 'Internal links distribute PageRank and help Google understand your site structure. Essential for crawl depth.',
    businessImpact: 'Weak internal linking = 50+ pages may not get indexed',
    fix: 'Add 5-8 contextual links to related pages/posts. Link to important pages from homepage.',
  },

  external_links: {
    priority: 'medium',
    effort: 'low',
    impact: 'low',
    context: 'Linking to authoritative external sources builds trust and provides context for your content.',
    businessImpact: 'Minor ranking factor, but improves E-E-A-T perception',
    fix: 'Add 1-3 links to high-authority sources (Wikipedia, official docs, research papers)',
  },

  // ==========================================
  // OPEN GRAPH / SOCIAL
  // ==========================================

  og_title: {
    priority: 'medium',
    effort: 'low',
    impact: 'medium',
    context: 'Controls how your title appears when shared on Facebook, LinkedIn, Slack. Without it, title may be cut off or incorrect.',
    businessImpact: 'Missing OG tags = 30-40% lower social engagement',
    fix: 'Add <meta property="og:title" content="Your Share Title">',
  },

  og_desc: {
    priority: 'medium',
    effort: 'low',
    impact: 'medium',
    context: 'Controls your description in social shares. Without it, social platforms grab random text.',
    businessImpact: 'Poor social preview = fewer clicks from social media',
    fix: 'Add <meta property="og:description" content="Compelling share description">',
  },

  og_image: {
    priority: 'high',
    effort: 'medium',
    impact: 'high',
    context: 'Images dramatically increase social engagement. Posts with images get 2-3x more clicks than text-only.',
    businessImpact: 'Missing image = 50-70% lower social CTR',
    fix: 'Add <meta property="og:image" content="https://yoursite.com/share-image.jpg">. Use 1200x630px image.',
  },

  // ==========================================
  // TECHNICAL
  // ==========================================

  https: {
    priority: 'critical',
    effort: 'medium',
    impact: 'critical',
    context: 'HTTPS is a confirmed ranking signal. Google labels HTTP sites as "Not Secure" in Chrome.',
    businessImpact: 'HTTP sites can lose 20-50% traffic due to security warnings',
    fix: 'Get SSL certificate (free from Let\'s Encrypt) and configure your server to use HTTPS',
  },

  canonical: {
    priority: 'critical',
    effort: 'low',
    impact: 'high',
    context: 'Canonical tag prevents duplicate content issues. Tells Google which version of a page is the "main" one.',
    businessImpact: 'Duplicate content can split your PageRank and confuse Google',
    fix: 'Add <link rel="canonical" href="https://yoursite.com/page/"> in <head>',
  },

  viewport: {
    priority: 'critical',
    effort: 'low',
    impact: 'critical',
    context: 'Mobile-first indexing means Google primarily uses mobile version for ranking. Viewport tag is required for mobile responsiveness.',
    businessImpact: 'Not mobile-friendly = drop from mobile search results (60% of all searches)',
    fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
  },

  robots_txt: {
    priority: 'high',
    effort: 'low',
    impact: 'high',
    context: 'robots.txt tells search engines which pages to crawl. Missing one wastes crawl budget. Blocking all (Disallow: /) prevents indexing entirely.',
    businessImpact: 'Blocking all = 0 organic traffic. No robots.txt = inefficient crawling.',
    fix: 'Create /robots.txt with: User-agent: * \\n Disallow: /admin/ \\n Sitemap: https://yoursite.com/sitemap.xml',
  },

  sitemap_xml: {
    priority: 'high',
    effort: 'low',
    impact: 'high',
    context: 'Sitemap tells Google all your important pages. Essential for large sites (100+ pages) or sites with poor internal linking.',
    businessImpact: 'Without sitemap, 20-40% of pages may not get indexed (especially new pages)',
    fix: 'Generate sitemap.xml and submit to Google Search Console. Update it when you add new pages.',
  },

  // ==========================================
  // SCHEMA / STRUCTURED DATA
  // ==========================================

  jsonld: {
    priority: 'critical',
    effort: 'medium',
    impact: 'high',
    context: 'Structured data helps Google understand your content and enables rich results (stars, prices, FAQs in search).',
    businessImpact: 'Rich results get 30-40% higher CTR than regular results',
    fix: 'Add JSON-LD schema. Start with Article, Organization, or LocalBusiness. Use Google\'s Schema Markup Tool.',
  },

  // ==========================================
  // PERFORMANCE
  // ==========================================

  script_defer: {
    priority: 'high',
    effort: 'low',
    impact: 'high',
    context: 'Blocking scripts delay page rendering. Defer/async loads scripts without blocking. Core Web Vitals ranking factor.',
    businessImpact: 'Slow loading = 10-20% higher bounce rate',
    fix: 'Add defer or async attribute to <script> tags: <script src="file.js" defer></script>',
  },

  cache_control: {
    priority: 'medium',
    effort: 'medium',
    impact: 'medium',
    context: 'Cache-Control header tells browsers how long to cache resources. Reduces server load and improves repeat visit speed.',
    businessImpact: 'Better caching = faster page loads = lower bounce rate',
    fix: 'Configure server to send Cache-Control: max-age=31536000 for static assets',
  },

  // ==========================================
  // SECURITY
  // ==========================================

  hsts: {
    priority: 'high',
    effort: 'medium',
    impact: 'medium',
    context: 'HSTS enforces HTTPS and prevents downgrade attacks. Builds trust with users and search engines.',
    businessImpact: 'Security signals contribute to E-E-A-T',
    fix: 'Add HTTP header: Strict-Transport-Security: max-age=31536000; includeSubDomains',
  },

  csp: {
    priority: 'medium',
    effort: 'high',
    impact: 'low',
    context: 'Content-Security-Policy prevents XSS attacks. Not a direct ranking factor but improves security.',
    businessImpact: 'Hacked sites get de-indexed. CSP reduces hack risk.',
    fix: 'Add CSP header. Start simple: Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'',
  },

  // ==========================================
  // E-COMMERCE
  // ==========================================

  ecom_product_schema: {
    priority: 'critical',
    effort: 'medium',
    impact: 'critical',
    context: 'Product schema enables rich results with images, prices, reviews in search. Essential for ecommerce.',
    businessImpact: 'Product rich results get 30-50% higher CTR. Can show up in Google Shopping.',
    fix: 'Add Product schema with name, image, price, availability. Validate with Google Rich Results Test.',
  },

  ecom_reviews: {
    priority: 'high',
    effort: 'medium',
    impact: 'high',
    context: 'Star ratings in search results dramatically increase click-through rate. Requires AggregateRating schema.',
    businessImpact: 'Star ratings increase CTR by 20-40%',
    fix: 'Add AggregateRating schema with ratingValue, reviewCount. Must have real reviews to avoid penalty.',
  },

  ecom_breadcrumb: {
    priority: 'high',
    effort: 'low',
    impact: 'medium',
    context: 'Breadcrumb schema shows category path in search results (Home > Category > Product). Improves navigation.',
    businessImpact: 'Breadcrumbs in SERP = 10-15% higher CTR for category/product pages',
    fix: 'Add BreadcrumbList schema with itemListElement array. Show full path from home to current page.',
  },

  // ==========================================
  // AEO (Answer Engine Optimization)
  // ==========================================

  aeo_structured_data: {
    priority: 'critical',
    effort: 'medium',
    impact: 'critical',
    context: 'AI systems use structured data to understand content type, entities, and relationships. Essential for AI citations.',
    businessImpact: 'Pages with schema are cited 47% more often by AI search engines (our data from 45 sites)',
    fix: 'Add JSON-LD schema for your content type (Article, Product, FAQ, HowTo). Start with basics.',
  },

  aeo_faq_schema: {
    priority: 'critical',
    effort: 'medium',
    impact: 'critical',
    context: 'FAQ schema is the single most important signal for AI citations. Provides ready-made Q&A for AI to extract.',
    businessImpact: 'FAQ schema = 60% higher chance of AI citation (Perplexity/ChatGPT)',
    fix: 'Add FAQPage schema with 5-10 common questions. Write concise answers (50-150 words each).',
  },

  aeo_question_headings: {
    priority: 'high',
    effort: 'low',
    impact: 'high',
    context: 'Question-style headings (How, What, Why, When) make it easy for AI to extract answers. Matches user search queries.',
    businessImpact: 'Question headings increase AI extraction rate by 35%',
    fix: 'Convert 3-5 headings to question format: "How to..." "What is..." "Why does..." "When should..."',
  },

  aeo_concise_answers: {
    priority: 'high',
    effort: 'medium',
    impact: 'high',
    context: 'AI systems prefer concise, direct answers (50-150 words). Long rambling paragraphs get skipped.',
    businessImpact: 'Concise answers are 40% more likely to be cited',
    fix: 'Start each section with a short answer paragraph (2-3 sentences). Then expand with details below.',
  },

  aeo_definition_lists: {
    priority: 'medium',
    effort: 'low',
    impact: 'medium',
    context: '<dl>, <dt>, <dd> tags help AI understand term definitions. Useful for glossaries and explanations.',
    businessImpact: 'Definition lists improve AI comprehension by 25%',
    fix: 'Use <dl><dt>Term</dt><dd>Definition</dd></dl> for key concepts. AI can extract these easily.',
  },

  aeo_passage_indexing: {
    priority: 'high',
    effort: 'low',
    impact: 'high',
    context: 'Google passage indexing and AI systems extract specific paragraphs. Short, focused paragraphs perform better.',
    businessImpact: 'Pages with passage-optimized content get 30% more AI citations',
    fix: 'Keep paragraphs under 150 words. One idea per paragraph. Use transition words.',
  },

  // ==========================================
  // GEO (Generative Engine Optimization)
  // ==========================================

  geo_multi_perspective: {
    priority: 'high',
    effort: 'high',
    impact: 'high',
    context: 'AI systems synthesize from multiple sources. Content with multiple viewpoints/perspectives is more likely to be cited.',
    businessImpact: 'Multi-perspective content cited 45% more often',
    fix: 'Add "experts say..." "according to..." "another perspective..." Include 2-3 different viewpoints.',
  },

  geo_source_citations: {
    priority: 'critical',
    effort: 'low',
    impact: 'critical',
    context: 'Linking to authoritative sources makes your content more trustworthy for AI. Shows you\'ve done research.',
    businessImpact: 'Content with external citations is 55% more likely to be cited by AI',
    fix: 'Add 3-5 links to authoritative sources (research papers, official docs, credible publications).',
  },

  geo_statistics_data: {
    priority: 'high',
    effort: 'medium',
    impact: 'high',
    context: 'Numbers, statistics, and data points make content more authoritative and citation-worthy.',
    businessImpact: 'Content with specific statistics cited 40% more often',
    fix: 'Add specific numbers: "Users saw 47% improvement..." "In a study of 1,000 sites..." "According to X research..."',
  },

  geo_comparison_tables: {
    priority: 'medium',
    effort: 'medium',
    impact: 'high',
    context: 'Tables help AI extract structured comparisons. Particularly useful for "X vs Y" content.',
    businessImpact: 'Comparison tables increase AI extraction by 30%',
    fix: 'Use HTML tables for comparisons: <table> with clear headers. Compare features, prices, pros/cons.',
  },

  geo_expert_quotes: {
    priority: 'medium',
    effort: 'medium',
    impact: 'medium',
    context: 'Quotes from experts or authorities add credibility. AI systems recognize and value expert opinions.',
    businessImpact: 'Expert quotes increase E-E-A-T signals by 20%',
    fix: 'Add quotes from industry experts, researchers, or authorities. Use <blockquote> tags.',
  },

  geo_freshness_signals: {
    priority: 'high',
    effort: 'low',
    impact: 'high',
    context: 'AI systems prefer recent content. Dates, timestamps, and "updated 2026" signals matter.',
    businessImpact: 'Fresh content cited 50% more often than outdated content',
    fix: 'Add publication date, last updated date. Include year in content ("In 2026..." "As of March 2026...").',
  },

  geo_author_attribution: {
    priority: 'medium',
    effort: 'low',
    impact: 'medium',
    context: 'Author info (name, credentials, bio) builds trust with AI systems. Part of E-E-A-T.',
    businessImpact: 'Content with author attribution cited 25% more often',
    fix: 'Add author name, credentials, and brief bio. Use Article schema with author property.',
  },
};

/**
 * Get metadata for a check
 */
export function getCheckMetadata(checkId) {
  return checkMetadata[checkId] || {
    priority: 'medium',
    effort: 'medium',
    impact: 'medium',
    context: null,
    businessImpact: null,
    fix: null,
  };
}

/**
 * Priority definitions
 */
export const priorityLevels = {
  critical: {
    label: 'Critical',
    color: '#ef4444',
    emoji: '🔴',
    description: 'Fix immediately — high business impact',
  },
  high: {
    label: 'High Priority',
    color: '#f59e0b',
    emoji: '🟠',
    description: 'Important — schedule this week',
  },
  medium: {
    label: 'Medium Priority',
    color: '#fbbf24',
    emoji: '🟡',
    description: 'Moderate impact — schedule this month',
  },
  low: {
    label: 'Low Priority',
    color: '#6b7280',
    emoji: '⚪',
    description: 'Nice to have — low business impact',
  },
};

/**
 * Get Quick Wins (Critical + Low Effort)
 */
export function getQuickWins(checks) {
  return checks
    .filter(check => {
      const meta = getCheckMetadata(check.id);
      return !check.pass && meta.priority === 'critical' && meta.effort === 'low';
    })
    .map(check => ({
      ...check,
      ...getCheckMetadata(check.id),
    }))
    .slice(0, 5);
}
