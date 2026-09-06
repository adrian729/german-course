 
 
 
 
 
 
 
 
 
 

export type LessonId = string  
export type TopicId = string  
export type PointId = string  
export type LexemeId = string  
export type SentenceId = string  
export type ErratumId = string  
export type ParadigmId = string  

export const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const
export type Level = (typeof LEVELS)[number]

/** The 26 thematic slugs the corpus's ~110 raw vocabulary section titles map
 *  onto via authored content/taxonomy.json. Provenance is preserved per word. */
export const THEMES = [
  'basics',
  'greetings',
  'numbers',
  'time',
  'family',
  'house-home',
  'food-drink',
  'clothing',
  'body-health',
  'travel',
  'transport',
  'city-places',
  'nature-weather',
  'work-professions',
  'education',
  'school',
  'technology',
  'media-culture',
  'money-economy',
  'shopping',
  'relations-feelings',
  'daily-routine',
  'leisure-hobbies',
  'abstract',
  'word-formation',
  'misc',
] as const
export type Theme = (typeof THEMES)[number]

/** How much a human has looked at this record. Drives the visible badge. */
export type Verification = 'extracted' | 'reviewed' | 'authored'

export const POS = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'particle',
  'phrase',
  'interjection',
  'number',
] as const
export type Pos = (typeof POS)[number]

export const GENDERS = ['m', 'f', 'n'] as const
export type Gender = (typeof GENDERS)[number]

 

export type Lesson = {
  id: LessonId
  number: number
  title: string
  shortTitle: string
  level: Level
  summary: string
  status: Verification
  topicOrder: TopicId[]  
  sourceFile: string  
}

/** 'prose' renders markdown and nothing else. The other three render a short
 *  preamble plus a data-driven component, because those H2s are 200-row tables
 *  and 80-item drills that are far better as records than as scrolling markdown. */
export type TopicRender = 'prose' | 'vocabulary' | 'practice' | 'applied'

export type SourceRef = {
  file: string
  lines: [number, number]
  heading: string
  sha256: string  
}

export type Heading = { depth: 2 | 3; text: string; id: string }

export type TopicFrontmatter = {
  id: TopicId
  lessonId: LessonId
  number: number
  title: string
  render: TopicRender
  status: Verification
  summary: string
  points: PointId[]  
  /** Points defined elsewhere that this one leans on. Direction (back/forward)
   *  is COMPUTED from lesson+topic order, never authored. */
  revisits: Array<{ pointId: PointId; note: string }>
  paradigms: ParadigmId[]
  source: SourceRef
}

export type Topic = TopicFrontmatter & {
  slug: string
  readingTimeMin: number
  headings: Heading[]
  counts: { vocab: number; sentences: number; drillItems: number }
  errata: ErratumId[]
}

/** The anchor-and-hover-card entity: the German analogue of the sibling's
 *  GlossaryTerm. Hand-authored — deriving them from the 501 H3 titles would
 *  yield 500 junk anchors. */
export type GrammarPoint = {
  id: PointId
  term: string
  englishTerm: string
  aliases: string[]
  definition: string
  lessonId: LessonId
  topicId: TopicId
  confusableWith: PointId[]  
  sequence?: string[]  
  register?: { spoken: string; written: string }
  level: Level
  themes: Theme[]
}

 

export type PluralKind =
  | 'suffix'
  | 'umlaut'
  | 'full'
  | 'invariant'
  | 'none'
  | 'pluraleTantum'
  | 'unknown'

export type Plural = {
  form: string | null  
  kind: PluralKind
  raw: string | null  
}

export type NounDeclension = 'normal' | 'adjectival' | 'n'

export type VerbInfo = {
  class?: 'weak' | 'strong' | 'mixed' | 'modal'
  separable?: boolean
  prefix?: string
  reflexive?: 'A' | 'D'
  auxiliary?: 'haben' | 'sein'
  /** 3sg present when irregular: waschen (wäscht). This is the OTHER thing the
   *  parenthesis can hold, and confusing it with a plural is the single easiest
   *  way to corrupt the extraction. */
  present3sg?: string
  praeteritum3sg?: string
  partizip2?: string
  praeteritumFull?: string[]  
}

export type Valency = string  

export type Occurrence = {
  topicId: TopicId
  lessonNumber: number
  sourceSection: string
  sourceLine: number
  gloss: string
  exampleId: SentenceId | null
}

export type VocabEntry = {
  id: LexemeId
  headword: string  
  lemma: string  
  pos: Pos | null
  gender: Gender | null
  plural: Plural
  glosses: string[]  
  declension?: NounDeclension
  verb?: VerbInfo
  valency?: Valency
  register: 'neutral' | 'formal' | 'informal' | 'colloquial' | 'literary'
  relations: Array<{
    kind: 'informal-of' | 'feminine-of' | 'derived-from' | 'compound-of'
    lexemeId: LexemeId
  }>
  falseFriend?: { looksLike: string; actuallyMeans: string }
  literal?: string  
  themes: Theme[]
  level: Level
  occurrences: Occurrence[]  
  exampleIds: SentenceId[]
  verification: Verification
  conflicts?: Array<{ field: string; values: string[]; from: TopicId[] }>
  errata: ErratumId[]
}

 

export type Token = { text: string; capitalised: boolean }

export type Sentence = {
  id: SentenceId
  text: string
  tokens: Token[]
  /** The corpus never translates its examples — 3,045 sentences, not one
   *  English rendering. Non-null ONLY for sentences lifted from answer keys,
   *  which do carry a literal gloss. */
  english: string | null
  lexemeIds: LexemeId[]
  topicId: TopicId
  level: Level
  /** Safe to scramble for the word-order drill. True only for 4–8 tokens, one
   *  finite verb, no fronted adverbial, and A1/A2. */
  wordOrderEligible: boolean
  speakable: string  
}

 

export type ParadigmKind = 'verb' | 'article' | 'pronoun' | 'adjective-ending'

export type Paradigm = {
  id: ParadigmId
  title: string
  kind: ParadigmKind
  rows: string[]
  cols: string[]
  cells: string[][]
  /** Properties of a ROW, not a form — lifted out of the grid. */
  notes?: Record<string, string>
  /** Rows introduced in a later lesson render dimmed when viewed as-of an
   *  earlier lesson. Progressive revelation, not progress tracking. */
  rowIntroducedIn?: Record<string, LessonId>
  /** The topic files this grid was merged from — provenance for the
   *  cell-in-body invariant. */
  origins?: TopicId[]
  topicId: TopicId
  verification: Verification
}

 

export type DrillItem = {
  id: string
  n: number
  prompt: string  
  expected: string[]  
  english: string | null  
  rationale: string | null  
  chunks?: string[]  
  /** The section rubric, attached VERBATIM — never summarised. Guards the
   *  typed drills whose key is not the whole set of correct answers. */
  rubric?: string
  sourceTopicId: TopicId
}

export type Drill = {
  id: string
  topicId: TopicId
  title: string
  items: DrillItem[]
}

/** An ungrammatical form the corpus explicitly strikes out. 64 of them. ONLY
 *  the `judgement` generator may render these. */
export type WrongForm = {
  id: string
  form: string
  scope: 'form' | 'sentence'
  correct: string | null
  lexemeId: LexemeId | null
  topicId: TopicId
  context: string
}

 

/** A correction to a corpus we do not own. Quotes and hashes its source, so a
 *  re-extraction that changes that text hard-fails rather than silently
 *  un-fixing the app. */
export type Erratum = {
  id: ErratumId
  kind: 'factual' | 'notation' | 'classification' | 'typo'
  severity: 'error' | 'silent'  
  source: { file: string; line: number; quote: string; sha256: string }
  note: string
  target:
    | { kind: 'lexeme'; id: LexemeId; patch: Partial<VocabEntry> }
    | { kind: 'topic'; id: TopicId; find: string; replace: string }
    | { kind: 'paradigm'; id: ParadigmId; patch: Partial<Paradigm> }
}

 

export type ReadingText = {
  id: string
  topicId: TopicId
  title: string
  level: Level
  body: string
  questions: Array<{ q: string; answer: string | null }>
  /** Raw "New words in this text:" block, as the corpus wrote it. */
  glossary: string
}

export type WritingPrompt = {
  id: string
  topicId: TopicId
  title: string
  prompt: string
  requirements: string[]  
}

 

/** Eager — nav, headers, search, everything the shell renders. */
export type ContentIndex = {
  lessons: Lesson[]
  topics: Record<TopicId, Topic>
  points: Record<PointId, GrammarPoint>
  errata: Record<ErratumId, Erratum>
  stats: {
    lexemes: number
    sentences: number
    drillItems: number
    byVerification: Record<Verification, number>
    unknownPlural: number
    unknownPos: number
    conflicts: number
    /** Relation sources with no lexeme entry. Dropped from distractors;
     *  listed on /status instead of warning per item at build. */
    unresolvedRelations: Array<{ target: string; referrers: string[] }>
  }
}

/** Lazy. Each is reached by a memoised dynamic import in a route loader so the
 *  ~1.6 MB of lexical data stays out of the entry chunk. */
export type VocabBundle = { entries: VocabEntry[] }
export type SentenceBundle = { sentences: Sentence[] }
export type DrillBundle = { drills: Drill[]; wrongForms: WrongForm[] }
export type ParadigmBundle = { paradigms: Paradigm[] }
export type AppliedBundle = { readings: ReadingText[]; prompts: WritingPrompt[] }
