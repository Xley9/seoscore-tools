"""
CTR-Optimization Fix for seoscore.tools
Rewrites titles + meta descriptions for top-performing blog pages across 5 languages.

Based on GSC data analysis 2026-04-21:
- Problem 1: Low CTR (0.14% overall vs industry 1-4%)
- Problem 2: Non-EN titles truncated mid-sentence (critical!)
- Problem 3: Titles lack numbers, specificity, benefit-hooks

This script applies CTR-optimized titles + metas to blog posts across en/de/es/ru/tr.
"""
import re
import sys
from pathlib import Path

SITE = Path(r'C:\Users\Ati\Desktop\seoscore-tools\src\site')
LANGS = ['en', 'de', 'es', 'ru', 'tr']

# CTR-optimized titles + descriptions
# Keep under 60 chars for title, under 160 chars for description
FIXES = {
    'meta-tags-guide': {
        'en': {
            'title': 'Meta Tags for SEO 2026: 15 Title Patterns That Boost CTR',
            'desc': '15 title-tag patterns that boost CTR by 40%. Copy-paste formulas for meta descriptions, Open Graph, canonical, and hreflang tags. Real 2026 examples.',
        },
        'de': {
            'title': 'Meta Tags für SEO 2026: 15 Title-Muster die CTR steigern',
            'desc': '15 Title-Tag-Muster die CTR um 40% steigern. Copy-Paste-Formeln für Meta-Descriptions, Open Graph, Canonical und Hreflang. Echte 2026-Beispiele.',
        },
        'es': {
            'title': 'Meta Tags para SEO 2026: 15 Patrones que Aumentan el CTR',
            'desc': '15 patrones de title tags que aumentan el CTR 40%. Fórmulas copy-paste para meta descriptions, Open Graph, canonical y hreflang. Ejemplos reales 2026.',
        },
        'ru': {
            'title': 'Meta Tags для SEO 2026: 15 шаблонов для роста CTR',
            'desc': '15 шаблонов title-тегов, повышающих CTR на 40%. Формулы для meta description, Open Graph, canonical и hreflang. Примеры 2026 года.',
        },
        'tr': {
            'title': 'SEO için Meta Tags 2026: CTR Artıran 15 Başlık Kalıbı',
            'desc': 'CTR\'yi %40 artıran 15 title-tag kalıbı. Meta description, Open Graph, canonical ve hreflang için kopyala-yapıştır formüller. 2026 örnekleri.',
        },
    },
    'robots-txt-ai': {
        'en': {
            'title': 'Robots.txt for AI Crawlers: Block ChatGPT & Claude (2026)',
            'desc': 'Block or allow GPTBot, ClaudeBot, PerplexityBot, and Google-Extended with copy-paste configs. The 2026 guide to controlling AI crawlers in 5 minutes.',
        },
        'de': {
            'title': 'Robots.txt für KI-Crawler: ChatGPT & Claude blockieren (2026)',
            'desc': 'GPTBot, ClaudeBot, PerplexityBot und Google-Extended mit Copy-Paste-Configs blockieren oder erlauben. Der 2026-Leitfaden in 5 Minuten.',
        },
        'es': {
            'title': 'Robots.txt para Crawlers IA: Bloquear ChatGPT y Claude (2026)',
            'desc': 'Bloquea o permite GPTBot, ClaudeBot, PerplexityBot y Google-Extended con configs copy-paste. La guía 2026 para crawlers IA en 5 minutos.',
        },
        'ru': {
            'title': 'Robots.txt для AI-ботов: Блок ChatGPT и Claude (2026)',
            'desc': 'Блокируйте или разрешайте GPTBot, ClaudeBot, PerplexityBot и Google-Extended с готовыми конфигами. Руководство 2026 за 5 минут.',
        },
        'tr': {
            'title': 'AI Crawler\'lar için Robots.txt: ChatGPT & Claude Engelle (2026)',
            'desc': 'GPTBot, ClaudeBot, PerplexityBot ve Google-Extended\'ı kopyala-yapıştır konfigürasyonlarla engelle veya izin ver. 2026 rehberi, 5 dakikada.',
        },
    },
    'image-seo': {
        'en': {
            'title': 'Image SEO 2026: 12 Alt-Text Patterns That Actually Rank',
            'desc': '12 alt-text patterns that rank images in Google Images + AI search. Filename conventions, compression specs, Schema markup — with real 2026 examples.',
        },
        'de': {
            'title': 'Image SEO 2026: 12 Alt-Text-Muster die wirklich ranken',
            'desc': '12 Alt-Text-Muster die Bilder in Google Images + KI-Suche ranken. Dateinamen-Konventionen, Kompression, Schema-Markup — echte 2026-Beispiele.',
        },
        'es': {
            'title': 'Image SEO 2026: 12 Patrones de Alt-Text que Realmente Rankean',
            'desc': '12 patrones de alt-text que posicionan imágenes en Google Images + búsqueda IA. Nombres de archivo, compresión, Schema — ejemplos reales 2026.',
        },
        'ru': {
            'title': 'Image SEO 2026: 12 шаблонов alt-text для реальных позиций',
            'desc': '12 шаблонов alt-text для ранжирования в Google Images и AI-поиске. Имена файлов, сжатие, Schema-разметка — реальные примеры 2026.',
        },
        'tr': {
            'title': 'Image SEO 2026: Gerçekten Sıralanan 12 Alt-Text Kalıbı',
            'desc': 'Google Images ve AI aramada resimleri sıralayan 12 alt-text kalıbı. Dosya adları, sıkıştırma, Schema markup — gerçek 2026 örnekleri.',
        },
    },
    'perplexity-seo': {
        'en': {
            'title': 'Perplexity SEO 2026: How to Get Cited by Perplexity AI',
            'desc': '12 proven strategies to get your content cited by Perplexity AI in 2026. Structured data, citation signals, source authority — with a free AEO audit checklist.',
        },
        'de': {
            'title': 'Perplexity SEO 2026: So wirst du von Perplexity AI zitiert',
            'desc': '12 bewährte Strategien damit dein Content 2026 von Perplexity AI zitiert wird. Structured Data, Citation Signals, Source Authority — plus gratis AEO-Audit.',
        },
        'es': {
            'title': 'Perplexity SEO 2026: Cómo ser citado por Perplexity AI',
            'desc': '12 estrategias probadas para que Perplexity AI cite tu contenido en 2026. Datos estructurados, señales de citación, autoridad — con auditoría AEO gratis.',
        },
        'ru': {
            'title': 'Perplexity SEO 2026: Как попасть в цитаты Perplexity AI',
            'desc': '12 проверенных стратегий для цитирования вашего контента в Perplexity AI в 2026. Структурированные данные, авторитет источника + бесплатный AEO-аудит.',
        },
        'tr': {
            'title': 'Perplexity SEO 2026: Perplexity AI Tarafından Nasıl Alıntılanırsınız',
            'desc': 'Perplexity AI\'ın 2026\'da içeriğinizi alıntılaması için 12 kanıtlanmış strateji. Yapılandırılmış veri, alıntı sinyalleri + ücretsiz AEO denetimi.',
        },
    },
    'perplexity-seo-checker': {
        'en': {
            'title': 'Perplexity SEO Checker 2026: Track AI Citations (Free Tool)',
            'desc': 'Track if Perplexity AI cites your website. Compare 7 methods, audit your AI citation score, and use our free checker tool. Step-by-step guide 2026.',
        },
        'de': {
            'title': 'Perplexity SEO Checker 2026: AI-Zitate tracken (kostenlos)',
            'desc': 'Prüfe ob Perplexity AI deine Website zitiert. 7 Methoden verglichen, kostenloses Checker-Tool, AI-Citation-Score. Schritt-für-Schritt 2026.',
        },
    },
    'google-ai-overviews': {
        'en': {
            'title': 'How to Appear in Google AI Overviews: 12 Tactics (2026)',
            'desc': 'Google AI Overviews show in 30%+ of searches. 12 proven GEO tactics with Schema.org code, citation signals, and a complete optimization checklist for 2026.',
        },
        'de': {
            'title': 'In Google AI Overviews erscheinen: 12 Taktiken (2026)',
            'desc': 'Google AI Overviews erscheinen in 30%+ aller Suchen. 12 bewährte GEO-Taktiken mit Schema.org-Code, Citation-Signals, Optimierungs-Checkliste für 2026.',
        },
        'es': {
            'title': 'Aparecer en Google AI Overviews: 12 Tácticas (2026)',
            'desc': 'Google AI Overviews aparecen en 30%+ de búsquedas. 12 tácticas GEO probadas con código Schema.org, señales de citación y checklist completo para 2026.',
        },
        'ru': {
            'title': 'Как попасть в Google AI Overviews: 12 тактик (2026)',
            'desc': 'Google AI Overviews показываются в 30%+ запросов. 12 проверенных GEO-тактик с кодом Schema.org, сигналами цитирования и чеклистом на 2026.',
        },
        'tr': {
            'title': 'Google AI Overviews\'da Görünme: 12 Taktik (2026)',
            'desc': 'Google AI Overviews aramaların %30+ında görünüyor. 12 kanıtlanmış GEO taktiği + Schema.org kodu, alıntı sinyalleri ve tam optimizasyon listesi 2026.',
        },
    },
    'faq-schema-markup': {
        'en': {
            'title': 'FAQ Schema Markup 2026: Copy-Paste JSON-LD for AI Citations',
            'desc': 'Copy-paste FAQPage JSON-LD examples that get cited by ChatGPT, Perplexity & Google AI. Validation tools, multi-language support, and best practices for 2026.',
        },
        'de': {
            'title': 'FAQ Schema Markup 2026: JSON-LD für AI-Zitate (Copy-Paste)',
            'desc': 'Copy-Paste FAQPage JSON-LD Beispiele die von ChatGPT, Perplexity & Google AI zitiert werden. Validierungs-Tools, mehrsprachig, Best Practices 2026.',
        },
    },
    'core-web-vitals': {
        'en': {
            'title': 'Core Web Vitals 2026: Fix LCP, INP & CLS in 30 Minutes',
            'desc': 'Fix LCP, INP, and CLS in 30 minutes with diagnostic tools and proven optimizations. 2026 thresholds, real examples, and a checklist that works for any site.',
        },
        'de': {
            'title': 'Core Web Vitals 2026: LCP, INP & CLS in 30 Minuten fixen',
            'desc': 'Behebe LCP, INP und CLS in 30 Minuten mit Diagnose-Tools und bewährten Optimierungen. 2026-Schwellenwerte, echte Beispiele, Checkliste für jede Site.',
        },
    },
    'eeat-optimization': {
        'en': {
            'title': 'E-E-A-T Optimization 2026: 15 Signals Google Actually Checks',
            'desc': '15 concrete E-E-A-T signals Google uses to rank content. Experience, Expertise, Authoritativeness, Trust — with examples of what works in 2026 and what doesn\'t.',
        },
        'de': {
            'title': 'E-E-A-T Optimierung 2026: 15 Signale die Google prüft',
            'desc': '15 konkrete E-E-A-T-Signale die Google zum Ranken nutzt. Experience, Expertise, Authority, Trust — mit Beispielen was 2026 funktioniert und was nicht.',
        },
    },
    'semantic-seo': {
        'en': {
            'title': 'Semantic SEO 2026: 7 Entity Strategies Beyond Keywords',
            'desc': 'Modern SEO optimizes for entities and meaning, not keywords. 7 strategies using Knowledge Graph, topic clusters, and semantic relationships. 2026 examples.',
        },
        'de': {
            'title': 'Semantic SEO 2026: 7 Entity-Strategien jenseits von Keywords',
            'desc': 'Modernes SEO optimiert für Entities und Bedeutung, nicht Keywords. 7 Strategien mit Knowledge Graph, Topic Clusters und semantischen Relationen. 2026.',
        },
    },
    'schema-markup-guide': {
        'en': {
            'title': 'Schema Markup 2026: 20 JSON-LD Templates (Copy-Paste)',
            'desc': '20 copy-paste Schema.org JSON-LD templates for all common use cases. Article, FAQ, Product, Recipe, How-To, and AI-citation types — with validation.',
        },
        'de': {
            'title': 'Schema Markup 2026: 20 JSON-LD Vorlagen (Copy-Paste)',
            'desc': '20 Copy-Paste Schema.org JSON-LD Vorlagen für alle Standard-Use-Cases. Article, FAQ, Product, Recipe, How-To, AI-Citation-Typen — mit Validierung.',
        },
    },
    'seo-audit-checklist': {
        'en': {
            'title': 'SEO Audit Checklist 2026: 50+ Checks (Free PDF Download)',
            'desc': 'Free SEO audit checklist with 50+ actionable checks for Technical SEO, On-Page, AEO, and GEO. Audit any website in 2026 with this proven framework.',
        },
        'de': {
            'title': 'SEO Audit Checkliste 2026: 50+ Checks (Kostenloses PDF)',
            'desc': 'Kostenlose SEO-Audit-Checkliste mit 50+ umsetzbaren Checks für Technical SEO, On-Page, AEO und GEO. Jede Website 2026 auditieren — bewährtes Framework.',
        },
    },
    'what-is-aeo': {
        'en': {
            'title': 'What is AEO? Answer Engine Optimization in 5 Minutes (2026)',
            'desc': 'AEO helps ChatGPT, Perplexity & Claude find and cite your content. Learn the 8 core AEO signals in 5 minutes, with examples and a free audit checklist.',
        },
        'de': {
            'title': 'Was ist AEO? Answer Engine Optimization in 5 Minuten (2026)',
            'desc': 'AEO hilft ChatGPT, Perplexity & Claude deinen Content zu finden und zu zitieren. 8 zentrale AEO-Signale in 5 Minuten — mit Beispielen und Gratis-Audit.',
        },
    },
    'what-is-geo': {
        'en': {
            'title': 'What is GEO? Generative Engine Optimization Explained (2026)',
            'desc': 'GEO gets your content into Google AI Overviews and generative search. 10 actionable strategies with Schema.org code, citation signals, and 2026 examples.',
        },
        'de': {
            'title': 'Was ist GEO? Generative Engine Optimization erklärt (2026)',
            'desc': 'GEO bringt deinen Content in Google AI Overviews und generative Suche. 10 Strategien mit Schema.org-Code, Citation-Signalen und 2026-Beispielen.',
        },
    },
    'zero-click-searches': {
        'en': {
            'title': 'Zero-Click Searches 2026: Why 65% Get No Click (+ Fix)',
            'desc': '65% of Google searches end without a click. Why it\'s growing (AI Overviews, featured snippets), and 8 strategies to adapt your SEO in 2026.',
        },
        'de': {
            'title': 'Zero-Click-Suchen 2026: Warum 65% nicht klicken (+ Fix)',
            'desc': '65% der Google-Suchen enden ohne Klick. Warum das wächst (AI Overviews, Featured Snippets) und 8 Strategien um dein SEO 2026 anzupassen.',
        },
    },
    'topical-authority': {
        'en': {
            'title': 'Topical Authority 2026: 6 Steps to Dominate Any Niche',
            'desc': 'How Google and AI decide who ranks first: topical authority. 6 concrete steps to build topic clusters, content hubs, and dominate your niche in 2026.',
        },
        'de': {
            'title': 'Topical Authority 2026: 6 Schritte zur Nischen-Dominanz',
            'desc': 'Wie Google und AI entscheiden wer zuerst rankt: Topical Authority. 6 konkrete Schritte für Topic Cluster, Content Hubs und Nischen-Dominanz 2026.',
        },
    },
    'llms-txt-guide': {
        'en': {
            'title': 'LLMS.txt Guide 2026: Setup + Audit for AI Crawlers',
            'desc': 'LLMS.txt is the new robots.txt for AI. Complete setup guide with audit checklist, configuration examples, and the fastest way to tell AI how to use your content.',
        },
        'de': {
            'title': 'LLMS.txt Anleitung 2026: Setup + Audit für AI-Crawler',
            'desc': 'LLMS.txt ist die neue Robots.txt für KI. Komplette Setup-Anleitung mit Audit-Checkliste, Konfigurations-Beispielen und wie du AI-Crawler steuerst.',
        },
    },
    'seo-vs-aeo-vs-geo': {
        'en': {
            'title': 'SEO vs AEO vs GEO 2026: The Complete Comparison',
            'desc': 'SEO vs AEO vs GEO compared side by side in 2026. Understand the 3 search types, which to prioritize for your site, and how to optimize for all three.',
        },
        'de': {
            'title': 'SEO vs AEO vs GEO 2026: Der komplette Vergleich',
            'desc': 'SEO vs AEO vs GEO direkt verglichen in 2026. Die 3 Such-Typen verstehen, welche für deine Site priorisieren, und wie du für alle drei optimierst.',
        },
    },
    'google-core-update-recovery': {
        'en': {
            'title': 'Google March 2026 Core Update: 30-Check Recovery Audit',
            'desc': 'Lost rankings in the Google March 2026 Core Update? Complete 30-check audit to diagnose traffic drops and recover rankings. SEO + AEO + GEO covered.',
        },
        'de': {
            'title': 'Google März 2026 Core Update: 30-Punkte-Recovery-Audit',
            'desc': 'Rankings im Google März 2026 Core Update verloren? Komplettes 30-Punkte-Audit um Traffic-Einbrüche zu diagnostizieren und Rankings zu reaktivieren.',
        },
    },
    'schema-markup-guide': {
        'en': {
            'title': 'Schema Markup 2026: 20 JSON-LD Templates (Copy-Paste)',
            'desc': '20 copy-paste Schema.org JSON-LD templates for common use cases. Article, FAQ, Product, Recipe, How-To + AI-citation types with validation examples.',
        },
    },
}


def update_file(fp: Path, title: str, desc: str) -> bool:
    """Update a single HTML file's title and meta description."""
    if not fp.exists():
        return False

    text = fp.read_text(encoding='utf-8')
    orig = text

    # Fix title - handle both simple <title>...</title> and any attrs
    text = re.sub(
        r'<title>[^<]*</title>',
        f'<title>{title}</title>',
        text,
        count=1
    )

    # Fix meta description
    text = re.sub(
        r'<meta\s+name="description"\s+content="[^"]*"',
        f'<meta name="description" content="{desc}"',
        text,
        count=1
    )

    # Fix og:title
    text = re.sub(
        r'<meta\s+property="og:title"\s+content="[^"]*"',
        f'<meta property="og:title" content="{title}"',
        text,
        count=1
    )

    # Fix og:description
    text = re.sub(
        r'<meta\s+property="og:description"\s+content="[^"]*"',
        f'<meta property="og:description" content="{desc}"',
        text,
        count=1
    )

    # Fix twitter:title
    text = re.sub(
        r'<meta\s+name="twitter:title"\s+content="[^"]*"',
        f'<meta name="twitter:title" content="{title}"',
        text,
        count=1
    )

    # Fix twitter:description
    text = re.sub(
        r'<meta\s+name="twitter:description"\s+content="[^"]*"',
        f'<meta name="twitter:description" content="{desc}"',
        text,
        count=1
    )

    if text != orig:
        fp.write_text(text, encoding='utf-8')
        return True
    return False


def main():
    updated = 0
    skipped = 0
    missing = []

    for slug, lang_fixes in FIXES.items():
        # EN always available
        if 'en' in lang_fixes:
            en = lang_fixes['en']
            fp = SITE / 'blog' / slug / 'index.html'
            if fp.exists():
                if update_file(fp, en['title'], en['desc']):
                    print(f"  [OK] EN /blog/{slug}/")
                    updated += 1
                else:
                    skipped += 1
            else:
                missing.append(f"EN /blog/{slug}/")

        # Non-EN
        for lang in ['de', 'es', 'ru', 'tr']:
            if lang in lang_fixes:
                fix = lang_fixes[lang]
            elif 'en' in lang_fixes:
                # Fallback: use EN for missing translations (better than truncated)
                fix = lang_fixes['en']
            else:
                continue

            fp = SITE / lang / 'blog' / slug / 'index.html'
            if fp.exists():
                if update_file(fp, fix['title'], fix['desc']):
                    print(f"  [OK] {lang.upper()} /{lang}/blog/{slug}/")
                    updated += 1
                else:
                    skipped += 1
            else:
                missing.append(f"{lang.upper()} /{lang}/blog/{slug}/")

    print(f"\n=== Summary ===")
    print(f"Updated: {updated} files")
    print(f"Skipped (no change): {skipped}")
    if missing:
        print(f"Missing: {len(missing)} files")
        for m in missing[:10]:
            print(f"  - {m}")


if __name__ == '__main__':
    main()
