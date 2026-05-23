// Pure HTML-parsing helpers shared by the SEO/AEO/GEO check engines.
//
// Regex-based on purpose: the worker runs on Cloudflare and we don't want
// to ship a DOM parser. These functions are intentionally lenient — they
// match the most common patterns and ignore the long tail.

export function makeExtract(html) {
  return function extract(tag, attr) {
    if (attr) {
      const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["']`, 'i');
      const m = html.match(re);
      return m ? m[1] : '';
    }
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const m = html.match(re);
    return m ? m[1].trim() : '';
  };
}

export function makeMetaContent(html) {
  return function metaContent(name) {
    const tagRe = new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*>`, 'i');
    const tag = (html.match(tagRe) || [''])[0];
    if (!tag) return '';
    const cm = tag.match(/content="([^"]*)"/i) || tag.match(/content='([^']*)'/i);
    return cm ? cm[1] : '';
  };
}
