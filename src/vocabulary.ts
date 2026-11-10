// The site's vocabulary: one source of truth for note types, stages and
// relation verbs. The build checks every note and connection against it.
// See CLAUDE.md > Data model. Ask before adding a type, stage or verb.

/** What kind of object a note looks at, shown in lists ("pattern", "trip"...). */
export const TYPES = ['pattern', 'novel', 'reading plan', 'epic', 'field notes'] as const;
export type NoteType = (typeof TYPES)[number];

/** How settled a note is. */
export const STAGES = ['seedling', 'budding', 'evergreen'] as const;
export type Stage = (typeof STAGES)[number];

export interface VerbDef {
  verb: string;
  inverse: string;
  means: string;
  /** What each side owes the other, when defined. */
  owes?: string;
}

/** Verbs between any two things (CLAUDE.md order). */
export const THING_VERBS: readonly VerbDef[] = [
  { verb: 'part of', inverse: 'has part', means: 'X is a component of Y', owes: 'part: fit · whole: context' },
  { verb: 'serves in', inverse: 'is served by', means: 'X holds a role in Y', owes: 'holder: effort · Y: clear remit' },
  { verb: 'governs', inverse: 'is governed by', means: 'X sets rules Y follows', owes: 'X: clear scope · Y: use and feedback' },
  { verb: 'tends', inverse: 'is tended by', means: 'X maintains Y without authority', owes: 'X: care · Y: legibility' },
  { verb: 'depends on', inverse: 'is depended on by', means: 'X can’t operate without Y', owes: 'X: no excess reliance · Y: notice of change' },
  { verb: 'informs', inverse: 'is informed by', means: 'X changes what Y knows', owes: 'X: accuracy · Y: attribution' },
  { verb: 'derives from', inverse: 'gives rise to', means: 'X began as a version of Y', owes: 'X: credit' },
  { verb: 'succeeds', inverse: 'is succeeded by', means: 'X replaces Y', owes: 'X: migration path · Y: clean end' },
];

/** Verbs only between notes. No "owes" defined for these. */
export const NOTE_VERBS: readonly VerbDef[] = [
  { verb: 'argues for', inverse: 'argued for by', means: 'X gives reasons to believe Y' },
  { verb: 'argues against', inverse: 'argued against by', means: 'X gives reasons to doubt Y' },
  { verb: 'questions', inverse: 'questioned by', means: 'X asks something Y hasn’t answered' },
  { verb: 'revises', inverse: 'revised by', means: 'X is a newer take on Y' },
  { verb: 'supersedes', inverse: 'superseded by', means: 'X replaces Y as the current view' },
];

export const ALL_VERBS: readonly VerbDef[] = [...THING_VERBS, ...NOTE_VERBS];

export function findVerb(verb: string): VerbDef | undefined {
  return ALL_VERBS.find((v) => v.verb === verb);
}
