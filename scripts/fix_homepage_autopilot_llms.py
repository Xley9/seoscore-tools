"""
Phase 2: Homepage + seo-autopilot CTR optimization + llms.txt AI visibility expansion.
"""
import re
from pathlib import Path

SITE = Path(r'C:\Users\Ati\Desktop\seoscore-tools\src\site')


# ============================================================================
# Homepage title/meta updates (all languages)
# ============================================================================

HOMEPAGE_FIXES = {
    'en': {
        'title': 'Free SEO, AEO & GEO Audit Tool — 260+ Checks, No Signup | seoscore.tools',
        'desc': 'Free SEO audit with 260+ checks. The only scanner that scores SEO + AEO (Answer Engine) + GEO (Generative Engine) in one scan. No signup, results in 10 seconds.',
    },
    'de': {
        'title': 'Kostenloser SEO, AEO & GEO Audit — 260+ Checks, ohne Anmeldung | seoscore.tools',
        'desc': 'Kostenloser SEO-Audit mit 260+ Checks. Der einzige Scanner der SEO + AEO (Answer Engine) + GEO (Generative Engine) in einem Scan bewertet. Ergebnis in 10 Sekunden.',
    },
    'es': {
        'title': 'Auditoría SEO, AEO y GEO Gratis — 260+ Comprobaciones, Sin Registro | seoscore.tools',
        'desc': 'Auditoría SEO gratuita con 260+ comprobaciones. El único escáner que puntúa SEO + AEO + GEO en un solo análisis. Sin registro, resultados en 10 segundos.',
    },
    'ru': {
        'title': 'Бесплатный SEO, AEO и GEO аудит — 260+ проверок | seoscore.tools',
        'desc': 'Бесплатный SEO-аудит с 260+ проверками. Единственный сканер, который оценивает SEO + AEO + GEO за один скан. Без регистрации, результаты за 10 секунд.',
    },
    'tr': {
        'title': 'Ücretsiz SEO, AEO & GEO Denetim Aracı — 260+ Kontrol | seoscore.tools',
        'desc': 'Ücretsiz SEO denetimi, 260+ kontrol. SEO + AEO + GEO\'yu tek taramada puanlayan tek tarayıcı. Kayıt gerekmez, 10 saniyede sonuç.',
    },
}

AUTOPILOT_FIXES = {
    'en': {
        'title': 'SEO Autopilot: WordPress Plugin That Auto-Fixes 260+ SEO/AEO/GEO Issues',
        'desc': 'The only WordPress plugin that scores + auto-fixes SEO, AEO & GEO in one click. 65+ automatic fixes, Claude AI content generation. $79 one-time, no subscription.',
    },
    'de': {
        'title': 'SEO Autopilot: WordPress Plugin das 260+ SEO/AEO/GEO Issues automatisch fixt',
        'desc': 'Das einzige WordPress-Plugin das SEO, AEO & GEO bewertet UND mit einem Klick auto-fixt. 65+ automatische Fixes, Claude AI Content. 79€ einmalig, kein Abo.',
    },
    'es': {
        'title': 'SEO Autopilot: Plugin WordPress que Auto-Arregla 260+ Problemas SEO/AEO/GEO',
        'desc': 'El único plugin WordPress que puntúa + auto-arregla SEO, AEO y GEO en un clic. 65+ correcciones automáticas, IA de Claude. $79 una vez, sin suscripción.',
    },
    'ru': {
        'title': 'SEO Autopilot: WordPress плагин, авто-исправляющий 260+ SEO/AEO/GEO проблем',
        'desc': 'Единственный WordPress плагин, оценивающий + авто-исправляющий SEO, AEO и GEO в один клик. 65+ автофиксов, Claude AI. $79 единоразово, без подписки.',
    },
    'tr': {
        'title': 'SEO Autopilot: 260+ SEO/AEO/GEO Sorununu Otomatik Düzelten WordPress Eklentisi',
        'desc': 'SEO, AEO ve GEO\'yu puanlayan + tek tıkla otomatik düzelten tek WordPress eklentisi. 65+ otomatik düzeltme, Claude AI içerik. $79 tek ödeme, abonesiz.',
    },
}


def update_html(fp: Path, title: str, desc: str) -> bool:
    if not fp.exists():
        return False
    text = fp.read_text(encoding='utf-8')
    orig = text

    text = re.sub(r'<title>[^<]*</title>', f'<title>{title}</title>', text, count=1)
    text = re.sub(r'<meta\s+name="description"\s+content="[^"]*"',
                  f'<meta name="description" content="{desc}"', text, count=1)
    text = re.sub(r'<meta\s+property="og:title"\s+content="[^"]*"',
                  f'<meta property="og:title" content="{title}"', text, count=1)
    text = re.sub(r'<meta\s+property="og:description"\s+content="[^"]*"',
                  f'<meta property="og:description" content="{desc}"', text, count=1)
    text = re.sub(r'<meta\s+name="twitter:title"\s+content="[^"]*"',
                  f'<meta name="twitter:title" content="{title}"', text, count=1)
    text = re.sub(r'<meta\s+name="twitter:description"\s+content="[^"]*"',
                  f'<meta name="twitter:description" content="{desc}"', text, count=1)

    if text != orig:
        fp.write_text(text, encoding='utf-8')
        return True
    return False


def main():
    print("=== Homepage Updates ===")
    # EN
    fp = SITE / 'index.html'
    if update_html(fp, HOMEPAGE_FIXES['en']['title'], HOMEPAGE_FIXES['en']['desc']):
        print(f"  [OK] EN /")
    # Others
    for lang in ['de', 'es', 'ru', 'tr']:
        fp = SITE / lang / 'index.html'
        if fp.exists():
            if update_html(fp, HOMEPAGE_FIXES[lang]['title'], HOMEPAGE_FIXES[lang]['desc']):
                print(f"  [OK] {lang.upper()} /{lang}/")

    print("\n=== seo-autopilot Updates ===")
    # EN
    fp = SITE / 'seo-autopilot' / 'index.html'
    if update_html(fp, AUTOPILOT_FIXES['en']['title'], AUTOPILOT_FIXES['en']['desc']):
        print(f"  [OK] EN /seo-autopilot/")
    # Others
    for lang in ['de', 'es', 'ru', 'tr']:
        fp = SITE / lang / 'seo-autopilot' / 'index.html'
        if fp.exists():
            if update_html(fp, AUTOPILOT_FIXES[lang]['title'], AUTOPILOT_FIXES[lang]['desc']):
                print(f"  [OK] {lang.upper()} /{lang}/seo-autopilot/")


if __name__ == '__main__':
    main()
