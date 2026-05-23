# Legacy / One-shot Scripts

Diese Scripts wurden einmalig ausgeführt und stehen hier nur als Referenz. **Nicht erneut ausführen ohne genau zu wissen, was passiert** — sie schreiben direkt in `src/site/` oder andere Repo-Pfade.

| Script | Zweck |
|---|---|
| `apply_aeo_geo.py` | AEO/GEO-Sektionen in existierende Blog-Posts einsetzen |
| `fix-canonicals.ps1` | Canonical-Tags auf übersetzten Seiten korrigieren |
| `fix-mojibake.py`, `fix-mojibake-v2.py` | UTF-8 Mojibake in Blog-Texten reparieren |
| `fix-rel-tags.ps1` | `rel`-Attribute auf externen Links setzen |
| `generate-og-image.js`, `generate-og-image.py` | OG-Image via Puppeteer/Pillow generieren |
| `update-checks.py` | Check-Liste batch-update |
| `scan-check.js`, `parse-scan.js` | Scan-Output analysieren |
| `logo-impact.html` | Standalone-Page zum Visualisieren des Logos |

Existierende Scripts in `scripts/`:
- `upgrade-blog-ctas.js` — Blog CTAs upgraden
- `fix_ctr_titles.py` — Title-CTR-Tweaks
- `fix_homepage_autopilot_llms.py` — Homepage LLMS.txt-Block updaten
