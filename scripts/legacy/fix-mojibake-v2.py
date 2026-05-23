"""
Fix mojibake in seoscore.tools blog index page.

Strategy:
1. For each corrupted excerpt line, look up the article slug from the surrounding
   <h2><a href="/blog/SLUG/"> link.
2. Use the clean description from feed.xml (which is uncorrupted).
3. For corrupted titles / meta tags, use known clean values.

Run: python fix-mojibake-v2.py
"""

from pathlib import Path
import re
from xml.etree import ElementTree as ET

ROOT = Path(r"C:\Users\Ati\Desktop\seoscore-tools\src\site")
THRESHOLD = 5000

# ─── Load clean descriptions from feed.xml ─────────────────────────
def load_feed_descriptions() -> dict[str, dict[str, str]]:
    """Returns slug → {title, description} from feed.xml (regex-based for robustness)"""
    feed = (ROOT / "feed.xml").read_text(encoding="utf-8")
    out = {}
    # Match each <item>...</item> block
    for item_match in re.finditer(r"<item>(.*?)</item>", feed, re.DOTALL):
        block = item_match.group(1)
        link_m = re.search(r"<link>([^<]+)</link>", block)
        title_m = re.search(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", block, re.DOTALL)
        desc_m = re.search(r"<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</description>", block, re.DOTALL)
        if not (link_m and title_m and desc_m):
            continue
        link = link_m.group(1).strip()
        title = title_m.group(1).strip()
        desc = desc_m.group(1).strip()
        slug_m = re.search(r"/blog/([^/]+)/?$", link)
        if slug_m:
            slug = slug_m.group(1)
            out[slug] = {"title": title, "description": desc}
    return out


FEED = load_feed_descriptions()
print(f"[OK] Loaded {len(FEED)} clean descriptions from feed.xml")


def load_article_descriptions() -> dict[str, dict[str, str]]:
    """Scrape <meta name="description"> from each article page in /blog/<slug>/index.html"""
    out: dict[str, dict[str, str]] = {}
    blog_dir = ROOT / "blog"
    for article_dir in blog_dir.iterdir():
        if not article_dir.is_dir():
            continue
        idx = article_dir / "index.html"
        if not idx.exists():
            continue
        try:
            html = idx.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        title_m = re.search(r"<title>([^<]+)</title>", html)
        desc_m = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', html)
        if title_m and desc_m:
            title = title_m.group(1).strip()
            desc = desc_m.group(1).strip()
            # Skip articles whose own meta is itself corrupted
            if "Ã" in title or "Ã" in desc:
                continue
            out[article_dir.name] = {"title": title, "description": desc}
    return out


ARTICLES = load_article_descriptions()
print(f"[OK] Scraped {len(ARTICLES)} article descriptions from /blog/<slug>/index.html\n")

# Merge: articles fill in slugs missing from feed.xml
for slug, data in ARTICLES.items():
    FEED.setdefault(slug, data)


# ─── Fix corrupted blog cards by slug lookup ────────────────────────
def fix_blog_index():
    fp = ROOT / "blog" / "index.html"
    text = fp.read_text(encoding="utf-8")
    original = text
    fixed_count = 0

    # Pattern: an article block with <h2><a href="/blog/SLUG/">CORRUPT</a></h2>
    # followed by <p class="blog-card-excerpt">CORRUPT</p>
    # We rewrite both parts.
    article_pat = re.compile(
        r'(<h2><a href="/blog/([^/]+)/?")(?:\s+[^>]*)?>([^<]*?)(?=Ã)[^<]*</a></h2>\s*'
        r'(<p\s+class="blog-card-excerpt">)([^<]*?)(?=Ã)[^<]*</p>',
        re.DOTALL,
    )

    def replace_article(m: re.Match) -> str:
        slug = m.group(2).strip("/")
        clean_title_prefix = m.group(3).strip()
        clean_excerpt_prefix = m.group(5).strip()
        feed_data = FEED.get(slug, {})
        # Use feed.xml title/desc when slug matches; else preserve cleaner prefix.
        title = feed_data.get("title", clean_title_prefix)
        desc = feed_data.get("description", clean_excerpt_prefix)
        # Preserve "/blog/" link href and any extra anchor attributes
        href = m.group(1)
        return (
            f'{href}>{title}</a></h2>\n'
            f'            {m.group(4)}{desc}</p>'
        )

    text, n = article_pat.subn(replace_article, text)
    fixed_count += n
    print(f"  [OK] Fixed {n} blog card(s) via feed.xml lookup")

    # ─── Now any remaining corrupted excerpts (without title corruption) ───
    standalone_excerpt = re.compile(
        r'(<p\s+class="blog-card-excerpt">)([^<Ã]*).*?</p>',
        re.DOTALL,
    )
    # Only target ones where the line is excessively long
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if len(line.encode("utf-8")) > THRESHOLD:
            # Try to extract slug from same article block (up to 5 lines above)
            slug = None
            for j in range(max(0, i - 6), i):
                m_slug = re.search(r'/blog/([^/]+)/', lines[j])
                if m_slug:
                    slug = m_slug.group(1)
                    break
            new_text = None
            if slug and slug in FEED:
                # Replace the excerpt with the feed.xml description
                new_line = re.sub(
                    r'(<p\s+class="blog-card-excerpt">)[^<]*</p>.*$',
                    rf'\g<1>{FEED[slug]["description"]}</p>',
                    line,
                    count=1,
                )
                # If the replace pattern didn't match because the closing tag was eaten
                # by mojibake, just rebuild from prefix:
                if new_line == line:
                    pre = re.match(r'^(\s*<p\s+class="blog-card-excerpt">)', line)
                    if pre:
                        new_line = f'{pre.group(1)}{FEED[slug]["description"]}</p>'
                if new_line != line:
                    lines[i] = new_line
                    fixed_count += 1
                    print(f"      line {i+1}: filled in from feed.xml (slug={slug})")
                    continue

            # Fallback for head meta tags / comments
            for pat, repl in [
                (re.compile(r"^(\s*<title>)[^Ã]*.*$"), r"\1Blog — SEO, AEO & GEO Guides | seoscore.tools</title>"),
                (re.compile(r'^(\s*<meta[^>]*?\bproperty="og:title"[^>]*?\bcontent=")[^"Ã]*.*$'), r'\1Blog — SEO, AEO & GEO Guides | seoscore.tools">'),
                (re.compile(r'^(\s*<meta[^>]*?\bname="twitter:title"[^>]*?\bcontent=")[^"Ã]*.*$'), r'\1Blog — SEO, AEO & GEO Guides | seoscore.tools">'),
                (re.compile(r'^(\s*<meta[^>]*?\bname="description"[^>]*?\bcontent=")[^"Ã]*.*$'), r'\1Expert guides on SEO, AEO and GEO. Learn how to optimize for search engines and AI.">'),
                (re.compile(r'^(\s*<meta[^>]*?\bproperty="og:description"[^>]*?\bcontent=")[^"Ã]*.*$'), r'\1Expert guides on SEO, AEO and GEO. Learn how to optimize for search engines and AI.">'),
                (re.compile(r'^(\s*<meta[^>]*?\bname="twitter:description"[^>]*?\bcontent=")[^"Ã]*.*$'), r'\1Expert guides on SEO, AEO and GEO. Learn how to optimize for search engines and AI.">'),
                (re.compile(r"^(\s*)<!--.*$"), r"\1<!-- (corrupt comment removed) -->"),
            ]:
                if pat.match(line):
                    new_line = pat.sub(repl, line, count=1)
                    if new_line != line:
                        lines[i] = new_line
                        fixed_count += 1
                        print(f"      line {i+1}: cleaned head/meta tag")
                        break

    text = "\n".join(lines)
    if text != original:
        fp.write_text(text, encoding="utf-8")
        print(f"\n[OK] Wrote fixed file ({fixed_count} fix(es) applied)")
    else:
        print("\n[!] No changes written")
    return fixed_count


if __name__ == "__main__":
    fix_blog_index()
    print("\n--- Residual long-line scan ---")
    fp = ROOT / "blog" / "index.html"
    rem = [(i + 1, len(l.encode("utf-8")))
           for i, l in enumerate(fp.read_text(encoding="utf-8").split("\n"))
           if len(l.encode("utf-8")) > THRESHOLD]
    if rem:
        for ln, sz in rem[:20]:
            print(f"  [!] line {ln}: {sz:,} bytes")
    else:
        print("  [OK] All clean.")
