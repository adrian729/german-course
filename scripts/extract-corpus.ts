// pnpm extract — reads ../enciclopedia/docs/german/week_N.md and emits:
//   content/lessons/<lessonId>/topics/*.md   (93 topic bodies, one per content H2)
//   content/lessons/<lessonId>/lesson.json   (topicOrder + metadata)
//   content/extracted/*.jsonl / *.json        (vocab, sentences, drills, paradigms,
//                                             wrong forms, readings, prompts)
//   content/extracted/.upstream.json          (per-file sha256 — drift detector)
//
// MACHINE-WRITTEN output: content/extracted/ is clobbered every run and never
// hand-edited; topic bodies under content/lessons/ are machine-owned but their
// frontmatter keys are owned individually (build-content preserves the
// human-authored keys). Run rarely; the output is committed.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { LESSONS, TABLE_SHAPES, PRACTICE_RE, VOCAB_RE, APPLIED_RE, ANSWER_KEY_RE, WEEK_RE, WEEK_REPLACE, VALENCY_RE, FULL_PLURAL_RE } from './extract.config.ts'
import type { Gender, Level, Plural, Pos, Theme } from '../src/content/types.ts'

const ROOT = join(import.meta.dirname, '..')
const CORPUS = process.env.CORPUS_DIR ?? join(ROOT, '..', 'enciclopedia', 'docs', 'german')
const LESSONS_DIR = join(ROOT, 'content', 'lessons')
const EXTRACTED_DIR = join(ROOT, 'content', 'extracted')

const taxonomy = JSON.parse(readFileSync(join(ROOT, 'content', 'taxonomy.json'), 'utf8')) as {
  sections: Array<{ section: string; theme: Theme; pos?: Pos }>
}
const themeBySection = new Map(taxonomy.sections.map((s) => [normTitle(s.section), s]))

const warnings: string[] = []
const warn = (lessonId: string, msg: string) => warnings.push(`[${lessonId}] ${msg}`)
// An unregistered table shape inside a vocabulary section fabricates data
// (the false-friend row read positionally mints phantom senses) — guessing
// is strictly worse than stopping, so this hard-fails.
const unknownShapes: string[] = []
// Article vs gender-tag disagreement means the parser broke. Same treatment.
const genderDisagreements: string[] = []

// ---------------------------------------------------------------- utilities

const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex')

export function asciiFold(s: string): string {
  return s
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/ẞ/g, 'Ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function slugify(s: string): string {
  return (
    asciiFold(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'x'
  )
}

/** H3 title "5.1. Feelings & Emotions (25)" → "feelings emotions" (for taxonomy lookup). */
function normTitle(s: string): string {
  return s
    .replace(/^\s*\d+(?:\.\d+)*\.\s*/, '')
    .replace(/\s*\(\d+(?:–\d+)?\s*\w*\)\s*$/, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

/** Table-header normaliser: `#` survives, everything else becomes words. */
function headerNorm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9#]+/g, ' ').trim().replace(/\s+/g, ' ')
}

/** GitHub-style slug for the ToC anchor check — keeps digits and umlauts. */
function ghSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stripBold(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1')
}

function stripInlineMd(s: string): string {
  return stripBold(s).replace(/[*_]/g, '').trim()
}

function cellsOf(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim())
}

const isSeparatorRow = (cells: string[]): boolean => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c))

// ------------------------------------------------------------- headword parse

const ARTICLE_RE = /^(der|die|das)\s+/
const SEPARABLE_PREFIXES = new Set(
  'ab an auf aus bei ein mit nach vor zu los fest fern heim her hin weg zurück gegenüber entgegen'.split(' '),
)
const ENGLISH_STOPWORDS = new Set(
  'to a an the of for with from in on and or be is are was were has have had will would can could should may might must not no by at as into about against between during without through during before after above below up down out off over under again further then once here there when where why how all any both each few more most other some such only own same so than too very just also'.split(' '),
)

type ParsedParen = Partial<{
  gender: Gender | null
  plural: Plural
  present3sg: string
  valency: string
  derivedFrom: string
}>

const UNKNOWN_PLURAL: Plural = { form: null, kind: 'unknown', raw: null }

function parseParen(raw: string, level: number, section: string, line: number): ParsedParen {
  const m = /\(([^()]+)\)\s*$/.exec(raw)
  if (!m) return {}
  const inner = m[1]!.trim()
  if (inner === 'no pl.') return { plural: { form: null, kind: 'none', raw: inner } }
  if (inner === 'pl.') return { plural: { form: null, kind: 'pluraleTantum', raw: inner } }
  if (inner === '—' || inner === '–' || inner === '-') return { plural: { form: null, kind: 'invariant', raw: inner } }


  if (inner === 'm.' || inner === 'f.' || inner === 'n.') {
    if (level !== 3) warn(`l${level}`, `gender tag "${inner}" outside lesson 3 in "${section}" L${line}`)
    // Plural unknown — but keep the raw tag: it is the tooltip and the
    // re-extraction diff signal, not disposable.
    return { gender: inner[0] as Gender, plural: { form: null, kind: 'unknown', raw: inner } }
  }

  const suff = /^-([a-zäöüß]+)$/.exec(inner)
  if (suff) return { plural: { form: null, kind: 'suffix', raw: inner } }

  if (/^[A-ZÄÖÜ]/.test(inner) && FULL_PLURAL_RE.test(inner)) {
    return { plural: { form: inner, kind: /[äöü]/.test(inner) ? 'umlaut' : 'full', raw: inner } }
  }

  if (VALENCY_RE.test(inner)) return { valency: inner }

  // 3sg stem change: "wäscht", "fährt ab", "nimmt" — never a plural.
  const words = inner.split(/\s+/)
  const singleWord = words.length === 1
  if (singleWord && /(st|t)$/.test(words[0]!) && !/(en|eln|ern)$/.test(words[0]!)) {
    return { present3sg: inner }
  }
  if (words.length === 2 && SEPARABLE_PREFIXES.has(words[1]!) && /(st|t)$/.test(words[0]!)) {
    return { present3sg: inner }
  }

  // multi-word parens after a noun are either a full plural form written out
  // ("die erneuerbare Energie (erneuerbaren Energien)") or an English gloss
  // ("spielen (to play)"). English contains function words; German does not.
  if (words.length > 1 && ![...ENGLISH_STOPWORDS].some((w) => words.includes(w))) {
    return { plural: { form: inner, kind: 'full', raw: inner } }
  }

  // infinitive source: "die Ablehnung (ablehnen)"
  if (singleWord && /(en|eln|ern)$/.test(words[0]!)) return { derivedFrom: inner }

  // dotted abbreviation like (z.B.) is part of the phrase, not a notation
  return {}
}

type Headword = {
  headword: string
  lemma: string
  gender: Gender | null
  plural: Plural
  present3sg?: string
  valency?: string
  derivedFrom?: string
  reflexive?: 'A' | 'D'
  phrase: boolean
}

function parseHeadword(raw0: string, ctx: { pos: Pos | null; level: number; section: string; line: number }): Headword | null {
  const raw = stripBold(raw0).trim()
  if (!raw) return null

  // Note: "der Arzt (m.) / die Ärztin (f.)" pair rows are split by the caller
  // (splitPairRows); each half is parsed independently here.

  const paren = parseParen(raw, ctx.level, ctx.section, ctx.line)
  const noted = Object.keys(paren).length > 0
  const noParen = raw.replace(/\([^()]+\)\s*$/, '').trim()
  const base = noted ? noParen : raw

  const article = ARTICLE_RE.exec(base)
  const articleWord = article?.[1] ?? null
  const rest = base.replace(ARTICLE_RE, '').trim()
  const reflexive = rest.startsWith('sich ')
  const phrase = articleWord !== null && /\s/.test(rest)

  let plural = paren.plural ?? UNKNOWN_PLURAL
  // invariant and plurale tantum: the plural form IS the lemma, and a
  // plurale tantum has no gender (the corpus's "die (pl.)" is a plural article).
  if (plural.kind === 'invariant' || plural.kind === 'pluraleTantum') {
    plural = { ...plural, form: rest }
    if (plural.kind === 'pluraleTantum' && paren.gender === undefined) {
      paren.gender = null
    }
  }
  // Suffix plurals are expanded to a fully spelled-out form here so nothing
  // downstream ever sees a bare suffix: Schwester + -n = Schwestern.
  if (plural.kind === 'suffix' && plural.raw) {
    plural = { ...plural, form: `${rest}${plural.raw.slice(1)}` }
  }
  // Lessons 10–12 spell out invariant plurals (Richter); normalise to
  // invariant so the two spellings of one fact never read as a conflict.
  if ((plural.kind === 'full' || plural.kind === 'umlaut') && plural.form === rest) {
    plural = { ...plural, kind: 'invariant' }
  }
  const articleGender: Gender | null = articleWord === 'der' ? 'm' : articleWord === 'die' ? 'f' : articleWord === 'das' ? 'n' : null
  if (paren.gender !== undefined && paren.gender !== null && articleGender && paren.gender !== articleGender) {
    // Hard failure, not a warning: article and tag both present and
    // disagreeing means the parser broke (a wrong gender here ships a wrong
    // word page and wrong drill keys downstream).
    genderDisagreements.push(`[${ctx.level}] gender tag "(${paren.gender}.)" disagrees with article "${articleWord}" in "${raw}" (${ctx.section} L${ctx.line})`)
  }
  if (plural.kind === 'pluraleTantum') {
    warn(`l${ctx.level}`, `(pl.) "${raw}" needs a human decision — may be a plural of an existing singular, not a plurale tantum (${ctx.section} L${ctx.line})`)
  }
  const gender: Gender | null = plural.kind === 'pluraleTantum' ? null : (paren.gender ?? articleGender)

  return {
    headword: base,
    lemma: reflexive ? rest : articleWord ? rest : base,
    gender,
    plural,
    present3sg: paren.present3sg,
    valency: paren.valency,
    derivedFrom: paren.derivedFrom,
    reflexive: reflexive ? (ctx.section.includes('Dat') ? 'D' : 'A') : undefined,
    phrase,
  }
}

/** "die Daumen drücken" → lemma "Daumen drücken" (article stripped). */
function lemmaOf(h: Headword): string {
  return h.lemma
}

// const foldKey — superseded: POS resolves in rowToOccurrence before the key is built.

// --------------------------------------------------------------- topic split

type H2Block = {
  number: number
  heading: string
  title: string
  start: number
  end: number
  body: string[]
}

function splitH2s(lines: string[]): H2Block[] {
  const blocks: H2Block[] = []
  let current: H2Block | null = null
  for (let i = 0; i < lines.length; i++) {
    const m = /^##\s+([\d.]+)\.\s+(.+)$/.exec(lines[i]!)
    if (m) {
      if (current) current.end = i
      current = {
        number: parseInt(m[1]!, 10),
        heading: `${m[1]}. ${m[2]}`,
        title: m[2]!.trim(),
        start: i,
        end: lines.length,
        body: [],
      }
      blocks.push(current)
    } else if (current) {
      current.body.push(lines[i]!)
    }
  }
  return blocks
}

function classify(title: string): 'prose' | 'vocabulary' | 'practice' | 'applied' {
  if (VOCAB_RE.test(title)) return 'vocabulary'
  if (PRACTICE_RE.test(title)) return 'practice'
  if (APPLIED_RE.test(title)) return 'applied'
  return 'prose'
}

const renderSlug = (render: string, title: string): string =>
  render === 'vocabulary'
    ? 'vocabulary'
    : render === 'practice'
      ? 'practice'
      : render === 'applied'
        ? 'applied-skills'
        : slugify(title.split(' — ')[0]!.split(' / ')[0]!)

// ------------------------------------------------------------------ stages

const files = readdirSync(CORPUS).filter((f) => /^week_\d+\.md$/.test(f)).sort()
const upstream: Record<string, { sha256: string; lines: number; bytes: number }> = {}
const weekSources = new Map<string, string[]>()

for (const f of files) {
  const text = readFileSync(join(CORPUS, f), 'utf8')
  upstream[f] = { sha256: sha256(text), lines: text.split('\n').length, bytes: Buffer.byteLength(text) }
  weekSources.set(f, text.split('\n'))
}

mkdirSync(EXTRACTED_DIR, { recursive: true })
mkdirSync(LESSONS_DIR, { recursive: true })

const allOccurrences: Record<string, unknown>[] = []
const allSentences: Record<string, unknown>[] = []
const allParadigms: Record<string, unknown>[] = []
const allDrills: Record<string, unknown>[] = []
const allWrongForms: Record<string, unknown>[] = []
const allReadings: Record<string, unknown>[] = []
const allPrompts: Record<string, unknown>[] = []

const sentenceByText = new Map<string, string>()

function sentenceId(text: string): string {
  let id = sentenceByText.get(text)
  if (!id) {
    id = `s-${sha256(text.normalize('NFC')).slice(0, 6)}`
    sentenceByText.set(text, id)
  }
  return id
}

function cleanSentence(s: string): string {
  return (
    stripInlineMd(s)
      .replace(/\s*—\s*\*[^*]*\*.*$/, '')
      .replace(/\s*—\s*\w.*$/, '')
      .replace(/\s*\([^()]*[a-zäöüß]+[^()]*\)\s*$/, '')
      .replace(/[\[\]]/g, '')
      .trim()
  )
}

function registerSentence(text0: string, topicId: string, level: Level): string | null {
  const text = cleanSentence(text0)
  if (!text || !/[a-zäüöß]/.test(text)) return null
  const id = sentenceId(text)
  if (!allSentences.some((s) => s.id === id)) {
    const tokens = text.split(/\s+/).map((t) => ({ text: t, capitalised: /^[A-ZÄÖÜ]/.test(t) }))
    allSentences.push({
      id,
      text,
      tokens,
      english: null,
      lexemeIds: [],
      topicId,
      level,
      wordOrderEligible:
        (level === 'A1' || level === 'A2') &&
        tokens.length >= 4 &&
        tokens.length <= 8 &&
        !text.includes(',') &&
        !text.includes('?') &&
        !/^(heute|morgen|gestern|jetzt|dort|hier|leider)\s/i.test(text),
      speakable: text,
    })
  }
  return id
}

// ---------------------------------------------------------------- stage: emit topics

let topicTotal = 0

for (const lesson of LESSONS) {
  const lines = weekSources.get(lesson.weekFile)!
  const blocks = splitH2s(lines).filter((b) => !/^Table of Contents/i.test(b.title))

  // ToC anchor check — a dangling anchor is a signal about the source.
  const tocStart = lines.findIndex((l) => l.startsWith('## Table of Contents'))
  if (tocStart >= 0) {
    const toc = lines.slice(tocStart, tocStart + 100).join('\n')
    const anchors = [...toc.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]!)
    const headingIds = new Set(
      lines.filter((l) => /^#{2,3}\s/.test(l)).map((l) => ghSlug(l.replace(/^#{2,3}\s+/, ''))),
    )
    for (const a of anchors) {
      if (!headingIds.has(ghSlug(a))) warn(lesson.id, `dangling ToC anchor "#${a}"`)
    }
  }

  const lessonDir = join(LESSONS_DIR, lesson.id)
  const topicsDir = join(lessonDir, 'topics')
  mkdirSync(topicsDir, { recursive: true })
  const topicOrder: string[] = []

  for (const block of blocks) {
    const render = classify(block.title)
    const slug = `${String(block.number).padStart(2, '0')}-${renderSlug(render, block.title)}`
    const topicId = `${lesson.id}/${slug}`
    topicOrder.push(topicId)
    topicTotal++

    let bodyLines = block.body
    if (render === 'practice') {
      const keyIdx = bodyLines.findIndex((l) => ANSWER_KEY_RE.test(l))
      if (keyIdx >= 0) bodyLines = bodyLines.slice(0, keyIdx)
    }

    let body = bodyLines.join('\n').trim()
    if (render !== 'prose') {
      const firstH3 = bodyLines.findIndex((l) => /^###\s/.test(l))
      body = (firstH3 >= 0 ? bodyLines.slice(0, firstH3) : bodyLines).join('\n').trim()
    }
    body = body.replace(WEEK_RE, WEEK_REPLACE)

    const topicPath = join(topicsDir, `${slug}.md`)
    // Frontmatter keys are owned individually: the machine owns id, lessonId,
    // number, title, render and source; everything else (summary, points,
    // revisits, paradigms, status) survives re-extraction verbatim.
    let preserved: Record<string, unknown> = {}
    if (existsSync(topicPath)) {
      try {
        preserved = matter(readFileSync(topicPath, 'utf8')).data as Record<string, unknown>
      } catch {
        preserved = {}
      }
    }
    const fm = {
      ...preserved,
      id: topicId,
      lessonId: lesson.id,
      number: block.number,
      title: block.title.replace(/^[\d.]+\.\s*/, '').trim(),
      render,
      status: typeof preserved.status === 'string' ? preserved.status : 'extracted',
      summary: typeof preserved.summary === 'string' ? preserved.summary : '',
      points: Array.isArray(preserved.points) ? preserved.points : [],
      revisits: Array.isArray(preserved.revisits) ? preserved.revisits : [],
      paradigms: Array.isArray(preserved.paradigms) ? preserved.paradigms : [],
      source: {
        file: lesson.weekFile,
        lines: [block.start, block.end],
        heading: block.heading,
        sha256: upstream[lesson.weekFile]!.sha256,
      },
    }

    const frontmatter = `---\n${Object.entries(fm)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n')}\n---\n`
    writeFileSync(topicPath, frontmatter + body + '\n')

    if (render === 'vocabulary') extractVocabulary(lesson, levelOf(lesson), block, topicId)
    if (render === 'practice') extractDrills(lesson, block, topicId)
    if (render === 'applied') extractApplied(lesson, block, topicId)
  }

  const lessonJsonPath = join(lessonDir, 'lesson.json')
  const existing = existsSync(lessonJsonPath) ? JSON.parse(readFileSync(lessonJsonPath, 'utf8')) : {}
  writeFileSync(
    lessonJsonPath,
    JSON.stringify(
      {
        ...existing,
        id: lesson.id,
        number: lesson.number,
        title: lesson.title,
        shortTitle: lesson.shortTitle,
        level: lesson.level,
        summary: existing.summary ?? lesson.summary,
        status: existing.status ?? 'extracted',
        topicOrder,
        sourceFile: lesson.weekFile,
      },
      null,
      2,
    ) + '\n',
  )

  const indexPath = join(lessonDir, 'index.md')
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, `# ${lesson.title}\n\n${lesson.summary}\n`)
  }
}

function levelOf(lesson: (typeof LESSONS)[number]): Level {
  const lines = weekSources.get(lesson.weekFile)!
  const m = /\(([A-C]\d)\)\s*$/.exec(lines[0]!)
  return (m?.[1] as Level) ?? lesson.level
}

// ------------------------------------------------------------- vocabulary

function extractVocabulary(lesson: (typeof LESSONS)[number], level: Level, block: H2Block, topicId: string) {
  const lines = block.body
  let section = ''
  let sectionPos: Pos | null = null
  let sectionTheme: Theme | null = null
  let inTable = false
  let headerCells: string[] | null = null
  let shape: (typeof TABLE_SHAPES)[number]['shape'] | null = null

  const parseRow = (row: string[], line: number) => {
    if (!shape) return
    const headRaw = row[shape.head] ?? ''
    const halves = splitPairRows(headRaw)
    const isFemininePair = halves.length === 2
    for (const single of halves) {
      const occurrence = rowToOccurrence(single, row, shape, lesson, level, topicId, section, sectionPos, sectionTheme, line, block.start)
      if (!occurrence) continue
      if (isFemininePair && (occurrence.gender as string) === 'f') {
        // der Arzt (m.) / die Ärztin (f.): the feminine entry alone carries a
        // feminine-of link to the masculine lemma.
        const other = halves.find((h) => h !== single) ?? ''
        const otherLemma = other.replace(/\([^()]+\)\s*$/, '').replace(/^(der|die|das)\s+/, '').trim()
        ;(occurrence.relations as Array<{ kind: string; sourceRaw: string }>).push({ kind: 'feminine-of', sourceRaw: otherLemma })
      }
      allOccurrences.push(occurrence)
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    if (/^###\s/.test(line)) {
      section = line.replace(/^###\s+/, '').trim()
      const info = themeBySection.get(normTitle(section))
      sectionPos = info?.pos ?? null
      sectionTheme = info?.theme ?? null
      if (!info) warn(lesson.id, `unmapped vocabulary section "${section}"`)
      inTable = false
      headerCells = null
      shape = null
      continue
    }

    if (line.startsWith('|')) {
      const cells = cellsOf(line)
      if (!inTable) {
        inTable = true
        headerCells = cells
        shape = classifyTable(cells)
        if (!shape) {
          unknownShapes.push(`[${lesson.id}] unknown table shape in "${section}": ${JSON.stringify(cells)}`)
          warn(lesson.id, `unknown table shape in "${section}": ${JSON.stringify(cells)}`)
        }
        continue
      }
      if (shape && headerCells && !isSeparatorRow(cells) && cells.length >= headerCells.length) {
        parseRow(cells, i)
      }
      continue
    }

    if (inTable) {
      inTable = false
      headerCells = null
      shape = null
    }

    const numbered = /^(\d+)\.\s+(.+?)(?:\s+—\s+(.+))?$/.exec(line)
    if (numbered) {
      shape = { head: 0, gloss: 1 }
      parseRow([numbered[2]!.trim(), numbered[3]?.trim() ?? ''], i)
      shape = null
    }
  }

  // Masculine/feminine profession rows ("der Bekannte" / "die Bekannte" as
  // separate rows of one table): the feminine occurrence alone carries a
  // feminine-of link to the masculine lemma.
  const seenInBlock = new Map<string, Record<string, unknown>[]>()
  for (const o of allOccurrences) {
    const occ = o as { occurrence?: { topicId?: string; sourceSection?: string }; lemma?: string; pos?: string; gender?: string }
    if (occ.occurrence?.topicId !== topicId || occ.pos !== 'noun' || !occ.lemma) continue
    const k = `${occ.occurrence.sourceSection}::${occ.lemma}`
    const arr = seenInBlock.get(k)
    if (arr) arr.push(o)
    else seenInBlock.set(k, [o])
  }
  for (const group of seenInBlock.values()) {
    const byGender = new Map<string, Record<string, unknown>[]>()
    for (const o of group) {
      const g = (o as { gender?: string }).gender ?? ''
      const arr = byGender.get(g)
      if (arr) arr.push(o)
      else byGender.set(g, [o])
    }
    const ms = byGender.get('m') ?? []
    const fs = byGender.get('f') ?? []
    if (ms.length === 0 || fs.length === 0) continue
    const masc = ms[0] as unknown as { lemma: string }
    for (const f of fs) {
      const fem = f as unknown as { relations: Array<{ kind: string; sourceRaw: string }>; lemma: string }
      if (masc && !fem.relations.some((r) => r.kind === 'feminine-of')) {
        fem.relations.push({ kind: 'feminine-of', sourceRaw: masc.lemma })
      }
    }
  }
}

function splitPairRows(raw: string): string[] {
  if (!raw.includes(' / ')) return [raw]
  const parts = raw.split(' / ')
  return parts.every((p) => ARTICLE_RE.test(p)) ? parts : [raw]
}

function classifyTable(cells: string[]): (typeof TABLE_SHAPES)[number]['shape'] | null {
  const norm = cells.map((c) => headerNorm(c))
  for (const entry of TABLE_SHAPES) {
    if (norm.length >= entry.match.length && entry.match.every((m, j) => norm[j] === headerNorm(m))) return entry.shape
  }
  return null
}

function rowToOccurrence(
  headRaw: string,
  row: string[],
  shape: (typeof TABLE_SHAPES)[number]['shape'],
  lesson: (typeof LESSONS)[number],
  level: Level,
  topicId: string,
  section: string,
  sectionPos: Pos | null,
  sectionTheme: Theme | null,
  line: number,
  sectionStart: number,
): Record<string, unknown> | null {
  const parsed = parseHeadword(headRaw, { pos: sectionPos, level: lesson.number, section, line: line + sectionStart + 2 })
  if (!parsed) return null

  // POS cascade: section override → structural tests → null (+ warning at build).
  const structuralPos = (): Pos | null => {
    if (parsed.phrase) return 'phrase'
    if (parsed.gender) return 'noun'
    if (/^[a-zäöüß]/.test(parsed.lemma)) {
      if (/(en|eln|ern)$/.test(parsed.lemma)) return 'verb'
      return 'adjective'
    }
    return null
  }
  // POS cascade: phrase first (the article in "das Bett machen" is part of
  // the idiom, not a gender tag), then gendered headwords are nouns no
  // matter what the section claims, then section override, then structural.
  const pos: Pos | null = (shape.forcePhrase || parsed.phrase) ? 'phrase' : parsed.gender ? 'noun' : (sectionPos ?? structuralPos())

  const gloss = shape.gloss !== undefined ? stripInlineMd(row[shape.gloss] ?? '') : ''
  const exampleRaw = shape.example !== undefined ? (row[shape.example] ?? '') : ''
  const exampleId = exampleRaw ? registerSentence(exampleRaw, topicId, level) : null

  const relations: Array<{ kind: string; sourceRaw: string; topicId: string; lessonNumber: number; sourceSection: string; sourceLine: number }> = []
  const relCtx = { topicId, lessonNumber: lesson.number, sourceSection: section, sourceLine: line + sectionStart + 2 }
  if (shape.derivedFrom !== undefined) {
    const src = stripInlineMd(row[shape.derivedFrom] ?? '')
    if (src && !/[A-ZÄÖÜ]/.test(src[0]!)) relations.push({ kind: 'derived-from', sourceRaw: src.replace(/\([^()]+\)/g, '').trim(), ...relCtx })
  }
  if (shape.informal !== undefined) {
    const inf = stripInlineMd(row[shape.informal] ?? '')
    if (inf) relations.push({ kind: 'informal-of', sourceRaw: inf, ...relCtx })
  }

  const plural = parsed.plural

  return {
    key: `${pos}:${asciiFold(lemmaOf(parsed)).toLowerCase()}`,
    headword: parsed.headword,
    lemma: lemmaOf(parsed),
    pos,
    gender: parsed.gender,
    plural,
    gloss,
    register: shape.registerFromCol !== undefined ? 'formal' : 'neutral',
    relations,
    themes: sectionTheme ? [sectionTheme] : [],
    level: lesson.level,
    present3sg: parsed.present3sg,
    valency: parsed.valency,
    reflexive: parsed.reflexive,
    literal: shape.literal !== undefined ? stripInlineMd(row[shape.literal] ?? '') : undefined,
    falseFriend: shape.looksLike !== undefined ? { looksLike: stripInlineMd(row[shape.looksLike] ?? ''), actuallyMeans: gloss } : undefined,
    phrase: parsed.phrase,
    occurrence: {
      topicId,
      lessonNumber: lesson.number,
      sourceSection: section,
      sourceLine: line + sectionStart + 2,
      gloss,
      exampleId,
    },
  }
}

// ------------------------------------------------------------------ drills

function extractDrills(lesson: (typeof LESSONS)[number], block: H2Block, topicId: string) {
  const lines = block.body
  const keyIdx = lines.findIndex((l) => ANSWER_KEY_RE.test(l))
  const keyLines = keyIdx >= 0 ? lines.slice(keyIdx + 1) : []

  type KeyGroup = { num: string; items: Array<{ n: number; raw: string }> }
  const keyGroups: KeyGroup[] = []
  let current: KeyGroup | null = null
  for (const l of keyLines) {
    const bold = /^\*\*\s*([\d.]+)\s*\.?\s*[^*]+?\s*\*\*$/.exec(l.trim())
    if (bold) {
      current = { num: bold[1]!.replace(/\.$/, ''), items: [] }
      keyGroups.push(current)
      continue
    }
    const item = /^\s*(\d+)[\.\)]\s+(.*)$/.exec(l)
    if (item && current) current.items.push({ n: parseInt(item[1]!, 10), raw: item[2]!.trim() })
  }

  let drillNum = ''
  let drillTitle = ''
  let preamble = ''
  let items: Array<{ n: number; raw: string }> = []
  let inDrill = false

  const flushDrill = () => {
    if (!drillNum || items.length === 0) return
    const keyGroup = keyGroups.find((g) => g.num === drillNum)
    const keyItems = keyGroup?.items ?? []
    if (keyItems.length > 0 && keyItems.length !== items.length) {
      warn(lesson.id, `drill "${drillNum}" has ${items.length} items but key has ${keyItems.length}`)
    }
    allDrills.push({
      id: `${topicId}/${drillNum}`,
      topicId,
      title: drillTitle,
      items: items.map((item, idx) => {
        const key = keyItems[idx]
        const parsed = key ? parseKeyItem(key.raw) : { expected: [] as string[], english: null as string | null, rationale: null as string | null }
        const chunks =
          /^[^()]*?[^_]+(?:\s*\/\s*[^_()]+){2,}$/.test(item.raw) && !item.raw.includes('___')
            ? item.raw.split('/').map((c) => c.trim())
            : undefined
        return {
          id: `${drillNum}.${item.n}`,
          n: item.n,
          prompt: item.raw.replace(WEEK_RE, WEEK_REPLACE),
          expected: parsed.expected,
          english: parsed.english,
          rationale: parsed.rationale,
          chunks,
          rubric: preamble.replace(WEEK_RE, WEEK_REPLACE),
          sourceTopicId: topicId,
        }
      }),
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (/^###\s/.test(line)) {
      if (inDrill) flushDrill()
      const h3 = line.replace(/^###\s+/, '').trim()
      if (/^[\d.]+\.\s*Answer Key/i.test(h3)) {
        inDrill = false
        break
      }
      drillNum = /^(\d+\.\d+)\.?\s*/.exec(h3)?.[1] ?? ''
      drillTitle = h3.replace(/^[\d.]+\.\s*/, '').trim()
      preamble = ''
      items = []
      inDrill = true
      continue
    }
    if (!inDrill) continue
    if (/^[|`]/.test(line)) continue
    const item = /^\s*(\d+)[\.\)]\s+(.*)$/.exec(line)
    if (item) items.push({ n: parseInt(item[1]!, 10), raw: item[2]!.trim() })
    else if (items.length === 0 && line.trim()) preamble += (preamble ? ' ' : '') + line.trim()
  }
  if (inDrill) flushDrill()
}

function parseKeyItem(raw: string): { expected: string[]; english: string | null; rationale: string | null } {
  const alternatives = raw.split(' / ')
  const expected: string[] = []
  for (const alt of alternatives) {
    const bolds = [...alt.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!.trim())
    if (bolds.length > 0) {
      const stripped = alt.replace(/\*\*([^*]+)\*\*/g, '$1').trim()
      if (bolds.length === 1 && stripped.replace(/[?!.,—:;]/g, '').trim() === bolds[0]!.replace(/[?!.,—:;]/g, '').trim()) {
        expected.push(bolds[0]!)
      } else {
        expected.push(bolds.join(' '))
      }
      continue
    }
    // Unbolded keys (week_1 10.4, week_4 6.3/6.4): "1. schneller (faster)".
    // The head before a trailing gloss/rationale is the answer.
    const noRat = alt.replace(/\s*—\s*\*[^*]*\*\s*$/, '').replace(/\s*—\s*[A-Za-z].*$/, '').trim()
    const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(noRat)
    const head = (m ? m[1]! : noRat).trim()
    if (head) expected.push(head)
  }
  if (expected.length === 0) return { expected: [], english: null, rationale: null }

  let rest = raw.replace(/\*\*[^*]+\*\*/g, '')
  let rationale: string | null = null
  const rat = /—\s*\*([^*]+)\*\s*$/.exec(rest)
  if (rat) {
    rationale = rat[1]!.trim()
    rest = rest.slice(0, rat.index)
  }
  const gloss = /\(([^()]+)\)\s*$/.exec(rest.trim())
  return { expected, english: gloss ? gloss[1]!.trim() : null, rationale }
}

// ------------------------------------------------------------------ applied

function extractApplied(lesson: (typeof LESSONS)[number], block: H2Block, topicId: string) {
  const lines = block.body
  for (let i = 0; i < lines.length; i++) {
    const h3 = /^###\s+([\d.]+)\.\s*(.+)$/.exec(lines[i]!)
    if (!h3) continue
    const title = h3[2]!.trim()
    let end = i + 1
    while (end < lines.length && !/^###\s/.test(lines[end]!)) end++
    const body = lines.slice(i + 1, end).join('\n')
    if (/Reading/i.test(title)) allReadings.push(parseReading(topicId, title, body, levelOf(lesson)))
    else if (/Writing Prompt/i.test(title)) allPrompts.push(parseWritingPrompt(topicId, title, body))
    i = end - 1
  }
}

function parseReading(topicId: string, title: string, body: string, level: Level): Record<string, unknown> {
  const fences = body.split(/^---\s*$/m)
  // Questions live AFTER the --- fence; the text is before it.
  let main = (fences[0] ?? body).trim()
  const after = fences.slice(1).join('\n---\n')
  const haystack = after.trim() ? `${main}\n${after}` : main
  main = main.replace(/^\*\*[^*]+\*\*\s*/, '')
  // The source writes "> **New words in this text:** …" (colon INSIDE bold).
  const newWords = /^\>\s*\*\*New words[^*]*:?\*\*\s*:?\s*(.+)$/m.exec(body)
  const questions: Array<{ q: string; answer: string | null }> = []
  const qStart = /^\*\*Comprehension Questions\*\*/m.exec(haystack)?.index ?? -1
  if (qStart >= 0) {
    for (const l of haystack.slice(qStart).split('\n')) {
      const m = /^\s*(\d+)[\.\)]\s+(.+)$/.exec(l)
      if (m) questions.push({ q: m[2]!.trim(), answer: null })
    }
    const cut = main.indexOf('**Comprehension Questions**')
    if (cut >= 0) main = main.slice(0, cut)
  }
  return {
    id: `${topicId}:reading`,
    topicId,
    title: title.replace(/^Reading:\s*/i, ''),
    level,
    body: main.trim(),
    questions,
    glossary: newWords ? newWords[1]!.trim() : '',
  }
}

function parseWritingPrompt(topicId: string, title: string, body: string): Record<string, unknown> {
  const requirements = body
    .split('\n')
    .filter((l) => /^\s*[-•*]/.test(l))
    .map((l) => l.replace(/^\s*[-•*]\s+/, '').trim())
  const prompt = body
    .split('\n')
    .filter((l) => !/^\s*[-•*]/.test(l) && !/^Example start:\s*\*/.test(l))
    .join(' ')
    .trim()
  return {
    id: `${topicId}:prompt`,
    topicId,
    title: title.replace(/^Writing Prompt:\s*/i, ''),
    prompt,
    requirements,
  }
}

// ------------------------------------------------------------- paradigms

for (const lesson of LESSONS) {
  const lines = weekSources.get(lesson.weekFile)!
  const blocks = splitH2s(lines).filter((b) => !/^Table of Contents/i.test(b.title))
  for (const block of blocks) {
    if (['vocabulary', 'practice', 'applied'].includes(classify(block.title))) continue
    const topicId = `${lesson.id}/${String(block.number).padStart(2, '0')}-${renderSlug(classify(block.title), block.title)}`
    parseParadigms(lesson, block, topicId)
  }
}

function parseParadigms(lesson: (typeof LESSONS)[number], block: H2Block, topicId: string) {
  const lines = block.body
  let heading = block.title
  let inTable = false
  let headerCells: string[] | null = null
  let rows: string[][] = []

  const flushParadigm = () => {
    if (!headerCells || rows.length === 0) return
    const first = headerCells[0]!
    if (!/^(Person|Case|Verb|Infinitive|Tense|Aspect|Konjunktiv|Nominative|Nom)\b/i.test(first)) {
      headerCells = null
      rows = []
      return
    }
    const kind = classifyParadigm(headerCells!, rows)
    if (!kind) {
      headerCells = null
      rows = []
      return
    }
    const notes: Record<string, string> = {}
    const idIdx = headerCells!.findIndex((c) => /identical to indicative/i.test(c))
    let cols = headerCells!
    let data = rows
    if (idIdx >= 0) {
      data = rows.map((r) => {
        const noteVal = r[idIdx]
        if (noteVal && noteVal !== '—') notes[r[0]!] = stripBold(noteVal)
        return r.filter((_, j) => j !== idIdx)
      })
      cols = cols.filter((_, j) => j !== idIdx)
    }
    allParadigms.push({
      id: slugify(`${lesson.number}-${heading}`),
      title: heading.replace(WEEK_RE, WEEK_REPLACE),
      kind,
      rows: data.map((r) => stripBold(r[0] ?? '')),
      cols: cols.map((c) => stripBold(c)),
      cells: data.map((r) => r.map((c) => stripBold(c).replace(WEEK_RE, WEEK_REPLACE))),
      notes: Object.keys(notes).length ? notes : undefined,
      topicId,
      verification: 'extracted',
    })
    headerCells = null
    rows = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (/^###\s/.test(line)) {
      flushParadigm()
      heading = line.replace(/^###\s+/, '').replace(/^[\d.]+\.\s*/, '').trim()
      inTable = false
      headerCells = null
      rows = []
      continue
    }
    if (line.startsWith('|')) {
      const cells = cellsOf(line)
      if (!inTable) {
        inTable = true
        headerCells = cells
        rows = []
        continue
      }
      if (!isSeparatorRow(cells)) rows.push(cells)
      continue
    }
    flushParadigm()
  }
  flushParadigm()
}

function classifyParadigm(header: string[], rows: string[][]): 'verb' | 'article' | 'pronoun' | 'adjective-ending' | null {
  const h = header.join(' ').toLowerCase()
  if (/person|infinitive|partizip|tense|aspect|konjunktiv|präteritum|perfekt|passive|conjugation|modal|ending|formation|construction|full pattern|aux/i.test(h)) return 'verb'
  // "Verb | Example" lists are vocabulary tables, not paradigms.
  if (/^verb$/.test(header[0]!.toLowerCase())) return null
  if (h.startsWith('case') || h.startsWith('nominative')) {
    const sample = rows[0]?.[1] ?? ''
    if (/^-[a-zäöüß]/.test(sample)) return 'adjective-ending'
    if (/^(ich|du|er|sie|es|wir|ihr|mich|mir|sich)/i.test(sample)) return 'pronoun'
    return 'article'
  }
  return null
}

// ------------------------------------------------------------ wrong forms

for (const lesson of LESSONS) {
  const lines = weekSources.get(lesson.weekFile)!
  const blocks = splitH2s(lines).filter((b) => !/^Table of Contents/i.test(b.title))
  const topicOf = (lineNo: number): string => {
    for (const b of blocks) if (lineNo >= b.start && lineNo < b.end) return `${lesson.id}/${String(b.number).padStart(2, '0')}-${renderSlug(classify(b.title), b.title)}`
    return `${lesson.id}/0-unknown`
  }
  lines.forEach((line, idx) => {
    let k = 0
    for (const m of line.matchAll(/~~([^~]+)~~/g)) {
      const form = m[1]!.trim()
      const scope = form.includes(' ') ? 'sentence' : 'form'
      let correct: string | null = null
      if (line.includes('(NOT:')) {
        const before = line.slice(0, line.indexOf('(NOT:')).replace(/\*\*([^*]+)\*\*/g, '$1').trim()
        if (before && !before.includes('~~')) correct = before.replace(/^[-–—]\s*/, '')
      }
      if (!correct) correct = /^\*\*([^*]+)\*\*/.exec(line)?.[1] ?? null
      // Never invent a correction by suffix-stripping: a guessed "correct"
      // next to an authored wrong form teaches a wrong rule. Leave null.
      allWrongForms.push({
        id: `${lesson.id}:wf${idx}-${k++}`,
        form,
        scope,
        correct: correct !== form ? correct : null,
        lexemeId: null,
        topicId: topicOf(idx),
        context: line.replace(WEEK_RE, WEEK_REPLACE).replace(/~~([^~]+)~~/g, '[WRONG]').trim(),
      })
    }
  })
}

// --------------------------------------------------------------- emit files

// Refuse to write anything when a vocabulary table shape went unregistered:
// partial output that looks complete is worse than no output.
if (unknownShapes.length) {
  console.error(`\n✖ extraction failed — ${unknownShapes.length} unregistered table shape(s) in vocabulary sections. Register the shape in extract.config.ts TABLE_SHAPES; guessing fabricates data.\n`)
  for (const s of [...new Set(unknownShapes)].slice(0, 20)) console.error(`  · ${s}`)
  console.error('')
  process.exit(1)
}
if (genderDisagreements.length) {
  console.error(`\n✖ extraction failed — ${genderDisagreements.length} article/gender-tag disagreement(s). Both present and disagreeing means the parser broke; fix parseHeadword.\n`)
  for (const s of [...new Set(genderDisagreements)].slice(0, 20)) console.error(`  · ${s}`)
  console.error('')
  process.exit(1)
}

writeFileSync(join(EXTRACTED_DIR, 'occurrences.jsonl'), allOccurrences.map((o) => JSON.stringify(o)).join('\n') + '\n')
writeFileSync(join(EXTRACTED_DIR, 'sentences.jsonl'), allSentences.map((o) => JSON.stringify(o)).join('\n') + '\n')
writeFileSync(join(EXTRACTED_DIR, 'drills.jsonl'), allDrills.map((o) => JSON.stringify(o)).join('\n') + '\n')
writeFileSync(join(EXTRACTED_DIR, 'paradigms.json'), JSON.stringify(allParadigms, null, 2) + '\n')
writeFileSync(join(EXTRACTED_DIR, 'wrong-forms.json'), JSON.stringify(allWrongForms, null, 2) + '\n')
writeFileSync(join(EXTRACTED_DIR, 'readings.json'), JSON.stringify(allReadings, null, 2) + '\n')
writeFileSync(join(EXTRACTED_DIR, 'prompts.json'), JSON.stringify(allPrompts, null, 2) + '\n')
writeFileSync(join(EXTRACTED_DIR, '.upstream.json'), JSON.stringify(upstream, null, 2) + '\n')

// ----------------------------------------------------------------- summary

const drillItems = allDrills.reduce((n, d) => n + (d.items as unknown[]).length, 0)
console.log(
  `✔ extracted: ${files.length} files · ${topicTotal} topics · ${allOccurrences.length} vocab rows · ` +
    `${allSentences.length} sentences · ${allDrills.length} drills (${drillItems} items) · ${allParadigms.length} paradigms · ` +
    `${allWrongForms.length} wrong forms · ${allReadings.length} readings · ${allPrompts.length} prompts`,
)
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):`)
  for (const w of [...new Set(warnings)].slice(0, 80)) console.log(`  · ${w}`)
  console.log('')
}