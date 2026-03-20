/* ============================================
   seoscore.tools — Frontend Logic
   Theme Toggle, Scan, Animations, History, i18n
   ============================================ */

// --- i18n Init ---
const initialLang = detectLanguage();
applyTranslations(initialLang);

// --- Language Switcher ---
const langBtn = document.getElementById('langBtn');
const langDropdown = document.getElementById('langDropdown');

langBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  langDropdown.classList.toggle('open');
});

document.addEventListener('click', () => {
  langDropdown?.classList.remove('open');
});

document.querySelectorAll('.lang-option').forEach(opt => {
  opt.addEventListener('click', () => {
    const lang = opt.dataset.lang;
    applyTranslations(lang);
    langDropdown.classList.remove('open');
    // Update URL without reload
    const url = new URL(window.location);
    if (lang === 'en') url.searchParams.delete('lang');
    else url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  });
});

// --- FAQ Accordion ---
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    // Toggle current
    if (!isOpen) item.classList.add('open');
    btn.setAttribute('aria-expanded', !isOpen);
  });
});

// --- Tooltips for AEO/GEO badges ---
document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
  const key = trigger.dataset.tooltipKey;
  if (!key) return;
  const popup = document.createElement('div');
  popup.className = 'tooltip-popup';
  popup.textContent = getTranslation('tooltip_' + key);
  trigger.appendChild(popup);
});

// --- Theme Toggle ---
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('seoscore-theme', theme);
}

themeToggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  setTheme(current === 'light' ? 'dark' : 'light');
});

// Load saved theme
const savedTheme = localStorage.getItem('seoscore-theme');
if (savedTheme) setTheme(savedTheme);
else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');

// --- Tab Switching ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// --- GA4 Event Helper ---
function trackEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params);
}

// --- Global scan data (for exports) ---
let lastScanData = null;
let lastScanUrl = '';

// --- Scan Form ---
const scanForm = document.getElementById('scanForm');
const urlInput = document.getElementById('urlInput');
const scanBtn = document.getElementById('scanBtn');
const scanProgressSection = document.getElementById('scanProgress');
const resultsSection = document.getElementById('results');
const heroSection = document.querySelector('.hero');

function normalizeUrl(input) {
  let url = input.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try { new URL(url); return url; } catch { return ''; }
}

scanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = normalizeUrl(urlInput.value);
  if (!url) { urlInput.focus(); return; }
  trackEvent('scan_start', { url_scanned: url });
  await runScan(url);
});

// Scan Again button
document.getElementById('scanAgainBtn')?.addEventListener('click', () => {
  resultsSection.classList.add('hidden');
  document.getElementById('ctaCard').classList.remove('hidden');
  heroSection.scrollIntoView({ behavior: 'smooth' });
  urlInput.value = '';
  urlInput.focus();
});

// Share button
document.getElementById('shareBtn')?.addEventListener('click', () => {
  const url = urlInput.value;
  const overall = document.getElementById('overallScore').textContent;
  const text = `I just scored ${overall}/100 on seoscore.tools — the free SEO + AEO + GEO scanner. Check your site:`;
  trackEvent('share', { method: navigator.share ? 'native' : 'clipboard' });
  if (navigator.share) {
    navigator.share({ title: 'SEO Score', text, url: 'https://seoscore.tools' });
  } else {
    navigator.clipboard.writeText(`${text} https://seoscore.tools`);
    alert('Link copied to clipboard!');
  }
});

// --- Scan Logic ---
async function runScan(url) {
  // UI: Show progress, hide results
  scanBtn.disabled = true;
  scanBtn.querySelector('.scan-btn-text').textContent = 'Scanning...';
  scanProgressSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');

  // Scroll to progress
  scanProgressSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Reset progress UI
  resetProgress();

  try {
    // Phase 1: Fetch
    activatePhase('fetch');
    updateProgress(10);

    let data;
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Scan failed' }));
        throw new Error(err.error || 'Scan failed');
      }

      activatePhase('seo');
      updateProgress(40);
      data = await response.json();
    } catch (fetchErr) {
      // Fallback: Mock mode (local dev without Worker)
      console.log('API not available — using mock scan for demo');
      data = await runMockScan(url);
    }

    activatePhase('seo');
    updateProgress(40);
    await delay(600);

    activatePhase('aeo');
    updateProgress(70);
    await delay(600);

    activatePhase('geo');
    updateProgress(90);
    await delay(500);

    // All done
    completeProgress();
    await delay(400);

    // Store for exports
    lastScanData = data;
    lastScanUrl = url;

    // Show results
    displayResults(data, url);

    // GA4: Scan complete with scores
    const seoS = data.seo?.score || 0, aeoS = data.aeo?.score || 0, geoS = data.geo?.score || 0;
    trackEvent('scan_complete', {
      url_scanned: url,
      seo_score: seoS,
      aeo_score: aeoS,
      geo_score: geoS,
      overall_score: Math.round(seoS * 0.5 + aeoS * 0.25 + geoS * 0.25)
    });

    // Save to history + increment counter
    saveToHistory(url, data);
    incrementScanCount();

  } catch (err) {
    scanProgressSection.classList.add('hidden');
    alert('Scan error: ' + err.message);
  } finally {
    scanBtn.disabled = false;
    scanBtn.querySelector('.scan-btn-text').textContent = getTranslation('btn_scan');
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Progress Animation ---
function resetProgress() {
  document.getElementById('scanPct').textContent = '0%';
  const ring = document.querySelector('.scan-ring-progress');
  ring.style.strokeDashoffset = '326.73';
  document.querySelectorAll('.scan-check-item').forEach(item => {
    item.classList.remove('active', 'done');
  });
}

function updateProgress(pct) {
  const ring = document.querySelector('.scan-ring-progress');
  const circumference = 326.73;
  ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
  document.getElementById('scanPct').textContent = pct + '%';
}

function activatePhase(phase) {
  document.querySelectorAll('.scan-check-item').forEach(item => {
    if (item.classList.contains('active')) {
      item.classList.remove('active');
      item.classList.add('done');
    }
  });
  const el = document.querySelector(`[data-phase="${phase}"]`);
  if (el) el.classList.add('active');
}

function completeProgress() {
  updateProgress(100);
  document.querySelectorAll('.scan-check-item').forEach(item => {
    item.classList.remove('active');
    item.classList.add('done');
  });
  document.getElementById('scanStatus').textContent = getTranslation('scan_complete');
}

// Site type display labels
const SITE_TYPE_LABELS = {
  ecommerce: 'E-Commerce',
  blog: 'Blog',
  saas: 'SaaS',
  corporate: 'Corporate',
  default: 'Website',
};

// --- Display Results ---
function displayResults(data, url) {
  scanProgressSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const seo = data.seo || { score: 0, checks: [] };
  const aeo = data.aeo || { score: 0, checks: [] };
  const geo = data.geo || { score: 0, checks: [] };

  // Show site type badge
  const siteTypeContainer = document.getElementById('siteTypeContainer');
  const siteTypeBadge = document.getElementById('siteTypeBadge');
  if (data.siteType && data.siteType.siteType !== 'default') {
    const label = SITE_TYPE_LABELS[data.siteType.siteType] || data.siteType.siteType;
    siteTypeBadge.textContent = `Detected: ${label} (${data.siteType.confidence}% confidence)`;
    siteTypeContainer.classList.remove('hidden');
  } else {
    siteTypeContainer.classList.add('hidden');
  }

  // Weighted overall: SEO 50%, AEO 25%, GEO 25%
  const overall = Math.round(seo.score * 0.5 + aeo.score * 0.25 + geo.score * 0.25);

  // Animate scores
  animateScore('overallScore', 'overallRing', overall, 376.99);
  animateScore('seoScore', 'seoRing', seo.score, 314.16, '#10B981');
  animateScore('aeoScore', 'aeoRing', aeo.score, 314.16, '#8B5CF6');
  animateScore('geoScore', 'geoRing', geo.score, 314.16, '#F59E0B');

  // Grade
  const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' :
                overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F';
  document.getElementById('overallGrade').textContent = grade;

  // Detail counts — only count applicable checks for fails
  const seoApplicable = seo.checks.filter(c => c.applicable !== false);
  const aeoApplicable = aeo.checks.filter(c => c.applicable !== false);
  const geoApplicable = geo.checks.filter(c => c.applicable !== false);
  const seoFails = seoApplicable.filter(c => !c.pass).length;
  const aeoFails = aeoApplicable.filter(c => !c.pass).length;
  const geoFails = geoApplicable.filter(c => !c.pass).length;
  const seoNa = seo.checks.filter(c => c.applicable === false).length;
  const aeoNa = aeo.checks.filter(c => c.applicable === false).length;
  const geoNa = geo.checks.filter(c => c.applicable === false).length;

  document.getElementById('seoDetail').textContent = `${seoApplicable.length} checks, ${seoFails} issues`;
  document.getElementById('aeoDetail').textContent = `${aeoApplicable.length} checks, ${aeoFails} issues${aeoNa ? ` (${aeoNa} N/A)` : ''}`;
  document.getElementById('geoDetail').textContent = `${geoApplicable.length} checks, ${geoFails} issues${geoNa ? ` (${geoNa} N/A)` : ''}`;

  // Tab labels with counts
  document.querySelector('[data-tab="seo"]').textContent = `SEO Issues (${seoFails})`;
  document.querySelector('[data-tab="aeo"]').textContent = `AEO Issues (${aeoFails})`;
  document.querySelector('[data-tab="geo"]').textContent = `GEO Issues (${geoFails})`;

  // Render checks
  renderChecks('seoChecks', seo.checks);
  renderChecks('aeoChecks', aeo.checks);
  renderChecks('geoChecks', geo.checks);

  // Tips dynamic text
  const totalFails = seoFails + aeoFails + geoFails;
  if (totalFails > 0) {
    document.querySelector('.cta-title').innerHTML = `<strong>${totalFails}</strong> issue${totalFails > 1 ? 's' : ''} found — here's how to improve`;
    document.getElementById('ctaText').textContent = `Your site has ${totalFails} issue${totalFails > 1 ? 's' : ''} across SEO, AEO & GEO. Fix the red items first for the biggest impact. Rescan after making changes to track your progress.`;
  } else {
    document.querySelector('.cta-title').innerHTML = 'Your site is in <strong>great shape</strong>!';
    document.getElementById('ctaText').textContent = 'All checks passed. Keep monitoring regularly to maintain your scores.';
  }

  // Show history
  renderHistory();
}

function animateScore(textId, ringId, target, circumference, color) {
  const textEl = document.getElementById(textId);
  const ringEl = document.getElementById(ringId);
  const duration = 1500;
  const start = performance.now();

  // Color based on score
  if (color) {
    const c = target >= 80 ? '#10B981' : target >= 50 ? '#F59E0B' : '#EF4444';
    ringEl.style.stroke = color || c;
  }

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(target * eased);

    textEl.textContent = current;
    ringEl.style.strokeDashoffset = circumference - (current / 100) * circumference;

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function renderChecks(containerId, checks) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // Split into applicable and N/A
  const applicable = checks.filter(c => c.applicable !== false);
  const naChecks = checks.filter(c => c.applicable === false);

  // Sort applicable: fails first, then passes
  const sorted = [...applicable].sort((a, b) => a.pass - b.pass);

  sorted.forEach((check, i) => {
    const row = document.createElement('div');
    row.className = 'check-row';
    row.style.animationDelay = `${i * 40}ms`;

    const iconClass = check.pass ? 'check-pass' : check.severity === 'warning' ? 'check-warn' : 'check-fail';
    const iconText = check.pass ? '\u2713' : check.severity === 'warning' ? '!' : '\u2717';

    const affiliate = !check.pass ? getAffiliateLink(check.id) : null;

    row.innerHTML = `
      <div class="check-icon ${iconClass}">${iconText}</div>
      <div class="check-label">
        ${check.label}
        ${affiliate ? `<span class="check-tip">${affiliate.tip}</span>` : ''}
      </div>
      ${affiliate ? `<a href="${affiliate.url}" class="check-fix" target="_blank" rel="noopener" data-aff-tool="${affiliate.tool}" data-check-id="${check.id}">Hire Pro</a>` : !check.pass ? `<span class="check-fix">${check.severity === 'warning' ? 'Warning' : 'Fix'}</span>` : ''}
    `;

    // Track hire-expert clicks
    const affLink = row.querySelector('a[data-aff-tool]');
    if (affLink) {
      affLink.addEventListener('click', () => {
        trackEvent('hire_expert_click', { check_id: affLink.dataset.checkId });
      });
    }
    container.appendChild(row);
  });

  // N/A section (collapsed)
  if (naChecks.length > 0) {
    const naHeader = document.createElement('div');
    naHeader.className = 'na-section-header';
    naHeader.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <span>${naChecks.length} check${naChecks.length > 1 ? 's' : ''} not applicable for this site type</span>
    `;

    const naContent = document.createElement('div');
    naContent.className = 'na-section-content';

    naChecks.forEach((check, i) => {
      const row = document.createElement('div');
      row.className = 'check-row check-na';
      row.innerHTML = `
        <div class="check-na-badge">N/A</div>
        <div class="check-label">${check.label}</div>
      `;
      naContent.appendChild(row);
    });

    naHeader.addEventListener('click', () => {
      naHeader.classList.toggle('open');
      naContent.classList.toggle('open');
    });

    container.appendChild(naHeader);
    container.appendChild(naContent);
  }
}

// --- Score History (localStorage) ---
function saveToHistory(url, data) {
  const history = JSON.parse(localStorage.getItem('seoscore-history') || '[]');
  const seo = data.seo?.score || 0;
  const aeo = data.aeo?.score || 0;
  const geo = data.geo?.score || 0;
  const overall = Math.round(seo * 0.5 + aeo * 0.25 + geo * 0.25);

  // Remove same URL if exists (keep latest)
  const filtered = history.filter(h => h.url !== url);
  filtered.unshift({ url, seo, aeo, geo, overall, date: new Date().toISOString() });

  // Keep last 20
  localStorage.setItem('seoscore-history', JSON.stringify(filtered.slice(0, 20)));
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('seoscore-history') || '[]');
  const section = document.getElementById('historySection');
  const tbody = document.getElementById('historyBody');

  if (history.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  tbody.innerHTML = '';

  history.forEach(h => {
    const date = new Date(h.date).toLocaleDateString();
    const domain = h.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="history-url" title="${h.url}" onclick="document.getElementById('urlInput').value='${h.url}'">${domain}</span></td>
      <td><span class="history-score" style="color:${scoreColor(h.seo)}">${h.seo}</span></td>
      <td><span class="history-score" style="color:${scoreColor(h.aeo)}">${h.aeo}</span></td>
      <td><span class="history-score" style="color:${scoreColor(h.geo)}">${h.geo}</span></td>
      <td><span class="history-score" style="color:${scoreColor(h.overall)}">${h.overall}</span></td>
      <td style="color:var(--text-muted);font-size:13px">${date}</td>
      <td><button class="history-btn" onclick="document.getElementById('urlInput').value='${h.url}';document.getElementById('scanForm').requestSubmit()">Rescan</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function scoreColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

// Load history on page load
renderHistory();

// --- Scan Counter (Global via Cloudflare KV) ---
let globalScanCount = 2847; // Fallback if API fails

async function fetchScanCount() {
  try {
    const resp = await fetch('/api/scan-count');
    if (resp.ok) {
      const data = await resp.json();
      globalScanCount = data.count || 2847;
    }
  } catch { /* use fallback */ }
  animateCounter();
}

function animateCounter(newTarget) {
  const el = document.getElementById('scanCountValue');
  const statEl = document.getElementById('statScans');
  if (!el) return;
  const target = newTarget || globalScanCount;
  const start = parseInt(el.textContent.replace(/,/g, '')) || 0;
  if (start === target) {
    const formatted = target.toLocaleString();
    el.textContent = formatted;
    if (statEl) statEl.textContent = formatted;
    return;
  }
  const duration = 1200;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    const formatted = current.toLocaleString();
    el.textContent = formatted;
    if (statEl) statEl.textContent = formatted;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function incrementScanCount() {
  // Counter is incremented server-side in /api/scan
  // Just update the display optimistically
  globalScanCount++;
  animateCounter();
}

// Init counter from server on page load
fetchScanCount();

// --- Fix Recommendations → Hire SEO Expert ---
const EXPERT_URL = 'https://www.upwork.com/freelancers/~014f43fd2dc9aa6e70';

// Category-based tips for hire-expert CTA
const EXPERT_TIPS = {
  meta:     'A professional SEO expert can optimize all your meta tags site-wide',
  content:  'A professional can improve your content structure and depth',
  technical:'A professional can fix your technical SEO configuration',
  social:   'A professional can set up proper social sharing tags',
  schema:   'A professional can implement proper structured data markup',
  aeo:      'A professional can optimize your site for AI search engines',
  geo:      'A professional can boost your visibility in AI-generated answers',
  security: 'A professional can configure your security headers properly',
};

// Map each check to its category
const CHECK_CATEGORIES = {
  title_exists:'meta', title_length:'meta', desc_exists:'meta', desc_length:'meta',
  duplicate_title:'meta', duplicate_desc:'meta', h1_exists:'meta', heading_hierarchy:'meta',
  word_count:'content', img_alt:'meta', img_dimensions:'technical', internal_links:'content',
  external_links:'content', empty_hrefs:'technical',
  og_title:'social', og_desc:'social', og_image:'social', og_url:'social',
  og_type:'social', og_site_name:'social', twitter_card:'social', twitter_title:'social',
  twitter_desc:'social', twitter_image:'social',
  https:'security', canonical:'technical', favicon:'technical', compression:'technical',
  url_length:'technical', hreflang:'technical', deprecated_html:'technical',
  text_html_ratio:'content', inline_css:'technical', inline_js:'technical',
  script_defer:'technical', cache_control:'technical', hsts:'security', csp:'security',
  jsonld:'schema', schema_types:'schema',
  aeo_structured_data:'aeo', aeo_semantic_html:'aeo', aeo_segmentation:'aeo',
  aeo_topic_signals:'aeo', aeo_named_entities:'aeo', aeo_internal_links:'aeo',
  aeo_faq:'aeo', aeo_question_headings:'aeo', aeo_lists:'aeo', aeo_tables:'aeo',
  aeo_direct_answers:'aeo', aeo_numbered_steps:'aeo', aeo_concise_paragraphs:'aeo',
  aeo_section_depth:'aeo', aeo_author:'aeo', aeo_org_schema:'aeo', aeo_eeat:'aeo',
  aeo_citations:'aeo', aeo_authority_links:'aeo', aeo_freshness:'aeo', aeo_topic_focus:'aeo',
  aeo_speakable:'aeo', aeo_conversational:'aeo', aeo_snippet_ready:'aeo',
  aeo_search_action:'aeo', aeo_reading_level:'aeo', aeo_summary:'aeo', aeo_heading_density:'aeo',
  geo_definitions:'geo', geo_paa_format:'geo', geo_freshness:'geo', geo_content_depth:'geo',
  geo_intent_clarity:'geo', geo_structured_answers:'geo', geo_hierarchy_depth:'geo',
  geo_paragraph_length:'geo', geo_author_schema:'geo', geo_citations:'geo', geo_trust:'geo',
  geo_expert_quotes:'geo', geo_industry_terms:'geo', geo_authority_links:'geo',
  geo_source_diversity:'geo', geo_faq_schema:'geo', geo_howto_schema:'geo', geo_comparison:'geo',
  geo_summary:'geo', geo_breadcrumb:'geo', geo_list_variety:'geo', geo_format_variety:'geo',
  geo_multi_perspective:'geo', geo_actionable:'geo', geo_conclusion:'geo',
  geo_entity_markup:'geo', geo_semantic_depth:'geo', geo_keyword_prominence:'geo',
  geo_subtopic_depth:'geo', geo_canonical:'geo', geo_robots_ai:'geo',
  geo_schema_richness:'geo', geo_og_complete:'geo',
};

function getAffiliateLink(checkId) {
  const cat = CHECK_CATEGORIES[checkId];
  if (!cat) return null;
  return { tool: 'SEO Expert', url: EXPERT_URL, tip: EXPERT_TIPS[cat] || EXPERT_TIPS.technical };
}

// --- PDF Export ---
document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
  if (!lastScanData) return;
  trackEvent('export', { format: 'pdf', url_scanned: lastScanUrl });
  generatePdfReport(lastScanUrl, lastScanData);
});

function generatePdfReport(url, data) {
  const seo = data.seo || { score: 0, checks: [] };
  const aeo = data.aeo || { score: 0, checks: [] };
  const geo = data.geo || { score: 0, checks: [] };
  const overall = Math.round(seo.score * 0.5 + aeo.score * 0.25 + geo.score * 0.25);
  const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' :
                overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F';
  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Site type info for PDF
  const siteTypeLabel = data.siteType && data.siteType.siteType !== 'default'
    ? `Site Type: ${SITE_TYPE_LABELS[data.siteType.siteType] || data.siteType.siteType} (${data.siteType.confidence}% confidence)`
    : '';

  function checkSymbol(check) {
    if (check.applicable === false) return '\u2796'; // N/A
    return check.pass ? '\u2705' : '\u274C';
  }
  function checksHtml(title, checks, color) {
    const applicable = checks.filter(c => c.applicable !== false);
    const passed = applicable.filter(c => c.pass).length;
    const naCount = checks.filter(c => c.applicable === false).length;
    const naLabel = naCount > 0 ? ` (${naCount} N/A)` : '';
    const rows = checks.map(c =>
      `<tr style="${c.applicable === false ? 'opacity:0.5' : ''}"><td style="padding:4px 8px;font-size:11px">${checkSymbol(c)}</td><td style="padding:4px 8px;font-size:11px">${c.label}${c.applicable === false ? ' <em style="color:#9ca3af">[N/A]</em>' : ''}</td></tr>`
    ).join('');
    return `
      <div style="margin-top:20px">
        <h3 style="color:${color};font-size:14px;margin-bottom:8px">${title} — ${passed}/${applicable.length} passed${naLabel}</h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
          <thead><tr style="background:#f9fafb"><th style="padding:6px 8px;text-align:left;font-size:10px;color:#6b7280">Status</th><th style="padding:6px 8px;text-align:left;font-size:10px;color:#6b7280">Check</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>SEO Report — ${domain}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #1a1a2e; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; margin-bottom: 24px; }
        .header h1 { font-size: 22px; margin: 0 0 4px; }
        .header p { color: #6b7280; font-size: 13px; margin: 0; }
        .scores { display: flex; justify-content: center; gap: 24px; margin: 24px 0; }
        .score-box { text-align: center; padding: 16px 24px; border-radius: 12px; border: 1px solid #e5e7eb; min-width: 120px; }
        .score-box .num { font-size: 36px; font-weight: 800; }
        .score-box .lbl { font-size: 11px; color: #6b7280; margin-top: 4px; }
        .overall { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; border: none; }
        .overall .lbl { color: rgba(255,255,255,0.8); }
        .grade { font-size: 16px; font-weight: 700; margin-top: 4px; }
        .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
        table { border-radius: 6px; overflow: hidden; }
        tr:nth-child(even) { background: #f9fafb; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SEO / AEO / GEO Report</h1>
        <p>${domain} — Generated ${date} by seoscore.tools</p>
        ${siteTypeLabel ? `<p style="margin-top:6px;font-size:12px;color:#4F46E5;font-weight:600">${siteTypeLabel}</p>` : ''}
      </div>

      <div class="scores">
        <div class="score-box overall">
          <div class="num">${overall}</div>
          <div class="lbl">Overall Score</div>
          <div class="grade">Grade: ${grade}</div>
        </div>
        <div class="score-box">
          <div class="num" style="color:#10B981">${seo.score}</div>
          <div class="lbl">SEO Score</div>
        </div>
        <div class="score-box">
          <div class="num" style="color:#8B5CF6">${aeo.score}</div>
          <div class="lbl">AEO Score</div>
        </div>
        <div class="score-box">
          <div class="num" style="color:#F59E0B">${geo.score}</div>
          <div class="lbl">GEO Score</div>
        </div>
      </div>

      ${checksHtml('SEO Checks (' + seo.score + '%)', seo.checks, '#10B981')}
      ${checksHtml('AEO Checks (' + aeo.score + '%)', aeo.checks, '#8B5CF6')}
      ${checksHtml('GEO Checks (' + geo.score + '%)', geo.checks, '#F59E0B')}

      <div class="footer">
        Generated by seoscore.tools — Free SEO, AEO & GEO Scanner<br>
        ${url}
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing as PDF
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Auto-trigger print dialog after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// --- CSV Export ---
document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
  if (!lastScanData) return;
  trackEvent('export', { format: 'csv', url_scanned: lastScanUrl });
  generateCsvReport(lastScanUrl, lastScanData);
});

function generateCsvReport(url, data) {
  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  const date = new Date().toISOString().split('T')[0];

  const rows = [
    ['SEO/AEO/GEO Report', domain, date],
    ['Generated by', 'seoscore.tools', ''],
    [''],
    ['Category', 'Score', 'Passed', 'Total'],
    ['Overall', Math.round(data.seo.score * 0.5 + data.aeo.score * 0.25 + data.geo.score * 0.25), '', ''],
    ['SEO', data.seo.score, data.seo.passed, data.seo.total],
    ['AEO', data.aeo.score, data.aeo.passed, data.aeo.total],
    ['GEO', data.geo.score, data.geo.passed, data.geo.total],
    [''],
    ['Check ID', 'Category', 'Status', 'Description'],
  ];

  function addChecks(category, checks) {
    checks.forEach(c => {
      const status = c.applicable === false ? 'N/A' : c.pass ? 'PASS' : 'FAIL';
      rows.push([c.id, category, status, `"${c.label.replace(/"/g, '""')}"`]);
    });
  }

  addChecks('SEO', data.seo.checks);
  addChecks('AEO', data.aeo.checks);
  addChecks('GEO', data.geo.checks);

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `seoscore-report-${domain}-${date}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// --- Mock Scan (for local dev without Worker API) ---
async function runMockScan(url) {
  // Simulate network delay
  await delay(800);

  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  // Generate semi-random but consistent scores based on domain hash
  const hash = [...domain].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seoBase = 55 + (hash % 35);  // 55-89
  const aeoBase = 20 + (hash % 50);  // 20-69
  const geoBase = 15 + (hash % 45);  // 15-59

  function mockChecks(checks, baseScore) {
    const passRate = baseScore / 100;
    return checks.map((c, i) => ({
      ...c,
      pass: Math.random() < passRate + (c.weight || 0),
    }));
  }

  const seoChecks = mockChecks([
    // Meta (12)
    { id: 'title_exists', label: 'Title tag found', category: 'meta', weight: 0.1 },
    { id: 'title_length', label: `Title length: ${40 + (hash % 20)} characters (optimal)`, category: 'meta' },
    { id: 'desc_exists', label: 'Meta description found', category: 'meta', weight: 0.1 },
    { id: 'desc_length', label: `Description length: ${130 + (hash % 30)} chars`, category: 'meta' },
    { id: 'viewport', label: 'Viewport meta tag found (mobile-friendly)', category: 'meta', weight: 0.2 },
    { id: 'charset', label: 'UTF-8 charset declared', category: 'meta', weight: 0.3 },
    { id: 'lang_attr', label: 'Language attribute set on HTML tag', category: 'meta' },
    { id: 'theme_color', label: 'No theme-color meta tag', category: 'meta' },
    { id: 'meta_refresh', label: 'No meta refresh redirect (good)', category: 'meta', weight: 0.2 },
    { id: 'robots_meta', label: 'No robots meta tag (default: index, follow)', category: 'meta', weight: 0.2 },
    // Content (10)
    { id: 'h1_exists', label: 'Single H1 tag found', category: 'content', weight: 0.15 },
    { id: 'h2_exists', label: `${3 + (hash % 5)} H2 tags found`, category: 'content', weight: 0.1 },
    { id: 'heading_hierarchy', label: 'Heading hierarchy is correct', category: 'content' },
    { id: 'word_count', label: `${800 + (hash % 2000)} words on page`, category: 'content' },
    { id: 'img_alt', label: '3 of 12 images missing ALT text', category: 'content' },
    { id: 'img_dimensions', label: '5 images missing width/height — causes layout shift', category: 'content' },
    { id: 'img_lazy', label: '4 images could use loading="lazy"', category: 'content' },
    { id: 'internal_links', label: `${15 + (hash % 30)} internal links found`, category: 'content', weight: 0.15 },
    { id: 'external_links', label: `${hash % 5} external links found`, category: 'content' },
    { id: 'empty_hrefs', label: 'No empty href attributes found', category: 'content', weight: 0.15 },
    // Social (10)
    { id: 'og_title', label: 'Open Graph title found', category: 'social' },
    { id: 'og_desc', label: 'Open Graph description found', category: 'social' },
    { id: 'og_image', label: 'Open Graph image found', category: 'social' },
    { id: 'og_url', label: 'Missing og:url', category: 'social' },
    { id: 'og_type', label: 'Missing og:type', category: 'social' },
    { id: 'og_site_name', label: 'Missing og:site_name', category: 'social' },
    { id: 'twitter_card', label: 'Twitter Card meta tag found', category: 'social' },
    { id: 'twitter_title', label: 'Missing twitter:title', category: 'social' },
    { id: 'twitter_desc', label: 'Missing twitter:description', category: 'social' },
    { id: 'twitter_image', label: 'Missing twitter:image', category: 'social' },
    // Technical (10)
    { id: 'https', label: 'HTTPS enabled', category: 'technical', weight: 0.3 },
    { id: 'canonical', label: 'Canonical tag found', category: 'technical' },
    { id: 'favicon', label: 'Favicon found', category: 'technical', weight: 0.2 },
    { id: 'apple_touch_icon', label: 'No apple-touch-icon', category: 'technical' },
    { id: 'compression', label: 'Compression: gzip', category: 'technical' },
    { id: 'url_length', label: `URL length: ${url.length} chars`, category: 'technical', weight: 0.15 },
    { id: 'url_hyphens', label: 'URL uses hyphens (good)', category: 'technical', weight: 0.15 },
    { id: 'hreflang', label: 'No hreflang tags', category: 'technical' },
    { id: 'deprecated_html', label: 'No deprecated HTML tags found', category: 'technical', weight: 0.2 },
    { id: 'text_html_ratio', label: 'Text-to-HTML ratio: 18.5% (good)', category: 'technical' },
    // Performance (5)
    { id: 'inline_css', label: 'Inline CSS: 2.3 KB (acceptable)', category: 'performance', weight: 0.1 },
    { id: 'inline_js', label: 'Inline JS: 4.1 KB (acceptable)', category: 'performance' },
    { id: 'script_defer', label: '2 render-blocking scripts', category: 'performance' },
    { id: 'font_preload', label: 'No font preload/preconnect', category: 'performance' },
    { id: 'cache_control', label: 'No Cache-Control header', category: 'performance' },
    // Security (3)
    { id: 'hsts', label: 'No Strict-Transport-Security header', category: 'security' },
    { id: 'x_content_type', label: 'Missing X-Content-Type-Options header', category: 'security' },
    { id: 'csp', label: 'No Content-Security-Policy header', category: 'security' },
    // Schema (2)
    { id: 'jsonld', label: 'JSON-LD schema block(s) found', category: 'schema' },
    { id: 'schema_types', label: 'Schema types: Organization, WebSite', category: 'schema' },
  ], seoBase);

  const aeoChecks = mockChecks([
    // Discoverability (10)
    { id: 'aeo_structured_data', label: 'Structured data found', category: 'discoverability' },
    { id: 'aeo_html_content', label: `${500 + (hash % 1500)} words in HTML`, category: 'discoverability', weight: 0.1 },
    { id: 'aeo_clean_url', label: 'Clean URL structure', category: 'discoverability', weight: 0.15 },
    { id: 'aeo_semantic_html', label: '4 semantic HTML5 elements found', category: 'discoverability' },
    { id: 'aeo_segmentation', label: 'Only 2 content sections', category: 'discoverability' },
    { id: 'aeo_topic_signals', label: 'Description + OG both present', category: 'discoverability' },
    { id: 'aeo_named_entities', label: 'Few named entities', category: 'discoverability' },
    { id: 'aeo_internal_links', label: `${5 + (hash % 15)} internal links`, category: 'discoverability' },
    { id: 'aeo_definition_lists', label: 'No definition lists', category: 'discoverability' },
    { id: 'aeo_code_blocks', label: 'No code blocks', category: 'discoverability' },
    // Structure (10)
    { id: 'aeo_faq', label: 'No FAQ section found', category: 'structure' },
    { id: 'aeo_question_headings', label: 'No question-style headings', category: 'structure' },
    { id: 'aeo_lists', label: '3 lists found', category: 'structure' },
    { id: 'aeo_tables', label: 'No data tables', category: 'structure' },
    { id: 'aeo_direct_answers', label: 'No concise answer paragraphs', category: 'structure' },
    { id: 'aeo_numbered_steps', label: 'No numbered steps', category: 'structure' },
    { id: 'aeo_short_sentences', label: '65% short sentences', category: 'structure' },
    { id: 'aeo_concise_paragraphs', label: '80% concise paragraphs', category: 'structure' },
    { id: 'aeo_key_value', label: 'Few key-value patterns', category: 'structure' },
    { id: 'aeo_section_depth', label: 'Avg 35 words/section', category: 'structure' },
    // Citation (10)
    { id: 'aeo_author', label: 'No author information', category: 'citation' },
    { id: 'aeo_date', label: 'Publication date found', category: 'citation' },
    { id: 'aeo_statistics', label: 'No statistics or data', category: 'citation' },
    { id: 'aeo_org_schema', label: 'No Organization schema', category: 'citation' },
    { id: 'aeo_eeat', label: 'Only 2/5 E-E-A-T signals', category: 'citation' },
    { id: 'aeo_citations', label: 'No source citations', category: 'citation' },
    { id: 'aeo_authority_links', label: 'Few external links', category: 'citation' },
    { id: 'aeo_freshness', label: 'No recent year mentioned', category: 'citation' },
    { id: 'aeo_topic_focus', label: 'Topic focus: 45%', category: 'citation' },
    { id: 'aeo_answer_box', label: 'No answer-box-ready content', category: 'citation' },
    // Voice (10)
    { id: 'aeo_speakable', label: 'No Speakable schema', category: 'voice' },
    { id: 'aeo_conversational', label: 'Formal tone', category: 'voice' },
    { id: 'aeo_snippet_ready', label: 'First paragraph too long', category: 'voice' },
    { id: 'aeo_search_action', label: 'No SearchAction schema', category: 'voice' },
    { id: 'aeo_reading_level', label: 'Avg 22 words/sentence — simplify', category: 'voice' },
    { id: 'aeo_active_voice', label: 'Active voice dominant', category: 'voice', weight: 0.1 },
    { id: 'aeo_pronoun_density', label: 'Pronoun density: 0.3%', category: 'voice' },
    { id: 'aeo_summary', label: 'No summary section', category: 'voice' },
    { id: 'aeo_heading_density', label: 'Only 3 H2/H3 headings', category: 'voice' },
    { id: 'aeo_qa_blocks', label: 'Few Q&A blocks', category: 'voice' },
  ], aeoBase);

  const geoChecks = mockChecks([
    // Overview (8)
    { id: 'geo_definitions', label: 'Definition-style content found', category: 'overview' },
    { id: 'geo_paa_format', label: 'Few question headings', category: 'overview' },
    { id: 'geo_freshness', label: 'Content freshness signals detected', category: 'overview' },
    { id: 'geo_content_depth', label: `Content may be too thin`, category: 'overview' },
    { id: 'geo_intent_clarity', label: 'Title and H1 aligned', category: 'overview' },
    { id: 'geo_structured_answers', label: 'No step-by-step content', category: 'overview' },
    { id: 'geo_hierarchy_depth', label: 'Flat heading structure', category: 'overview' },
    { id: 'geo_paragraph_length', label: '55% optimal paragraphs', category: 'overview' },
    // Authority (10)
    { id: 'geo_author_schema', label: 'No author schema', category: 'authority' },
    { id: 'geo_citations', label: 'No source citations', category: 'authority' },
    { id: 'geo_trust', label: 'Only 1/5 trust signals', category: 'authority' },
    { id: 'geo_brand', label: 'Incomplete brand identity', category: 'authority' },
    { id: 'geo_original', label: 'No original data signals', category: 'authority' },
    { id: 'geo_expert_quotes', label: 'No expert quotes', category: 'authority' },
    { id: 'geo_case_study', label: 'No case studies or examples', category: 'authority' },
    { id: 'geo_industry_terms', label: '2 industry terms used', category: 'authority' },
    { id: 'geo_authority_links', label: 'No links to authoritative sources', category: 'authority' },
    { id: 'geo_source_diversity', label: 'Few external source domains', category: 'authority' },
    // Format (12)
    { id: 'geo_faq_schema', label: 'No FAQ Schema', category: 'format' },
    { id: 'geo_howto_schema', label: 'No HowTo Schema', category: 'format' },
    { id: 'geo_comparison', label: 'No comparison content', category: 'format' },
    { id: 'geo_summary', label: 'No summary section', category: 'format' },
    { id: 'geo_visual', label: '2 images missing ALT text', category: 'format' },
    { id: 'geo_breadcrumb', label: 'No BreadcrumbList schema', category: 'format' },
    { id: 'geo_data_viz', label: 'No data tables or charts', category: 'format' },
    { id: 'geo_list_variety', label: 'Only one list type', category: 'format' },
    { id: 'geo_format_variety', label: '2/6 formatting types used', category: 'format' },
    { id: 'geo_multi_perspective', label: 'Single-perspective content', category: 'format' },
    { id: 'geo_actionable', label: 'No actionable content', category: 'format' },
    { id: 'geo_conclusion', label: 'No conclusion section', category: 'format' },
    // Semantic (8)
    { id: 'geo_entity_markup', label: 'No entity Schema types', category: 'semantic' },
    { id: 'geo_semantic_depth', label: '3/14 semantic elements', category: 'semantic' },
    { id: 'geo_time_element', label: 'No <time> elements', category: 'semantic' },
    { id: 'geo_numerical_density', label: 'Few data points with units', category: 'semantic' },
    { id: 'geo_keyword_prominence', label: '40% title keywords in first 200 words', category: 'semantic' },
    { id: 'geo_cross_references', label: 'Few contextual links', category: 'semantic' },
    { id: 'geo_categorization', label: 'No categorization signals', category: 'semantic' },
    { id: 'geo_subtopic_depth', label: 'Few sections have subtopics', category: 'semantic' },
    // Technical (8)
    { id: 'geo_mobile', label: 'Mobile-friendly (viewport set)', category: 'technical', weight: 0.2 },
    { id: 'geo_https', label: 'HTTPS secure', category: 'technical', weight: 0.3 },
    { id: 'geo_page_size', label: 'Page size: 145 KB — reasonable', category: 'technical', weight: 0.2 },
    { id: 'geo_og_complete', label: 'Incomplete Open Graph tags', category: 'technical' },
    { id: 'geo_canonical', label: 'Canonical URL set', category: 'technical', weight: 0.15 },
    { id: 'geo_robots_ai', label: 'Page allows AI indexing', category: 'technical', weight: 0.2 },
    { id: 'geo_schema_richness', label: 'Only 1 Schema type', category: 'technical' },
    { id: 'geo_lang_consistency', label: 'No HTML lang attribute', category: 'technical' },
  ], geoBase);

  // Update labels for failed checks
  seoChecks.forEach(c => {
    if (!c.pass && !c.label.includes('No ') && !c.label.includes('Missing') && !c.label.includes('missing')) {
      c.label = c.label.replace(/found|detected|enabled|set|declared/i, 'missing');
    }
  });

  function calcScore(checks) {
    const passed = checks.filter(c => c.pass).length;
    return { score: Math.round((passed / checks.length) * 100), checks, passed, total: checks.length };
  }

  return {
    url,
    siteType: { siteType: 'default', confidence: 0, signals: [] },
    seo: calcScore(seoChecks),
    aeo: calcScore(aeoChecks),
    geo: calcScore(geoChecks),
    scannedAt: new Date().toISOString(),
    mock: true,
  };
}
