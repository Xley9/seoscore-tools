# Backlog — seoscore.tools

Features that were considered but **not** built. Each entry has a clear
trigger condition (when it makes sense to build) so you don't have to
re-evaluate from scratch later.

---

## 🟢 BUILD AFTER PLUGIN LAUNCH — Context-Aware Plugin/Tool Recommendations

**What:** After a scan finishes, the result page shows a personalized
recommendation card based on the detected platform + site type, linking
to whichever commercial product is the best fit for fixing that user's
specific issues.

**Trigger condition:** SEO Autopilot WP Plugin live on Gumroad / Content-OS
live with public download. Without that, the recommendation links to
"Coming soon" pages and tanks conversion.

**Conversion math (estimated):**
- Sessions/month × % with detected platform × CTR on personalized CTA × buy rate
- At 600 sessions/mo (current): ~0.5-1 extra plugin sale/month
- At 5,000 sessions/mo: 4-8 extra plugin sales/month
- At 100,000 sessions/mo: 80-160 extra plugin sales/month
- Scales linearly with traffic, so the value compounds with seoscore.tools growth

**Mapping table (final design — refine before build):**

| Detected platform | Detected site type | CTA shown |
|---|---|---|
| `wordpress` | `blog` | "SEO Autopilot WP Plugin would auto-fix N of these issues — $79 one-time" |
| `wordpress` | `ecommerce` (Woo) | "SEO Autopilot Pro has WooCommerce-specific fixes for these N issues" |
| `wordpress` | `corporate` / `saas` | "SEO Autopilot WP Plugin handles N of these in one click" |
| `shopify` | `ecommerce` | "Content-OS Desktop generates SEO-optimized product descriptions in bulk — $49 one-time" |
| `wix` / `squarespace` | any | Two-option card: "Migrate to WP + SEO Autopilot" OR "Manual fix guide" |
| `magento` / `prestashop` | `ecommerce` | "Content-OS Desktop App for bulk product description optimization" |
| `astro` / `nextjs` / `gatsby` | any | "Browser-based fix guide" (no commercial product fits here yet) |
| `default` (unknown) | any | Generic CTA: "Get the SEO Audit Checklist PDF" → existing /blog/seo-audit-checklist-pdf/ |

**Where to implement:**
- Detected platform + site type already in scan response (`siteType.detectedCms`, `siteType.siteType` from `src/worker/site-detector.js`)
- Just need a `recommendations.js` module in `src/site/` that maps the two values → CTA card HTML
- Inject into the result-rendering code in `src/site/app.js` near where the existing static plugin CTA is rendered
- Count the fixable issues per product (which checks SEO Autopilot auto-fixes vs which need manual work) — this is the killer detail that makes the CTA specific not generic

**Estimated effort:** 2-3 hours

**Dependencies:**
- SEO Autopilot WP Plugin must be live with a real Gumroad / payment URL
- Content-OS must be live with a real download / payment URL
- A static JSON file listing which check IDs each product fixes (build this once, reuse in CTA logic)

---

## ⚪ NOT BUILDING — Considered and Declined

### Improved platform detection (more HTML patterns)
- **Why declined:** Current detector in `src/worker/site-detector.js` already handles 8+ platforms + 5 site types with reasonable confidence. Diminishing returns on adding more patterns. The Context-Aware Recommendations above use the existing detection — improving detection accuracy from 85% to 95% would add ~10% more accurate CTAs, not transformative.

### Score projection ("Fix 3 issues → Score 92")
- **Why declined:** No revenue tie. Risk of inaccurate projections damaging tool credibility. If revisited, build the conservative range version: *"Fixing the N Critical issues should improve your score by approximately X-Y points"* — never a point estimate.

### Scan-history UI
- **Why declined:** History is already saved in `localStorage` (key `seoscore-history`, max 20 entries — see `src/site/app.js:656-668`). What's missing is the UI (dropdown / sidebar). Pure polish, no revenue tie, only worth building if user-retention metrics start mattering for sale-readiness.

---

## How to use this backlog

When you finish a launch milestone and have free engineering hours, come
back here. Read the trigger conditions first — if they're not met, don't
build, even if the feature sounds appealing in the moment. The trigger
conditions exist because past-you was disciplined about not introducing
scope creep at the wrong time.

When a trigger fires:
1. Re-read the feature spec
2. Validate the conversion math against current traffic
3. Build the smallest version that ships value
4. Update this backlog with the actual outcome (so future decisions have data)

Last updated: 2026-05-23
