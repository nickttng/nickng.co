# nickng.co

Nick Ng's personal site. Small, self-contained entries (things) connected by named relations, written in Markdown and built into plain HTML by a small TypeScript build.

## Write

| What | Where |
|---|---|
| A note | `content/notes/<id>.md` |
| A connection | `content/relations.yaml` |
| Photos | `content/images/` (WebP) |
| Home bio, Colophon | `content/pages/` |

A note starts with front matter:

```yaml
---
schema: 1
id: the-iliad                 # permanent; must match the file name
title: "The Iliad"
type: epic                    # pattern · novel · reading plan · epic · field notes
stage: budding                # optional: seedling · budding · evergreen
date: 2026-01-08              # when the idea first appeared
summary: "Shown under the title and used as the page description."
---
```

In the body: `[[Title]]` links to another note, `![alt](images/x.webp)` adds a photo (an *italic line* right after it becomes the caption), several photos in one paragraph become a gallery, and `[^1]` adds a footnote.

Types, stages and verbs live in `src/vocabulary.ts`.

## Build

```sh
npm install
npm run dev        # http://localhost:4000, rebuilds on save
npm run build      # writes _site/
npm run check      # checks content and links without writing
npm run typecheck
```

The build fails, and writes nothing, if a note's front matter is wrong, a connection uses an unknown id or verb, a wikilink or internal link is broken, or an image is missing.

## Publish

Pushing to `main` builds and deploys to GitHub Pages (`.github/workflows/deploy.yml`). Pages source must be set to **GitHub Actions** in the repo settings.

See [ROADMAP.md](ROADMAP.md) for where the site is going.
