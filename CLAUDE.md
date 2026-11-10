# CLAUDE.md: nickng.co

Context for Claude Code working in this repo. It records decisions so new sessions don't start from zero. If the code and this file disagree, ask before changing either. Private notes, if present, are in `CLAUDE.local.md` (git-ignored); read it too.

## What this site is

A personal site built from small, self-contained entries (**things**) connected by named **relations**. It is not a résumé or a project list. The home headline and bio live in `content/pages/home.md`.

## URL map

| Path | Page | Nav |
|---|---|---|
| `/` | Home: headline, bio, feed of notes | Home mark + `nickng.co` |
| `/exist` | All things. Filters (All, Notes, Work, Ideas) appear once there is more than one kind | Things |
| `/exist/[id]` | One thing | — |
| `/rrelations` | Relations: a legend of verbs, with connections as examples | Relations |
| `/colophon` | How the site is made | Footer: Colophon |

- The puns live **only in URLs**. Nav labels stay plain.
- Plain-word redirects: `/things` goes to `/exist`, and `/relations` goes to `/rrelations`.
- Not decided: `/cv`, `/with` (contact and how to work together).

## Data model

**One collection.** Every thing is currently a note. Each note has a display **type** (pattern, novel, reading plan, epic, field notes) and an optional **stage** (seedling, budding, evergreen), both defined in `src/vocabulary.ts`.

**Note fields** (front matter, schema 1): `schema`, `id` (permanent; matches the file name), `title`, `type`, `stage?`, `date` (when the idea first appeared), `summary?` (shown under the title), `description?` (page description when there's no summary), `aliases[]?` (other names wikilinks may use).

**Kinds** (closed list, for when things other than notes are added): work, practice, organization, service, artifact, tool, concept, question, claim, person. `person` defaults to Nick only. Planned fields for those: `kind`, `definition` (genus plus differentia), `purpose`, `lifecycle` (active, dormant, ended), `question_state` (open, settled), `updated`.

**Relation verbs.** Each edge is stored once in `content/relations.yaml`; the inverse is derived, never written by hand.

| Verb | Inverse | Means | Owes |
|---|---|---|---|
| part of | has part | X is a component of Y | part: fit · whole: context |
| serves in | is served by | X holds a role in Y | holder: effort · Y: clear remit |
| governs | is governed by | X sets rules Y follows | X: clear scope · Y: use and feedback |
| tends | is tended by | X maintains Y without authority | X: care · Y: legibility |
| depends on | is depended on by | X can't operate without Y | X: no excess reliance · Y: notice of change |
| informs | is informed by | X changes what Y knows | X: accuracy · Y: attribution |
| derives from | gives rise to | X began as a version of Y | X: credit |
| succeeds | is succeeded by | X replaces Y | X: migration path · Y: clean end |

**Claim-only verbs** (between notes, no "owes"):

| Verb | Inverse | Means |
|---|---|---|
| argues for | argued for by | X gives reasons to believe Y |
| argues against | argued against by | X gives reasons to doubt Y |
| questions | questioned by | X asks something Y hasn't answered |
| revises | revised by | X is a newer take on Y |
| supersedes | superseded by | X replaces Y as the current view |

**Edge fields:** `from`, `verb`, `to`. Planned: `since`, `until?`, `role?`, `evidence[]` (note ids), `owes?` (a per-edge override, only when concrete).

## How the site is built

- Content is Markdown: notes in `content/notes/<id>.md`, connections in `content/relations.yaml`, photos in `content/images/`, the home bio and colophon in `content/pages/`.
- `src/` is a small TypeScript build (Node ≥ 22.18 runs `.ts` directly; `tsc` only type-checks). `src/vocabulary.ts` is the single source of truth for types, stages and verbs. `src/content.ts` loads and checks content, `src/markdown.ts` renders it, `src/templates.ts` holds the page layouts, `src/build.ts` writes `_site/`, `src/serve.ts` is the dev server.
- Lists, the Relations legend, counts and each note's "Tracks from here" are generated from content. Never hand-edit `_site/`; it is not committed.
- Commands: `npm run dev`, `npm run build`, `npm run check`, `npm run typecheck`. GitHub Actions builds every push and deploys `main` to Pages.

## Skills and reviewers (`.claude/skills/`)

| Skill | Does | Can block? |
|---|---|---|
| `socratic-editor` | Questions Nick, one at a time, to sharpen a note before publishing (adapted from Jane Street's `socratic-tutor`, MIT) | No |
| `accessibility-architect` | WCAG 2.2 AA review of templates, CSS, scripts and images | Yes |
| `security-privacy-engineer` | Privacy of people in content and photos, non-public work detail, build, dependencies, workflow | Yes |
| `content-context-architect` | Critique of things, types, connections, vocabulary and wayfinding | No |
| `typescript-engineer` | Conventions and review for `src/` | No |

Only the two blocking reviewers can stop a change; the others propose and Nick decides. None of them edits Nick's prose without a yes.

## Invariants (the build enforces 1–2; the rest are rules)

1. Every edge uses a registered verb between existing ids.
2. Edges are stored once, and inverses are generated.
3. Ids never change. A rename adds the old name to `aliases`.
4. Nothing goes in the repo that Nick wouldn't say on stage while representing his employer. Personal views only.
5. No new verb until three real edges need it. No new thing until a note cites it.

## Vocabulary: traces and tracks

- **Trace** is a note, the evidence of thinking left behind.
- **Track** is a path between things that you can follow.
- Use these in microcopy only, such as "Tracks from here" and the "Traces" photo sections. Never use them as nav labels, and keep one meaning per word.

## Design

- Ground `#F4F5F2`, ink `#15191C`, muted text `#5C6670`, mono labels `#4A5560`, rules `#D5D9D6`, link underline `#9AA3A0`, accent `#1D5C7A`.
- Type: **Schibsted Grotesk** for body and headings, **IBM Plex Mono** for paths, dates, types and verbs. Both self-hosted in `fonts/`. H1 is 40px at weight 500.
- Layout: page max width 1200px; running text keeps a reading measure of about 36–38rem. Hairline row lists, no cards, no emoji.
- Dates show as `2026.11.01` in the UI and as ISO in the data.
- Every page shows its own URL path in mono next to the home mark (each segment links to its level), and a footer link to the Colophon.
- Accessibility: works at 400px width, visible keyboard focus, contrast of 4.5:1 or better, touch targets 44px or larger, respects reduced motion.
- Privacy: no analytics, no cookies, no third-party requests.

## Copy rules

- Plain, short, active sentences. Name things the way readers would.
- Pattern notes are titled as claims ("Interfaces are agreements"). Other notes use the name readers would use ("The Iliad").
- Use no placeholder or lorem text in shipped pages. Use `[Bracketed placeholders]` while drafting.

## Agent-readable layer (later)

- Generate `graph.json`, `llms.txt`, an RSS feed and `.md` twins of pages from the same source files.
- Advertise `graph.json` with a `<link rel="alternate">` element. Add Person structured data to the home page.

## Roadmap

- Public roadmap: `ROADMAP.md`. It stays high-level, with no dates and no internal detail. Detailed plans live outside this repo.

## Working agreements

- Don't commit or push without asking.
- Don't edit `ROADMAP.md` without asking. Nick maintains it.
- Ask before adding a type, stage, verb, kind, or a new top-level path.
