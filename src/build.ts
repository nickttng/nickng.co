// Builds the site: content/ (Markdown + relations.yaml) → _site/ (static HTML).
//
//   node src/build.ts           build into _site/
//   node src/build.ts --check   check content and links without writing
//
// The build fails, and writes nothing, if any note, connection, wikilink,
// image or internal link is broken.

import { mkdirSync, rmSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, type Note } from './content.ts';
import { renderMarkdown, type RenderEnv } from './markdown.ts';
import { homePage, thingsPage, notePage, relationsPage, plainPage, redirectPage, COLOPHON_PATH } from './templates.ts';
import { findVerb } from './vocabulary.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const OUT = join(ROOT, '_site');
/** Folders and files copied to the site as they are. */
const STATIC = ['css', 'js', 'fonts', 'img', 'CNAME'];

export function build({ write = true } = {}): { pages: number; errors: string[] } {
  const started = performance.now();
  const content = loadContent(CONTENT);
  const errors = [...content.errors];
  const notes = [...content.notes].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

  // Wikilinks resolve by id, title or alias (case-insensitive).
  const lookup = new Map<string, Note>();
  for (const n of notes) for (const key of [n.id, n.title, ...n.aliases]) lookup.set(key.toLowerCase(), n);
  const titles = new Map(notes.map((n) => [n.id, n.title]));
  // Invalid connections are already reported; keep them out of rendering so
  // the build can finish checking and list every problem at once.
  const edges = content.edges.filter((e) => titles.has(e.from) && titles.has(e.to) && findVerb(e.verb));
  const env = (file: string): RenderEnv => ({
    file,
    errors,
    imagesDir: join(CONTENT, 'images'),
    resolve: (t) => { const n = lookup.get(t.toLowerCase()); return n && { id: n.id, title: n.title }; },
  });

  // Every page, keyed by its output path.
  const pages = new Map<string, string>();

  const home = content.pages.home;
  if (!home) errors.push('content/pages/home.md is missing');
  else {
    const sections = home.body.split(/^## /m).slice(1).map((chunk) => {
      const [title, ...rest] = chunk.split('\n');
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return { title: title.trim(), id, html: renderMarkdown(rest.join('\n'), env(home.file)) };
    });
    pages.set('index.html', homePage({
      headline: String(home.front.headline ?? ''),
      description: String(home.front.description ?? home.front.headline ?? ''),
      sections,
      notes,
    }));
  }

  pages.set('exist/index.html', thingsPage(notes));
  for (const n of notes) pages.set(`exist/${n.id}/index.html`, notePage(n, renderMarkdown(n.body, env(n.file)), edges, titles));
  pages.set('rrelations/index.html', relationsPage(notes, edges, titles));

  const colophon = content.pages.colophon;
  if (colophon) {
    pages.set(`${COLOPHON_PATH}/index.html`, plainPage({
      path: COLOPHON_PATH,
      title: String(colophon.front.title ?? 'Colophon'),
      description: colophon.front.description as string | undefined,
      lede: colophon.front.lede as string | undefined,
      html: renderMarkdown(colophon.body, env(colophon.file)),
      mainClass: 'colophon',
    }));
  }

  // Plain-word redirects (CLAUDE.md > URL map).
  pages.set('things/index.html', redirectPage('/exist'));
  pages.set('relations/index.html', redirectPage('/rrelations'));
  pages.set('colophon/index.html', redirectPage(`/${COLOPHON_PATH}`));

  // Internal links must point at a page this build makes, or a static file.
  const staticExists = (p: string) => existsSync(join(ROOT, p)) || existsSync(join(CONTENT, p));
  for (const [path, html] of pages) {
    for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const clean = href.replace(/^\//, '').replace(/\/$/, '');
      const ok = pages.has(clean ? `${clean}/index.html` : 'index.html') || pages.has(clean) || staticExists(clean);
      if (!ok) errors.push(`${path}: broken link ${href}`);
    }
  }

  if (errors.length || !write) return { pages: pages.size, errors };

  rmSync(OUT, { recursive: true, force: true });
  for (const [path, html] of pages) {
    mkdirSync(dirname(join(OUT, path)), { recursive: true });
    writeFileSync(join(OUT, path), html);
  }
  for (const item of STATIC) if (existsSync(join(ROOT, item))) cpSync(join(ROOT, item), join(OUT, item), { recursive: true });
  if (existsSync(join(CONTENT, 'images'))) cpSync(join(CONTENT, 'images'), join(OUT, 'images'), { recursive: true });

  const ms = Math.round(performance.now() - started);
  console.log(`Built ${pages.size} pages (${notes.length} notes, ${edges.length} connections) into _site/ in ${ms} ms`);
  return { pages: pages.size, errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const { pages, errors } = build({ write: !check });
  if (errors.length) {
    console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'}; nothing was written:\n`);
    for (const e of errors) console.error('  ✗ ' + e);
    process.exit(1);
  }
  if (check) console.log(`Content OK: ${pages} pages would be built.`);
}
