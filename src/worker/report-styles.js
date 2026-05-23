// Public report page styles.
//
// Inlined in the <head> of /report/:slug/ pages so the report renders in
// a single round-trip (no extra stylesheet fetch from KV-backed HTML).
// Worker bundle, not the static site CSS — kept here only because it's
// only referenced from generateReportHtml in index.js.

export const REPORT_STYLES = `
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0F172A;--bg-card:#1E293B;--bg-card-hover:#263348;--text:#F1F5F9;--text-muted:#94A3B8;--border:#334155;--green:#10B981;--purple:#8B5CF6;--orange:#F59E0B;--red:#EF4444;--blue:#3B82F6;--radius:12px}
@media(prefers-color-scheme:light){:root{--bg:#F8FAFC;--bg-card:#FFFFFF;--bg-card-hover:#F1F5F9;--text:#0F172A;--text-muted:#64748B;--border:#E2E8F0}}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}
a{color:var(--green);text-decoration:none}
a:hover{text-decoration:underline}
.container{max-width:900px;margin:0 auto;padding:24px 16px}
header{text-align:center;padding:32px 0 16px}
.logo{font-size:22px;font-weight:700;letter-spacing:-0.5px}
.logo span{background:linear-gradient(135deg,var(--green),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.report-badge{display:inline-block;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:4px 14px;font-size:12px;color:var(--text-muted);margin-top:8px}
.hero-report{text-align:center;padding:24px 0 32px}
.domain-title{font-size:28px;font-weight:700;word-break:break-all;margin-bottom:4px}
.scanned-url{font-size:13px;color:var(--text-muted);word-break:break-all;margin-bottom:4px}
.scan-date{font-size:13px;color:var(--text-muted)}
.gauges{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;margin:32px 0}
.gauge{position:relative;width:130px;height:130px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.gauge-inner{position:absolute;width:100px;height:100px;border-radius:50%;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center}
.gauge-score{font-size:32px;font-weight:800;line-height:1}
.gauge-label{font-size:11px;color:var(--text-muted);margin-top:2px;text-transform:uppercase;letter-spacing:0.5px}
.gauge-sub{font-size:10px;color:var(--text-muted);margin-top:1px}
.gauge-overall{width:160px;height:160px}
.gauge-overall .gauge-inner{width:124px;height:124px}
.gauge-overall .gauge-score{font-size:42px}
.grade{display:inline-block;background:var(--bg-card);border:2px solid var(--border);border-radius:8px;padding:2px 10px;font-size:16px;font-weight:800;margin-top:4px}
.section{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px}
.section-title{font-size:18px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.section-title .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.quick-wins{border-left:3px solid var(--orange)}
.quick-wins .section-title{color:var(--orange)}
.check-group{margin-bottom:16px}
.check-group-title{font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px}
.fail-title{color:var(--red)}
.pass-title{color:var(--green)}
.check-list{list-style:none}
.check-item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px}
.check-item:last-child{border-bottom:none}
.check-icon{flex-shrink:0;width:20px;text-align:center;font-weight:700;font-size:13px}
.check-item.pass .check-icon{color:var(--green)}
.check-item.fail .check-icon{color:var(--red)}
.check-label{flex:1}
.check-cat{font-size:11px;color:var(--text-muted);background:var(--bg);padding:2px 8px;border-radius:10px;white-space:nowrap;align-self:center}
.cta-card{background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(139,92,246,0.1));border:1px solid var(--green);border-radius:var(--radius);padding:24px;text-align:center;margin:24px 0}
.cta-card h3{font-size:18px;margin-bottom:8px}
.cta-card p{color:var(--text-muted);font-size:14px;margin-bottom:16px}
.btn{display:inline-block;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;border:none;text-decoration:none;transition:opacity 0.2s}
.btn:hover{opacity:0.9;text-decoration:none}
.btn-primary{background:linear-gradient(135deg,var(--green),#059669);color:#fff}
.btn-secondary{background:var(--bg-card);border:1px solid var(--border);color:var(--text)}
.btn-ghost{color:var(--text-muted);font-size:12px;padding:6px 12px}
.actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:16px}
footer{text-align:center;padding:32px 0;color:var(--text-muted);font-size:13px;border-top:1px solid var(--border);margin-top:32px}
footer a{color:var(--green)}
.summary-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin:16px 0}
.stat-item{text-align:center;padding:12px;background:var(--bg);border-radius:8px}
.stat-value{font-size:24px;font-weight:700}
.stat-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}
.category-details summary{cursor:pointer;list-style:none;user-select:none}
.category-details summary::-webkit-details-marker{display:none}
.category-details summary::marker{display:none;content:''}
.category-details summary::after{content:'';display:inline-block;width:8px;height:8px;border-right:2px solid var(--text-muted);border-bottom:2px solid var(--text-muted);transform:rotate(45deg);transition:transform 0.2s;margin-left:auto;flex-shrink:0}
.category-details[open] summary::after{transform:rotate(-135deg)}
.issue-count{font-size:13px;font-weight:400;color:var(--text-muted);margin-left:4px}
.remove-link{font-size:11px;color:var(--text-muted)}
@media(max-width:600px){.gauges{gap:16px}.gauge{width:100px;height:100px}.gauge-inner{width:76px;height:76px}.gauge-score{font-size:24px}.gauge-overall{width:130px;height:130px}.gauge-overall .gauge-inner{width:100px;height:100px}.gauge-overall .gauge-score{font-size:34px}.domain-title{font-size:22px}.container{padding:16px 12px}}
`.trim();
