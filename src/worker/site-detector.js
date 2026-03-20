/**
 * Site Type Detector — Automatic website classification
 * Detects: ecommerce, blog, saas, corporate, default
 * Returns siteType + confidence + signals for adaptive scoring
 */

// N/A check mappings per site type
export const NA_CHECKS = {
  ecommerce: {
    aeo: [
      'aeo_code_blocks', 'aeo_definition_lists', 'aeo_conversational', 'aeo_pronoun_density',
      'aeo_qa_blocks', 'aeo_summary', 'aeo_citations', 'aeo_authority_links',
    ],
    geo: [
      'geo_definitions', 'geo_expert_quotes', 'geo_case_study', 'geo_multi_perspective',
      'geo_paa_format', 'geo_original', 'geo_conclusion', 'geo_data_viz', 'geo_howto_schema',
    ],
  },
};

export function detectSiteType(html, url) {
  const scores = { ecommerce: 0, blog: 0, saas: 0, corporate: 0 };
  const signals = [];
  const lowerHtml = html.toLowerCase();

  // --- E-Commerce Signals ---
  if (/"@type"\s*:\s*"Product"/i.test(html)) {
    scores.ecommerce += 3; signals.push('Product Schema');
  }
  if (/og:type"\s*content=["']product/i.test(html)) {
    scores.ecommerce += 2; signals.push('og:type=product');
  }
  if (/add.to.cart|add_to_cart|addtocart|sepete ekle|in den warenkorb/i.test(lowerHtml)) {
    scores.ecommerce += 3; signals.push('Add to Cart');
  }
  if (/itemprop=["']price["']|itemprop=["']priceCurrency["']/i.test(html)) {
    scores.ecommerce += 2; signals.push('Price markup');
  }
  if (/cart|basket|warenkorb|sepet/i.test(lowerHtml) && /<a[^>]*href=["'][^"']*cart/i.test(html)) {
    scores.ecommerce += 2; signals.push('Cart link');
  }
  if (/opencart|woocommerce|shopify|magento|prestashop|bigcommerce/i.test(html)) {
    scores.ecommerce += 3; signals.push('E-Commerce platform');
  }
  if (/"offers"|"AggregateOffer"|"availability"/i.test(html)) {
    scores.ecommerce += 2; signals.push('Product offers schema');
  }
  if (/checkout|ödeme|kasse|bezahlen/i.test(lowerHtml)) {
    scores.ecommerce += 1; signals.push('Checkout link');
  }
  if (/"@type"\s*:\s*"BreadcrumbList"/i.test(html) && /"@type"\s*:\s*"Product"/i.test(html)) {
    scores.ecommerce += 1; signals.push('Product breadcrumb');
  }

  // --- Blog Signals ---
  if (/"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"/i.test(html)) {
    scores.blog += 3; signals.push('Article/Blog Schema');
  }
  if (/og:type"\s*content=["']article/i.test(html)) {
    scores.blog += 2; signals.push('og:type=article');
  }
  if (/<article[^>]*>/i.test(html)) {
    scores.blog += 2; signals.push('<article> tag');
  }
  if (/wp-content|wordpress|wp-includes/i.test(html)) {
    scores.blog += 2; signals.push('WordPress');
  }
  if (/\/blog\/|\/article\/|\/post\/|\/news\//i.test(url)) {
    scores.blog += 2; signals.push('Blog URL pattern');
  }
  if (/"datePublished"|"dateModified"/i.test(html) && /"author"/i.test(html)) {
    scores.blog += 1; signals.push('Article metadata');
  }

  // --- SaaS Signals ---
  if (/"@type"\s*:\s*"(WebApplication|SoftwareApplication)"/i.test(html)) {
    scores.saas += 3; signals.push('WebApplication Schema');
  }
  if (/sign.?up|log.?in|create.?account|free.?trial|get.?started/i.test(lowerHtml)) {
    scores.saas += 2; signals.push('Signup/Login');
  }
  if (/pricing|plans|subscribe|subscription/i.test(lowerHtml)) {
    scores.saas += 2; signals.push('Pricing page');
  }
  if (/dashboard|api|documentation|docs/i.test(lowerHtml)) {
    scores.saas += 1; signals.push('SaaS indicators');
  }

  // --- Corporate Signals ---
  if (/"@type"\s*:\s*"(Organization|Corporation|LocalBusiness)"/i.test(html)) {
    scores.corporate += 2; signals.push('Organization Schema');
  }
  if (/about.us|about-us|über.uns|hakkimizda/i.test(lowerHtml)) {
    scores.corporate += 1; signals.push('About page');
  }
  if (/contact|kontakt|iletişim/i.test(lowerHtml)) {
    scores.corporate += 1; signals.push('Contact page');
  }
  if (/team|karriere|career/i.test(lowerHtml)) {
    scores.corporate += 1; signals.push('Team/Careers');
  }

  // Determine winner
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = entries[0];
  const [, secondScore] = entries[1];

  // Need minimum score and clear lead
  if (topScore < 4) {
    return { siteType: 'default', confidence: 0, signals: [] };
  }

  const confidence = Math.min(Math.round((topScore / (topScore + secondScore + 1)) * 100), 100);

  return {
    siteType: topType,
    confidence,
    signals: signals.filter((v, i, a) => a.indexOf(v) === i), // unique
  };
}
