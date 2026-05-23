/**
 * CWV Check Engine — 8 checks
 * Core Web Vitals via Google PageSpeed Insights API
 */

export function runCwvChecks(psiData) {
  if (!psiData) return { score: null, checks: [], passed: 0, total: 0 };

  // Validate PSI response structure
  if (!psiData.lighthouseResult) {
    return { score: null, checks: [{ id: 'cwv_error', label: 'Core Web Vitals data unavailable — PageSpeed API did not return results', pass: false, severity: 'warning', category: 'performance' }], passed: 0, total: 1 };
  }

  const checks = [];
  const audits = psiData.lighthouseResult.audits || {};
  const perfScore = psiData.lighthouseResult.categories?.performance?.score;

  // 1. Performance Score
  const perfPct = perfScore != null ? Math.round(perfScore * 100) : null;
  if (perfPct != null) {
    checks.push({
      id: 'cwv_performance',
      label: perfPct >= 90 ? `Performance Score: ${perfPct} (excellent)` : perfPct >= 50 ? `Performance Score: ${perfPct} (needs improvement)` : `Performance Score: ${perfPct} (poor)`,
      pass: perfPct >= 50,
      severity: perfPct < 50 ? 'error' : perfPct < 90 ? 'warning' : undefined,
      category: 'performance',
      value: perfPct,
    });
  }

  // 2. Largest Contentful Paint (LCP) — good: ≤2.5s
  const lcp = audits['largest-contentful-paint'];
  if (lcp?.numericValue != null) {
    const lcpSec = (lcp.numericValue / 1000).toFixed(1);
    checks.push({
      id: 'cwv_lcp',
      label: lcp.numericValue <= 2500 ? `LCP: ${lcpSec}s (good)` : lcp.numericValue <= 4000 ? `LCP: ${lcpSec}s (needs improvement — aim for ≤2.5s)` : `LCP: ${lcpSec}s (poor — must be under 2.5s)`,
      pass: lcp.numericValue <= 2500,
      severity: lcp.numericValue > 4000 ? 'error' : 'warning',
      category: 'performance',
      value: parseFloat(lcpSec),
    });
  }

  // 3. Cumulative Layout Shift (CLS) — good: ≤0.1
  const cls = audits['cumulative-layout-shift'];
  if (cls?.numericValue != null) {
    const clsVal = cls.numericValue.toFixed(3);
    checks.push({
      id: 'cwv_cls',
      label: cls.numericValue <= 0.1 ? `CLS: ${clsVal} (good — stable layout)` : cls.numericValue <= 0.25 ? `CLS: ${clsVal} (needs improvement — aim for ≤0.1)` : `CLS: ${clsVal} (poor — layout shifts detected)`,
      pass: cls.numericValue <= 0.1,
      severity: cls.numericValue > 0.25 ? 'error' : 'warning',
      category: 'performance',
      value: parseFloat(clsVal),
    });
  }

  // 4. First Contentful Paint (FCP) — good: ≤1.8s
  const fcp = audits['first-contentful-paint'];
  if (fcp?.numericValue != null) {
    const fcpSec = (fcp.numericValue / 1000).toFixed(1);
    checks.push({
      id: 'cwv_fcp',
      label: fcp.numericValue <= 1800 ? `FCP: ${fcpSec}s (good)` : fcp.numericValue <= 3000 ? `FCP: ${fcpSec}s (needs improvement — aim for ≤1.8s)` : `FCP: ${fcpSec}s (poor — first paint too slow)`,
      pass: fcp.numericValue <= 1800,
      severity: fcp.numericValue > 3000 ? 'error' : 'warning',
      category: 'performance',
      value: parseFloat(fcpSec),
    });
  }

  // 5. Total Blocking Time (TBT) — good: ≤200ms
  const tbt = audits['total-blocking-time'];
  if (tbt?.numericValue != null) {
    const tbtMs = Math.round(tbt.numericValue);
    checks.push({
      id: 'cwv_tbt',
      label: tbtMs <= 200 ? `TBT: ${tbtMs}ms (good — minimal blocking)` : tbtMs <= 600 ? `TBT: ${tbtMs}ms (needs improvement — aim for ≤200ms)` : `TBT: ${tbtMs}ms (poor — excessive blocking)`,
      pass: tbtMs <= 200,
      severity: tbtMs > 600 ? 'error' : 'warning',
      category: 'performance',
      value: tbtMs,
    });
  }

  // 6. Speed Index — good: ≤3.4s
  const si = audits['speed-index'];
  if (si?.numericValue != null) {
    const siSec = (si.numericValue / 1000).toFixed(1);
    checks.push({
      id: 'cwv_speed_index',
      label: si.numericValue <= 3400 ? `Speed Index: ${siSec}s (good)` : si.numericValue <= 5800 ? `Speed Index: ${siSec}s (needs improvement — aim for ≤3.4s)` : `Speed Index: ${siSec}s (poor)`,
      pass: si.numericValue <= 3400,
      severity: si.numericValue > 5800 ? 'error' : 'warning',
      category: 'performance',
      value: parseFloat(siSec),
    });
  }

  // 7. Interaction to Next Paint (INP) — good: ≤200ms
  const inp = audits['interaction-to-next-paint'];
  if (inp?.numericValue != null) {
    const inpMs = Math.round(inp.numericValue);
    checks.push({
      id: 'cwv_inp',
      label: inpMs <= 200 ? `INP: ${inpMs}ms (good — responsive interactions)` : inpMs <= 500 ? `INP: ${inpMs}ms (needs improvement — aim for ≤200ms)` : `INP: ${inpMs}ms (poor — interactions feel sluggish)`,
      pass: inpMs <= 200,
      severity: inpMs > 500 ? 'error' : 'warning',
      category: 'performance',
      value: inpMs,
    });
  }

  // 8. Time to First Byte (TTFB) — good: ≤800ms
  const ttfb = audits['server-response-time'];
  if (ttfb?.numericValue != null) {
    const ttfbMs = Math.round(ttfb.numericValue);
    checks.push({
      id: 'cwv_ttfb',
      label: ttfbMs <= 800 ? `TTFB: ${ttfbMs}ms (good — fast server response)` : ttfbMs <= 1800 ? `TTFB: ${ttfbMs}ms (needs improvement — aim for ≤800ms)` : `TTFB: ${ttfbMs}ms (poor — slow server response)`,
      pass: ttfbMs <= 800,
      severity: ttfbMs > 1800 ? 'error' : 'warning',
      category: 'performance',
      value: ttfbMs,
    });
  }

  const passed = checks.filter(c => c.pass).length;
  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : null;

  return { score, checks, passed, total: checks.length };
}
