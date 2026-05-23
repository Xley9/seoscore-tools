"""
Fix mojibake-corrupted text on seoscore.tools.

Some pages contain text where special characters (em-dash, en-dash, smart quotes)
were UTF-8-encoded multiple times -- producing massive blobs of
"Ã­Æ'Ã†...Ã¢..." gibberish where a single dash should have been.

Strategy:
  For every line longer than 5,000 bytes (a clear sign of multi-round corruption),
  find the clean prefix (everything before the corruption starts), then re-close
  whichever HTML element the line was inside.
"""

from pathlib import Path
import re
import sys

ROOT = Path(r"C:\Users\Ati\Desktop\seoscore-tools\src\site")
THRESHOLD_BYTES = 5000

# A run of typical mojibake bytes — once we see this, the corruption begins.
# Conservative pattern: "Ã" followed by any character we'd expect inside encoded UTF-8.
MOJIBAKE_RE = re.compile(r"Ã[^a-zA-Z0-9\s\"<>=\.,:;!?\-\(\)/]")

# When a line is structurally important (title / meta / h1 / p), we know the
# safe re-close. Map a detection pattern to a clean rewrite.
# IMPORTANT: each pattern matches FROM the start of the line THROUGH the end —
# the corrupted tail is consumed (and discarded) so the result is just the clean
# prefix + a sane closing tag.
LINE_REWRITES: list[tuple[re.Pattern, str]] = [
    # <title>Blog ...mojibake...</title>     (or any further junk to end of line)
    (
        re.compile(r"^(\s*<title>)([^Ã]*).*$"),
        r"\1\2 | seoscore.tools</title>"
    ),
    # <meta ...content="...mojibake...">
    (
        re.compile(r'^(\s*<meta[^>]*?\bcontent=")([^"Ã]*).*$'),
        r'\1\2">'
    ),
    # <p class="blog-card-excerpt">clean...mojibake...</p>
    (
        re.compile(r'^(\s*<p\s+class="blog-card-excerpt">)([^<Ã]*).*$'),
        r"\1\2</p>"
    ),
    # <h1>...mojibake...</h1>
    (
        re.compile(r"^(\s*<h1[^>]*>)([^<Ã]*).*$"),
        r"\1\2</h1>"
    ),
    # <h2><a ...>clean...mojibake...</a></h2>
    (
        re.compile(r"^(\s*<h2[^>]*><a[^>]*>)([^<Ã]*).*$"),
        r"\1\2</a></h2>"
    ),
    # HTML comment with mojibake — drop the entire comment
    (
        re.compile(r"^(\s*)<!--.*$"),
        r"\1<!-- (corrupt comment removed) -->"
    ),
]


def fix_line(line: str) -> tuple[str, str]:
    """Return (new_line, what_we_did) — what_we_did is for diagnostic logging."""
    for pat, repl in LINE_REWRITES:
        m = pat.match(line)
        if m:
            new_line = pat.sub(repl, line, count=1)
            return new_line, pat.pattern[:50]
    # Fallback: chop at the first mojibake character
    cut = MOJIBAKE_RE.search(line)
    if cut:
        prefix = line[: cut.start()].rstrip()
        return prefix + " <!-- (text after this point was mojibake-corrupted) -->", "fallback-chop"
    return line, "no-change"


def fix_file(fp: Path) -> int:
    text = fp.read_text(encoding="utf-8")
    lines = text.split("\n")
    changes = 0
    for i, line in enumerate(lines):
        if len(line.encode("utf-8")) > THRESHOLD_BYTES:
            new_line, how = fix_line(line)
            if new_line != line:
                lines[i] = new_line
                changes += 1
                print(f"      line {i+1}: fixed via [{how}] (was {len(line):,} chars)")
    if changes:
        fp.write_text("\n".join(lines), encoding="utf-8")
    return changes


def main():
    print("=== seoscore.tools mojibake fixer ===\n")
    bad_files = []
    for f in sorted(ROOT.rglob("*.html")):
        long_lines = [(i + 1, len(l.encode("utf-8")))
                      for i, l in enumerate(f.read_text(encoding="utf-8").split("\n"))
                      if len(l.encode("utf-8")) > THRESHOLD_BYTES]
        if long_lines:
            bad_files.append((f, long_lines))

    if not bad_files:
        print("No corrupted files found.")
        return

    total_lines = sum(len(lines) for _, lines in bad_files)
    print(f"Found {len(bad_files)} file(s) with {total_lines} corrupted line(s).\n")

    total_fixed = 0
    for fp, _ in bad_files:
        rel = fp.relative_to(ROOT)
        print(f"  {rel}:")
        n = fix_file(fp)
        total_fixed += n
        if n:
            print(f"    [OK] {n} line(s) fixed.")
        else:
            print(f"    [!] no auto-fix matched (manual review needed).")

    print(f"\n=== Total: {total_fixed} line(s) fixed across {len(bad_files)} file(s) ===")

    # Re-scan for any residual long lines
    print("\n--- Residual scan ---")
    residuals = 0
    for f in ROOT.rglob("*.html"):
        rem = [(i + 1, len(l.encode("utf-8")))
               for i, l in enumerate(f.read_text(encoding="utf-8").split("\n"))
               if len(l.encode("utf-8")) > THRESHOLD_BYTES]
        if rem:
            residuals += len(rem)
            print(f"  [!] {f.relative_to(ROOT)}: still {len(rem)} long line(s)")
            for ln, sz in rem[:3]:
                print(f"      line {ln}: {sz:,} bytes")
    if residuals == 0:
        print("  [OK] All clean.")


if __name__ == "__main__":
    main()
