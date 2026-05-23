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

// --- FAQ Accordion (native <details> with only-one-open behavior) ---
document.querySelectorAll('details.faq-item').forEach(det => {
  det.addEventListener('toggle', () => {
    if (det.open) {
      document.querySelectorAll('details.faq-item').forEach(d => {
        if (d !== det) d.removeAttribute('open');
      });
    }
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

// --- Auto-track outbound clicks to Gumroad (Plugin Funnel) ---
// Fires `click_gumroad` event with { destination: 'free'|'pro', location: section_id }
// Used to measure conversion from seoscore.tools → Gumroad on plugin landing pages.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href*="gumroad.com"]').forEach(link => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href') || '';
      const destination = href.includes('-pro') ? 'pro' : (href.includes('-free') ? 'free' : 'other');
      // Find the nearest section/parent with an id for context
      let location = 'unknown';
      let parent = link.closest('section, header, footer, nav, [id]');
      if (parent) {
        location = parent.id || parent.tagName.toLowerCase();
      }
      trackEvent('click_gumroad', {
        destination,
        location,
        url: href,
        page_path: window.location.pathname
      });
    });
  });
});

// --- XSS Protection ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// --- Scan Mode Toggle ---
let scanMode = 'page'; // 'page' or 'site'

document.querySelectorAll('.scan-mode').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.scan-mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    scanMode = btn.dataset.mode;
  });
});

// --- Global scan data (for exports) ---
let lastScanData = null;
let lastScanUrl = '';
let lastCrawlData = null; // Map of url -> scanResult for crawl mode

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
  if (scanMode === 'site') {
    trackEvent('crawl_start', { url_scanned: url });
    await runCrawl(url);
  } else {
    trackEvent('scan_start', { url_scanned: url });
    await runScan(url);
  }
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
        body: JSON.stringify({ url, keyphrase: document.getElementById('keyphraseInput')?.value?.trim() || '' }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Scan failed' }));
        throw new Error(err.error || 'Scan failed');
      }

      activatePhase('seo');
      updateProgress(40);
      data = await response.json();
    } catch (fetchErr) {
      // Show error UI instead of fake data
      scanProgressSection.classList.add('hidden');
      heroSection.classList.add('hidden');
      resultsSection.classList.remove('hidden');
      resultsSection.innerHTML = '<div style="text-align:center;padding:40px 20px"><h2 style="color:#ef4444">Scan Failed</h2><p style="color:#6b7280;margin:12px 0">Could not connect to the scanner. Please try again in a moment.</p><button class="btn btn-primary" onclick="location.reload()">Try Again</button></div>';
      return;
    }

    activatePhase('seo');
    updateProgress(40);
    await delay(600);

    activatePhase('aeo');
    updateProgress(70);
    await delay(600);

    activatePhase('geo');
    updateProgress(85);
    await delay(500);

    activatePhase('cwv');
    updateProgress(95);
    await delay(400);

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

    // Show public report link
    showPublicReportLink(url);

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
  const cwv = data.cwv || { score: null, checks: [] };

  // Show site type badge + CMS
  const siteTypeContainer = document.getElementById('siteTypeContainer');
  const siteTypeBadge = document.getElementById('siteTypeBadge');
  const cms = data.siteType?.detectedCms;
  _lastDetectedCms = cms; // Store for getAffiliateLink
  const CMS_LABELS = { wordpress: 'WordPress', nextjs: 'Next.js', drupal: 'Drupal', shopify: 'Shopify', wix: 'Wix', squarespace: 'Squarespace', opencart: 'OpenCart', magento: 'Magento', gatsby: 'Gatsby', nuxt: 'Nuxt' };
  if (data.siteType && (data.siteType.siteType !== 'default' || cms)) {
    const label = SITE_TYPE_LABELS[data.siteType.siteType] || data.siteType.siteType;
    const cmsLabel = cms ? CMS_LABELS[cms] || cms : null;
    siteTypeBadge.textContent = cmsLabel
      ? `Detected: ${label} (${cmsLabel}) — ${data.siteType.confidence}% confidence`
      : `Detected: ${label} (${data.siteType.confidence}% confidence)`;
    siteTypeContainer.classList.remove('hidden');
  } else {
    siteTypeContainer.classList.add('hidden');
  }

  // SPA warning banner
  const spaWarning = data.siteType?.spaWarning;
  const existingSpaWarn = document.getElementById('spaWarningBanner');
  if (existingSpaWarn) existingSpaWarn.remove();
  if (spaWarning) {
    const banner = document.createElement('div');
    banner.id = 'spaWarningBanner';
    banner.style.cssText = 'background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#92400E;display:flex;align-items:center;gap:8px';
    banner.innerHTML = '<span style="font-size:18px">⚠</span><span>' + escapeHtml(spaWarning) + '</span>';
    resultsSection.querySelector('.results-header')?.after(banner) || resultsSection.prepend(banner);
  }

  // Weighted overall: SEO 50%, AEO 25%, GEO 25%
  const overall = Math.round(seo.score * 0.5 + aeo.score * 0.25 + geo.score * 0.25);

  // Animate scores
  animateScore('overallScore', 'overallRing', overall, 376.99);
  animateScore('seoScore', 'seoRing', seo.score, 314.16, '#10B981');
  animateScore('aeoScore', 'aeoRing', aeo.score, 314.16, '#8B5CF6');
  animateScore('geoScore', 'geoRing', geo.score, 314.16, '#F59E0B');

  // CWV Score Card
  const cwvCard = document.getElementById('cwvCard');
  const cwvTabBtn = document.getElementById('cwvTab');
  if (cwv.score != null) {
    cwvCard.classList.remove('hidden');
    cwvTabBtn.classList.remove('hidden');
    animateScore('cwvScore', 'cwvRing', cwv.score, 314.16, '#3B82F6');
    document.getElementById('cwvDetail').textContent = `${cwv.checks.length} checks, ${cwv.checks.filter(c => !c.pass).length} issues`;
    const cwvFails = cwv.checks.filter(c => !c.pass).length;
    cwvTabBtn.textContent = `CWV (${cwvFails})`;
    renderChecks('cwvChecks', cwv.checks);
  } else {
    cwvCard.classList.add('hidden');
    cwvTabBtn.classList.add('hidden');
    document.getElementById('cwvChecks').innerHTML = '<div class="cwv-unavailable" style="text-align:center;padding:24px;color:var(--text-muted)">Core Web Vitals could not be loaded (timeout or API unavailable)</div>';
  }

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

  // Quick Wins Section (insert before tabs)
  const allChecks = [...seo.checks, ...aeo.checks, ...geo.checks];
  const quickWins = getQuickWins(allChecks);

  // Remove existing Quick Wins if present
  const existingQW = document.getElementById('quickWinsSection');
  if (existingQW) existingQW.remove();

  if (quickWins.length > 0) {
    const quickWinsSection = document.createElement('div');
    quickWinsSection.id = 'quickWinsSection';
    quickWinsSection.style.cssText = 'background:linear-gradient(135deg,#fef3c7,#fed7aa);border:2px solid #f59e0b;border-radius:12px;padding:24px;margin:24px 0 32px 0;box-shadow:0 4px 12px rgba(245,158,11,0.15)';

    quickWinsSection.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span style="font-size:32px">⚡</span>
        <div>
          <h2 style="margin:0;font-size:22px;font-weight:800;color:#92400e">Quick Wins — Do These First!</h2>
          <p style="margin:4px 0 0;font-size:14px;color:#92400e;opacity:0.8">High impact, low effort (under 30 minutes each)</p>
        </div>
      </div>
      ${quickWins.map((check, i) => {
        const meta = getCheckMetadata(check.id);
        const priorityEmoji = priorityConfig[meta.priority]?.emoji || '⚪';
        const priorityLabel = priorityConfig[meta.priority]?.label || 'Medium';
        const priorityColor = priorityConfig[meta.priority]?.color || '#6b7280';

        return `
          <div style="background:white;border-radius:8px;padding:16px;margin-bottom:${i < quickWins.length - 1 ? '12px' : '0'};border-left:4px solid ${priorityColor};box-shadow:0 2px 4px rgba(0,0,0,0.05)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <span style="background:${priorityColor};color:white;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.5px">${priorityEmoji} ${priorityLabel.toUpperCase()}</span>
              <strong style="font-size:15px;color:#1f2937">${escapeHtml(check.label)}</strong>
            </div>
            ${meta.businessImpact ? `
              <div style="background:#fef3c7;padding:10px 12px;border-radius:6px;margin:10px 0;font-size:14px;color:#78350f;border-left:3px solid #f59e0b">
                <strong style="font-size:13px;opacity:0.7;display:block;margin-bottom:4px">💰 Business Impact:</strong>
                ${escapeHtml(meta.businessImpact)}
              </div>
            ` : ''}
            ${meta.context ? `
              <div style="margin:10px 0;font-size:13px;color:#6b7280;line-height:1.5">
                <strong>Why:</strong> ${escapeHtml(meta.context)}
              </div>
            ` : ''}
            ${meta.fix ? `
              <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:14px;color:#1f2937">
                <strong style="color:#059669;font-size:13px">✓ How to Fix:</strong><br>
                <span style="line-height:1.6">${escapeHtml(meta.fix)}</span>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    `;

    // Insert before detail tabs
    const detailSection = document.querySelector('.detail-section');
    if (detailSection) {
      detailSection.before(quickWinsSection);
    }
  }

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

    // Get metadata for enhanced display
    const meta = getCheckMetadata(check.id);
    const priorityEmoji = priorityConfig[meta.priority]?.emoji || '';
    const priorityLabel = priorityConfig[meta.priority]?.label || 'Medium';
    const priorityColor = priorityConfig[meta.priority]?.color || '#6b7280';

    // Build enhanced info section (only for failed checks)
    let enhancedInfo = '';
    if (!check.pass && (meta.businessImpact || meta.context || meta.fix)) {
      const infoId = `info-${check.id}-${i}`;
      enhancedInfo = `
        <div class="check-enhanced-info" style="margin-top:8px;display:none" id="${infoId}">
          ${meta.businessImpact ? `
            <div style="background:#fef3c7;padding:8px 10px;border-radius:4px;margin-bottom:6px;font-size:13px;color:#78350f">
              <strong>💰 Impact:</strong> ${escapeHtml(meta.businessImpact)}
            </div>
          ` : ''}
          ${meta.context ? `
            <div style="margin-bottom:6px;font-size:13px;color:#6b7280">
              <strong>Why:</strong> ${escapeHtml(meta.context)}
            </div>
          ` : ''}
          ${meta.fix ? `
            <div style="font-size:13px;color:#059669">
              <strong>✓ Fix:</strong> ${escapeHtml(meta.fix)}
            </div>
          ` : ''}
        </div>
      `;
    }

    row.innerHTML = `
      <div class="check-icon ${iconClass}">${iconText}</div>
      <div class="check-label" style="flex:1">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${priorityEmoji ? `<span style="font-size:12px;opacity:0.8" title="${priorityLabel} priority">${priorityEmoji}</span>` : ''}
          <span>${escapeHtml(check.label)}</span>
          ${!check.pass && (meta.businessImpact || meta.context || meta.fix) ? `<button class="check-info-btn" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:18px;padding:0;margin-left:4px" title="Show details" data-target="${'info-'+check.id+'-'+i}">ℹ️</button>` : ''}
        </div>
        ${affiliate ? `<span class="check-tip">${escapeHtml(affiliate.tip)}</span>` : ''}
        ${enhancedInfo}
      </div>
      ${affiliate ? `<a href="${escapeHtml(affiliate.url)}" class="check-fix" target="_blank" rel="noopener" data-aff-tool="${escapeHtml(affiliate.tool)}" data-check-id="${escapeHtml(check.id)}">Auto-Fix</a>` : !check.pass ? `<span class="check-fix">${check.severity === 'warning' ? 'Warning' : 'Fix'}</span>` : ''}
    `;

    // Track plugin CTA clicks
    const affLink = row.querySelector('a[data-aff-tool]');
    if (affLink) {
      affLink.addEventListener('click', () => {
        trackEvent('plugin_click', { check_id: affLink.dataset.checkId });
      });
    }

    // Toggle enhanced info
    const infoBtn = row.querySelector('.check-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', () => {
        const targetId = infoBtn.dataset.target;
        const infoDiv = document.getElementById(targetId);
        if (infoDiv) {
          const isHidden = infoDiv.style.display === 'none';
          infoDiv.style.display = isHidden ? 'block' : 'none';
          infoBtn.textContent = isHidden ? '▼' : 'ℹ️';
        }
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
        <div class="check-label">${escapeHtml(check.label)}</div>
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
    const safeUrl = escapeHtml(h.url);
    const domain = escapeHtml(h.url.replace(/^https?:\/\//, '').replace(/\/$/, ''));
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="history-url" title="${safeUrl}" data-url="${safeUrl}">${domain}</span></td>
      <td><span class="history-score" style="color:${scoreColor(h.seo)}">${parseInt(h.seo) || 0}</span></td>
      <td><span class="history-score" style="color:${scoreColor(h.aeo)}">${parseInt(h.aeo) || 0}</span></td>
      <td><span class="history-score" style="color:${scoreColor(h.geo)}">${parseInt(h.geo) || 0}</span></td>
      <td><span class="history-score" style="color:${scoreColor(h.overall)}">${parseInt(h.overall) || 0}</span></td>
      <td style="color:var(--text-muted);font-size:13px">${escapeHtml(date)}</td>
      <td><button class="history-btn" data-url="${safeUrl}">Rescan</button></td>
    `;
    // Safe event listeners instead of inline onclick
    tr.querySelector('.history-url').addEventListener('click', () => {
      document.getElementById('urlInput').value = h.url;
    });
    tr.querySelector('.history-btn').addEventListener('click', () => {
      document.getElementById('urlInput').value = h.url;
      document.getElementById('scanForm').requestSubmit();
    });
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

// --- Public Report Link ---
function showPublicReportLink(scannedUrl) {
  try {
    const domain = new URL(scannedUrl).hostname;
    const slug = domain.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
    const reportUrl = '/report/' + slug + '/';

    // Remove previous link if exists
    const existing = document.getElementById('publicReportLink');
    if (existing) existing.remove();

    // Insert after the export-bar
    const exportBar = document.querySelector('#results .export-bar');
    if (!exportBar) return;

    const linkDiv = document.createElement('div');
    linkDiv.id = 'publicReportLink';
    linkDiv.style.cssText = 'text-align:center;margin-top:12px;';
    const anchor = document.createElement('a');
    anchor.href = reportUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-muted);text-decoration:none;padding:6px 14px;border-radius:6px;border:1px solid var(--border);transition:all 0.2s;';
    anchor.onmouseover = function() { this.style.borderColor = 'var(--green)'; this.style.color = 'var(--green)'; };
    anchor.onmouseout = function() { this.style.borderColor = 'var(--border)'; this.style.color = 'var(--text-muted)'; };

    // SVG: external link icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.innerHTML = '<path d="M6 3H3v10h10v-3"/><path d="M9 2h5v5"/><path d="M14 2L7 9"/>';
    anchor.appendChild(svg);

    const text = document.createTextNode('View Public Report');
    anchor.appendChild(text);

    const arrow = document.createElement('span');
    arrow.textContent = '\u2192';
    arrow.style.fontSize = '14px';
    anchor.appendChild(arrow);

    linkDiv.appendChild(anchor);
    exportBar.after(linkDiv);
  } catch (e) {
    // Silent fail — public report link is non-critical
  }
}

// Init counter from server on page load
fetchScanCount();

// --- Fix Recommendations → SEO Autopilot Plugin ---
let _lastDetectedCms = null; // Set by displayResults, read by getAffiliateLink
const PLUGIN_URL = '/seo-autopilot/';
const GUMROAD_URL = 'https://atilla45.gumroad.com/l/seo-autopilot-pro';

// Category-based tips for plugin CTA
const FIX_TIPS = {
  meta:      'SEO Autopilot plugin auto-fixes meta tags, titles & descriptions across your entire WordPress site.',
  content:   'SEO Autopilot generates AI-powered FAQ sections, summaries & expert content via your Claude API key. Strongly recommended for full scores.',
  technical: 'SEO Autopilot fixes canonical tags, HTTPS, schema markup & 30+ technical issues automatically.',
  social:    'SEO Autopilot generates and fixes all Open Graph and Twitter Card tags automatically.',
  schema:    'SEO Autopilot adds Organization, Product, FAQ, HowTo & Speakable schema automatically.',
  aeo:       'SEO Autopilot boosts your AEO score from ~28 to 90+ with AI-generated FAQ, summaries & speakable markup. Add your Claude API key to unlock this.',
  geo:       'SEO Autopilot boosts your GEO score from ~13 to 83+ with AI-optimized content, authority links & trust signals. Claude API key strongly recommended.',
  security:  'SEO Autopilot configures security headers and HTTPS for better search engine trust.',
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
  // Extended SEO checks
  mixed_content:'technical', duplicate_canonical:'technical', html_doctype:'technical',
  structured_data_valid:'schema', font_display:'technical', meta_viewport_content:'meta',
  robots_txt:'technical', robots_txt_sitemap:'technical', sitemap_xml:'technical',
  sitemap_urls:'technical', broken_links:'technical',
  // Extended SEO checks 2
  x_robots_tag:'technical', nofollow_ratio:'content', og_image_url:'social',
  keyword_in_url:'technical', link_noopener:'security', web_manifest:'technical',
  resource_hints:'technical',
  // Extended AEO checks
  aeo_ai_robots:'aeo', aeo_last_modified:'aeo', aeo_llms_txt:'aeo',
  aeo_toc:'aeo', aeo_video:'aeo', aeo_data_attribution:'aeo', aeo_collapsible:'aeo',
  // Extended GEO checks
  geo_aria_landmarks:'geo', geo_img_alt_quality:'geo', geo_content_length:'geo',
  geo_snippet_control:'geo', geo_citation_markup:'geo', geo_comprehensiveness:'geo',
  geo_anchor_quality:'geo', geo_image_captions:'geo',
  // CWV checks
  cwv_performance:'technical', cwv_lcp:'technical', cwv_cls:'technical',
  cwv_fcp:'technical', cwv_tbt:'technical', cwv_speed_index:'technical',
};

function getAffiliateLink(checkId) {
  // Only recommend WordPress plugin to WordPress sites (or unknown CMS)
  if (_lastDetectedCms && _lastDetectedCms !== 'wordpress') return null;
  const cat = CHECK_CATEGORIES[checkId];
  if (!cat) return null;
  return { tool: 'SEO Autopilot', url: PLUGIN_URL, tip: FIX_TIPS[cat] || FIX_TIPS.technical };
}

// --- PDF Export (lazy-load jsPDF on first click) ---
let _jspdfLoaded = false;
function loadJsPdf() {
  if (_jspdfLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s1 = document.createElement('script');
    s1.src = 'jspdf.umd.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'jspdf.plugin.autotable.min.js';
      s2.onload = () => { _jspdfLoaded = true; resolve(); };
      s2.onerror = () => reject(new Error('Failed to load jsPDF AutoTable'));
      document.head.appendChild(s2);
    };
    s1.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(s1);
  });
}

document.getElementById('exportPdfBtn')?.addEventListener('click', async () => {
  if (!lastScanData) return;
  const btn = document.getElementById('exportPdfBtn');
  const btnText = btn.querySelector('span');
  const origText = btnText?.textContent || 'Download PDF Report';
  try {
    btn.disabled = true;
    if (btnText) btnText.textContent = 'Generating PDF...';
    btn.style.opacity = '0.7';
    await loadJsPdf();
    trackEvent('export', { format: 'pdf', url_scanned: lastScanUrl });
    generatePdfReport(lastScanUrl, lastScanData);
  } catch (e) {
    alert('Could not load PDF library. Please try again.');
  } finally {
    btn.disabled = false;
    if (btnText) btnText.textContent = origText;
    btn.style.opacity = '1';
  }
});

// --- jsPDF Helper Functions ---
function scoreColorRGB(score) {
  if (score >= 80) return [16, 185, 129];
  if (score >= 50) return [245, 158, 11];
  return [239, 68, 68];
}

function scoreColorHex(score) {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function hexToRGB(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function drawGradientRect(doc, x, y, w, h, colorStart, colorEnd) {
  const steps = 60;
  const stripW = w / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(colorStart[0] + (colorEnd[0] - colorStart[0]) * t);
    const g = Math.round(colorStart[1] + (colorEnd[1] - colorStart[1]) * t);
    const b = Math.round(colorStart[2] + (colorEnd[2] - colorStart[2]) * t);
    doc.setFillColor(r, g, b);
    doc.rect(x + i * stripW, y, stripW + 0.5, h, 'F');
  }
}

// --- Canvas Chart Generators (CSP-safe: Canvas → PNG → addImage) ---

function createGaugeImage(score, size) {
  size = size || 300;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 0.65;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size * 0.55;
  const radius = size * 0.38;
  const lineW = size * 0.045;

  // Track background
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score arc with gradient
  const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
  grad.addColorStop(0, '#EF4444');
  grad.addColorStop(0.4, '#F59E0B');
  grad.addColorStop(0.7, '#10B981');
  grad.addColorStop(1, '#059669');
  const endAngle = Math.PI + (score / 100) * Math.PI;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, endAngle);
  ctx.strokeStyle = grad;
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Needle
  const needleAngle = Math.PI + (score / 100) * Math.PI;
  const needleLen = radius * 0.72;
  const nx = cx + Math.cos(needleAngle) * needleLen;
  const ny = cy + Math.sin(needleAngle) * needleLen;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = size * 0.012;
  ctx.lineCap = 'round';
  ctx.stroke();
  // Needle center dot
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.025, 0, 2 * Math.PI);
  ctx.fillStyle = '#1E293B';
  ctx.fill();

  // Score text
  ctx.fillStyle = '#1E293B';
  ctx.font = '800 ' + (size * 0.16) + 'px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(String(score), cx, cy - size * 0.02);

  // "Overall Score" label
  ctx.fillStyle = '#6B7280';
  ctx.font = '500 ' + (size * 0.05) + 'px Helvetica, Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('Overall Score', cx, cy + size * 0.02);

  // Min/Max labels
  ctx.fillStyle = '#9CA3AF';
  ctx.font = (size * 0.04) + 'px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('0', cx - radius - size * 0.01, cy + size * 0.06);
  ctx.textAlign = 'right';
  ctx.fillText('100', cx + radius + size * 0.01, cy + size * 0.06);

  return canvas.toDataURL('image/png');
}

function createScoreCircleImage(score, colorHex, size) {
  size = size || 200;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const radius = size * 0.38;
  const lineWidth = size * 0.07;

  // Background circle
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#F3F4F6';
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Score arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (score / 100) * 2 * Math.PI;
  ctx.beginPath();
  ctx.arc(center, center, radius, startAngle, endAngle);
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score text
  ctx.fillStyle = colorHex;
  ctx.font = '800 ' + (size * 0.24) + 'px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(score), center, center);

  return canvas.toDataURL('image/png');
}

function createBenchmarkBarsImage(scores, averages, size) {
  const w = size || 500;
  const h = Math.round(w * 0.55);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const labels = ['SEO', 'AEO', 'GEO'];
  const yourColors = ['#10B981', '#8B5CF6', '#F59E0B'];
  const avgColor = '#CBD5E1';
  const barH = h * 0.12;
  const gap = h * 0.08;
  const startY = h * 0.08;
  const labelW = w * 0.12;
  const maxBarW = w * 0.65;
  const valueX = labelW + maxBarW + w * 0.03;

  ctx.font = '600 ' + (h * 0.09) + 'px Helvetica, Arial, sans-serif';
  ctx.textBaseline = 'middle';

  labels.forEach(function(label, i) {
    const y = startY + i * (barH * 2 + gap);
    const score = scores[i];
    const avg = averages[i];

    // Label
    ctx.fillStyle = '#4B5563';
    ctx.textAlign = 'left';
    ctx.fillText(label, 0, y + barH);

    // Average bar (behind)
    const avgW = (avg / 100) * maxBarW;
    ctx.fillStyle = avgColor;
    roundRect(ctx, labelW, y + barH * 0.7, avgW, barH * 0.6, 3);

    // Your bar (front)
    const barW = (score / 100) * maxBarW;
    ctx.fillStyle = yourColors[i];
    roundRect(ctx, labelW, y, barW, barH, 4);

    // Score value
    ctx.fillStyle = yourColors[i];
    ctx.font = '800 ' + (h * 0.1) + 'px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(score), valueX, y + barH * 0.5);

    // Diff
    const diff = score - avg;
    ctx.font = '600 ' + (h * 0.07) + 'px Helvetica, Arial, sans-serif';
    ctx.fillStyle = diff >= 0 ? '#059669' : '#DC2626';
    ctx.fillText((diff >= 0 ? '+' : '') + diff, valueX + w * 0.08, y + barH * 0.5);

    // Average label
    ctx.font = '400 ' + (h * 0.06) + 'px Helvetica, Arial, sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('Avg: ' + avg, valueX, y + barH * 1.3);

    ctx.font = '600 ' + (h * 0.09) + 'px Helvetica, Arial, sans-serif';
  });

  // Legend
  const legY = h - h * 0.1;
  ctx.font = '500 ' + (h * 0.06) + 'px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#10B981';
  roundRect(ctx, labelW, legY, h * 0.05, h * 0.05, 2);
  ctx.fillStyle = '#4B5563';
  ctx.textAlign = 'left';
  ctx.fillText('Your Site', labelW + h * 0.08, legY + h * 0.03);
  ctx.fillStyle = avgColor;
  roundRect(ctx, labelW + w * 0.22, legY, h * 0.05, h * 0.05, 2);
  ctx.fillStyle = '#4B5563';
  ctx.fillText('Industry Average (2000+ scans)', labelW + w * 0.22 + h * 0.08, legY + h * 0.03);

  return canvas.toDataURL('image/png');
}

function createDonutImage(passed, failed, na, size) {
  size = size || 260;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.40;
  const innerR = size * 0.26;
  const total = passed + failed + na;
  if (total === 0) return canvas.toDataURL('image/png');

  const segments = [
    { value: passed, color: '#10B981', label: 'Passed' },
    { value: failed, color: '#EF4444', label: 'Failed' },
    { value: na,     color: '#D1D5DB', label: 'N/A' },
  ];

  let startAngle = -Math.PI / 2;
  segments.forEach(function(seg) {
    if (seg.value === 0) return;
    const sliceAngle = (seg.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Center text
  ctx.fillStyle = '#1E293B';
  ctx.font = '800 ' + (size * 0.14) + 'px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(passed), cx, cy - size * 0.03);
  ctx.fillStyle = '#6B7280';
  ctx.font = '500 ' + (size * 0.06) + 'px Helvetica, Arial, sans-serif';
  ctx.fillText('Passed', cx, cy + size * 0.07);

  // Legend below donut
  ctx.font = '500 ' + (size * 0.05) + 'px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  const legStartY = size * 0.88;
  const legGap = size * 0.33;
  segments.forEach(function(seg, i) {
    const lx = size * 0.08 + i * legGap;
    ctx.fillStyle = seg.color;
    ctx.fillRect(lx, legStartY - size * 0.02, size * 0.035, size * 0.035);
    ctx.fillStyle = '#4B5563';
    ctx.fillText(seg.label + ': ' + seg.value, lx + size * 0.05, legStartY);
  });

  return canvas.toDataURL('image/png');
}

function createRadarImage(categoryScores, size) {
  size = size || 360;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  const labels = Object.keys(categoryScores);
  const values = Object.values(categoryScores);
  const n = labels.length;
  if (n < 3) return canvas.toDataURL('image/png');

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  // Grid rings
  [0.2, 0.4, 0.6, 0.8, 1.0].forEach(function(frac) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = startAngle + i * angleStep;
      const x = cx + Math.cos(a) * radius * frac;
      const y = cy + Math.sin(a) * radius * frac;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Axis lines
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Data polygon
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    const v = Math.min(values[i], 100) / 100;
    const x = cx + Math.cos(a) * radius * v;
    const y = cy + Math.sin(a) * radius * v;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(79, 70, 229, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Data points and labels
  for (let i = 0; i < n; i++) {
    const a = startAngle + i * angleStep;
    const v = Math.min(values[i], 100) / 100;
    const x = cx + Math.cos(a) * radius * v;
    const y = cy + Math.sin(a) * radius * v;

    // Dot
    ctx.beginPath();
    ctx.arc(x, y, size * 0.015, 0, 2 * Math.PI);
    ctx.fillStyle = '#4F46E5';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    const lx = cx + Math.cos(a) * (radius + size * 0.07);
    const ly = cy + Math.sin(a) * (radius + size * 0.07);
    ctx.fillStyle = '#374151';
    ctx.font = '600 ' + (size * 0.04) + 'px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labels[i], lx, ly - size * 0.02);
    ctx.fillStyle = '#6B7280';
    ctx.font = '500 ' + (size * 0.035) + 'px Helvetica, Arial, sans-serif';
    ctx.fillText(Math.round(values[i]) + '%', lx, ly + size * 0.025);
  }

  return canvas.toDataURL('image/png');
}

function createCategoryBarsImage(categoryData, size) {
  const w = size || 500;
  const rowH = 22;
  const h = Math.max(categoryData.length * rowH + 40, 120);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const labelW = w * 0.22;
  const barMaxW = w * 0.60;
  const numX = labelW + barMaxW + w * 0.03;

  ctx.font = '500 ' + 12 + 'px Helvetica, Arial, sans-serif';
  ctx.textBaseline = 'middle';

  categoryData.forEach(function(cat, i) {
    const y = 10 + i * rowH;
    const total = cat.passed + cat.failed;
    if (total === 0) return;

    // Label
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'right';
    ctx.fillText(cat.name, labelW - 8, y + rowH / 2);

    // Passed bar
    const passW = (cat.passed / total) * barMaxW;
    ctx.fillStyle = '#10B981';
    roundRect(ctx, labelW, y + 3, passW, rowH - 6, 3);

    // Failed bar
    if (cat.failed > 0) {
      ctx.fillStyle = '#EF4444';
      roundRect(ctx, labelW + passW, y + 3, (cat.failed / total) * barMaxW, rowH - 6, 3);
    }

    // Count text
    ctx.fillStyle = '#6B7280';
    ctx.textAlign = 'left';
    ctx.font = '500 ' + 11 + 'px Helvetica, Arial, sans-serif';
    ctx.fillText(cat.passed + '/' + total, numX, y + rowH / 2);
    ctx.font = '500 ' + 12 + 'px Helvetica, Arial, sans-serif';
  });

  return canvas.toDataURL('image/png');
}

// Helper: draw rounded rect on canvas (fill)
function roundRect(ctx, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawMiniHeader(doc, domain, pageTitle) {
  drawGradientRect(doc, 0, 0, 210, 10, [79, 70, 229], [124, 58, 237]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(pageTitle || 'Detailed Analysis', 15, 6.5);
  doc.text(domain, 195, 6.5, { align: 'right' });
}

function drawFooter(doc, text) {
  const y = 289;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(15, y - 2, 195, y - 2);
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text('seoscore.tools', 15, y);
  doc.setTextColor(107, 114, 128);
  doc.text(text, 195, y, { align: 'right' });
}

function drawSectionTitle(doc, text, y, icon) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text((icon || '') + text, 15, y);
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.6);
  doc.line(15, y + 1.5, 15 + doc.getTextWidth(text) + (icon ? 4 : 0), y + 1.5);
  return y + 6;
}

// --- Main PDF Generator ---

function generatePdfReport(url, data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const seo = data.seo || { score: 0, checks: [] };
  const aeo = data.aeo || { score: 0, checks: [] };
  const geo = data.geo || { score: 0, checks: [] };
  const cwv = data.cwv || { score: null, checks: [] };
  const overall = Math.round(seo.score * 0.5 + aeo.score * 0.25 + geo.score * 0.25);
  const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' :
                overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F';
  const domain = url.replace(/^https?:\/\//, '').replace(/\/.*/, '');
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateShort = now.toISOString().slice(0, 10);

  // Site type info
  const pdfCms = data.siteType?.detectedCms;
  const PDF_CMS_LABELS = { wordpress: 'WordPress', nextjs: 'Next.js', drupal: 'Drupal', shopify: 'Shopify', wix: 'Wix', squarespace: 'Squarespace', opencart: 'OpenCart', magento: 'Magento', gatsby: 'Gatsby', nuxt: 'Nuxt' };
  const pdfCmsLabel = pdfCms ? PDF_CMS_LABELS[pdfCms] || pdfCms : null;
  const siteTypeLabel = data.siteType && (data.siteType.siteType !== 'default' || pdfCms)
    ? (SITE_TYPE_LABELS[data.siteType.siteType] || data.siteType.siteType) + (pdfCmsLabel ? ' (' + pdfCmsLabel + ')' : '')
    : '';

  const allChecks = [...seo.checks, ...aeo.checks, ...geo.checks];
  const quickWins = getQuickWins(allChecks);

  const totalChecks = seo.checks.length + aeo.checks.length + geo.checks.length + (cwv.checks?.length || 0);
  const passedCount = seo.checks.filter(c => c.pass).length + aeo.checks.filter(c => c.pass).length + geo.checks.filter(c => c.pass).length + (cwv.checks?.filter(c => c.pass).length || 0);
  const failedChecks = allChecks.filter(c => !c.pass && c.applicable !== false);
  const failedCount = failedChecks.length;
  const naCount = totalChecks - passedCount - failedCount;
  const passRate = totalChecks > 0 ? Math.round((passedCount / totalChecks) * 100) : 0;

  // Benchmark averages (from 2000+ real scans)
  const AVG_SEO = 52, AVG_AEO = 28, AVG_GEO = 13;

  // Compute category breakdown
  const catMap = {};
  allChecks.forEach(function(c) {
    const cat = CHECK_CATEGORIES[c.id] || 'other';
    if (!catMap[cat]) catMap[cat] = { name: cat.charAt(0).toUpperCase() + cat.slice(1), passed: 0, failed: 0 };
    if (c.pass) catMap[cat].passed++;
    else if (c.applicable !== false) catMap[cat].failed++;
  });
  const categoryData = Object.values(catMap).sort(function(a, b) { return (b.passed + b.failed) - (a.passed + a.failed); });

  // Priority counts
  const critCount = failedChecks.filter(c => getCheckMetadata(c.id).priority === 'critical').length;
  const highCount = failedChecks.filter(c => getCheckMetadata(c.id).priority === 'high').length;
  const medCount = failedChecks.filter(c => getCheckMetadata(c.id).priority === 'medium').length;
  const lowCount = failedChecks.filter(c => getCheckMetadata(c.id).priority === 'low').length;

  // ================================================================
  // PAGE 1: EXECUTIVE SUMMARY
  // ================================================================

  // Full-width gradient header
  drawGradientRect(doc, 0, 0, 210, 48, [79, 70, 229], [139, 92, 246]);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('SEO \u00B7 AEO \u00B7 GEO Audit Report', 105, 15, { align: 'center' });

  // Domain + date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(224, 220, 255);
  doc.text(domain, 105, 23, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Scanned on ' + date, 105, 29, { align: 'center' });

  // Site type badge
  if (siteTypeLabel) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    const bw = doc.getTextWidth(siteTypeLabel) + 10;
    doc.setFillColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.2 }));
    doc.roundedRect(105 - bw / 2, 33, bw, 6, 3, 3, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setTextColor(255, 255, 255);
    doc.text(siteTypeLabel, 105, 37, { align: 'center' });
  }

  // Grade badge (top-right corner)
  doc.setFillColor(255, 255, 255);
  doc.setGState(new doc.GState({ opacity: 0.15 }));
  doc.roundedRect(170, 6, 28, 28, 4, 4, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(grade, 184, 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('GRADE', 184, 30, { align: 'center' });

  // --- GAUGE METER (center) ---
  const gaugeImg = createGaugeImage(overall, 360);
  doc.addImage(gaugeImg, 'PNG', 55, 50, 100, 65);

  // --- 3 SCORE CIRCLES ROW ---
  const circleY = 118;
  const scoreItems = [
    { score: seo.score, label: 'SEO', color: '#10B981' },
    { score: aeo.score, label: 'AEO', color: '#8B5CF6' },
    { score: geo.score, label: 'GEO', color: '#F59E0B' },
  ];
  if (cwv.score != null) {
    scoreItems.push({ score: cwv.score, label: 'CWV', color: '#3B82F6' });
  }

  const circW = 28;
  const circGap = 180 / scoreItems.length;
  scoreItems.forEach(function(s, i) {
    const cx = 15 + circGap * i + circGap / 2;
    const img = createScoreCircleImage(s.score, s.color, 220);
    doc.addImage(img, 'PNG', cx - circW / 2, circleY, circW, circW);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRGB(s.color));
    doc.text(s.label, cx, circleY + circW + 4, { align: 'center' });
  });

  // --- BENCHMARK BAR CHART + DONUT (side by side) ---
  const chartY = circleY + circW + 10;

  // Section title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Benchmark Comparison', 15, chartY);
  doc.text('Check Distribution', 125, chartY);

  // Benchmark bars (left side)
  const benchImg = createBenchmarkBarsImage(
    [seo.score, aeo.score, geo.score],
    [AVG_SEO, AVG_AEO, AVG_GEO],
    480
  );
  doc.addImage(benchImg, 'PNG', 15, chartY + 3, 100, 55);

  // Donut chart (right side)
  const donutImg = createDonutImage(passedCount, failedCount, naCount, 280);
  doc.addImage(donutImg, 'PNG', 130, chartY + 1, 55, 55);

  // --- STATS ROW (5 boxes) ---
  const statsY = chartY + 62;
  const statsW = 34;
  const statsGap = 1.5;
  const statsItems = [
    { value: String(totalChecks), label: 'Total Checks', color: [79, 70, 229], bg: [238, 242, 255] },
    { value: String(passedCount), label: 'Passed',        color: [5, 150, 105],  bg: [236, 253, 245] },
    { value: String(failedCount), label: 'Failed',        color: [220, 38, 38],  bg: [254, 242, 242] },
    { value: String(quickWins.length), label: 'Quick Wins', color: [202, 138, 4], bg: [254, 252, 232] },
    { value: passRate + '%',      label: 'Pass Rate',     color: [30, 64, 175],  bg: [239, 246, 255] },
  ];

  statsItems.forEach(function(s, i) {
    const sx = 15 + i * (statsW + statsGap);

    // Card background
    doc.setFillColor(s.bg[0], s.bg[1], s.bg[2]);
    doc.roundedRect(sx, statsY, statsW, 18, 2.5, 2.5, 'F');

    // Value
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.text(s.value, sx + statsW / 2, statsY + 9, { align: 'center' });

    // Label
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(s.label, sx + statsW / 2, statsY + 14.5, { align: 'center' });
  });

  // ================================================================
  // PAGE 2: ISSUES & QUICK WINS
  // ================================================================
  doc.addPage();
  drawMiniHeader(doc, domain, 'Issues & Quick Wins');

  let y2 = 16;

  // --- PRIORITY DISTRIBUTION: 4 colored boxes ---
  y2 = drawSectionTitle(doc, 'Priority Distribution', y2);
  const priData = [
    { count: critCount, label: 'Critical', color: [239, 68, 68], bg: [254, 226, 226] },
    { count: highCount, label: 'High',     color: [245, 158, 11], bg: [254, 243, 199] },
    { count: medCount,  label: 'Medium',   color: [234, 179, 8],  bg: [254, 249, 195] },
    { count: lowCount,  label: 'Low',      color: [156, 163, 175], bg: [243, 244, 246] },
  ];
  const priBoxW = 42;
  priData.forEach(function(p, i) {
    const px = 15 + i * 45;
    doc.setFillColor(p.bg[0], p.bg[1], p.bg[2]);
    doc.roundedRect(px, y2, priBoxW, 20, 3, 3, 'F');
    // Left accent bar
    doc.setFillColor(p.color[0], p.color[1], p.color[2]);
    doc.roundedRect(px, y2, 2.5, 20, 1.5, 1.5, 'F');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(p.color[0], p.color[1], p.color[2]);
    doc.text(String(p.count), px + priBoxW / 2, y2 + 10, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(p.label, px + priBoxW / 2, y2 + 16.5, { align: 'center' });
  });
  y2 += 26;

  // --- TOP 5 QUICK WINS ---
  y2 = drawSectionTitle(doc, 'Top Quick Wins', y2);
  const qwMax = Math.min(quickWins.length, 5);
  if (qwMax > 0) {
    for (let qi = 0; qi < qwMax; qi++) {
      if (y2 > 250) { doc.addPage(); drawMiniHeader(doc, domain, 'Quick Wins (cont.)'); y2 = 16; }
      const qw = quickWins[qi];
      const meta = getCheckMetadata(qw.id);
      const pConf = priorityConfig[meta.priority] || {};
      const pCol = hexToRGB(pConf.color || '#6b7280');

      // Card background
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(15, y2, 180, 20, 2.5, 2.5, 'F');
      // Left priority bar
      doc.setFillColor(pCol[0], pCol[1], pCol[2]);
      doc.roundedRect(15, y2, 2.5, 20, 1.5, 1.5, 'F');

      // Priority badge
      const badgeLbl = (pConf.label || 'Medium').toUpperCase();
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      const bw = doc.getTextWidth(badgeLbl) + 4;
      doc.setFillColor(pCol[0], pCol[1], pCol[2]);
      doc.roundedRect(20, y2 + 1.5, bw, 4.5, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(badgeLbl, 20 + bw / 2, y2 + 4.5, { align: 'center' });

      // Issue label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const issueLines = doc.splitTextToSize(qw.label, 140);
      doc.text(issueLines[0], 20 + bw + 3, y2 + 4.5);

      // Business impact
      if (meta.businessImpact) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 53, 15);
        const impLines = doc.splitTextToSize('Impact: ' + meta.businessImpact, 165);
        doc.text(impLines.slice(0, 2), 20, y2 + 9);
      }

      // Fix instructions
      if (meta.fix) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(5, 122, 85);
        const fixLines = doc.splitTextToSize('Fix: ' + meta.fix, 165);
        doc.text(fixLines.slice(0, 2), 20, y2 + 14.5);
      }

      y2 += 23;
    }
  } else {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(15, y2, 180, 10, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('No quick wins needed - great job!', 105, y2 + 6, { align: 'center' });
    y2 += 14;
  }

  // --- CATEGORY BREAKDOWN (stacked bars) ---
  if (y2 > 200) { doc.addPage(); drawMiniHeader(doc, domain, 'Category Breakdown'); y2 = 16; }
  y2 = drawSectionTitle(doc, 'Category Breakdown', y2);

  if (categoryData.length > 0) {
    const catBarsImg = createCategoryBarsImage(categoryData.slice(0, 12), 540);
    const catImgH = Math.min(categoryData.length * 5 + 10, 90);
    doc.addImage(catBarsImg, 'PNG', 15, y2, 180, catImgH);
    y2 += catImgH + 4;
  }

  // ================================================================
  // PAGE 3+: DETAILED RESULTS — FAILED CHECKS TABLE
  // ================================================================
  doc.addPage();
  drawMiniHeader(doc, domain, 'Failed Checks');

  let ftY = 16;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Failed Checks \u2014 Issues to Fix (' + failedCount + ')', 15, ftY);
  ftY += 4;

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const failedRows = failedChecks
    .map(function(c) {
      const meta = getCheckMetadata(c.id);
      const cat = CHECK_CATEGORIES[c.id] || 'other';
      return {
        priority: meta.priority || 'medium',
        category: cat.charAt(0).toUpperCase() + cat.slice(1),
        label: c.label,
        impact: meta.businessImpact || '-',
        fix: meta.fix || '-',
      };
    })
    .sort(function(a, b) { return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2); });

  const priorityColors = {
    critical: [239, 68, 68],
    high: [245, 158, 11],
    medium: [234, 179, 8],
    low: [156, 163, 175],
  };

  if (failedRows.length > 0) {
    doc.autoTable({
      startY: ftY,
      head: [['Priority', 'Category', 'Issue', 'Business Impact', 'How to Fix']],
      body: failedRows.map(function(r) {
        return [
          (r.priority || 'medium').toUpperCase(),
          r.category,
          r.label,
          r.impact,
          r.fix,
        ];
      }),
      styles: {
        fontSize: 6,
        cellPadding: 2,
        lineColor: [229, 231, 235],
        lineWidth: 0.15,
        overflow: 'linebreak',
        font: 'helvetica',
        textColor: [55, 65, 81],
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      columnStyles: {
        0: { cellWidth: 17, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 18 },
        2: { cellWidth: 50 },
        3: { cellWidth: 46 },
        4: { cellWidth: 49 },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      rowPageBreak: 'avoid',
      didParseCell: function(hookData) {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          var pKey = hookData.cell.raw.toLowerCase();
          var pCol = priorityColors[pKey];
          if (pCol) {
            hookData.cell.styles.fillColor = pCol;
            hookData.cell.styles.textColor = [255, 255, 255];
          }
        }
        // Highlight critical/high rows
        if (hookData.section === 'body' && hookData.column.index > 0) {
          var rowPriority = hookData.row.raw[0].toLowerCase();
          if (rowPriority === 'critical') {
            hookData.cell.styles.fillColor = [254, 242, 242];
          } else if (rowPriority === 'high') {
            hookData.cell.styles.fillColor = [255, 251, 235];
          }
        }
      },
      didDrawPage: function(hookData) {
        if (hookData.pageNumber > 1) {
          drawMiniHeader(doc, domain, 'Failed Checks (cont.)');
        }
      },
      margin: { left: 15, right: 15, top: 14 },
    });
  } else {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(15, ftY, 180, 14, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('All checks passed! No issues found.', 105, ftY + 8.5, { align: 'center' });
  }

  // ================================================================
  // PASSED CHECKS PAGE(S)
  // ================================================================
  doc.addPage();
  drawMiniHeader(doc, domain, 'Passed Checks');

  let passY = 16;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Passed Checks \u2014 What\'s Working Well (' + passedCount + ')', 15, passY);
  passY += 5;

  var passedSections = [
    { title: 'SEO', checks: seo.checks, color: [16, 185, 129] },
    { title: 'AEO', checks: aeo.checks, color: [139, 92, 246] },
    { title: 'GEO', checks: geo.checks, color: [245, 158, 11] },
  ];
  if (cwv.score != null && cwv.checks && cwv.checks.length > 0) {
    passedSections.push({ title: 'Core Web Vitals', checks: cwv.checks, color: [59, 130, 246] });
  }

  passedSections.forEach(function(section) {
    var passed = section.checks.filter(function(c) { return c.pass && c.applicable !== false; });
    if (passed.length === 0) return;

    var rows = passed.map(function(c) { return [c.label]; });

    doc.autoTable({
      startY: passY,
      head: [[section.title + ' (' + passed.length + ' passed)']],
      body: rows,
      styles: {
        fontSize: 6.5,
        cellPadding: 1.8,
        lineColor: [229, 231, 235],
        lineWidth: 0.15,
        overflow: 'linebreak',
        font: 'helvetica',
        textColor: [55, 65, 81],
      },
      headStyles: {
        fillColor: section.color,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      rowPageBreak: 'avoid',
      didParseCell: function(hookData) {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          hookData.cell.text = ['\u2713  ' + hookData.cell.raw];
        }
      },
      didDrawPage: function(hookData) {
        if (hookData.pageNumber > 1) {
          drawMiniHeader(doc, domain, 'Passed Checks (cont.)');
        }
      },
      margin: { left: 15, right: 15, top: 14 },
    });

    passY = doc.lastAutoTable.finalY + 5;
  });

  // ================================================================
  // LAST PAGE: SUMMARY — RADAR CHART + NEXT STEPS + BRANDING
  // ================================================================
  doc.addPage();
  drawMiniHeader(doc, domain, 'Summary & Next Steps');

  let sumY = 16;

  // --- RADAR CHART ---
  // Compute category scores for radar axes
  var radarCategories = {};
  var radarCats = ['meta', 'content', 'schema', 'images', 'links', 'performance'];
  var radarLabels = { meta: 'Technical', content: 'Content', schema: 'Schema', images: 'Images', links: 'Authority', performance: 'Performance' };
  radarCats.forEach(function(rc) {
    var catChecks = allChecks.filter(function(c) { return (CHECK_CATEGORIES[c.id] || 'other') === rc; });
    if (catChecks.length === 0) return;
    var p = catChecks.filter(function(c) { return c.pass; }).length;
    radarCategories[radarLabels[rc] || rc] = Math.round((p / catChecks.length) * 100);
  });
  // Ensure at least 5 axes
  if (Object.keys(radarCategories).length < 5) {
    var extraCats = ['security', 'readability', 'trust', 'keyphrase'];
    extraCats.forEach(function(ec) {
      if (Object.keys(radarCategories).length >= 5) return;
      var ecChecks = allChecks.filter(function(c) { return (CHECK_CATEGORIES[c.id] || 'other') === ec; });
      if (ecChecks.length > 0) {
        var p = ecChecks.filter(function(c) { return c.pass; }).length;
        radarCategories[ec.charAt(0).toUpperCase() + ec.slice(1)] = Math.round((p / ecChecks.length) * 100);
      }
    });
  }

  if (Object.keys(radarCategories).length >= 3) {
    sumY = drawSectionTitle(doc, 'Performance Radar', sumY);
    var radarImg = createRadarImage(radarCategories, 400);
    doc.addImage(radarImg, 'PNG', 40, sumY, 130, 130);
    sumY += 136;
  }

  // --- 3 NEXT STEPS ---
  if (sumY > 240) { doc.addPage(); drawMiniHeader(doc, domain, 'Next Steps'); sumY = 16; }
  sumY = drawSectionTitle(doc, 'Recommended Next Steps', sumY);

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(15, sumY, 180, 40, 3, 3, 'F');
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, sumY, 180, 40, 3, 3, 'S');

  var nsCards = [];
  if (overall >= 90) {
    nsCards.push({ num: '1', title: 'Maintain Excellence', desc: 'Monitor weekly to keep your high scores. Focus on emerging AI optimization trends and stay ahead.', color: [16, 185, 129] });
  } else if (overall >= 70) {
    nsCards.push({ num: '1', title: 'Fix Quick Wins First', desc: 'Start with ' + critCount + ' CRITICAL + LOW effort items. These can boost your score by 10-20 points quickly.', color: [245, 158, 11] });
  } else {
    nsCards.push({ num: '1', title: 'Address Critical Issues', desc: critCount + ' critical issues need immediate attention. Your site is likely losing significant organic traffic.', color: [239, 68, 68] });
  }
  nsCards.push({ num: '2', title: 'Track Your Progress', desc: 'Re-scan weekly after implementing fixes. Export CSV to track score improvements over time.', color: [139, 92, 246] });
  nsCards.push({ num: '3', title: 'Automate with Plugin', desc: 'Using WordPress? Install SEO Autopilot for one-click auto-fixes on 65+ issues with full undo support.', color: [6, 182, 212] });

  nsCards.forEach(function(card, i) {
    var cx = 18 + i * 60;
    var cy = sumY + 3;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, cy, 56, 34, 2.5, 2.5, 'F');

    // Number circle
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.circle(cx + 6, cy + 6, 3.5, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(card.num, cx + 6, cy + 7, { align: 'center' });

    // Title
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.title, cx + 12, cy + 7);

    // Description
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    var dLines = doc.splitTextToSize(card.desc, 50);
    doc.text(dLines.slice(0, 4), cx + 4, cy + 13);
  });
  sumY += 48;

  // --- BRANDING FOOTER ---
  if (sumY > 260) sumY = 260;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.4);
  doc.line(55, sumY, 155, sumY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('Generated by seoscore.tools', 105, sumY + 7, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Free SEO, AEO & GEO Scanner  |  260+ Checks  |  WordPress Plugin Available', 105, sumY + 12, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text('seoscore.tools/seo-autopilot/', 105, sumY + 17, { align: 'center' });

  // ================================================================
  // TWO-PASS: Page numbers on every page
  // ================================================================
  var totalPages = doc.getNumberOfPages();
  for (var i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, 'Page ' + i + ' of ' + totalPages);
  }

  doc.save('SEO-Report-' + domain + '-' + dateShort + '.pdf');
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
    ...(data.cwv?.score != null ? [['CWV', data.cwv.score, data.cwv.passed, data.cwv.total]] : []),
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
  if (data.cwv?.checks?.length) addChecks('CWV', data.cwv.checks);

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `seoscore-report-${domain}-${date}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ============================================
// Site Crawl Feature
// ============================================

const crawlProgressSection = document.getElementById('crawlProgressSection');
const crawlResultsSection = document.getElementById('crawlResults');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runCrawl(startUrl) {
  const MAX_PAGES = 20;
  const DELAY_MS = 3000;

  const scanned = new Map();
  const queue = [startUrl];
  const visited = new Set();
  visited.add(startUrl);

  const domain = new URL(startUrl).hostname;

  // UI: show crawl progress, hide everything else
  scanBtn.disabled = true;
  scanBtn.querySelector('.scan-btn-text').textContent = getTranslation('crawling').replace('{domain}', domain);
  crawlProgressSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');
  crawlResultsSection.classList.add('hidden');
  scanProgressSection.classList.add('hidden');
  crawlProgressSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('crawlDomainStatus').textContent = domain;
  document.getElementById('crawlBarFill').style.width = '0%';
  document.getElementById('crawlCount').textContent = '0';
  document.getElementById('crawlTotal').textContent = MAX_PAGES;
  document.getElementById('crawlCurrent').textContent = '';

  let retryCount = 0;

  while (queue.length > 0 && scanned.size < MAX_PAGES) {
    const url = queue.shift();
    document.getElementById('crawlCurrent').textContent = url.replace(/^https?:\/\//, '');

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        if (response.status === 429 && retryCount < 2) {
          retryCount++;
          document.getElementById('crawlCurrent').textContent = 'Rate limited — waiting 10s...';
          await sleep(10000);
          queue.unshift(url);
          continue;
        }
        continue;
      }

      retryCount = 0;
      const data = await response.json();
      scanned.set(url, data);

      // Enqueue discovered internal links
      if (data.internalLinks) {
        for (const link of data.internalLinks) {
          if (!visited.has(link) && new URL(link).hostname === domain) {
            visited.add(link);
            queue.push(link);
          }
        }
      }

      // Update progress
      const total = Math.min(queue.length + scanned.size, MAX_PAGES);
      document.getElementById('crawlCount').textContent = scanned.size;
      document.getElementById('crawlTotal').textContent = total;
      document.getElementById('crawlBarFill').style.width = Math.round((scanned.size / total) * 100) + '%';

    } catch (err) {
      console.warn('Crawl error for', url, err);
    }

    // Throttle between requests
    if (queue.length > 0 && scanned.size < MAX_PAGES) {
      await sleep(DELAY_MS);
    }
  }

  // Final progress update
  document.getElementById('crawlBarFill').style.width = '100%';
  document.getElementById('crawlCount').textContent = scanned.size;
  document.getElementById('crawlTotal').textContent = scanned.size;
  document.getElementById('crawlCurrent').textContent = getTranslation('scan_complete');

  // Store and display
  lastCrawlData = scanned;
  displayCrawlResults(domain, scanned);

  // GA4
  trackEvent('crawl_complete', { domain, pages_scanned: scanned.size });

  scanBtn.disabled = false;
  scanBtn.querySelector('.scan-btn-text').textContent = getTranslation('btn_scan');
}

function getScoreClass(score) {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  if (score >= 60) return 'poor';
  return 'bad';
}

function displayCrawlResults(domain, scanned) {
  crawlProgressSection.classList.add('hidden');
  crawlResultsSection.classList.remove('hidden');
  crawlResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const pages = [...scanned.entries()];
  const count = pages.length;

  // 1. Average Scores
  let seoSum = 0, aeoSum = 0, geoSum = 0;
  pages.forEach(([url, data]) => {
    seoSum += data.seo?.score || 0;
    aeoSum += data.aeo?.score || 0;
    geoSum += data.geo?.score || 0;
  });
  const avgSeo = Math.round(seoSum / count);
  const avgAeo = Math.round(aeoSum / count);
  const avgGeo = Math.round(geoSum / count);
  const avgOverall = Math.round(avgSeo * 0.5 + avgAeo * 0.25 + avgGeo * 0.25);

  // Summary text
  document.getElementById('crawlSummary').textContent =
    getTranslation('avgScores').replace('{n}', count) + ' — ' + domain;

  // Score cards (reuse score ring SVG)
  const scoresContainer = document.getElementById('crawlScores');
  scoresContainer.innerHTML = '';
  scoresContainer.className = 'scores-grid';

  function makeScoreCard(label, score, color, isOverall) {
    const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
    const r = isOverall ? 60 : 50;
    const sw = isOverall ? 8 : 6;
    const size = isOverall ? 140 : 100;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (score / 100) * circumference;
    const ringId = 'crawl-ring-' + label.replace(/\s/g, '');
    const textId = 'crawl-text-' + label.replace(/\s/g, '');

    const card = document.createElement('div');
    card.className = 'score-card' + (isOverall ? ' overall-card' : '');
    card.innerHTML = `
      ${isOverall ? '<div class="score-label">' + escapeHtml(label) + '</div>' : '<div class="score-badge" style="background:rgba(0,0,0,0.08);color:' + color + '">' + escapeHtml(label) + '</div>'}
      <div class="score-ring-wrap">
        <svg class="score-ring" viewBox="0 0 ${size+20} ${size+20}" width="${size}" height="${size}">
          <circle cx="${(size+20)/2}" cy="${(size+20)/2}" r="${r}" fill="none" stroke="${isOverall ? 'rgba(255,255,255,0.2)' : 'var(--ring-bg)'}" stroke-width="${sw}"/>
          <circle class="score-ring-fill" id="${ringId}" cx="${(size+20)/2}" cy="${(size+20)/2}" r="${r}" fill="none" stroke="${isOverall ? 'white' : color}" stroke-width="${sw}" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"/>
        </svg>
        <div class="score-value ${isOverall ? '' : 'score-value-sm'}" id="${textId}">0</div>
      </div>
      ${isOverall ? '<div class="score-grade">' + grade + '</div>' : ''}
    `;
    scoresContainer.appendChild(card);

    // Animate
    setTimeout(() => animateScore(textId, ringId, score, circumference, isOverall ? null : color), 100);
  }

  makeScoreCard(getTranslation('score_overall'), avgOverall, null, true);
  makeScoreCard('SEO', avgSeo, '#10B981', false);
  makeScoreCard('AEO', avgAeo, '#8B5CF6', false);
  makeScoreCard('GEO', avgGeo, '#F59E0B', false);

  // 2. Page Table (sorted by issues descending)
  const tbody = document.getElementById('crawlTableBody');
  tbody.innerHTML = '';

  const tableRows = pages.map(([url, data]) => {
    const seo = data.seo?.score || 0;
    const aeo = data.aeo?.score || 0;
    const geo = data.geo?.score || 0;
    const allChecks = [...(data.seo?.checks||[]), ...(data.aeo?.checks||[]), ...(data.geo?.checks||[])];
    const fails = allChecks.filter(c => !c.pass && c.applicable !== false).length;
    return { url, seo, aeo, geo, fails };
  }).sort((a, b) => b.fails - a.fails);

  tableRows.forEach(row => {
    const tr = document.createElement('tr');
    const shortUrl = row.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    tr.innerHTML = `
      <td><span class="page-url" title="${escapeHtml(row.url)}">${escapeHtml(shortUrl)}</span></td>
      <td><span class="score-cell ${getScoreClass(row.seo)}">${row.seo}</span></td>
      <td><span class="score-cell ${getScoreClass(row.aeo)}">${row.aeo}</span></td>
      <td><span class="score-cell ${getScoreClass(row.geo)}">${row.geo}</span></td>
      <td><span class="score-cell ${row.fails > 0 ? 'bad' : 'excellent'}">${row.fails}</span></td>
    `;
    // Click page URL to scan it individually
    tr.querySelector('.page-url').addEventListener('click', () => {
      scanMode = 'page';
      document.querySelectorAll('.scan-mode').forEach(b => b.classList.remove('active'));
      document.getElementById('modePage').classList.add('active');
      urlInput.value = row.url;
      crawlResultsSection.classList.add('hidden');
      scanForm.requestSubmit();
    });
    tbody.appendChild(tr);
  });

  // 3. Top Issues (aggregate fails across all pages)
  const issueCounts = {};
  pages.forEach(([url, data]) => {
    const allChecks = [...(data.seo?.checks||[]), ...(data.aeo?.checks||[]), ...(data.geo?.checks||[])];
    allChecks.forEach(c => {
      if (!c.pass && c.applicable !== false) {
        if (!issueCounts[c.id]) {
          issueCounts[c.id] = { id: c.id, label: c.label, count: 0 };
        }
        issueCounts[c.id].count++;
      }
    });
  });

  const topIssues = Object.values(issueCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const issuesContainer = document.getElementById('crawlIssues');
  issuesContainer.innerHTML = '';

  topIssues.forEach(issue => {
    const pct = Math.round((issue.count / count) * 100);
    const div = document.createElement('div');
    div.className = 'crawl-issue';
    div.innerHTML = `
      <span class="crawl-issue-count">${issue.count}/${count}</span>
      <span class="crawl-issue-label">${escapeHtml(issue.label)}</span>
      <div class="crawl-issue-bar"><div class="crawl-issue-bar-fill" style="width:${pct}%"></div></div>
    `;
    issuesContainer.appendChild(div);
  });
}

// --- Crawl CSV Export ---
document.getElementById('crawlExportCsv')?.addEventListener('click', () => {
  if (!lastCrawlData || lastCrawlData.size === 0) return;
  trackEvent('export', { format: 'csv_crawl' });
  generateCrawlCsv(lastCrawlData);
});

function generateCrawlCsv(scanned) {
  const pages = [...scanned.entries()];
  const date = new Date().toISOString().split('T')[0];
  const domain = new URL(pages[0][0]).hostname;

  const rows = [
    ['Site Crawl Report', domain, date],
    ['Generated by', 'seoscore.tools', ''],
    ['Pages scanned', pages.length, ''],
    [''],
    ['URL', 'SEO Score', 'AEO Score', 'GEO Score', 'Overall', 'Failed Checks'],
  ];

  pages.forEach(([url, data]) => {
    const seo = data.seo?.score || 0;
    const aeo = data.aeo?.score || 0;
    const geo = data.geo?.score || 0;
    const overall = Math.round(seo * 0.5 + aeo * 0.25 + geo * 0.25);
    const allChecks = [...(data.seo?.checks||[]), ...(data.aeo?.checks||[]), ...(data.geo?.checks||[])];
    const fails = allChecks.filter(c => !c.pass && c.applicable !== false).length;
    rows.push([`"${url}"`, seo, aeo, geo, overall, fails]);
  });

  // Add all individual fails
  rows.push(['']);
  rows.push(['All Failed Checks', '', '', '', '', '']);
  rows.push(['URL', 'Check ID', 'Category', 'Description']);

  pages.forEach(([url, data]) => {
    const cats = { seo: data.seo?.checks || [], aeo: data.aeo?.checks || [], geo: data.geo?.checks || [] };
    for (const [cat, checks] of Object.entries(cats)) {
      checks.filter(c => !c.pass && c.applicable !== false).forEach(c => {
        rows.push([`"${url}"`, c.id, cat.toUpperCase(), `"${c.label.replace(/"/g, '""')}"`]);
      });
    }
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `seoscore-site-report-${domain}-${date}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// --- Crawl Again Button ---
document.getElementById('crawlAgainBtn')?.addEventListener('click', () => {
  crawlResultsSection.classList.add('hidden');
  heroSection.scrollIntoView({ behavior: 'smooth' });
  urlInput.value = '';
  urlInput.focus();
});

