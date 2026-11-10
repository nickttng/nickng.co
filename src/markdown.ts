// Markdown → HTML for notes and pages.
//
// Conventions (carried over from nickng.xyz):
//   [[Title]] or [[Title|text]]   link to another note by title, alias or id
//   ![alt](images/x.webp)          an image on its own becomes a <figure>
//   an image + an *italic line*    the italic line becomes the <figcaption>
//   several images in a paragraph  a "Traces" gallery, in justified rows
//   [^1]                           footnotes

import MarkdownIt, { type PluginSimple } from 'markdown-it';
import footnote from 'markdown-it-footnote';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface RenderEnv {
  /** Resolves a wikilink target to a note id and title. */
  resolve: (target: string) => { id: string; title: string } | undefined;
  /** Where problems are reported. */
  errors: string[];
  /** The file being rendered, for error messages. */
  file: string;
  /** Absolute path of content/images. */
  imagesDir: string;
}

const md = new MarkdownIt({ html: true, linkify: false, typographer: false });
// The plugin's bundled types target markdown-it's CommonJS build; same runtime API.
md.use(footnote as unknown as PluginSimple);

// Footnote markers as plain numbers rather than "[1]".
md.renderer.rules.footnote_caption = (tokens, idx) => {
  const meta = tokens[idx].meta as { id: number; subId: number };
  return String(meta.id + 1) + (meta.subId > 0 ? `:${meta.subId}` : '');
};

// [[Wikilinks]] between notes.
md.inline.ruler.before('link', 'wikilink', (state, silent) => {
  const src = state.src;
  if (src.charCodeAt(state.pos) !== 0x5b || src.charCodeAt(state.pos + 1) !== 0x5b) return false;
  const end = src.indexOf(']]', state.pos + 2);
  if (end < 0) return false;
  if (!silent) {
    const inner = src.slice(state.pos + 2, end);
    const [target, label] = inner.split('|').map((s) => s.trim());
    const env = state.env as RenderEnv;
    const hit = env.resolve(target);
    if (!hit) env.errors.push(`${env.file}: broken wikilink [[${inner}]]`);
    const open = state.push('link_open', 'a', 1);
    open.attrSet('href', hit ? `/exist/${hit.id}` : '#');
    if (!hit) open.attrSet('data-broken', '');
    const text = state.push('text', '', 0);
    text.content = label || (hit ? hit.title : target);
    state.push('link_close', 'a', -1);
  }
  state.pos = end + 2;
  return true;
});

// External links: don't pass on the referrer or window access.
const defaultLinkOpen = md.renderer.rules.link_open ?? ((t, i, o, _e, s) => s.renderToken(t, i, o));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet('href') ?? '';
  if (/^https?:\/\//.test(href)) tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// Heading ids, so sections can be linked to.
md.core.ruler.push('heading_ids', (state) => {
  const used = new Set<string>();
  state.tokens.forEach((tok, i) => {
    if (tok.type !== 'heading_open') return;
    const text = state.tokens[i + 1]?.content ?? '';
    let id = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    while (used.has(id)) id += '-2';
    used.add(id);
    if (id) tok.attrSet('id', id);
  });
});

/** Width and height of a WebP file, read from its header. */
export function webpSize(path: string): { w: number; h: number } {
  const b = readFileSync(path);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`${path} is not a WebP image`);
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
    return { w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  throw new Error(`${path}: unknown WebP chunk ${chunk}`);
}

/** Gallery shape class, so justified rows keep each photo uncropped. */
function shape(w: number, h: number): string {
  const r = w / h;
  return r > 1.6 ? 'r169' : r > 1.05 ? 'r43' : 'r34';
}

export function renderMarkdown(source: string, env: RenderEnv): string {
  let html = md.render(source, env);

  // Images: site paths, real dimensions, lazy loading; check the file exists.
  html = html.replace(/<img src="(?:\.\/)?images\/([^"]+)" alt="([^"]*)">/g, (_m, name: string, alt: string) => {
    const path = join(env.imagesDir, name);
    if (!existsSync(path)) { env.errors.push(`${env.file}: missing image images/${name}`); return `<img src="/images/${name}" alt="${alt}">`; }
    const { w, h } = webpSize(path);
    return `<img data-shape="${shape(w, h)}" src="/images/${name}" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async">`;
  });
  if (/<img (?![^>]*data-shape)/.test(html)) env.errors.push(`${env.file}: images must live in content/images (use images/name.webp)`);

  // Several images in one paragraph → gallery.
  html = html.replace(/<p>((?:<img [^>]+>\n?){2,})<\/p>/g, (_m, imgs: string) =>
    '<div class="gallery">\n' + imgs.trim().split('\n').map((i) => i.replace(/data-shape="(\w+)"/, 'class="$1"')).join('\n') + '</div>');
  // Image + italic line → figure with caption; image alone → figure.
  html = html.replace(/<p>(<img [^>]+>)\n<em>([\s\S]*?)<\/em><\/p>/g, '<figure>\n$1\n<figcaption>$2</figcaption></figure>');
  html = html.replace(/<p>(<img [^>]+>)<\/p>/g, '<figure>\n$1\n</figure>');
  html = html.replace(/ data-shape="\w+"/g, '');

  // Wide tables scroll sideways instead of breaking the layout.
  html = html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, '</table></div>');
  return html;
}
