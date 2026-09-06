 
 
 
 
 
 
 

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import matter from 'gray-matter'
import { parseMarkdown } from '@tanstack/markdown/parser'
import type { Level } from '../src/content/types.ts'
import type {
  AppliedBundle,
  ContentIndex,
  DrillBundle,
  Erratum,
  GrammarPoint,
  Lesson,
  LessonId,
  Paradigm,
  ParadigmBundle,
  Plural,
  Pos,
  SentenceBundle,
  Topic,
  TopicId,
  Theme,
  VocabBundle,
  VocabEntry,
  Verification,
} from '../src/content/types.ts'

const ROOT = join(import.meta.dirname, '..')
const CONTENT = join(ROOT, 'content')
const LESSONS_DIR = join(CONTENT, 'lessons')
const EXTRACTED = join(CONTENT, 'extracted')
const OVERRIDES = join(CONTENT, 'overrides')
const OUT_DIR = join(ROOT, 'src/content/generated')

const errors: string[] = []
const warnings: string[] = []
const fail = (msg: string) => errors.push(msg)
const warn = (msg: string) => warnings.push(msg)

const asciiFold = (s: string): string =>
  s
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

const slugify = (s: string): string =>
  asciiFold(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'x'

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
const readJsonl = <T>(p: string): T[] =>
  existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as T) : []

 

const lessonDirs = readdirSync(LESSONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()

const lessons: Record<string, Lesson> = {}
const topics: Record<string, Topic> = {}

for (const dir of lessonDirs) {
  const dirPath = join(LESSONS_DIR, dir)
  const lesson = readJson<Lesson>(join(dirPath, 'lesson.json'))
  if (lesson.id !== dir) fail(`${dir}/lesson.json: id "${lesson.id}" does not match its directory`)
  lessons[lesson.id] = lesson

  const topicsDir = join(dirPath, 'topics')
  if (!existsSync(topicsDir)) {
    fail(`${dir}: no topics/ directory`)
    continue
  }
  const topicFiles = readdirSync(topicsDir).filter((f) => f.endsWith('.md')).sort()
  for (const file of topicFiles) {
    const slug = basename(file, '.md')
    const raw = readFileSync(join(topicsDir, file), 'utf8')
    const { data, content } = matter(raw)
    const fm = data as Topic & { id: string; lessonId: string }
    const where = `${dir}/topics/${file}`
    if (fm.id !== `${dir}/${slug}`) fail(`${where}: frontmatter id "${fm.id}" should be "${dir}/${slug}"`)
    if (fm.lessonId !== dir) fail(`${where}: lessonId "${fm.lessonId}" should be "${dir}"`)
    topics[fm.id] = {
      ...fm,
      slug,
      readingTimeMin: Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 200)),
      headings: [],
      counts: { vocab: 0, sentences: 0, drillItems: 0 },
      errata: [],
    }
  }

   
  const onDisk = topicFiles.map((f) => `${dir}/${basename(f, '.md')}`)
  for (const id of lesson.topicOrder) if (!onDisk.includes(id)) fail(`${dir}/lesson.json: topicOrder lists "${id}" with no file`)
  for (const id of onDisk) if (!lesson.topicOrder.includes(id)) fail(`${dir}/lesson.json: topic "${id}" exists but is missing from topicOrder`)
}

 

type Occurrence = {
  key: string
  headword: string
  lemma: string
  pos: Pos | null
  gender: 'm' | 'f' | 'n' | null
  plural: Plural
  gloss: string
  register?: 'formal' | 'informal'
  relations: Array<{ kind: string; sourceRaw: string; topicId?: string; lessonNumber?: number; sourceSection?: string; sourceLine?: number }>
  themes: string[]
  level: string
  present3sg?: string
  valency?: string
  reflexive?: 'A' | 'D'
  literal?: string
  falseFriend?: { looksLike: string; actuallyMeans: string }
  phrase?: boolean
  occurrence: {
    topicId: string
    lessonNumber: number
    sourceSection: string
    sourceLine: number
    gloss: string
    exampleId: string | null
  }
}

type Sentence = {
  id: string
  text: string
  tokens: Array<{ text: string; capitalised: boolean }>
  english: string | null
  lexemeIds: string[]
  topicId: string
  level: Level
  wordOrderEligible: boolean
  speakable: string
}

type DrillItem = {
  id: string
  n: number
  prompt: string
  expected: string[]
  english: string | null
  rationale: string | null
  chunks?: string[]
  rubric?: string
  sourceTopicId: string
}
type Drill = { id: string; topicId: string; title: string; items: DrillItem[] }
type WrongForm = { id: string; form: string; scope: 'form' | 'sentence'; correct: string | null; lexemeId: string | null; topicId: string; context: string }
type Reading = { id: string; topicId: string; title: string; level: Level; body: string; questions: Array<{ q: string; answer: string | null }>; glossary: string }
type WritingPrompt = { id: string; topicId: string; title: string; prompt: string; requirements: string[] }

const occurrences = readJsonl<Occurrence>(join(EXTRACTED, 'occurrences.jsonl'))
const sentencesRaw = readJsonl<Sentence>(join(EXTRACTED, 'sentences.jsonl'))
const drillsRaw = readJsonl<Drill>(join(EXTRACTED, 'drills.jsonl'))
const paradigmsRaw = readJson<Paradigm[]>(join(EXTRACTED, 'paradigms.json'))
const wrongFormsRaw = readJson<WrongForm[]>(join(EXTRACTED, 'wrong-forms.json'))
const readingsRaw = readJson<Reading[]>(join(EXTRACTED, 'readings.json'))
const promptsRaw = readJson<WritingPrompt[]>(join(EXTRACTED, 'prompts.json'))

 

/** Structural POS fallback — the cascade that saves verbs and phrases whose
 *  section carried no override. */
function structuralPos(lemma: string, gender: 'm' | 'f' | 'n' | null, phrase: boolean): Pos | null {
  if (phrase) return 'phrase'
  if (gender) return 'noun'
  if (/^[a-zäöüß]/.test(lemma)) {
    if (/(en|eln|ern)$/.test(lemma)) return 'verb'
    return 'adjective'
  }
  return null
}

/** Expand a suffix plural to a fully spelled-out form. */
function expandPlural(plural: Plural, lemma: string): Plural {
  if (plural.kind !== 'suffix' || !plural.raw) return plural
  const suffix = plural.raw.replace(/^-/, '')
  return { form: lemma + suffix, kind: 'suffix', raw: plural.raw }
}

type MergeAcc = {
  key: string
  headword: string
  lemma: string
  pos: Pos | null
  gender: 'm' | 'f' | 'n' | null
  plural: Plural
  glosses: string[]
  present3sg?: string
  valency?: string
  reflexive?: 'A' | 'D'
  literal?: string
  falseFriend?: { looksLike: string; actuallyMeans: string }
  register: Set<string>
  themes: Set<string>
  level: string
  relations: Array<{ kind: string; sourceRaw: string; topicId?: string; lessonNumber?: number; sourceSection?: string; sourceLine?: number }>
  occurrenceList: Occurrence['occurrence'][]
  conflicts: Array<{ field: string; values: string[]; from: string[] }>
  pluralNote: string | null
}

const mergeByKey = new Map<string, MergeAcc>()

for (const o of occurrences) {
  const pos = o.pos ?? structuralPos(o.lemma, o.gender, o.phrase ?? false)
   
   
  const key = pos === 'noun' ? `${pos}:${o.gender ?? ''}:${asciiFold(o.lemma).toLowerCase()}` : o.key
  const acc = mergeByKey.get(key) ?? {
    key,
    headword: o.headword,
    lemma: o.lemma,
    pos,
    gender: o.gender,
    plural: expandPlural(o.plural, o.lemma),
    glosses: [],
    register: new Set<string>(),
    themes: new Set<string>(),
    level: o.level,
    relations: [],
    occurrenceList: [],
    conflicts: [],
    pluralNote: null as string | null,
  }
  mergeByKey.set(key, acc)

  if (acc.pos !== null && pos !== null && acc.pos !== pos) {
    acc.conflicts.push({ field: 'pos', values: [acc.pos, pos], from: [acc.occurrenceList[0]?.topicId ?? '', o.occurrence.topicId] })
  } else if (acc.pos === null && pos !== null) {
    acc.pos = pos
  }

  if (acc.gender !== null && o.gender !== null && acc.gender !== o.gender) {
    acc.conflicts.push({ field: 'gender', values: [acc.gender, o.gender], from: [acc.occurrenceList[0]?.topicId ?? '', o.occurrence.topicId] })
  } else if (acc.gender === null && o.gender !== null) {
    acc.gender = o.gender
  }

   
   
   
   
   
  const otherPlural = expandPlural(o.plural, o.lemma)
  if (acc.plural.kind === 'unknown' && otherPlural.kind !== 'unknown') acc.plural = otherPlural
  else if (acc.plural.kind === 'none' && otherPlural.kind !== 'none' && otherPlural.kind !== 'unknown') {
    acc.plural = otherPlural
    acc.pluralNote = `plural "no pl." overruled by "${otherPlural.form}" (${o.occurrence.topicId})`
  } else if (otherPlural.kind === 'none' && acc.plural.kind !== 'none' && acc.plural.kind !== 'unknown') {
    acc.pluralNote = `plural "${acc.plural.form}" kept over "no pl." (${o.occurrence.topicId})`
  } else if (acc.plural.kind !== 'unknown' && otherPlural.kind !== 'unknown' && acc.plural.form !== otherPlural.form) {
    acc.conflicts.push({ field: 'plural', values: [acc.plural.form ?? '∅', otherPlural.form ?? '∅'], from: [acc.occurrenceList[0]?.topicId ?? '', o.occurrence.topicId] })
  }

  if (o.gloss) acc.glosses.push(o.gloss)
  if (o.present3sg && !acc.present3sg) acc.present3sg = o.present3sg
  if (o.valency && !acc.valency) acc.valency = o.valency
  if (o.reflexive && !acc.reflexive) acc.reflexive = o.reflexive
  if (o.literal && !acc.literal) acc.literal = o.literal
  if (o.falseFriend && !acc.falseFriend) acc.falseFriend = o.falseFriend
  if (o.register) acc.register.add(o.register)
  for (const t of o.themes) acc.themes.add(t)
  for (const r of o.relations) acc.relations.push(r)
  acc.occurrenceList.push(o.occurrence)
}

 
 
 
 
for (const acc of mergeByKey.values()) {
  if (acc.present3sg || acc.pos !== 'verb') continue
  const bare = acc.lemma.replace(/^sich\s+/, '')
  for (const p of paradigmsRaw) {
    if (p.kind !== 'verb') continue
    const ci = p.cols.findIndex((c) => c.toLowerCase().replace(/\s*\(.*\)\s*$/, '') === bare.toLowerCase())
    if (ci < 0) continue
    const erRow = p.cells.find((r) => r[0] === 'er/sie/es')
    const form = erRow?.[ci]
    if (form && form !== '—' && form !== '') {
      acc.present3sg = form
      break
    }
  }
}

 

 
 
 
 
const entries: VocabEntry[] = []
const baseCount = new Map<string, number>()
for (const acc of mergeByKey.values()) {
  const base = slugify(acc.headword)
  baseCount.set(base, (baseCount.get(base) ?? 0) + 1)
}
const usedIds = new Set<string>()

for (const acc of mergeByKey.values()) {
  acc.occurrenceList.sort((a, b) => a.lessonNumber - b.lessonNumber || a.sourceLine - b.sourceLine)
  acc.glosses = [...new Set(acc.glosses)]
  // Nouns drill gender: every German card front carries the article (die Tür),
  // so its English meaning side must too — "door" alone silently drops it.
  const nounGlosses = acc.glosses.length ? acc.glosses : ['']
  const glosses = acc.pos === 'noun' ? nounGlosses.map((g) => (g && !/^(the|a|an)\s/i.test(g) ? `the ${g}` : g)) : nounGlosses
  const base = slugify(acc.headword)
  let id = base
  if ((baseCount.get(base) ?? 0) > 1) {
    const firstLesson = acc.occurrenceList[0]?.lessonNumber ?? 0
    id = `${base}-l${String(firstLesson).padStart(2, '0')}`
    if (usedIds.has(id)) id = `${id}-${acc.pos ?? 'x'}`
  }
  if (usedIds.has(id)) fail(`lexeme id collision on "${id}" (${acc.headword}) — needs a hand-chosen slug`)
  usedIds.add(id)

  entries.push({
    id,
    headword: acc.headword,
    lemma: acc.lemma,
    pos: acc.pos,
    gender: acc.gender,
    plural: acc.plural,
    glosses,
    register: acc.register.has('formal') ? 'formal' : acc.register.has('informal') ? 'informal' : 'neutral',
    relations: [],
    themes: [...acc.themes] as VocabEntry['themes'],
    level: acc.level as VocabEntry['level'],
    occurrences: acc.occurrenceList,
    exampleIds: [...new Set(acc.occurrenceList.map((o) => o.exampleId).filter(Boolean) as string[])],
    verification: 'extracted',
    errata: [],
    conflicts: acc.conflicts.length ? acc.conflicts : undefined,
     
     
    ...(acc.present3sg
      ? { verb: { present3sg: acc.present3sg, ...(acc.reflexive ? { reflexive: acc.reflexive } : {}) } }
      : {}),
    ...(acc.reflexive && !acc.present3sg ? { verb: { reflexive: acc.reflexive } } : {}),
    ...(acc.valency ? { valency: acc.valency } : {}),
    ...(acc.literal ? { literal: acc.literal } : {}),
    ...(acc.falseFriend ? { falseFriend: acc.falseFriend } : {}),
  })

  const entry = entries[entries.length - 1]!
  void entry
  void acc
}

 
 
const byLemma = new Map<string, VocabEntry[]>()
const missingRelationTargets = new Map<string, string[]>()
for (const e of entries) {
  const k = asciiFold(e.lemma).toLowerCase()
  const arr = byLemma.get(k)
  if (arr) arr.push(e)
  else byLemma.set(k, [e])
}
const relationsByLemma = new Map<string, Array<{ kind: string; sourceRaw: string; topicId?: string; lessonNumber?: number; sourceSection?: string; sourceLine?: number }>>()
for (const o of occurrences) {
  if (!o.relations.length) continue
  const k = asciiFold(o.lemma).toLowerCase()
  const arr = relationsByLemma.get(k)
  if (arr) arr.push(...o.relations)
  else relationsByLemma.set(k, [...o.relations])
}

 
 
 
 
type NewLexeme = {
  headword: string
  pos: Pos
  glosses: string[]
  note?: string
  verb?: { separable?: boolean; prefix?: string; reflexive?: 'A' | 'D' }
  /** Explicit level/theme when inheritance misleads (e.g. haben/sein named
   *  in a B2 register section are A1 words). */
  level?: Level
  themes?: Theme[]
}
const newLexemes = existsSync(join(OVERRIDES, 'new-lexemes.json')) ? readJson<NewLexeme[]>(join(OVERRIDES, 'new-lexemes.json')) : []
{
   
  type RelCtx = { kind: string; sourceRaw: string; topicId?: string; lessonNumber?: number; sourceSection?: string; sourceLine?: number };
  const namingCtx = new Map<string, { rel: RelCtx; occ: (typeof occurrences)[number] }>()
  for (const o of occurrences) {
    for (const r of o.relations) {
      const k = asciiFold(r.sourceRaw).toLowerCase()
      if (!namingCtx.has(k)) namingCtx.set(k, { rel: r, occ: o })
    }
  }
  for (const nl of newLexemes) {
    const lemma = nl.headword
    const id = slugify(nl.headword)
    if (entries.some((e) => e.id === id)) fail(`overrides/new-lexemes.json: "${nl.headword}" collides with existing id "${id}"`)
    const bare = lemma.replace(/^sich\s+/, '')
    const ctx =
      namingCtx.get(asciiFold(lemma).toLowerCase()) ?? (bare !== lemma ? namingCtx.get(asciiFold(bare).toLowerCase()) : undefined)
    if (!ctx || ctx.rel.topicId === undefined || ctx.rel.sourceLine === undefined) {
      fail(`overrides/new-lexemes.json: "${nl.headword}" names no occurrence in the corpus — remove it or fix the headword`)
      continue
    }
    const lessonId = ctx.rel.topicId.split('/')[0]!
    const lesson = lessons[lessonId]
    if (!lesson) fail(`overrides/new-lexemes.json: "${nl.headword}" names unknown topic "${ctx.rel.topicId}"`)
    entries.push({
      id,
      headword: nl.headword,
      lemma,
      pos: nl.pos,
      gender: null,
      plural: { form: null, kind: 'unknown', raw: null },
      glosses: nl.glosses,
      register: 'neutral',
      relations: [],
      themes: (nl.themes ?? (ctx.occ.themes.length ? ctx.occ.themes : ['misc'])) as VocabEntry['themes'],
      level: (nl.level ?? lesson?.level ?? 'A1') as VocabEntry['level'],
      occurrences: [
        {
          topicId: ctx.rel.topicId,
          lessonNumber: ctx.rel.lessonNumber ?? lesson?.number ?? 0,
          sourceSection: ctx.rel.sourceSection ?? '',
          sourceLine: ctx.rel.sourceLine,
          gloss: nl.glosses[0] ?? '',
          exampleId: null,
        },
      ],
      exampleIds: [],
      verification: 'authored',
      errata: [],
      ...(nl.verb ? { verb: nl.verb } : {}),
    })
    const e = entries[entries.length - 1]!
    const k = asciiFold(e.lemma).toLowerCase()
    const arr = byLemma.get(k)
    if (arr) arr.push(e)
    else byLemma.set(k, [e])
     
    if (e.lemma.startsWith('sich ')) {
      const bare = asciiFold(e.lemma.replace(/^sich\s+/, '')).toLowerCase()
      const arr2 = byLemma.get(bare)
      if (arr2) arr2.push(e)
      else byLemma.set(bare, [e])
    }
  }
}

for (const e of entries) {
  const rels: VocabEntry['relations'] = []
  const occRels = relationsByLemma.get(asciiFold(e.lemma).toLowerCase()) ?? []
  for (const occ of occRels) {
     
     
    const candidates = byLemma.get(asciiFold(occ.sourceRaw).toLowerCase()) ?? []
    const target =
      occ.kind === 'feminine-of'
        ? (candidates.find((c) => c.gender === 'm') ?? candidates[0])
        : candidates[0]
    if (!target) {
       
       
       
       
      if (/^[a-zäöüß]+$/i.test(occ.sourceRaw.trim())) {
        const k = occ.sourceRaw.trim().toLowerCase()
        const arr = missingRelationTargets.get(k)
        if (arr) arr.push(e.headword)
        else missingRelationTargets.set(k, [e.headword])
      }
      continue
    }
    rels.push({ kind: occ.kind as VocabEntry['relations'][number]['kind'], lexemeId: target.id })
  }
  e.relations = [...new Map(rels.map((r) => [`${r.kind}:${r.lexemeId}`, r])).values()]
}
 
 
const unresolvedRelations = [...missingRelationTargets.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([target, referrers]) => ({ target, referrers: [...new Set(referrers)] }))

 

type OverrideFile = Array<{ id: string; patch: Partial<VocabEntry>; note?: string }>
const lexemeOverrides = existsSync(join(OVERRIDES, 'lexemes.json')) ? readJson<OverrideFile>(join(OVERRIDES, 'lexemes.json')) : []
const entryById = new Map(entries.map((e) => [e.id, e]))
const overriddenByField = new Map<string, Set<string>>()

for (const ov of lexemeOverrides) {
  const entry = entryById.get(ov.id)
  if (!entry) {
    fail(`overrides/lexemes.json: "${ov.id}" points at no lexeme — re-extraction may have renamed it`)
    continue
  }
  Object.assign(entry, ov.patch)
  if (ov.patch.verification) entry.verification = ov.patch.verification
  const fields = new Set(Object.keys(ov.patch).filter((k) => k !== 'verification'))
  overriddenByField.set(ov.id, fields)
   
   
  if (entry.conflicts && fields.size) {
    entry.conflicts = entry.conflicts.filter((c) => !fields.has(c.field))
    if (!entry.conflicts.length) entry.conflicts = undefined
  }
}

 
 
 
 
 
for (const e of entries) {
  if (e.conflicts?.length) {
    warn(`merge conflict on "${e.headword}" (${e.lemma}): ` + e.conflicts.map((c) => `${c.field}: ${[...new Set(c.values)].join(' / ')}`).join('; '))
  }
}

 

const errata: Erratum[] = existsSync(join(OVERRIDES, 'errata.json')) ? readJson<Erratum[]>(join(OVERRIDES, 'errata.json')) : []
const upstream = existsSync(join(EXTRACTED, '.upstream.json')) ? readJson<Record<string, { sha256: string }>>(join(EXTRACTED, '.upstream.json')) : {}

for (const er of errata) {
  const sourceSha = upstream[er.source.file]?.sha256
  if (sourceSha !== er.source.sha256) {
    fail(`erratum "${er.id}": source ${er.source.file} sha256 no longer matches — the corpus changed; re-verify the erratum`)
    continue
  }
  switch (er.target.kind) {
    case 'lexeme': {
      const entry = entryById.get(er.target.id)
      if (!entry) fail(`erratum "${er.id}": lexeme "${er.target.id}" does not exist`)
      else {
        Object.assign(entry, er.target.patch)
        entry.errata = [...new Set([...entry.errata, er.id])]
      }
      break
    }
    case 'paradigm': {
      const p = paradigmsRaw.find((x) => x.id === er.target.id)
      if (!p) fail(`erratum "${er.id}": paradigm "${er.target.id}" does not exist`)
      else Object.assign(p, er.target.patch)
      break
    }
    case 'topic': {
      const topic = topics[er.target.id]
      const path = topic ? join(LESSONS_DIR, topic.lessonId, 'topics', `${topic.slug}.md`) : null
      if (!path || !existsSync(path)) {
        fail(`erratum "${er.id}": topic "${er.target.id}" does not exist`)
        break
      }
      const raw = readFileSync(path, 'utf8')
      const count = raw.split(er.target.find).length - 1
      if (count !== 1) fail(`erratum "${er.id}": find text matches ${count}× (must match exactly once)`)
      else writeFileSync(path, raw.replace(er.target.find, er.target.replace))
      break
    }
  }
}

 

 
 
 
 
 
{
  const byLemma = new Map<string, VocabEntry[]>()
  for (const e of entries) {
    if (e.pos !== 'noun' || !e.gender) continue
    const k = asciiFold(e.lemma).toLowerCase()
    const arr = byLemma.get(k)
    if (arr) arr.push(e)
    else byLemma.set(k, [e])
  }
  for (const group of byLemma.values()) {
    const genders = new Set(group.map((e) => e.gender))
    if (genders.size < 2) continue
     
     
    const linked = group.some((e) =>
      e.relations.some((r) => r.kind === 'feminine-of' && r.lexemeId !== e.id && group.some((o) => o.id === r.lexemeId)),
    )
    if (!linked) {
      warn(`gender variance on "${group[0]!.lemma}": ${group.map((e) => `${e.headword} (${e.gender})`).join(' vs ')} — human check`)
    }
  }
}

const sentencesById = new Map(sentencesRaw.map((s) => [s.id, s]))
 
{
  const lexemesByExample = new Map<string, string[]>()
  for (const e of entries) {
    for (const exId of e.exampleIds) {
      const arr = lexemesByExample.get(exId)
      if (arr) arr.push(e.id)
      else lexemesByExample.set(exId, [e.id])
    }
  }
  for (const s of sentencesById.values()) {
    s.lexemeIds = lexemesByExample.get(s.id) ?? []
  }
}

for (const topic of Object.values(topics)) {
  topic.counts = {
    vocab: 0,
    sentences: 0,
    drillItems: 0,
  }
}
{
  const vocabByTopic = new Map<string, number>()
  const sentByTopic = new Map<string, number>()
  const drillByTopic = new Map<string, number>()
  for (const e of entries) {
    const seen = new Set<string>()
    for (const o of e.occurrences) {
      if (seen.has(o.topicId)) continue
      seen.add(o.topicId)
      vocabByTopic.set(o.topicId, (vocabByTopic.get(o.topicId) ?? 0) + 1)
    }
  }
  for (const s of sentencesById.values()) sentByTopic.set(s.topicId, (sentByTopic.get(s.topicId) ?? 0) + 1)
  for (const d of drillsRaw) drillByTopic.set(d.topicId, (drillByTopic.get(d.topicId) ?? 0) + d.items.length)
  for (const topic of Object.values(topics)) {
    topic.counts = {
      vocab: vocabByTopic.get(topic.id) ?? 0,
      sentences: sentByTopic.get(topic.id) ?? 0,
      drillItems: drillByTopic.get(topic.id) ?? 0,
    }
  }
}

 

 
 
 
 
type MergedParadigm = Paradigm & { origins: string[] }
const paradigmGroups = new Map<string, MergedParadigm[]>()

for (const p of paradigmsRaw) {
  const key = `${p.kind}:${p.cols.join('|')}`
  const group = paradigmGroups.get(key) ?? []
  let mergedInto: MergedParadigm | null = null
  for (const existing of group) {
    const common = new Set([...existing.rows, ...p.rows])
    let compatible = true
    for (const row of common) {
      const i1 = existing.rows.indexOf(row)
      const i2 = p.rows.indexOf(row)
      if (i1 >= 0 && i2 >= 0 && existing.cells[i1]!.join('|') !== p.cells[i2]!.join('|')) {
        compatible = false
        break
      }
    }
    if (compatible) {
      mergedInto = existing
      break
    }
  }
  if (!mergedInto) {
    const m: MergedParadigm = { ...p, origins: [p.topicId] }
    group.push(m)
    paradigmGroups.set(key, group)
    continue
  }
  for (let i = 0; i < p.rows.length; i++) {
    const row = p.rows[i]!
    if (!mergedInto.rows.includes(row)) {
      mergedInto.rows.push(row)
      mergedInto.cells.push(p.cells[i]!)
    }
  }
  mergedInto.origins.push(p.topicId)
  const introduced = mergedInto.rowIntroducedIn ?? {}
  for (const row of p.rows) {
    const lessonId = /^(\d{2})/.exec(p.topicId)?.[1]
    if (lessonId) introduced[row] = lessonId
  }
  mergedInto.rowIntroducedIn = introduced
}
const paradigms: MergedParadigm[] = [...paradigmGroups.values()].flat()

 

function collectLinks(node: unknown, found: string[] = []): string[] {
  if (!node || typeof node !== 'object') return found
  const n = node as { type?: unknown; href?: unknown; children?: unknown }
  if (n.type === 'link' && typeof n.href === 'string') found.push(n.href)
  for (const v of Object.values(n)) {
    if (Array.isArray(v)) v.forEach((x) => collectLinks(x, found))
    else if (v && typeof v === 'object') collectLinks(v, found)
  }
  return found
}

const pointIds = new Set<string>()
const grammarPoints: GrammarPoint[] = []

for (const topic of Object.values(topics)) {
  const raw = readFileSync(join(LESSONS_DIR, topic.lessonId, 'topics', `${topic.slug}.md`), 'utf8')
  const { content } = matter(raw)
  const ast = parseMarkdown(content, { headingIds: true })

  const headings: Array<{ depth: 2 | 3; text: string; id: string }> = []
  const doc = ast as unknown as { children?: Array<{ type?: unknown; depth?: unknown; id?: unknown }> }
  for (const child of doc.children ?? []) {
    if (child.type !== 'heading') continue
    const depth = child.depth as number
    if (depth !== 2 && depth !== 3) continue
    headings.push({ depth, text: textOf(child), id: typeof child.id === 'string' ? child.id : '' })
  }
  topic.headings = headings

  if (/\bWeek\b/.test(content.replace(/Days? of the Week/gi, ''))) fail(`${topic.id}: body contains "Week"`)
  if (/mojibake/.test(content) || /[\uFFFD]/.test(content)) fail(`${topic.id}: mojibake`)
  if (content.normalize('NFC') !== content) fail(`${topic.id}: body is not NFC`)
}

function textOf(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as Record<string, unknown>
  if (n.type === 'text' && typeof n.value === 'string') return n.value
  if (Array.isArray(n.children)) return n.children.map(textOf).join('')
  return ''
}

 

const pointsByTopic = new Map<TopicId, Set<string>>()
const pointsClaimed = new Map<string, string>()
const pointLessons = new Map<string, LessonId>()

if (existsSync(join(CONTENT, 'grammar', 'points.json'))) {
  const pts = readJson<GrammarPoint[]>(join(CONTENT, 'grammar', 'points.json'))
  for (const p of pts) {
    grammarPoints.push(p)
    pointIds.add(p.id)
    pointLessons.set(p.id, p.lessonId)
    const set = pointsByTopic.get(p.topicId) ?? new Set<string>()
    set.add(p.id)
    pointsByTopic.set(p.topicId, set)
    if (pointsClaimed.has(p.id) && pointsClaimed.get(p.id) !== p.topicId) {
      fail(`grammar point "${p.id}" is claimed by both ${pointsClaimed.get(p.id)} and ${p.topicId}`)
    }
    pointsClaimed.set(p.id, p.topicId)
  }
}

for (const topic of Object.values(topics)) {
  for (const pid of topic.points ?? []) {
    if (!pointIds.has(pid)) fail(`${topic.id}: "points" lists unknown grammar point "${pid}"`)
    else if (pointsClaimed.get(pid) !== topic.id) fail(`${topic.id}: claims "${pid}" but it is canonically defined in ${pointsClaimed.get(pid)}`)
  }
  for (const r of topic.revisits ?? []) {
    if (!pointIds.has(r.pointId)) fail(`${topic.id}: revisits unknown point "${r.pointId}"`)
    else if (pointsClaimed.get(r.pointId) === topic.id) fail(`${topic.id}: revisits "${r.pointId}" but defines it here`)
    if (pointLessons.has(r.pointId) && pointLessons.get(r.pointId) === topic.lessonId) fail(`${topic.id}: revisits "${r.pointId}" — same lesson`)
  }
  for (const pid of topic.paradigms ?? []) {
    if (!paradigms.some((p) => p.id === pid)) fail(`${topic.id}: "paradigms" lists unknown paradigm "${pid}"`)
  }
  if (/\bweeks?\b/i.test(topic.title)) fail(`${topic.id}: title contains "week"`)
  for (const erId of topic.errata ?? []) {
    if (!errata.some((e) => e.id === erId)) fail(`${topic.id}: errata "${erId}" does not exist`)
  }
}

 
 
for (const topic of Object.values(topics)) {
  const raw = readFileSync(join(LESSONS_DIR, topic.lessonId, 'topics', `${topic.slug}.md`), 'utf8')
  const { content } = matter(raw)
  const ast = parseMarkdown(content, { headingIds: true })
  for (const href of collectLinks(ast)) {
    const g = /^\/grammar#(.+)$/.exec(href)
    if (g && !pointIds.has(g[1]!)) fail(`${topic.id}: [..](/grammar#${g[1]}) resolves to no grammar point`)
    const v = /^\/vocabulary#(.+)$/.exec(href)
    if (v && !entryById.has(v[1]!)) fail(`${topic.id}: [..](/vocabulary#${v[1]}) resolves to no lexeme`)
    const l = /^\/lessons\/([^/]+)\/([^/]+)$/.exec(href)
    if (l) {
      const t = `${l[1]}/${l[2]}`
      if (!topics[t]) fail(`${topic.id}: [..](/lessons/${t}) resolves to no topic`)
    }
  }
   
   
  for (const m of content.matchAll(/<ParadigmTable[^>]*\bid=["']([^"']+)["']/g)) {
    const pid = m[1]!
    if (!paradigms.some((p) => p.id === pid)) fail(`${topic.id}: <ParadigmTable id="${pid}"> resolves to no paradigm`)
  }
}

 

 
 
 
 
 

 

for (const d of drillsRaw) {
  if (!topics[d.topicId]) fail(`drill "${d.id}": topicId "${d.topicId}" does not exist`)
  if (d.items.length === 0) fail(`drill "${d.id}": empty`)
  for (const item of d.items) {
    if (item.chunks && item.chunks.join(' ') !== item.prompt.split(' / ').join(' ')) {
      fail(`drill item "${item.id}": chunks do not rejoin the prompt`)
    }
  }
}

 

const byVerification: Record<Verification, number> = { extracted: 0, reviewed: 0, authored: 0 }
for (const e of entries) byVerification[e.verification]++

const allSentences = [...sentencesById.values()]
const topicStats: ContentIndex['topicStats'] = {}
for (const topicId of Object.keys(topics)) {
  topicStats[topicId] = {
    entries: entries.filter((e) => e.occurrences.some((o) => o.topicId === topicId)).length,
    sentences: allSentences.filter((s) => s.topicId === topicId).length,
    drills: drillsRaw.filter((d) => d.topicId === topicId).length,
    answerableDrills: drillsRaw.filter((d) => d.topicId === topicId && d.items.some((i) => i.expected.length > 0)).length,
    wrongForms: wrongFormsRaw.filter((w) => w.topicId === topicId).length,
  }
}

const index: ContentIndex = {
  lessons: Object.values(lessons).sort((a, b) => a.number - b.number),
  topics,
  points: Object.fromEntries(grammarPoints.map((p) => [p.id, p])),
  errata: Object.fromEntries(errata.map((e) => [e.id, e])),
  topicStats,
  stats: {
    lexemes: entries.length,
    sentences: sentencesById.size,
    drillItems: drillsRaw.reduce((n, d) => n + d.items.length, 0),
    byVerification,
    unknownPlural: entries.filter((e) => e.pos === 'noun' && e.plural.kind === 'unknown').length,
    unknownPos: entries.filter((e) => e.pos === null).length,
    conflicts: entries.filter((e) => e.conflicts?.length).length,
    unresolvedRelations,
  },
}

if (errors.length) {
  console.error(`\n✖ Content validation failed — ${errors.length} problem(s):\n`)
  for (const e of errors) console.error(`  · ${e}`)
  console.error('')
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })
const gen = (name: string, body: string) => writeFileSync(join(OUT_DIR, name), body)

gen(
  'index.ts',
  `// GENERATED by scripts/build-content.ts — do not edit.\nimport type { ContentIndex } from '../types'\n\nexport const contentIndex: ContentIndex = ${JSON.stringify(index)} as unknown as ContentIndex\n`,
)

const bundle = (name: string, type: string, value: unknown) =>
  gen(
    name,
    `// GENERATED by scripts/build-content.ts — do not edit.\nimport type { ${type} } from '../types'\n\nexport const ${type.toLowerCase()}: ${type} = ${JSON.stringify(value)} as unknown as ${type}\n`,
  )

bundle('vocab.ts', 'VocabBundle', { entries } satisfies VocabBundle)
bundle('sentences.ts', 'SentenceBundle', { sentences: [...sentencesById.values()] } satisfies SentenceBundle)
bundle('drills.ts', 'DrillBundle', { drills: drillsRaw, wrongForms: wrongFormsRaw } satisfies DrillBundle)
bundle('paradigms.ts', 'ParadigmBundle', { paradigms } satisfies ParadigmBundle)
bundle('applied.ts', 'AppliedBundle', { readings: readingsRaw, prompts: promptsRaw } satisfies AppliedBundle)

const authoredTopics = Object.values(topics).filter((t) => t.status === 'authored').length
console.log(
  `✔ content: ${index.lessons.length} lessons · ${Object.keys(topics).length} topics (${authoredTopics} authored) · ` +
    `${entries.length} words · ${sentencesById.size} sentences · ${drillsRaw.reduce((n, d) => n + d.items.length, 0)} drill items · ` +
    `${grammarPoints.length} grammar points · ${paradigms.length} paradigms`,
)
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):`)
  for (const w of [...new Set(warnings)].slice(0, 60)) console.log(`  · ${w}`)
}
if (unresolvedRelations.length) {
  console.log(`\nℹ ${unresolvedRelations.length} relation targets have no lexeme (dropped from distractors — full list on /status)`)
}
const unknownPlural = entries.filter((e) => e.pos === 'noun' && e.plural.kind === 'unknown')
if (unknownPlural.length) {
  console.log(`\n⚠ ${unknownPlural.length} unknown plurals: ${unknownPlural.map((e) => e.headword).join(', ')}`)
}