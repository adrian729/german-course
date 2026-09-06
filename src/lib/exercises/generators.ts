 
 

import type { Drill, Paradigm, Sentence, VocabEntry, WrongForm } from '@/content/types'
import type {
  AuthoredItem,
  ClozeItem,
  ConjugationCellItem,
  GenderItem,
  JudgementItem,
  MatchGridItem,
  MeaningMcqItem,
  PartizipPairItem,
  PluralItem,
  SentenceBuilderItem,
  TypedRecallItem,
  VocabRevealItem,
} from './types'
import { topics } from '@/content/loader'

 

function sourceHref(topicId: string): string | undefined {
  const t = topics[topicId]
  if (!t) return undefined
  return `/lessons/${t.lessonId}/${t.slug}`
}

function verificationOf(entry: VocabEntry): VocabEntry['verification'] {
  return entry.verification
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

function hasUmlaut(s: string): boolean {
  return /[äöüÄÖÜ]/.test(s)
}

 
const BUILTIN_CONJUGATIONS: Record<string, Record<string, string>> = {
  sein: { ich: 'bin', du: 'bist', 'er/sie/es': 'ist', wir: 'sind', ihr: 'seid', 'sie/Sie': 'sind' },
  haben: { ich: 'habe', du: 'hast', 'er/sie/es': 'hat', wir: 'haben', ihr: 'habt', 'sie/Sie': 'haben' },
  werden: { ich: 'werde', du: 'wirst', 'er/sie/es': 'wird', wir: 'werden', ihr: 'werdet', 'sie/Sie': 'werden' },
  können: { ich: 'kann', du: 'kannst', 'er/sie/es': 'kann', wir: 'können', ihr: 'könnt', 'sie/Sie': 'können' },
  wollen: { ich: 'will', du: 'willst', 'er/sie/es': 'will', wir: 'wollen', ihr: 'wollt', 'sie/Sie': 'wollen' },
  müssen: { ich: 'muss', du: 'musst', 'er/sie/es': 'muss', wir: 'müssen', ihr: 'müsst', 'sie/Sie': 'müssen' },
  sollen: { ich: 'soll', du: 'sollst', 'er/sie/es': 'soll', wir: 'sollen', ihr: 'sollt', 'sie/Sie': 'sollen' },
  dürfen: { ich: 'darf', du: 'darfst', 'er/sie/es': 'darf', wir: 'dürfen', ihr: 'dürft', 'sie/Sie': 'dürfen' },
  mögen: { ich: 'mag', du: 'magst', 'er/sie/es': 'mag', wir: 'mögen', ihr: 'mögt', 'sie/Sie': 'mögen' },
}

const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] as const

 
export function vocabReveal(entries: VocabEntry[]): VocabRevealItem[] {
  return entries.map((e) => ({
    id: `vocab-reveal:${e.id}`,
    shape: 'reveal',
    kind: 'vocab-reveal',
    sourceIds: [e.id],
    verification: verificationOf(e),
    riskyWhenUnverified: false,
    origin: 'generated',
    sourceHref: e.occurrences[0] ? sourceHref(e.occurrences[0].topicId) : undefined,
    speakPrompt: e.headword,
    headword: e.headword,
    gloss: e.glosses[0] ?? '',
    lexemeId: e.id,
    level: e.level,
  }))
}

 
export function genderSnap(entries: VocabEntry[]): GenderItem[] {
  return entries
    .filter((e) => e.pos === 'noun' && e.gender && !e.conflicts?.some((c) => c.field === 'gender'))
    .map((e) => {
      const correct = e.gender === 'm' ? 'der' : e.gender === 'f' ? 'die' : 'das'
      const options: GenderItem['options'] = (['der', 'die', 'das'] as const).map((label) => ({
        label,
        correct: label === correct,
      }))
       
      const shuffled = shuffle(options)
      const topicId = e.occurrences[0]?.topicId ?? ''
      return {
        id: `gender:${e.id}`,
        shape: 'choice',
        kind: 'gender',
        sourceIds: [e.id],
        verification: verificationOf(e),
        riskyWhenUnverified: false,
        origin: 'generated',
        sourceHref: sourceHref(topicId),
        speakPrompt: e.headword,
        prompt: `___ ${e.lemma} (${e.glosses[0] ?? ''})`,
        options: shuffled,
        lexemeId: e.id,
      } as GenderItem
    })
}

 
export function typedRecall(entries: VocabEntry[]): TypedRecallItem[] {
  return entries
    .filter((e) => e.glosses.length > 0)
    .map((e) => {
      const english = e.glosses[0]!
       
       
       
      const accepts: string[] = [e.headword]
      if (e.pos !== 'noun' && e.lemma && e.lemma !== e.headword) accepts.push(e.lemma)
      const uniq = [...new Set(accepts.filter(Boolean))]
      const expectsArticle = e.pos === 'noun' && !!e.gender
       
      const gradeCase = e.pos === 'noun'
       
       
       
      const strictUmlaut = false
      const topicId = e.occurrences[0]?.topicId ?? ''
      return {
        id: `typed-recall:${e.id}`,
        shape: 'typed',
        kind: 'typed-recall',
        sourceIds: [e.id],
        verification: verificationOf(e),
        riskyWhenUnverified: false,
        origin: 'generated',
        sourceHref: sourceHref(topicId),
        speakPrompt: english,
        prompt: english,
        accepted: uniq,
        strictUmlaut,
        gradeCase,
        expectsArticle,
        speakAnswer: e.headword,
        lexemeId: e.id,
      } as TypedRecallItem
    })
}

 
function pickDistractors(
  entry: VocabEntry,
  all: VocabEntry[],
  count: number,
): VocabEntry[] {
   
  const relatedIds = new Set<string>()
  for (const r of entry.relations) relatedIds.add(r.lexemeId)
   
  const related = all.filter((e) => relatedIds.has(e.id) && e.id !== entry.id)

   
  const themePosPool = all.filter(
    (e) => e.id !== entry.id && e.pos === entry.pos && e.themes.some((t) => entry.themes.includes(t)),
  )

   
  const samePosPool = all.filter((e) => e.id !== entry.id && e.pos === entry.pos)

  const picked: VocabEntry[] = []
  const used = new Set<string>([entry.id])

  const tryAdd = (pool: VocabEntry[]) => {
    for (const cand of shuffle(pool)) {
      if (picked.length >= count) break
      if (used.has(cand.id)) continue
      picked.push(cand)
      used.add(cand.id)
    }
  }

   
  tryAdd(related)
  if (picked.length < count) tryAdd(themePosPool)
  if (picked.length < count) tryAdd(samePosPool)
   
  if (picked.length < count) {
    const fallback = all.filter((e) => !used.has(e.id))
    tryAdd(fallback)
  }
  return picked.slice(0, count)
}

export function meaningMCQ(entries: VocabEntry[]): MeaningMcqItem[] {
  return entries
    .filter((e) => e.glosses.length > 0)
    .map((e) => {
      let distractors = pickDistractors(e, entries, 3)
       
       
      const correctGloss = e.glosses[0]!
      const seen = new Set([correctGloss.toLowerCase()])
      distractors = distractors.filter((d) => {
        const label = (d.glosses[0] ?? d.headword).toLowerCase()
        if (seen.has(label)) return false
        seen.add(label)
        return true
      })
      if (distractors.length < 2) return null
       
      if (distractors.length > 3) distractors = distractors.slice(0, 3)
      const options = [
        { label: correctGloss, correct: true },
        ...distractors.map((d) => ({ label: d.glosses[0] ?? d.headword, correct: false })),
      ]
      const shuffled = shuffle(options)
       
      if (shuffled.length < 3 || shuffled.length > 4) return null
      const topicId = e.occurrences[0]?.topicId ?? ''
      return {
        id: `meaning-mcq:${e.id}`,
        shape: 'choice',
        kind: 'meaning-mcq',
        sourceIds: [e.id, ...distractors.map((d) => d.id)],
        verification: verificationOf(e),
        riskyWhenUnverified: false,
        origin: 'generated',
        sourceHref: sourceHref(topicId),
        speakPrompt: e.headword,
        german: e.headword,
        options: shuffled,
        lexemeId: e.id,
      } as MeaningMcqItem
    })
    .filter((x): x is MeaningMcqItem => Boolean(x))
}

 
export function conjugationCells(entries: VocabEntry[], paradigms: Paradigm[]): ConjugationCellItem[] {
  const items: ConjugationCellItem[] = []

   
   
   
  const verbEntries = entries.filter((e) => e.pos === 'verb')

  for (const e of verbEntries) {
    const lemma = e.lemma
    const builtin = BUILTIN_CONJUGATIONS[lemma]
    const topicId = e.occurrences[0]?.topicId ?? ''

    if (builtin) {
      for (const person of PERSONS) {
        const form = builtin[person]
        if (!form) continue
        items.push({
          id: `conjugation:${e.id}:${person}`,
          shape: 'typed',
          kind: 'conjugation-cell',
          sourceIds: [e.id],
          verification: verificationOf(e),
          riskyWhenUnverified: false,
          origin: 'generated',
          sourceHref: sourceHref(topicId),
          speakPrompt: `${lemma} — ${person}`,
          prompt: `${lemma} — ${person}, Präsens`,
          accepted: [form],
          strictUmlaut: hasUmlaut(form),
          gradeCase: false,
          lexemeId: e.id,
          infinitive: lemma,
        })
      }
      continue
    }

    if (e.verb?.present3sg) {
       
       
       
       
      const present3sg = e.verb.present3sg
       
      let duForm: string | null = null
      for (const p of paradigms) {
        if (p.kind !== 'verb') continue
         
         
         
        const colIndex = p.cols.findIndex((c) => c.toLowerCase().replace(/\s*\(.*\)\s*$/, '') === lemma.toLowerCase())
        if (colIndex >= 0) {
           
           
          for (const cellRow of p.cells) {
            const person = cellRow[0]
            if (person === 'du' && cellRow[colIndex] ) duForm = cellRow[colIndex]!
            if (person === 'er/sie/es' && cellRow[colIndex]) {
               
              if (cellRow[colIndex] !== present3sg) duForm = null
            }
          }
        }
      }
       
      items.push({
        id: `conjugation:${e.id}:er/sie/es`,
        shape: 'typed',
        kind: 'conjugation-cell',
        sourceIds: [e.id],
        verification: verificationOf(e),
        riskyWhenUnverified: false,
        origin: 'generated',
        sourceHref: sourceHref(topicId),
        speakPrompt: `${lemma} — er/sie/es`,
        prompt: `${lemma} — er/sie/es, Präsens`,
        accepted: [present3sg],
        strictUmlaut: hasUmlaut(present3sg),
        gradeCase: false,
        lexemeId: e.id,
        infinitive: lemma,
      })
      if (duForm) {
        items.push({
          id: `conjugation:${e.id}:du`,
          shape: 'typed',
          kind: 'conjugation-cell',
          sourceIds: [e.id],
          verification: verificationOf(e),
          riskyWhenUnverified: false,
          origin: 'generated',
          sourceHref: sourceHref(topicId),
          speakPrompt: `${lemma} — du`,
          prompt: `${lemma} — du, Präsens`,
          accepted: [duForm],
          strictUmlaut: hasUmlaut(duForm),
          gradeCase: false,
          lexemeId: e.id,
          infinitive: lemma,
        })
      }
    }
  }
  return items
}

 
 
 
export function pluralForge(entries: VocabEntry[]): PluralItem[] {
  return entries
    .filter((e) => e.pos === 'noun' && e.plural.form && e.plural.kind !== 'unknown' && e.plural.kind !== 'none' && !e.conflicts?.some((c) => c.field === 'plural'))
    .map((e) => {
      const pluralForm = e.plural.form!
      const topicId = e.occurrences[0]?.topicId ?? ''
       
       
       
      const singularBare = e.headword.replace(/^(der|die|das)\s+/i, '')
      const umlautIn = (s: string): boolean => /[äöüßÄÖÜẞ]/.test(s)
      return {
        id: `plural:${e.id}`,
        shape: 'typed',
        kind: 'plural',
        sourceIds: [e.id],
        verification: verificationOf(e),
        riskyWhenUnverified: false,
        origin: 'generated',
        sourceHref: sourceHref(topicId),
        speakPrompt: e.headword,
        prompt: `${e.headword} → ?`,
        accepted: [pluralForm],
        strictUmlaut: umlautIn(pluralForm) && !umlautIn(singularBare),
        lexemeId: e.id,
      } as PluralItem
    })
}

 
export function partizipPairs(entries: VocabEntry[]): PartizipPairItem[] {
  return entries
    .filter((e) => e.pos === 'verb' && e.verb?.partizip2)
    .map((e) => {
      const partizip2 = e.verb!.partizip2!
      const aux = (e.verb!.auxiliary ?? 'haben') as 'haben' | 'sein'
      const topicId = e.occurrences[0]?.topicId ?? ''
      return {
        id: `partizip:${e.id}`,
        shape: 'slots',
        kind: 'partizip-pair',
        sourceIds: [e.id],
        verification: verificationOf(e),
        riskyWhenUnverified: false,
        origin: 'generated',
        sourceHref: sourceHref(topicId),
        speakPrompt: e.headword,
        infinitive: e.lemma,
        expectedPartizip: partizip2,
        expectedAux: aux,
        lexemeId: e.id,
      } as PartizipPairItem
    })
}

 
export function sentenceBuilders(sentences: Sentence[]): SentenceBuilderItem[] {
  return sentences
    .filter((s) => s.wordOrderEligible)
    .map((s) => {
       
      const rawTokens = s.tokens.map((t) => t.text.replace(/[.!?;,]+$/, ''))
      const tokens = rawTokens.filter(Boolean)
       
      const expectedOrder = tokens.map((_, i) => i)
      return {
        id: `sentence-builder:${s.id}`,
        shape: 'order',
        kind: 'sentence-builder',
        sourceIds: [...s.lexemeIds],
        verification: 'extracted',
        riskyWhenUnverified: true,
        origin: 'generated',
        sourceHref: sourceHref(s.topicId),
        speakPrompt: s.speakable,
        sentence: s.text,
        tokens,
        expectedOrder,
        sourceIsEligible: true as const,
        sentenceId: s.id,
      } as SentenceBuilderItem
    })
}

 
export function matchGrid(entries: VocabEntry[]): MatchGridItem[] {
  const pool = entries.filter((e) => e.glosses.length > 0)
  if (pool.length < 6) return []
  const out: MatchGridItem[] = []
  const shuffled = shuffle(pool)
  for (let i = 0; i + 6 <= shuffled.length; i += 6) {
    const six = shuffled.slice(i, i + 6)
    const topicId = six[0]!.occurrences[0]?.topicId ?? ''
    out.push({
      id: `match-grid:${six.map((e) => e.id).join('+')}`,
      shape: 'pair',
      kind: 'match-grid',
      sourceIds: six.map((e) => e.id),
      verification: six[0]!.verification,
      riskyWhenUnverified: false,
      origin: 'generated',
      sourceHref: sourceHref(topicId),
      speakPrompt: six.map((e) => e.headword).join(', '),
      pairs: six.map((e) => ({ left: e.headword, right: e.glosses[0]!, lexemeId: e.id })),
    })
  }
  return out
}

 
export function judgementFromWrongForms(wrongForms: WrongForm[]): JudgementItem[] {
  return wrongForms.map((wf) => {
    const isCorrect = wf.correct ? false : true  
     
    const options: JudgementItem['options'] = [
      { label: 'right', correct: false },
      { label: 'wrong', correct: true },
    ]
     
     
    void isCorrect
    return {
      id: `judgement:${wf.id}`,
      shape: 'choice',
      kind: 'judgement',
      sourceIds: wf.lexemeId ? [wf.lexemeId] : [],
      verification: 'extracted',
      riskyWhenUnverified: false,
      origin: 'generated',
      sourceHref: sourceHref(wf.topicId),
      speakPrompt: wf.form,
      statement: wf.form,
      correct: wf.correct,
      context: wf.context,
      options: shuffle(options),
      formId: wf.id,
    } as JudgementItem
  })
}

 
export function clozeFromDrills(entries: VocabEntry[], sentences: Sentence[]): ClozeItem[] {
  const byId = new Map(sentences.map((s) => [s.id, s]))
  const items: ClozeItem[] = []
  const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
   
  const wordRe = (s: string): RegExp => new RegExp(`(?<![A-Za-zÄÖÜäöüßẞ])${escapeRegExp(s)}(?![A-Za-zÄÖÜäöüßẞ])`, 'i')
  for (const e of entries) {
    if (e.exampleIds.length === 0) continue
     
    const sid = e.exampleIds[0]!
    const sent = byId.get(sid)
    if (!sent) continue
     
    const lemma = e.lemma
     
    const hw = e.headword.replace(/^(der|die|das)\s+/i, '')
     
     
     
    const candidates = [lemma, hw].filter(Boolean)
    const hit = candidates.find((c) => wordRe(c).test(sent.text))
    if (!hit) continue
    const blanked = sent.text.replace(wordRe(hit), '___')
     
    if (!blanked.includes('___')) continue
    const topicId = e.occurrences[0]?.topicId ?? sent.topicId
    items.push({
      id: `cloze:${e.id}:${sid}`,
      shape: 'slots',
      kind: 'cloze',
      sourceIds: [e.id, sid],
      verification: verificationOf(e),
      riskyWhenUnverified: true,
      origin: 'generated',
      sourceHref: sourceHref(topicId),
      speakPrompt: sent.speakable,
      prompt: blanked,
      blanks: [{ accepted: [lemma, e.headword], strictUmlaut: hasUmlaut(lemma) }],
      english: sent.english,
      lexemeId: e.id,
    })
  }
  return items
}

 
export function authoredItemsFromDrills(drills: Drill[]): AuthoredItem[] {
  const items: AuthoredItem[] = []
  for (const drill of drills) {
    for (const it of drill.items) {
      if (it.expected.length === 0) continue
      const countBlanks = (it.prompt.match(/___/g) || []).length
      const hasChunks = Boolean(it.chunks && it.chunks.length > 0)
      let shape: AuthoredItem['shape'] = 'typed'
      let authoredShape: AuthoredItem['authoredShape'] = 'typed'
      if (hasChunks) {
        shape = 'order'
        authoredShape = 'order'
      } else if (countBlanks > 1) {
        shape = 'slots'
        authoredShape = 'slots'
      } else if (countBlanks === 1) {
        shape = 'typed'
        authoredShape = 'typed'
      } else {
        shape = 'typed'
        authoredShape = 'typed'
      }

      const topicId = it.sourceTopicId
      const base: AuthoredItem = {
        id: `authored:${it.id}`,
        shape,
        kind: 'authored',
        sourceIds: [it.id],
        verification: topics[topicId]?.status ?? 'extracted',
        riskyWhenUnverified: false,
        origin: 'authored',
        sourceHref: sourceHref(topicId),
        speakPrompt: it.prompt.replace(/___/g, '…'),
        rubric: it.rubric,
        drillId: it.id,
        prompt: it.prompt,
        expected: it.expected,
        english: it.english,
        rationale: it.rationale,
        chunks: it.chunks,
        authoredShape,
      }

      if (authoredShape === 'typed') {
        base.accepted = it.expected
         
         
        base.strictUmlaut = it.expected.some(hasUmlaut)
      } else if (authoredShape === 'slots') {
         
        const blanks = Array.from({ length: countBlanks }, (_, i) => ({
          accepted: it.expected.slice(i, i + 1).length ? [it.expected[i]!] : it.expected,
          strictUmlaut: hasUmlaut(it.expected[i] ?? it.expected[0] ?? ''),
        }))
        base.blanks = blanks
        base.accepted = it.expected
      } else if (authoredShape === 'order') {
        const tokens = it.chunks ?? []
        base.tokens = tokens
        base.expectedOrder = tokens.map((_, i) => i)
      }

      items.push(base)
    }
  }
  return items
}

 
export function authoredStrictUmlaut(item: AuthoredItem): boolean {
  const exp = item.expected ?? []
  return exp.some(hasUmlaut)
}
