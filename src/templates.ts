// Page templates. Plain functions that return HTML strings: no framework.

import type { Note, Edge } from './content.ts';
import { THING_VERBS, NOTE_VERBS, ALL_VERBS, findVerb, type VerbDef, type Stage } from './vocabulary.ts';

const ORIGIN = 'https://nickng.co';

/** Path of the colophon page (the pun lives only in the URL). */
export const COLOPHON_PATH = 'lophon';

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const dotted = (iso: string) => iso.replace(/-/g, '.');

interface LayoutOptions {
  /** URL path without slashes, e.g. "exist/the-iliad"; "" for home. */
  path: string;
  title: string;
  description?: string;
  scripts?: string[];
  main: string;
  mainClass?: string;
  nav?: 'things' | 'relations';
  footerCurrent?: boolean;
  /** Inline script appended to the body. */
  tail?: string;
}

function crumb(path: string): string {
  const parts = path ? path.split('/') : [];
  const home = `<a class="home-mark" href="/"${parts.length ? '' : ' aria-current="page"'}><span class="mark" aria-hidden="true"></span><span class="domain">nickng.co</span></a>`;
  const segs = parts.map((p, i) =>
    i === parts.length - 1
      ? `<span class="seg" aria-current="page">/${esc(p)}</span>`
      : `<a class="seg" href="/${parts.slice(0, i + 1).join('/')}">/${esc(p)}</a>`);
  return ['          ' + home, ...segs.map((s) => '          ' + s)].join('\n');
}

export function layout(o: LayoutOptions): string {
  const canonical = `${ORIGIN}/${o.path ? o.path + '/' : ''}`;
  const scripts = ['/js/mark.js', ...(o.scripts ?? [])].map((s) => `    <script src="${s}" defer></script>`).join('\n');
  const cur = (n: string) => (o.nav === n ? ' aria-current="page"' : '');
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="canonical" href="${canonical}">
    <title>${esc(o.title)}</title>
${o.description ? `    <meta name="description" content="${esc(o.description)}">\n` : ''}    <link rel="preload" href="/fonts/schibsted-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/ibm-plex-mono-400-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="/css/main.css">
${scripts}
  </head>
  <body>
    <div class="page">
      <nav class="nav" aria-label="Site">
        <div class="crumb">
${crumb(o.path)}
        </div>
        <ul>
          <li><a href="/exist"${cur('things')}>Things</a></li>
          <li><a href="/rrelations"${cur('relations')}>Relations</a></li>
        </ul>
      </nav>

      <main${o.mainClass ? ` class="${o.mainClass}"` : ''}>
${o.main}
      </main>

      <footer class="foot"><a href="/${COLOPHON_PATH}"${o.footerCurrent ? ' aria-current="page"' : ''}>Colophon</a></footer>
    </div>${o.tail ? '\n' + o.tail : ''}
  </body>
</html>
`;
}

// Stage marks: a circle that fills as a note settles. Outline for seedling,
// half for budding, solid for evergreen. Named for screen readers and hover.
const RING = '<circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.25"/>';
const STAGE_MARK: Record<Stage, string> = {
  seedling: RING,
  budding: RING + '<path d="M5 1a4 4 0 0 0 0 8z" fill="currentColor"/>',
  evergreen: '<circle cx="5" cy="5" r="4.6" fill="currentColor"/>',
};

function stageMark(stage: Stage): string {
  return `<svg class="stage" viewBox="0 0 10 10" width="10" height="10" role="img" aria-label="${stage}"><title>${stage}</title>${STAGE_MARK[stage]}</svg>`;
}

function noteRow(n: Note, indent: string, group = false): string {
  return `${indent}<li class="note-row"${group ? ' data-group="notes"' : ''}>
${indent}  <time class="row-meta" datetime="${n.date}">${dotted(n.date)}</time>
${indent}  <span class="row-meta">${esc(n.type)}</span>
${indent}  <span class="row-title">${n.stage ? stageMark(n.stage) : ''}<a href="/exist/${n.id}">${esc(n.title)}</a></span>
${indent}</li>`;
}

export function homePage(p: { headline: string; description: string; sections: { title: string; id: string; html: string }[]; notes: Note[] }): string {
  const sections = p.sections.map((s) => `        <section class="bio" aria-labelledby="${s.id}">
          <h2 id="${s.id}">${esc(s.title)}</h2>
${s.html.trim().split('\n').map((l) => '          ' + l).join('\n')}
        </section>`).join('\n\n');
  return layout({
    path: '',
    title: 'Nick Ng',
    description: p.description,
    scripts: ['/js/sketch.js'],
    main: `        <div class="hero">
          <h1>${esc(p.headline)}</h1>
          <figure class="sketch" aria-hidden="true">
            <canvas></canvas>
          </figure>
        </div>

        <div class="bio-grid">
${sections}
        </div>

        <h2>Notes</h2>
        <ul class="rows">
${p.notes.map((n) => noteRow(n, '          ')).join('\n')}
        </ul>`,
  });
}

const FILTER_SCRIPT = `    <script>
      (function () {
        var bar = document.querySelector('.filters');
        var rows = document.querySelectorAll('#things > li');
        var heading = document.querySelector('main h2');
        var names = { all: 'All things', notes: 'Notes', work: 'Work', ideas: 'Ideas' };
        // Only offer filters that have something in them.
        var shown = 0;
        bar.querySelectorAll('button').forEach(function (b) {
          var f = b.dataset.filter;
          var has = f === 'all' || document.querySelector('#things > li[data-group="' + f + '"]');
          b.hidden = !has;
          if (has && f !== 'all') shown++;
        });
        if (shown < 2) return;
        bar.hidden = false;
        bar.addEventListener('click', function (e) {
          var btn = e.target.closest('button');
          if (!btn) return;
          var f = btn.dataset.filter;
          bar.querySelectorAll('button').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === btn));
          });
          rows.forEach(function (r) {
            r.hidden = f !== 'all' && r.dataset.group !== f;
          });
          heading.textContent = names[f];
        });
      })();
    </script>`;

export function thingsPage(notes: Note[]): string {
  return layout({
    path: 'exist',
    title: 'Things · Nick Ng',
    description: 'Notes by Nick Ng, which may grow and lead to others.',
    nav: 'things',
    main: `        <h1>Things</h1>
        <p class="lede">Notes, which may grow and lead to others.</p>

        <div class="filters" role="group" aria-label="Filter things" hidden>
          <button type="button" data-filter="all" aria-pressed="true">All</button>
          <button type="button" data-filter="notes" aria-pressed="false">Notes</button>
          <button type="button" data-filter="work" aria-pressed="false">Work</button>
          <button type="button" data-filter="ideas" aria-pressed="false">Ideas</button>
        </div>

        <h2>All things</h2>
        <ul class="rows" id="things">
${notes.map((n) => noteRow(n, '          ', true)).join('\n')}
        </ul>`,
    tail: FILTER_SCRIPT,
  });
}

export function notePage(n: Note, html: string, edges: Edge[], titles: Map<string, string>): string {
  const tracks: string[] = [];
  for (const e of edges) {
    if (e.from === n.id) tracks.push(`            <li><span class="verb row-meta">${esc(e.verb)}</span><a href="/exist/${e.to}">${esc(titles.get(e.to)!)}</a></li>`);
    if (e.to === n.id) tracks.push(`            <li><span class="verb row-meta">${esc(findVerb(e.verb)!.inverse)}</span><a href="/exist/${e.from}">${esc(titles.get(e.from)!)}</a></li>`);
  }
  const meta = [`<time datetime="${n.date}">${dotted(n.date)}</time>`, esc(n.type), ...(n.stage ? [n.stage] : [])].join(' · ');
  return layout({
    path: `exist/${n.id}`,
    title: `${n.title} · Nick Ng`,
    description: n.summary ?? n.description,
    mainClass: n.summary ? 'note long' : 'note',
    main: `        <p class="row-meta note-meta">${meta}</p>
        <h1>${esc(n.title)}</h1>
${n.summary ? `        <p class="lede">${esc(n.summary)}</p>\n` : ''}        <div class="prose">
${html.trim()}
        </div>${tracks.length ? `

        <section class="tracks" aria-labelledby="tracks-h">
          <h2 id="tracks-h">Tracks from here</h2>
          <ul class="rows">
${tracks.join('\n')}
          </ul>
        </section>` : ''}`,
  });
}

export function relationsPage(notes: Note[], edges: Edge[], titles: Map<string, string>): string {
  const connected = new Set(edges.flatMap((e) => [e.from, e.to]));
  const byVerb = new Map<string, Edge[]>();
  for (const e of edges) byVerb.set(e.verb, [...(byVerb.get(e.verb) ?? []), e]);
  const noteVerbs = new Set(NOTE_VERBS.map((v) => v.verb));
  const ordered = [...THING_VERBS, ...NOTE_VERBS];
  const used = ordered.filter((v) => byVerb.has(v.verb));
  const unused = ordered.filter((v) => !byVerb.has(v.verb));

  const entry = (v: VerbDef) => [
    '          <li class="is-used">',
    `            <div class="legend-verb"><span class="verb">${esc(v.verb)}</span><span class="row-meta">${esc(v.inverse)}</span></div>`,
    '            <div class="legend-body">',
    `              <p class="legend-means">${esc(v.means)}.</p>`,
    ...(v.owes ? [`              <p class="legend-owes">Owes · ${esc(v.owes)}</p>`] : []),
    '              <ul class="legend-examples">',
    ...byVerb.get(v.verb)!.map((e) => `                <li><a href="/exist/${e.from}">${esc(titles.get(e.from)!)}</a><span class="legend-arrow" aria-hidden="true">→</span><span class="sr-only"> ${esc(v.verb)} </span><a href="/exist/${e.to}">${esc(titles.get(e.to)!)}</a></li>`),
    '              </ul>',
    '            </div>',
    '          </li>',
  ].join('\n');

  const unusedList = unused.length ? `

        <section aria-labelledby="not-yet">
          <h2 id="not-yet">Not used yet</h2>
          <ul class="legend-compact">
${unused.map((v) => `            <li><span class="verb">${esc(v.verb)}</span><span class="legend-means">${esc(v.means)}.${noteVerbs.has(v.verb) ? ' <span class="row-meta">between notes</span>' : ''}</span></li>`).join('\n')}
          </ul>
        </section>` : '';

  return layout({
    path: 'rrelations',
    title: 'Relations · Nick Ng',
    description: 'The verbs that connect things on nickng.co, and what each side owes the other.',
    nav: 'relations',
    main: `        <h1>Relations</h1>
        <p class="lede">How links work here. Every link is named with a verb. Each verb means one thing and says what the two sides owe each other.</p>
        <p class="row-meta rel-stats">${connected.size} of ${notes.length} things connected · ${edges.length} connections · ${used.length} of ${ALL_VERBS.length} verbs in use</p>

        <section aria-labelledby="in-use">
          <h2 id="in-use">In use</h2>
          <ul class="legend">
${used.map(entry).join('\n')}
          </ul>
        </section>${unusedList}`,
  });
}

export function plainPage(p: { path: string; title: string; description?: string; lede?: string; html: string; mainClass: string }): string {
  return layout({
    path: p.path,
    title: `${p.title} · Nick Ng`,
    description: p.description,
    mainClass: p.mainClass,
    footerCurrent: p.path === COLOPHON_PATH,
    main: `        <h1>${esc(p.title)}</h1>
${p.lede ? `        <p class="lede">${esc(p.lede)}</p>\n` : ''}
${p.html.trim()}`,
  });
}

export function redirectPage(target: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Redirecting to nickng.co${target}</title>
    <link rel="canonical" href="${ORIGIN}${target}">
    <meta http-equiv="refresh" content="0; url=${target}">
  </head>
  <body><p>Moved to <a href="${target}">nickng.co${target}</a>.</p></body>
</html>
`;
}
