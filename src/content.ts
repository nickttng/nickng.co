// Loads content/ and checks it against the vocabulary and CLAUDE.md's rules.
// Every problem is collected with its file, so one build shows them all.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { TYPES, STAGES, findVerb, type NoteType, type Stage } from './vocabulary.ts';

export const SCHEMA_VERSION = 1;

export interface Note {
  id: string;
  title: string;
  type: NoteType;
  stage?: Stage;
  /** ISO date the idea first appeared (YYYY-MM-DD). */
  date: string;
  /** Shown under the title, and used as the page description. */
  summary?: string;
  /** Page description when there is no summary. */
  description?: string;
  /** Other names that wikilinks may use for this note. */
  aliases: string[];
  body: string;
  file: string;
}

export interface Edge {
  from: string;
  verb: string;
  to: string;
}

export interface Page {
  front: Record<string, unknown>;
  body: string;
  file: string;
}

export interface Content {
  notes: Note[];
  edges: Edge[];
  pages: Record<string, Page>;
  errors: string[];
}

const NOTE_KEYS = new Set(['schema', 'id', 'title', 'type', 'stage', 'date', 'summary', 'description', 'aliases']);
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function splitFrontMatter(text: string): { front: Record<string, unknown>; body: string } | null {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return null;
  const front = parseYaml(m[1]) as Record<string, unknown> | null;
  return { front: front ?? {}, body: text.slice(m[0].length) };
}

export function loadContent(root: string): Content {
  const errors: string[] = [];
  const notes: Note[] = [];
  const notesDir = join(root, 'notes');

  for (const name of readdirSync(notesDir).filter((n) => n.endsWith('.md')).sort()) {
    const file = join('content/notes', name);
    const parsed = splitFrontMatter(readFileSync(join(notesDir, name), 'utf8'));
    if (!parsed) { errors.push(`${file}: missing front matter`); continue; }
    const f = parsed.front;
    const bad = (msg: string) => errors.push(`${file}: ${msg}`);

    const errorCount = errors.length;
    for (const key of Object.keys(f)) if (!NOTE_KEYS.has(key)) bad(`unknown field "${key}"`);
    if (f.schema !== SCHEMA_VERSION) bad(`schema must be ${SCHEMA_VERSION}`);
    const id = String(f.id ?? '');
    if (!ID_PATTERN.test(id)) bad(`id "${id}" must be lowercase words joined by hyphens`);
    if (id !== basename(name, '.md')) bad(`id "${id}" must match the file name`);
    if (typeof f.title !== 'string' || !f.title.trim()) bad('title is required');
    if (!TYPES.includes(f.type as NoteType)) bad(`type "${f.type}" is not one of: ${TYPES.join(', ')}`);
    if (f.stage !== undefined && !STAGES.includes(f.stage as Stage)) bad(`stage "${f.stage}" is not one of: ${STAGES.join(', ')}`);
    if (typeof f.date !== 'string' || !DATE_PATTERN.test(f.date)) bad('date must be YYYY-MM-DD');
    if (f.aliases !== undefined && !Array.isArray(f.aliases)) bad('aliases must be a list');
    if (errors.length > errorCount) continue;

    notes.push({
      id,
      title: String(f.title ?? ''),
      type: f.type as NoteType,
      stage: f.stage as Stage | undefined,
      date: String(f.date ?? ''),
      summary: f.summary === undefined ? undefined : String(f.summary),
      description: f.description === undefined ? undefined : String(f.description),
      aliases: Array.isArray(f.aliases) ? f.aliases.map(String) : [],
      body: parsed.body,
      file,
    });
  }

  const ids = new Set<string>();
  for (const n of notes) {
    if (ids.has(n.id)) errors.push(`${n.file}: duplicate id "${n.id}"`);
    ids.add(n.id);
  }

  // Connections: stored once, checked against the vocabulary.
  const edges: Edge[] = [];
  const relFile = 'content/relations.yaml';
  const relPath = join(root, 'relations.yaml');
  if (existsSync(relPath)) {
    const raw = parseYaml(readFileSync(relPath, 'utf8')) as unknown;
    if (!Array.isArray(raw)) errors.push(`${relFile}: must be a list of connections`);
    const seen = new Set<string>();
    for (const [i, e] of (Array.isArray(raw) ? raw : []).entries()) {
      const where = `${relFile} #${i + 1}`;
      const edge = { from: String(e?.from ?? ''), verb: String(e?.verb ?? ''), to: String(e?.to ?? '') };
      if (!ids.has(edge.from)) errors.push(`${where}: unknown "from" id "${edge.from}"`);
      if (!ids.has(edge.to)) errors.push(`${where}: unknown "to" id "${edge.to}"`);
      if (!findVerb(edge.verb)) errors.push(`${where}: "${edge.verb}" is not a registered verb`);
      if (edge.from === edge.to) errors.push(`${where}: a thing can't connect to itself`);
      const key = `${edge.from}|${edge.verb}|${edge.to}`;
      if (seen.has(key)) errors.push(`${where}: duplicate connection`);
      seen.add(key);
      edges.push(edge);
    }
  }

  // Pages: hand-written pages such as the home bio and the colophon.
  const pages: Record<string, Page> = {};
  const pagesDir = join(root, 'pages');
  if (existsSync(pagesDir)) {
    for (const name of readdirSync(pagesDir).filter((n) => n.endsWith('.md'))) {
      const file = join('content/pages', name);
      const parsed = splitFrontMatter(readFileSync(join(pagesDir, name), 'utf8'));
      if (!parsed) { errors.push(`${file}: missing front matter`); continue; }
      pages[basename(name, '.md')] = { ...parsed, file };
    }
  }

  return { notes, edges, pages, errors };
}
