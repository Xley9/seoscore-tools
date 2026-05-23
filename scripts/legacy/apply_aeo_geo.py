#!/usr/bin/env python3
"""
SESSION 70: Apply AEO/GEO optimizations to 5 seoscore.tools blog articles × 5 languages
- Answer Capsule (styled TL;DR block)
- Last Updated badge
- dateModified update in schema + meta
"""

import os
import re

BASE = r"C:\Users\Ati\Desktop\seoscore-tools\src\site"

ARTICLES = ["what-is-aeo", "what-is-geo", "seo-vs-aeo-vs-geo", "perplexity-seo", "rank-in-ai-search"]
LANGS = {
    "en": "",        # root /blog/slug/
    "de": "de",      # /de/blog/slug/
    "tr": "tr",      # /tr/blog/slug/
    "ru": "ru",      # /ru/blog/slug/
    "es": "es",      # /es/blog/slug/
}

# ─── Answer Capsule Content ───────────────────────────────────────
CAPSULES = {
    "what-is-aeo": {
        "en": "AEO (Answer Engine Optimization) is structuring your content so AI assistants like ChatGPT, Perplexity, and Claude can find and cite it. Websites with proper AEO optimization achieve up to 72% citation rates in AI responses (Gen-Optima 2026). Key elements include FAQ schema, answer capsules, and structured data &mdash; all measurable with seoscore.tools' 50+ AEO checks.",
        "de": "AEO (Answer Engine Optimization) ist die Strukturierung Ihrer Inhalte, damit KI-Assistenten wie ChatGPT, Perplexity und Claude sie finden und zitieren. Websites mit korrekter AEO-Optimierung erreichen bis zu 72% Zitierrate in KI-Antworten (Gen-Optima 2026). Wichtige Elemente sind FAQ-Schema, Answer Capsules und strukturierte Daten &mdash; alles messbar mit den 50+ AEO-Checks von seoscore.tools.",
        "tr": "AEO (Answer Engine Optimization), ChatGPT, Perplexity ve Claude gibi yapay zeka asistanlarinin icerigini bulup alinti yapabilmesi icin icerik yapilandirma pratigidir. Dogru AEO optimizasyonu yapilan siteler, yapay zeka yanitlarinda %72'ye varan alinti orani elde eder (Gen-Optima 2026). Temel unsurlar FAQ semasi, cevap kapsulleri ve yapisal veri &mdash; hepsi seoscore.tools'un 50+ AEO kontroluyle olculebilir.",
        "ru": "AEO (Answer Engine Optimization) &mdash; eto strukturirovanie kontenta, chtoby II-assistenty, takie kak ChatGPT, Perplexity i Claude, mogli nahodit' i tsitirovat' vash sayt. Sayty s pravilnoy AEO-optimizatsiey dostigayut do 72% urovnya tsitirovaniya v otvetakh II (Gen-Optima 2026). Klyuchevye elementy: FAQ-schema, answer capsules i strukturirovannye dannye.",
        "es": "AEO (Answer Engine Optimization) es la practica de estructurar tu contenido para que asistentes de IA como ChatGPT, Perplexity y Claude puedan encontrarlo y citarlo. Los sitios con optimizacion AEO correcta logran hasta un 72% de tasa de citacion en respuestas de IA (Gen-Optima 2026). Los elementos clave incluyen FAQ schema, answer capsules y datos estructurados &mdash; todo medible con los 50+ checks AEO de seoscore.tools.",
    },
    "what-is-geo": {
        "en": "GEO (Generative Engine Optimization) is optimizing content to be featured in AI-powered search results like Google AI Overview and Bing Copilot. Princeton research shows that adding statistics and citations increases AI visibility by 30-40%. GEO builds on traditional SEO by adding structured data, authoritative sources, and content formats that generative engines prefer to quote.",
        "de": "GEO (Generative Engine Optimization) ist die Optimierung von Inhalten fur KI-gestutzte Suchergebnisse wie Google AI Overview und Bing Copilot. Die Princeton-Studie zeigt, dass Statistiken und Quellenangaben die KI-Sichtbarkeit um 30-40% erhohen. GEO baut auf traditionellem SEO auf und fugt strukturierte Daten, autoritative Quellen und Inhaltsformate hinzu, die generative Suchmaschinen bevorzugt zitieren.",
        "tr": "GEO (Generative Engine Optimization), Google AI Overview ve Bing Copilot gibi yapay zeka destekli arama sonuclarinda icerigini one cikarma optimizasyonudur. Princeton arastirmasina gore, istatistik ve kaynak eklemek yapay zeka gorunurlugunu %30-40 artiriyor. GEO, geleneksel SEO uzerine yapilandirilmis veri, otoriter kaynaklar ve uretken arama motorlarinin alinti yapmayi tercih ettigi formatlari ekler.",
        "ru": "GEO (Generative Engine Optimization) &mdash; eto optimizatsiya kontenta dlya pokazov v rezul'tatakh poiska na osnove II, takih kak Google AI Overview i Bing Copilot. Issledovanie Prinstone pokazalo, chto dobavlenie statistiki i ssylok uvelichivaet vidimest' v II na 30-40%. GEO dopolnyaet traditsionnoe SEO strukturirovannymi dannymi i formotami kontenta, kotorye generativnye sistemy predpochitayut tsitirovat'.",
        "es": "GEO (Generative Engine Optimization) es la optimizacion de contenido para aparecer en resultados de busqueda impulsados por IA como Google AI Overview y Bing Copilot. La investigacion de Princeton muestra que agregar estadisticas y citas aumenta la visibilidad en IA un 30-40%. GEO se construye sobre el SEO tradicional anadiendo datos estructurados, fuentes autoritativas y formatos que los motores generativos prefieren citar.",
    },
    "seo-vs-aeo-vs-geo": {
        "en": "SEO targets Google's organic rankings, AEO optimizes for AI assistants (ChatGPT, Perplexity), and GEO targets AI-powered search results (Google AI Overview). According to AirOps' 2026 State of AI Search report, 40%+ of searches now involve AI tools. Smart optimization combines all three &mdash; seoscore.tools checks 173 criteria across SEO (68), AEO (50), and GEO (55) simultaneously.",
        "de": "SEO zielt auf Googles organische Rankings, AEO optimiert fur KI-Assistenten (ChatGPT, Perplexity) und GEO fur KI-gestutzte Suchergebnisse (Google AI Overview). Laut dem AirOps State of AI Search 2026 Report nutzen 40%+ aller Suchen bereits KI-Tools. Intelligente Optimierung kombiniert alle drei &mdash; seoscore.tools pruft 173 Kriterien uber SEO (68), AEO (50) und GEO (55) gleichzeitig.",
        "tr": "SEO Google'in organik siralamalarini, AEO yapay zeka asistanlarini (ChatGPT, Perplexity) ve GEO yapay zeka destekli arama sonuclarini (Google AI Overview) hedefler. AirOps'un 2026 AI Search raporuna gore aramalarin %40'indan fazlasi artik yapay zeka araclari iceriyor. Akilli optimizasyon ucu birlestirir &mdash; seoscore.tools SEO (68), AEO (50) ve GEO (55) olmak uzere 173 kriteri ayni anda kontrol eder.",
        "ru": "SEO napravleno na organicheskiy reyting Google, AEO optimiziruet dlya II-assistentov (ChatGPT, Perplexity), a GEO &mdash; dlya rezul'tatov poiska na osnove II (Google AI Overview). Soglasno otchyotu AirOps 2026, bolee 40% zaprosov teper' vklyuchayut II-instrumenty. Umnaya optimizatsiya ob\"edinyaet vse tri &mdash; seoscore.tools proveryaet 173 kriteriya po SEO (68), AEO (50) i GEO (55) odnovremenno.",
        "es": "SEO apunta a los rankings organicos de Google, AEO optimiza para asistentes de IA (ChatGPT, Perplexity) y GEO para resultados de busqueda con IA (Google AI Overview). Segun el informe AirOps 2026, el 40%+ de las busquedas ya involucran herramientas de IA. La optimizacion inteligente combina los tres &mdash; seoscore.tools verifica 173 criterios en SEO (68), AEO (50) y GEO (55) simultaneamente.",
    },
    "perplexity-seo": {
        "en": "Perplexity AI processes 100M+ queries monthly and cites sources in every response, making it the highest-converting AI traffic source with 27% average conversion rates (Broworks 2026). To get cited, your content needs clear answers, FAQ schema, E-E-A-T signals, and fresh content updated within 13 weeks (AirOps 2026). seoscore.tools' AEO checker evaluates 50+ Perplexity-specific ranking factors for free.",
        "de": "Perplexity AI verarbeitet 100M+ Anfragen monatlich und zitiert Quellen in jeder Antwort &mdash; die KI-Trafficquelle mit der hochsten Conversion von 27% (Broworks 2026). Um zitiert zu werden, braucht Ihr Content klare Antworten, FAQ-Schema, E-E-A-T-Signale und frischen Content innerhalb von 13 Wochen (AirOps 2026). seoscore.tools' AEO-Checker pruft 50+ Perplexity-spezifische Ranking-Faktoren kostenlos.",
        "tr": "Perplexity AI aylik 100M+ sorguyu isler ve her yanitinda kaynak gosterir &mdash; %27 ortalama donusum orani ile en yuksek donusumlu yapay zeka trafik kaynagidir (Broworks 2026). Alintilanmak icin net cevaplar, FAQ semasi, E-E-A-T sinyalleri ve 13 hafta icinde guncellennis icerik gerekir (AirOps 2026). seoscore.tools'un AEO kontrolcusu 50+ Perplexity siralama faktorunu ucretsiz degerlendirir.",
        "ru": "Perplexity AI obrabatyvat 100M+ zaprosov v mesyats i tsitruet istochniki v kazhdom otvete &mdash; eto istochnik II-trafika s naibolee vysokoy konversyey 27% (Broworks 2026). Chtoby poluchit' tsitirovanie, kontent dolzhen soderzhat' chyotkiye otvety, FAQ-schemu, signaly E-E-A-T i svezhiy kontent obnovlyonnyy v techenie 13 nedel' (AirOps 2026).",
        "es": "Perplexity AI procesa 100M+ consultas mensuales y cita fuentes en cada respuesta, siendo la fuente de trafico IA con mayor conversion del 27% (Broworks 2026). Para ser citado, tu contenido necesita respuestas claras, FAQ schema, senales E-E-A-T y contenido actualizado en las ultimas 13 semanas (AirOps 2026). El checker AEO de seoscore.tools evalua 50+ factores de ranking de Perplexity gratis.",
    },
    "rank-in-ai-search": {
        "en": "Getting cited in AI search requires a different approach than traditional SEO. According to Princeton's GEO study, adding statistics increases AI visibility by 30-40%, while FAQ schema adds a 30% citation boost (Frase.io). The key: structure content with clear answers, use authoritative data with sources, and ensure comprehensive schema markup &mdash; all verifiable with seoscore.tools' 173-check scanner.",
        "de": "Zitiert werden in der KI-Suche erfordert einen anderen Ansatz als traditionelles SEO. Laut Princetons GEO-Studie steigern Statistiken die KI-Sichtbarkeit um 30-40%, wahrend FAQ-Schema einen 30% Citation-Boost liefert (Frase.io). Der Schlussel: Inhalte mit klaren Antworten strukturieren, autoritative Daten mit Quellen verwenden und umfassendes Schema-Markup sicherstellen &mdash; alles prufbar mit dem 173-Check-Scanner von seoscore.tools.",
        "tr": "Yapay zeka aramasinda alintilanmak, geleneksel SEO'dan farkli bir yaklasim gerektirir. Princeton'un GEO arastirmasina gore istatistik eklemek yapay zeka gorunurlugunu %30-40 artirirken, FAQ semasi %30 alinti artisi saglar (Frase.io). Anahtar: net cevaplarla icerik yapilandirmak, kaynakli otoriter veriler kullanmak ve kapsamli sema isaretlemesi saglamak &mdash; hepsi seoscore.tools'un 173 kontrollu tarayicisiyla dogrulanabilir.",
        "ru": "Chtoby poluchit' tsitaty v II-poiske, nuzhen inoy podkhod, chem v traditsionnom SEO. Soglasno issledovaniyu Princeton GEO, dobavlenie statistiki uvelichivaet vidimot' v II na 30-40%, a FAQ-schema dayot 30% rost tsitirovaniya (Frase.io). Klyuch: strukturirovat' kontent s chyotkimi otvetami, ispol'zovat' avtoritetnye dannye s istochnikami i obespechit' kompleksnuyu schemu razmetki.",
        "es": "Ser citado en la busqueda IA requiere un enfoque diferente al SEO tradicional. Segun el estudio GEO de Princeton, agregar estadisticas aumenta la visibilidad IA un 30-40%, mientras que FAQ schema anade un 30% de impulso en citaciones (Frase.io). La clave: estructurar contenido con respuestas claras, usar datos autoritativos con fuentes y asegurar un schema markup completo &mdash; todo verificable con el escaner de 173 checks de seoscore.tools.",
    },
}

# ─── Labels ───────────────────────────────────────────────────────
LABELS = {
    "en": {"badge": "Last Updated: March 2026 &middot; By Atilla Kuruk, SEO &amp; AI Search Specialist", "label": "QUICK ANSWER"},
    "de": {"badge": "Letzte Aktualisierung: M&auml;rz 2026 &middot; Von Atilla Kuruk, SEO &amp; KI-Suchexperte", "label": "KURZANTWORT"},
    "tr": {"badge": "Son G&uuml;ncelleme: Mart 2026 &middot; Atilla Kuruk, SEO &amp; Yapay Zeka Uzman&#305;", "label": "KISA CEVAP"},
    "ru": {"badge": "Poslednee obnovlenie: Mart 2026 &middot; Atilla Kuruk, SEO &amp; AI spetsialist", "label": "KRATKIY OTVET"},
    "es": {"badge": "&Uacute;ltima actualizaci&oacute;n: Marzo 2026 &middot; Por Atilla Kuruk, Especialista en SEO &amp; IA", "label": "RESPUESTA R&Aacute;PIDA"},
}

# ─── HTML Templates ──────────────────────────────────────────────
def make_capsule_html(lang, slug):
    text = CAPSULES[slug][lang]
    label = LABELS[lang]["label"]
    badge = LABELS[lang]["badge"]

    return f'''
          <!-- SESSION_70_AEO: Answer Capsule + Last Updated Badge -->
          <div style="margin:0 0 24px;padding:0;">
            <p style="display:inline-block;background:rgba(99,102,241,0.1);padding:5px 14px;border-radius:16px;font-size:12px;color:rgba(255,255,255,0.6);margin:0 0 12px;line-height:1.4;">{badge}</p>
            <div style="background:linear-gradient(135deg,rgba(99,102,241,0.08) 0%,rgba(99,102,241,0.04) 100%);border-left:4px solid #6366f1;padding:18px 22px;border-radius:0 12px 12px 0;margin:0;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1.2px;text-transform:uppercase;">{label}</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85);">{text}</p>
            </div>
          </div>
'''


def process_file(filepath, lang, slug):
    """Process a single HTML file: insert Answer Capsule + update dateModified."""
    if not os.path.exists(filepath):
        return f"NOT FOUND: {filepath}"

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already applied
    if 'SESSION_70_AEO' in content:
        return f"ALREADY APPLIED: {filepath}"

    original_size = len(content)

    # 1. Insert Answer Capsule after </header> (article header)
    # Find the closing </header> tag that's inside the article
    capsule_html = make_capsule_html(lang, slug)

    # Insert after the article header closing tag
    # Pattern: </header>\n\n          <!-- Mobile TOC -->
    header_close = '</header>'
    header_positions = [m.start() for m in re.finditer(r'</header>', content)]

    if len(header_positions) >= 2:
        # Second </header> is the article header (first is the site header)
        insert_pos = header_positions[1] + len(header_close)
        content = content[:insert_pos] + '\n' + capsule_html + content[insert_pos:]
    elif len(header_positions) == 1:
        insert_pos = header_positions[0] + len(header_close)
        content = content[:insert_pos] + '\n' + capsule_html + content[insert_pos:]
    else:
        return f"NO HEADER FOUND: {filepath}"

    # 2. Update dateModified in BlogPosting schema
    content = re.sub(
        r'"dateModified":\s*"[^"]*"',
        '"dateModified": "2026-03-25T12:00:00+00:00"',
        content
    )

    # 3. Update article:modified_time meta tag
    content = re.sub(
        r'<meta property="article:modified_time" content="[^"]*"',
        '<meta property="article:modified_time" content="2026-03-25T12:00:00+00:00"',
        content
    )

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    new_size = len(content)
    return f"OK: {filepath} ({original_size} -> {new_size}, +{new_size - original_size} bytes)"


def main():
    results = []

    for slug in ARTICLES:
        for lang, prefix in LANGS.items():
            if prefix:
                filepath = os.path.join(BASE, prefix, "blog", slug, "index.html")
            else:
                filepath = os.path.join(BASE, "blog", slug, "index.html")

            result = process_file(filepath, lang, slug)
            results.append(result)
            print(result)

    print(f"\n=== TOTAL: {len(results)} files processed ===")
    ok_count = sum(1 for r in results if r.startswith("OK"))
    print(f"OK: {ok_count}, Errors: {len(results) - ok_count}")


if __name__ == "__main__":
    main()
