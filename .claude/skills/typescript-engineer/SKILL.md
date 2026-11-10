---
name: "typescript-engineer"
description: "Build, change and review nickng.co's TypeScript build (src/) the way a careful TypeScript engineer would: strict types, Node's native type stripping, a typed content model, deterministic output, few dependencies, and proof that changes don't alter the site unexpectedly. Use when adding features to the build, changing templates or the vocabulary, adding dependencies, writing tests, or when asked to 'review the code', 'refactor', or 'is this good TypeScript'. Not for content or visual design decisions."
---

# TypeScript Engineer

The build is small on purpose: about 750 lines, three runtime dependencies, no
framework. Keep it that way. Prefer readable code over clever code: every file
should be easy to follow for a designer-engineer and for future contributors.

## The codebase

| File | Job |
|---|---|
| `src/vocabulary.ts` | Types, stages, verbs (inverse, meaning, owes). Single source of truth. |
| `src/content.ts` | Load `content/`, parse front matter, collect every problem with its file. |
| `src/markdown.ts` | markdown-it plus wikilinks, footnotes, figures, galleries, image sizes. |
| `src/templates.ts` | Pages as functions returning HTML strings. `esc()` for every interpolation. |
| `src/build.ts` | Render in memory, check links, write `_site/` only if there are no errors. |
| `src/serve.ts` | Dev server; rebuilds in a child process on change. |

Commands: `npm run typecheck`, `npm run check`, `npm run build`, `npm run dev`.

## Rules of this codebase

1. **Node runs the `.ts` files directly** (type stripping, Node ≥ 22.18). So only
   erasable syntax: no `enum`, `namespace`, parameter properties, or decorators.
   Import local files with the `.ts` extension; use `import type` for types
   (`verbatimModuleSyntax`). `tsconfig.json` enforces this with `erasableSyntaxOnly`.
2. **Strict mode, no `any`.** Use `unknown` at the edges (parsed YAML, front matter),
   then narrow with checks that push a readable error. Avoid non-null `!` unless the
   value was validated just above; say so in a comment.
3. **Types come from data.** Unions are derived from `as const` arrays
   (`TYPES`, `STAGES`) so the list and the type can't drift. Add new vocabulary there.
4. **Collect errors, don't throw.** Content problems go into the errors array with
   `file: message`, so one run lists everything. Throw only for programmer errors.
   Invalid data must never reach templates (see the edge filter in `build.ts`).
5. **Deterministic output.** Sort explicitly (date, then title). No timestamps, random
   ids or environment-dependent paths in generated HTML. The same content always
   produces the same `_site/`.
6. **Escape everything.** Any string from content that lands in HTML goes through
   `esc()`, in attributes too. Rendered Markdown is the one deliberate exception.
7. **Few dependencies.** Before adding one, show what 20–40 lines of our own code
   would cost instead. Pin with the lockfile; CI uses `npm ci`.
8. **Templates stay templates.** Logic (sorting, grouping, counting) happens in
   `build.ts` or small helpers; templates receive ready data and print it.

## Proving a change is safe

- `npm run typecheck` and `npm run check` must pass.
- **Parity check:** build before and after, then compare the visible text of every
  page in `_site/` (strip tags, collapse whitespace). Any difference must be one you
  intended. Diff the HTML too when markup should be unchanged.
- **Failure check:** for new validation, add a deliberately broken input in a scratch
  copy (or temporarily), confirm the build fails with a clear message and writes
  nothing, then restore.
- Prefer adding tests with Node's built-in runner (`node --test src/*.test.ts`) for
  pure functions: `webpSize`, wikilink resolution, gallery and figure transforms,
  front-matter validation. No test framework dependency needed.

## Review checklist

- Types: any `any`, unchecked casts, or `!` without a reason? Are unions derived from
  data?
- Errors: does bad content produce a `file: message` error rather than a crash?
- Output: deterministic? Escaped? Any change to generated HTML that wasn't intended?
- Size: could this be simpler or shorter? Is a new dependency justified?
- Names: do function and variable names say what they mean in the site's terms
  (note, edge, verb, track)?
- Docs: if behaviour changed, are README.md and CLAUDE.md ("How the site is built")
  still true?

## Report

Summarise in one line, then findings by priority with `file:line`, what's wrong, why
it matters here, and the suggested change. Separate must-fix from nice-to-have, and
say which checks you ran and their results.
