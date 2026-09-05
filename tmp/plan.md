# German Course — Build Plan

## Context

The goal is a small, personal, client-only web app for learning German from English: readable grammar lessons, a browsable vocabulary, consolidated reference tables, and practice drills — built on the same stack and the same restraint as its sibling, `…/data-analytics-preparation`.

`…/german-course` is empty. Node 26.7.0, pnpm 12.3.2 available.

**The situation inverts the sibling's.** That project's source was a syllabus skeleton — 35 KB of bullet points, zero definitions — so every word had to be authored fresh, and its plan spent all its effort on data model and structure while treating content as a later workstream.

Here the opposite holds. `…/enciclopedia/docs/german/` is **12,374 lines / ~134,000 words** of finished, publication-quality material spanning A1→B2, with no stubs, no TODOs and no empty sections. So the bottleneck is not authoring. **It is extraction** — turning markdown tables into typed data that practice generators can consume — and the plan's centre of gravity moves accordingly.

---

## What the corpus actually contains

Every figure below was re-derived from the files, not taken on trust.

| | |
|---|---|
| Files | `german.md` (a syllabus plus the 12 LLM prompts that generated the lessons; **not ingested** — all 12 of its links are broken, `german/week_N.md`, doubled directory) + `week_1.md`…`week_12.md` |
| Structure | 106 H2s, of which 12 are `## Table of Contents` → **94 content H2s**. **501 H3s. Zero H4s** — depth caps at 3. |
| Vocabulary | **3,323 rows** (3,093 table rows + 230 numbered-list items in lessons 1–2 — the rows inside H2 sections matching `/Vocabulary/i`, a scoping predicate that captures 100% of the vocabulary with zero false positives, the single largest simplification in the extractor) → **~2,560 distinct lexemes**. 564 lexemes occur more than once; 559 of those span lessons. |
| Example sentences | **2,973**, and **not one is translated** — the single systematic gap in the corpus. |
| Exercises | **678 items** across 89 drills (80/76/75/50/60/58/52/69/38/66/44/10 per lesson), every one with an answer key except lesson 1's pronunciation drill. |
| Paradigms | ~41 tables — `sein`/`haben`/`werden`, six modals, 7 stem-changers as an 8-column matrix, 20 strong verbs in Präteritum with all six persons in one cell, 30 Partizip II with auxiliary, article/adjective/relative-pronoun/N-declension grids. |
| Authored gold | **64 `~~strikethrough~~` wrong forms** each paired with its correction · **20 false friends** · **30 idioms with literal *and* figurative readings** · a 20-pair formal/informal table · 63 valency annotations (`zustimmen (+D)`, `geben + D + A`) |
| Applied skills | 9 reading texts (130–300 words, German comprehension questions) + 9 writing prompts with required-construction checklists, lessons 3–11 |
| IPA | **42 strings, week 1 only.** No audio assets anywhere. |

### Why it is messier than it looks

It was machine-generated from 12 prompts, and the seams show:

- **The parenthesis after a headword is overloaded five ways** — plural (`das Frühstück (-e)`), 3sg stem change (`waschen (wäscht)`), gender tag (`der Kopf (m.)`), nominalisation source (`die Ablehnung (ablehnen)`), English gloss (`spielen (to play)`), and valency (`zustimmen (+D)`). A single "strip parens, read a plural" rule silently corrupts ~250 entries. **Disambiguation must come from the table shape and section kind, never from the string.**
- **Three gender notations** — article in headword (dominant), `(m./f./n.)` tags (68 nouns, lesson 3 §§5.1–5.5 only), and suffix rules stated as prose.
- **Two plural eras that turn out to be one rule.** Lessons 1–9 write a suffix *unless the stem umlauts*, in which case they spell it out (an umlaut is not expressible as a suffix). Lessons 10–12 spell everything out — `suffix` count is literally **0** in all three files. Both normalise to a fully spelled-out form by one rule.
- **Vocabulary is numbered lists in lessons 1–2, tables in 3–12.** 19 distinct table shapes exist inside vocabulary sections; 91 of ~110 tables are one of three.
- **Callout labels are an open set** — 38 `Note:`, 11 `Trap (critical):`, then a tail of ~85 one-offs (`> **Why the compound?**`, `> **das Herz is doubly irregular:**`). **Do not build an enum.**
- **Six real errors**, listed in §Errata. The sixth was found *by the deduplication merge itself*, which is the intended feedback loop.

Three findings make it tractable: **zero escaped pipes** in 4,584 table lines (naive `split('|')` is safe corpus-wide); only 19 table shapes inside vocabulary sections; and 179 `Week N` mentions, all mechanically rewritable.

---

## Decisions taken

| Decision | Choice |
|---|---|
| Hierarchy | **Lesson → Topic pages.** 12 Lessons (CEFR as a badge), 93 topics. **The word "week" never appears** — enforced by a build invariant. |
| State | **Fully stateless.** No SRS, no progress, no history. localStorage holds theme, sidebar collapse and TTS rate — device settings, not study records. |
| Extraction scope | **Parse all 12; hand-verify A1 only.** Lessons 1–2 ship `authored`, 3–12 ship `extracted` with a visible badge. |
| Capabilities | Typed production with umlaut-tolerant grading, word-order builder, browser TTS. **Speech recognition out of scope.** |
| Word pages | **`/vocabulary/$wordSlug` exists**, reversing the sibling's no-per-term rule — a German lexeme carries a paradigm, several examples, gender, plural, false friends and provenance. |
| Reference | **`/reference`** for the ~41 paradigm tables, assembled from data so each exists once. |

**One addition beyond what was asked**, flagged for a veto: a **`/grammar`** route holding ~124 hand-authored `GrammarPoint`s — the direct analogue of the sibling's `GlossaryTerm`, and the anchor target for inline `[Präteritum](/grammar#praeteritum)` hover-cards. It sits beside `/reference` in the sidebar; the two are distinct (named concepts with definitions vs. paradigm grids) but adjacent, and merging them into one route is a reasonable alternative.

**One open decision flagged for the user**, bearing on the 93-topic arithmetic above: `## Applied Skills` currently renders as one `applied` topic per lesson, but its two H3s are genuinely different page shapes — a text plus a `> **New words**` glossary plus 5–6 German comprehension questions with no upstream answers, versus a brief, a required-constructions checklist and a seed sentence — so the second design pass recommends splitting each into a `reading` topic and a `writing` topic. That takes 93 topics to 102 and 105 routes to 114, and `TopicRender` gains `reading` and `writing` in place of `applied`. Recommended; either way it is a one-line change in the topic slicer. Separately, and not a decision: week 12's `## 10. Answer Key & Model Texts` is **not** a topic — it folds into lesson 12's practice topic, exactly where every other lesson keeps its answer key, so all 12 lessons end up the same shape.

---

## Tech stack — inherited wholesale, already verified

Taken from the sibling's shipped `package.json`; no version research needed.

| Concern | Choice |
|---|---|
| Framework | React + React DOM 19.2 |
| Build | Vite 8.2 + `@vitejs/plugin-react` 6.1, TypeScript 7.0 |
| Routing | `@tanstack/react-router` 1.170 (file-based, `autoCodeSplitting`, typed `validateSearch`) + `@tanstack/router-plugin` — **must precede the React plugin** in `vite.config.ts` |
| Styling | Tailwind 4.3 via `@tailwindcss/vite`, CSS-first `@theme` |
| UI | shadcn "new-york" over the **unified `radix-ui`** package (namespace imports), the prebuilt `cn` package, `class-variance-authority`, `cmdk`, `lucide-react` |
| Markdown | `@tanstack/markdown` 0.0.13 |
| Build-time only | `gray-matter` |

**Copied verbatim:** `src/styles/theme.css` (286 lines — Catppuccin Latte/Mocha as OKLCH Tailwind scales with a WCAG AA audit; its `green`/`peach`/`red` scales are exactly the three grading states needed), `vite.config.ts` including the `spaFallback` plugin that copies `index.html` → `404.html` for GitHub Pages deep links, `tsconfig.json`, `components.json`, `lib/{utils,theme,sidebar}.ts`, `filter-chips.tsx`, `theme-toggle.tsx`, and the nine `ui/` primitives actually used. **Not installed:** `toggle`/`toggle-group` — present but unused in the sibling, since `ChipRow` replaced them.

Scripts run as plain `node scripts/*.ts` (Node 26 executes TypeScript directly; no tsx).

**The one inherited gotcha:** `@tanstack/markdown` **silently drops links whose URL scheme it does not recognise** — a `term:` protocol vanished with no error and no `link` node. Relative URLs only (`/grammar#id`, `/vocabulary#id`), intercepted via `components={{ a: … }}`, and validated at build with the same parser the app renders with.

---

## Content architecture

### Source → Lesson → Topic

`week_5.md` → **Lesson 5**, title = H1 minus the `German Week N:` prefix and the trailing CEFR parenthetical, `level: 'A2'` as a badge.

**One topic per content H2.** Slug is `NN-` + kebab-case of the title minus its leading `N. `, ASCII-folded (`ä→ae`, `ß→ss`) so URLs stay portable: `## 1. Präteritum — Simple Past / Narrative Past` → `01-praeteritum`. Section numbers are ordering metadata, never identity, so renumbering upstream cannot break a bookmark.

**The hand-written Tables of Contents are dropped** — redundant against the sidebar, the in-page rail and the palette. But not wasted: at extraction every ToC anchor is checked against the headings actually produced, and a dangling one warns (a signal about the source, not our build).

**Three H2 kinds are pages *and* data.** This is the reconciliation of a genuine disagreement between the two design passes, and it matters: dropping them as pages breaks the sidebar's promise that a lesson's contents are its topics; dropping them as data throws away the practice engine.

| `Topic.render` | Count | Page renders |
|---|---|---|
| `prose` | 60 | The markdown body — grammar explanation, tables, callouts, ASCII diagrams |
| `vocabulary` | 12 | Short preamble + `<VocabTable>` grouped by the corpus's own thematic sections, with per-group "practise these N words" |
| `practice` | 12 | Preamble + `<DrillList>`; answers revealed per item, never dumped. The answer-key H3 is **not** a topic — it is folded into `DrillItem.expected` |
| `applied` | 9 | Preamble + `<ReadingPanel>` (glossary popovers, TTS) + `<WritingPanel>` (requirement checklist in React state) |

**93 topics + 12 lesson index pages = 105 routes.**

#### Worked example — Lesson 3 (A2), 7 topics from `week_3.md`

| # | Slug | `render` | Notes |
|---|---|---|---|
| 1 | `01-praeteritum` | prose | Paradigms for `sein`, `haben`, six modals, weak pattern, and the 20-strong-verb table whose "Full Pattern" cell holds all six persons inline |
| 2 | `02-reflexive-verbs` | prose | 18 verbs → `VerbInfo.reflexive: 'A' \| 'D'` on the matching lexemes |
| 3 | `03-indefinite-pronouns` | prose | |
| 4 | `04-adjective-declension` | prose | Three 3×4 `Case \| Masculine \| …` paradigms |
| 5 | `05-vocabulary` | vocabulary | **200 entries.** §§5.1–5.5 are the gender-tag-only sections (68 nouns, plural unknown at extraction); §5.6 is word-formation; §§5.7–5.9 use ordinary suffixes |
| 6 | `06-applied-skills` | applied | "Lisas Wochenende" + writing prompt. **No glossary** — the `> **New words**` convention starts at lesson 4 |
| 7 | `07-practice` | practice | 6 drills, **75 items**, all keyed |

`week_3.md` is the hardest single file — it exercises every notation variant in the corpus. **If the extractor handles lesson 3, it handles all twelve.**

### The pipeline is two scripts, not one

The sibling has a single `pnpm content`. Copying that shape would be wrong in two directions at once:

**`pnpm extract`** — reads `../enciclopedia/docs/german/*.md`, writes `content/extracted/**` and the 93 topic bodies. Run rarely; **output is committed**. Not a one-off migration, because the format handling will be wrong on the first pass and you will iterate on it fifteen times — a one-off script makes every parser fix a hand-merge against work already done. Not part of `pnpm build`, because the corpus lives in a repo we do not own and CI must build from a clean clone of the app alone.

**`pnpm content`** — the sibling's step, unchanged in shape. Reads only `content/`, merges extracted + overrides, validates, emits `src/content/generated/`. Gated ahead of `dev`, `build` and `typecheck`.

Sizes: `extract-corpus.ts` ≈700 lines across 12 stages, plus ≈220 **declarative** lines in `extract.config.ts` (table shapes, section→kind/theme/POS overrides, theme mapping). `build-content.ts` ≈380 lines — the sibling's 233 plus merge/dedup plus the extra invariants. Keeping the tuning knobs in a config data file is what keeps the code readable; the config is where the corpus's idiosyncrasy lives and is the file a human edits when extraction gets something wrong.

### How hand-fixes survive re-extraction

The crux, defended six independent ways.

**Ownership is by directory, and CI enforces it rather than trusting a comment.** `content/extracted/` — machine writes, clobbered every run, header comment says so. `content/overrides/` — human writes, machine never reads. `content/lessons/` — shared, key by key. The CI step: `pnpm extract && git diff --exit-code content/extracted`. That requires `pnpm extract` to be idempotent and byte-stable — sorted keys, sorted arrays, content-hash ids rather than counters, LF endings, all of which the id scheme below already implies — stated here explicitly because CI depends on it. "Never hand-edit generated data" becomes a failing check rather than a header comment, and without it the overrides discipline collapses within a month.

**Frontmatter keys are owned individually.** Stage 5 reads the existing `.md` with `gray-matter` and replaces only the six machine keys (`id`, `lessonId`, `number`, `title`, `render`, `source`). A `summary` you wrote, a `points:` you assigned, a `status: authored` you promoted — all survive verbatim. The *body* is machine-owned; prose corrections belong in an erratum with a `find`/`replace`, not in a body that will be overwritten.

**Ids are content-derived, not positional.** `LexemeId` = `slugify(headword)` (`die-erfahrung`, `sich-erinnern`), independent of row/section/file order. `SentenceId` = `s-` + 6 hex of sha256(NFC text), so identical text always yields the identical id even if the sentence moves file. `DrillItem.id` uses the source's own `10.2.` numbering.

**Orphaned overrides hard-fail.** If re-extraction leaves an override pointing at nothing, the build errors with the dangling id. A silent no-op is the one failure that would make the whole scheme untrustworthy.

**Extractor output is JSONL, not JSON.** 3,323 pretty-printed records is ~50,000 lines of diff noise on every parser tweak; one record per line makes `git diff` after a fix immediately readable — you can see that exactly 68 lines changed and which. Small hand-edited files stay pretty JSON. This diverges from the sibling purely on scale: 39 terms vs 3,323 rows.

**The human loop:** `pnpm extract` → `git diff` is the review surface → read the warning report, grouped by lesson → corrections go to `overrides/lexemes.json` (fields), `overrides/errata.json` (the source is wrong), `taxonomy.json` (theme mapping) or `extract.config.ts` (the *parser* is wrong — then re-run) → `pnpm content` merges and validates → promote topics to `status: authored` as you read them, and the unverified badge disappears per topic.

### Normalising the notations

**Scope first, which removes the whole ambiguity class:** vocabulary is extracted **only** from H2 sections matching `/Vocabulary/i`. That predicate yields exactly the 3,323 rows (3,093 table rows + 230 numbered-list items in lessons 1–2) — 100% of the vocabulary, zero false positives, the single largest simplification in the extractor. Outside those 12 sections are ~130 other table shapes (`Case | Masculine | …`, `Person | können | …`) that are grammar tables and must never be read as word lists.

**Gender** — article prefix (~2,920 nouns) · `(m./f./n.)` tag (68) · `die` + `(pl.)` → plurale tantum, `gender: null` (38) · `der Arzt (m.) / die Ärztin (f.)` splits into two entries with a `feminine-of` relation (~30) · article and tag both present must agree, and disagreement is a **hard failure** because it means the parser broke. **Suffix rules are never applied** — they stay in the prose as pedagogy. Every tagged noun already carries an article, and a gender inferred from morphology would be a value the source did not assert.

**Plural** — one rule per encoding, all producing a fully spelled-out form so nothing downstream ever sees a suffix:

| Raw | Kind | Result |
|---|---|---|
| `-n` `-en` `-e` `-er` `-nen` `-s` `-se` | `suffix` | `stem + raw.slice(1)` → `Schwester`+`n` = `Schwestern`, `Bus`+`se` = `Busse` |
| capitalised full form with a new umlaut | `umlaut` | as written — `Väter`, `Bücher` |
| capitalised full form, no umlaut change | `full` | as written — `Romane`, `Gerichte` |
| `-` or `—` | `invariant` | `stem` |
| capitalised full form equal to the stem | `invariant` | `stem` — lessons 10–12 write `der Richter (Richter)`; normalising to `invariant` dedups it cleanly against lesson 5's `(-)` notation for the same word, so the two spellings of one fact never read as a conflict |
| `no pl.` | `none` | `null` |
| `pl.` | `pluraleTantum` | `stem` |
| gender tag only, nothing after merge | `unknown` | `null` — **44 entries** |

**The `(pl.)` trap is a warning, never a silent merge.** A `(pl.)` entry whose article-stripped stem matches an existing singular lemma is not necessarily a plurale tantum — lesson 9's `die Zuschauer (pl.)` is the plural of lesson 5's `der Zuschauer (-)`, not a separate plurale-tantum word. This is the one case in the whole merge where a human decides.

**Part of speech** is a three-stage cascade: section override first (`### 2.2. Verbs (40)` ⇒ every item is a verb; ~30 sections carry one), then structural tests on the headword, then `null` + a warning. The structural test that earns its place: *article present **and** a later lowercase token* ⇒ `phrase`, which is what saves `die Daumen drücken`, `das Bett machen` and `die Flinte ins Korn werfen` from being read as nouns.

**The governing rule throughout: the extractor never invents a value the corpus does not state.** `unknown` is a first-class outcome, not a failure.

### Paradigm assembly is declared, not inferred

~58 logical paradigms are assembled from ~95 source tables. The corpus restates the same grid across lessons at a scale that would otherwise look like duplication rather than pedagogy: the definite-article grid appears **5 times** (lesson 1 §5.1 nominative only, lesson 1 §6.1 +accusative, lesson 2 §1.1 +dative, lesson 4 §1.6 complete, lesson 12 §8.1 complete again), weak adjective endings **3 times** across lessons 2→3→4, N-Deklination **8 times**, Konjunktiv I **7 times**, and `sein`, `haben` and `werden` four times each across moods and tenses.

*Which* source tables constitute one logical grid is a judgement call the extractor cannot make, so it is declared rather than inferred, in an authored `content/reference/assembly.json`. An excerpt for `decl.adjektiv.schwach`:

```jsonc
{
  "decl.adjektiv.schwach": {
    "assembleFrom": [
      { "file": "week_2.md", "section": "§7.1", "rows": ["nom", "akk"] },
      { "file": "week_3.md", "section": "§4.1", "rows": ["dat"] },
      { "file": "week_4.md", "section": "§1.7", "rows": ["gen"] }
    ],
    "taughtIn": [
      { "lessonId": "02-dative-modals-perfekt-prepositions", "topicId": "…", "rows": ["nom", "akk"] },
      { "lessonId": "03-praeteritum-and-reflexives", "topicId": "…", "rows": ["nom", "akk", "dat"] },
      { "lessonId": "04-genitive-comparative-n-deklination", "topicId": "…", "rows": ["nom", "akk", "dat", "gen"] }
    ]
  }
}
```

The payoff, and the point of this subsection: **overlap is a feature, not a conflict.** When two source tables supply the same cell, the build asserts they agree; disagreement is a hard failure naming both `file:line`. That converts the corpus's 95-table redundancy into 95-table-wide cross-validation for free — the five copies of the article grid now check each other. See `### Build validation` for the corresponding hard-failure entry.

This subsection is also the mechanism behind the progressive-revelation behaviour described under `#### Progressive revelation — one table, taught in slices`: `taughtIn[].rows` is where the per-lesson slice (`rowIntroducedIn` / `asOf`) is declared. See that section rather than restating it here.

### The 44 unknown plurals

Lesson 3 §§5.1–5.5 give 68 nouns with a gender tag and no plural. **24 reappear in another lesson with a plural** (`die Angst → Ängste` in lesson 7, `das Krankenhaus → Krankenhäuser` in lesson 2) and the merge fills them at zero human cost. **44 remain** — body parts, weather, travel: `der Kopf`, `der Arm`, `das Bein`, `das Auge`, `der Zahn`, `das Wetter`, `der Regen`, `die Wolke`, `der Flug`, `die Reise`, `der Koffer`, `das Gepäck`, `die Ampel`, `die Ecke`…

Handling: field is `{ form: null, kind: 'unknown', raw: '(m.)' }` — never a guess. `Kopf → Köpfe` is obvious to a German speaker and *the source does not say it*; writing that inference into the extractor is how you end up with something silently wrong sitting next to it. The vocabulary table shows an em-dash with a "plural not given in the source" tooltip. **The plural drill filters `unknown` and `none` out entirely** — it does not fall back and does not accept anything. The fix is all 44 into `overrides/lexemes.json` as `authored`: a 20-minute pass, after which the warning tightens into a hard invariant to keep it at zero.

**This is the design's best return on effort:** the merge that exists to remove redundancy also repairs the corpus's worst data gap, without a human deciding anything.

### Deduplication

The extractor emits **one record per occurrence** (3,323 rows); `build-content.ts` merges them into ~2,560 `VocabEntry` records. The split matters — merge policy is then code, versioned and testable, while `occurrences.jsonl` stays a faithful diffable mirror of the corpus.

Key is `${pos}:${foldKey(lemma)}`, with `sich ` retained so `sich erinnern` and `erinnern` stay distinct (the corpus teaches both, in lessons 3 and 5).

| Field | Policy |
|---|---|
| `gender`, `plural`, `pos`, `verb.*`, `valency` | Must agree **after** normalisation — and agreement is the common case: `der Roman` is `(-e)` in lessons 5 and 8 and `(Romane)` in 11 and 12, and all four expand to `Romane`. Disagreement takes the earliest, records `conflicts[]`, warns, and excludes that field from generated drills. Never a hard fail — 564 multi-occurrence groups means fail-fast ships nothing. |
| `glosses` | **Union.** `die Verhandlung` → `["hearing", "trial", "negotiation"]`. Polysemy is data; picking one gloss deletes it. |
| `exampleIds` | Union — a pure gain. `der Vertrag` arrives with four distinct example sentences instead of one, feeding the word-order drill and TTS. |
| `occurrences` | Append, sorted. **This array is the "also appears in Lesson N" data** — nothing is lost by merging. |
| `plural` where one is `unknown` | **The known one wins** — the mechanism that fills 24 of lesson 3's gaps. |

Note that only ~187 of the 564 duplicate groups come from lesson 12's Comprehensive Review; **two thirds is ordinary cross-lesson recurrence**, and some is within a single file (`die Verhandlung` appears three times inside `week_10.md`).

### Errata — corrections are data, and they are visible

The upstream repo is not ours and is never modified. Corrections live in `content/overrides/errata.json`, each quoting the exact source text and pinning its hash. `severity: 'error'` renders a **visible source-note callout** on the affected page.

That visibility is the operative answer to "must not be laundered into the app as fact": the app does not quietly present the right answer where the source was wrong — it presents the right answer *and says the source was wrong*.

| Erratum | Source | Fix |
|---|---|---|
| `gehen` called a weak/regular verb | `week_11.md:100`, `week_9.md:91` | Body `find`/`replace` — it looks regular there only because Konjunktiv I builds from the infinitive stem for every verb but `sein`. Lesson 3 has it right. |
| Invented plurals for singular-only abstracts | `week_12.md` §9.9 (5 rows) | `plural.kind: 'none'`. `Work-Life-Balanzen` is not a German word. |
| `die Rechnung (-n)` | `week_5.md:666` | `-en`; `(-n)` would expand to `Rechnungn` |
| `der Beklagte`/`der Verdächtige` as N-nouns | `week_10.md:394` | `declension: 'adjectival'` — they decline like adjectives, so the indefinite nominative is `ein Beklagter` |
| `die erneuerbare Energie (erneuerbaren Energien)` | `week_10.md:723` | Bare plural takes the strong ending: `erneuerbare Energien`. **Found by the merge** — lesson 12 has it right, the two conflicted, the warning became an erratum. |

A stale erratum is worse than none, because it looks fixed — so every `find` must match **exactly once** and every source hash must still match, or the build fails.

---

## Data model

Three rules run through it: **the extractor never invents a value the corpus does not state**; **the word "week" appears nowhere**; and **every field has at least one named consumer**.

```ts
// src/content/types.ts  (abridged — full version is written first in Phase 1)

export type LessonId = string    // "03-praeteritum-and-reflexives"
export type TopicId  = string    // "03-praeteritum-and-reflexives/02-reflexive-verbs"
export type PointId  = string    // "praeteritum"      — anchor in /grammar
export type LexemeId = string    // "die-erfahrung"    — anchor in /vocabulary
export type SentenceId = string  // "s-a41f9c"         — content hash, survives re-extraction

export const LEVELS = ['A1','A2','B1','B2'] as const
export const THEMES = [ /* 26 slugs; the corpus's 110 raw section titles map onto these
                          via authored content/taxonomy.json, and survive as provenance */ ] as const

/** How much a human has looked at this record. Drives the visible badge. */
export type Verification = 'extracted' | 'reviewed' | 'authored'

export type Lesson = {
  id: LessonId; number: number; title: string; shortTitle: string
  level: Level; summary: string; status: Verification
  topicOrder: TopicId[]        // single source of display order
  sourceFile: string           // provenance only, never rendered as a link
}

/** 'prose' renders markdown and nothing else. The other three render a short
 *  preamble plus a data-driven component, because those H2s are 200-row tables
 *  and 80-item drills that are far better as records than as scrolling markdown. */
export type TopicRender = 'prose' | 'vocabulary' | 'practice' | 'applied'

export type SourceRef = {
  file: string; lines: [number, number]; heading: string
  sha256: string               // staleness detector for errata + upstream drift
}

export type TopicFrontmatter = {
  id: TopicId; lessonId: LessonId; number: number; title: string
  render: TopicRender; status: Verification; summary: string
  points: PointId[]            // grammar points canonically defined here
  /** Points defined elsewhere that this one leans on. Direction (back/forward)
   *  is COMPUTED from lesson+topic order, never authored — the sibling's trick. */
  revisits: Array<{ pointId: PointId; note: string }>
  paradigms: ParadigmId[]
  source: SourceRef
}

export type Topic = TopicFrontmatter & {
  slug: string; readingTimeMin: number; headings: Heading[]
  counts: { vocab: number; sentences: number; drillItems: number }
  errata: ErratumId[]
}

/** The anchor-and-hover-card entity: the German analogue of the sibling's
 *  GlossaryTerm. ~124 of these, HAND-AUTHORED, never extracted — deriving them
 *  from the 501 H3 titles would yield 500 junk anchors. */
export type GrammarPoint = {
  id: PointId; term: string; englishTerm: string; aliases: string[]
  definition: string; lessonId: LessonId; topicId: TopicId
  confusableWith: PointId[]    // generates contrast cards
  sequence?: string[]          // when the point IS a procedure
  register?: { spoken: string; written: string }
  level: Level; themes: Theme[]
}

export type PluralKind =
  | 'suffix' | 'umlaut' | 'full' | 'invariant' | 'none' | 'pluraleTantum' | 'unknown'

export type Plural = {
  form: string | null          // ALWAYS fully spelled out, or null. The only field consumers read.
  kind: PluralKind
  raw: string | null           // exactly what stood in the parens — tooltip + re-extraction diff
}

export type VerbInfo = {
  class?: 'weak' | 'strong' | 'mixed' | 'modal'
  separable?: boolean; prefix?: string
  reflexive?: 'A' | 'D'; auxiliary?: 'haben' | 'sein'
  /** 3sg present when irregular: waschen (wäscht). This is the OTHER thing the
   *  parenthesis can hold, and confusing it with a plural is the single easiest
   *  way to corrupt the extraction. */
  present3sg?: string
  praeteritum3sg?: string; partizip2?: string
  praeteritumFull?: string[]   // the six persons the corpus crams into one cell
}

export type Occurrence = {
  topicId: TopicId; lessonNumber: number
  sourceSection: string; sourceLine: number
  gloss: string; exampleId: SentenceId | null
}

export type VocabEntry = {
  id: LexemeId
  headword: string             // "die Erfahrung" — as displayed, and as spoken
  lemma: string                // "Erfahrung" — grading, search, plural expansion
  pos: Pos | null; gender: Gender | null; plural: Plural
  glosses: string[]            // union across occurrences; [0] is primary
  declension?: NounDeclension; verb?: VerbInfo; valency?: Valency
  register: 'neutral' | 'formal' | 'informal' | 'colloquial' | 'literary'
  relations: Array<{ kind: 'informal-of'|'feminine-of'|'derived-from'|'compound-of'; lexemeId: LexemeId }>
  falseFriend?: { looksLike: string; actuallyMeans: string }
  literal?: string             // idioms carry a literal reading beside the figurative
  themes: Theme[]; level: Level
  occurrences: Occurrence[]    // "Introduced in Lesson 3 · also in 7, 11"
  exampleIds: SentenceId[]
  verification: Verification
  conflicts?: Array<{ field: string; values: string[]; from: TopicId[] }>
  errata: ErratumId[]
}

export type Token = { text: string; capitalised: boolean }

export type Sentence = {
  id: SentenceId; text: string; tokens: Token[]
  /** The corpus never translates its examples — 2,973 sentences, not one English
   *  rendering. Non-null ONLY for sentences lifted from answer keys, which do
   *  carry a literal gloss: "(Today learn I German.)" */
  english: string | null
  lexemeIds: LexemeId[]; topicId: TopicId; level: Level
  /** Safe to scramble for the word-order drill. True only for 4–8 tokens, one
   *  finite verb, no fronted adverbial, and A1/A2 — because at B1+ German
   *  licenses several correct orders and a stateless app cannot argue with the
   *  learner. Sentence lengths cluster tightly (95% are 4–9 tokens, median 5),
   *  so the length test alone admits 2,813 of 2,973; the extra constraints above
   *  are what take it down to ~640 — a deliberate gap, not waste, since 640 is
   *  far more than a session needs and the surplus is headroom. */
  wordOrderEligible: boolean
  speakable: string            // == text unless the cell carried trailing markdown
}

export type Paradigm = {
  id: ParadigmId; title: string
  kind: 'verb' | 'article' | 'pronoun' | 'adjective-ending'
  rows: string[]; cols: string[]; cells: string[][]
  /** Week 11's unique "Identical to indicative?" column is COMPUTED at build
   *  time, never stored: identical(person) = konjunktiv1.cells[person][col].form
   *  === praesens.indikativ.cells[person][col].form. The corpus prints those
   *  yes/no values by hand across 5 tables × 6 persons = 30 cells, so deriving
   *  them is a free consistency check on two paradigms at once — the source's
   *  own printed values become an assertion target rather than data. Requires
   *  `verb.*.praesens.indikativ` to resolve first; a missing counterpart is a
   *  `depends-on` build failure. */
  derivedCols?: Record<string, { from: [ParadigmId, ParadigmId]; formula: string }>
  notes?: Record<string, string>   // genuine prose notes under a table
  topicId: TopicId; verification: Verification
}

export type DrillItem = {
  id: string; n: number
  prompt: string               // "Ich ___ (sein) Student."
  expected: string[]           // the key's " / " alternatives all land here
  english: string | null       // the key's literal gloss — doubles as an EN→DE prompt
  rationale: string | null     // the trailing "— *ein → kein*"
  chunks?: string[]            // wordOrder drills arrive pre-chunked from the source
}

/** An ungrammatical form the corpus explicitly strikes out. 64 of them, and the
 *  best distractors in the project because a human chose them as the mistakes
 *  learners actually make. ONLY the judgement generator may render these. */
export type WrongForm = {
  id: string; form: string; scope: 'form' | 'sentence'
  correct: string | null; lexemeId: LexemeId | null
  topicId: TopicId; context: string
}

/** A correction to a corpus we do not own. Quotes and hashes its source, so a
 *  re-extraction that changes that text hard-fails rather than silently
 *  un-fixing the app. */
export type Erratum = {
  id: ErratumId; kind: 'factual'|'notation'|'classification'|'typo'
  severity: 'error' | 'silent'          // 'error' renders a visible callout
  source: { file: string; line: number; quote: string; sha256: string }
  note: string
  target: { kind: 'lexeme'; id: LexemeId; patch: Partial<VocabEntry> }
        | { kind: 'topic';  id: TopicId; find: string; replace: string }
        | { kind: 'paradigm'; id: ParadigmId; patch: Partial<Paradigm> }
}

/** Eager — nav, headers, search, everything the shell renders. ≈90 KB. */
export type ContentIndex = {
  lessons: Lesson[]; topics: Record<TopicId, Topic>
  points: Record<PointId, GrammarPoint>; errata: Record<ErratumId, Erratum>
  stats: { lexemes: number; sentences: number; drillItems: number
           byVerification: Record<Verification, number>
           unknownPlural: number; unknownPos: number; conflicts: number }
}

/** Lazy. This is where the model diverges hardest from the sibling, whose whole
 *  eager index is 38 KB. Ours would be ~1.6 MB, which has no business in the
 *  entry chunk, so each is reached by a memoised dynamic import in a route loader. */
export type VocabBundle    = { entries: VocabEntry[] }        // ~900 KB
export type SentenceBundle = { sentences: Sentence[] }        // ~620 KB
export type DrillBundle    = { drills: Drill[]; wrongForms: WrongForm[] }  // ~250 KB
export type ParadigmBundle = { paradigms: Paradigm[] }        //  ~60 KB
export type AppliedBundle  = { readings: ReadingText[]; prompts: WritingPrompt[] }
```

### On-disk layout

```
content/
  taxonomy.json                  authored: 110 raw section titles → 26 Theme slugs
  grammar/points.json            authored: ~124 GrammarPoints
  lessons/03-praeteritum-and-reflexives/
    lesson.json                  metadata + topicOrder (single source of order)
    index.md                     2–3 sentence intro, hand-written
    topics/01-praeteritum.md … 07-practice.md
  extracted/                     MACHINE-WRITTEN — never hand-edit; committed
    .upstream.json               per-file sha256 + line count + timestamp
    occurrences.jsonl   3,323    sentences.jsonl  2,973     drills.jsonl  89
    paradigms.json        ~41    wrong-forms.json     64    readings.json  9
  overrides/                     HAND-WRITTEN — machine never touches
    errata.json  (6)   lexemes.json  (44 plurals + POS fixes)   sentences.json
scripts/
  extract-corpus.ts   ~700    extract.config.ts   ~220 declarative
  build-content.ts    ~380
src/content/
  types.ts   loader.ts   generated/  (gitignored: index.ts eager + 5 lazy bundles)
```

### Build validation — 15 hard failures, 7 warnings

One principle governs the split: **hard-fail on anything structural or referential a build can prove wrong; warn on anything about corpus quality a human must judge.** A build that is always red enforces nothing.

**Hard (exit 1):** `topicOrder` matches disk exactly, both directions · topic `id` matches its path · every `/grammar#id` and `/vocabulary#id` link resolves, checked **with the same parser the app renders with** so the check cannot drift · each `GrammarPoint` claimed by exactly one topic, which agrees · full referential integrity across extracted data · **every keyed drill has `items.length === answerKeyItems.length`** — the only thing standing between 678 items and silent off-by-one drift in the exercise↔key pairing · **erratum liveness** (every `find` matches exactly once, every source hash still matches) · **no "week"** — `/\bWeek\b/` in no body, `/\bweeks?\b/i` in no title or label, the case distinction deliberate because the corpus legitimately teaches `die Woche` and `am Wochenende` · notation coherence (article and gender tag agree; every `suffix` plural starts with its lemma) · NFC + no mojibake · **every `<ParadigmTable>` reference resolves** — the `id` names a real paradigm and every row named in `rows` exists in it, so a prose topic can never render an empty or half-missing grid; note this *replaces* an earlier invariant requiring each paradigm cell to appear verbatim in its topic's body, which the assembly manifest makes both impossible and unnecessary — the body now names a slice instead of restating it, so there is no second copy left to drift · practice viability (no empty drill; tokens rejoin to the source text exactly) · **an unregistered table shape inside a vocabulary section**, promoted from warning to hard failure — the reader registry is keyed by **exact header signature** and covers 19 shapes inside vocabulary sections plus ~30 more for paradigm grids, and an unregistered signature is the exact mechanism that fabricates data — the false-friend table's `der See | sea | lake` row, read positionally instead of by column, is exactly this failure mode (see `### Routes`) — so guessing is strictly worse than stopping · **assembly-manifest cell disagreement** — when two source tables declared in `assembly.json` as `assembleFrom` for the same paradigm supply the same cell, they must agree, or the build fails naming both `file:line` · **an override with no erratum** — a field-changing entry in `overrides/lexemes.json` must have a corresponding `errata.json` entry, because you may not silently disagree with the source; the one exception is filling a value the source never stated, which is not a disagreement — the 44 unknown plurals go in as `authored` with no erratum, and the build accepts an override over a `missing` value without one.

**Warn (grouped by lesson, surfaced on `/status`):** `pos: null` (<30 expected) · merge conflict (**this is the queue that produced the sixth erratum**) · `plural.kind: 'unknown'` (44, printed in full because the list is short enough to act on) · full-form plural sharing <3 chars with its lemma · dangling upstream ToC anchor · unmapped `Week N` residual · a hand-edited file under `extracted/` that will be clobbered.

```
✔ content: 12 lessons · 93 topics (17 authored) · 2,560 words · 2,973 sentences · 678 drill items · 124 grammar points
⚠ 44 unknown plurals · 23 unknown POS · 11 merge conflicts — see /status
```

---

## Practice — the exercise menu

The sibling shipped exactly one format and was right to: a glossary term is a definition, and there is nothing else to do with it. That argument does not survive contact with German. `der Vater → die Väter`, `Ich stehe um sieben auf`, `des Studenten` and `Wegen des schlechten Wetters` are four different *kinds* of knowledge and a flip-card drills none of them. The corpus already knows this — it ships 678 exercises in seven shapes.

### The idea that makes a long menu affordable

Twenty-six exercise *kinds* would be twenty-six renderers and twenty-six keyboard maps, which is how projects like this collapse. They are not. There are **six response shapes**, and a kind is *(a generator, a payload, a shape)*:

| Shape | Learner input | Kinds using it |
|---|---|---|
| `reveal` | none | Vocab Reveal, Reading |
| `choice` | one of 2–4 | Gender, Meaning MCQ, False Friend, Idiom, Register, Confusable, Case Label, Judgement, Listen & Choose, Umlaut Ear, Prep+Case |
| `typed` | one string | Typed Recall, Plural, Conjugation Cell, Dictation, Translation, Transformation |
| `slots` | n strings | Cloze, Ending Fill, Partizip Pair |
| `order` | token sequence | Sentence Builder, Insert-the-Word |
| `pair` | bipartite matching | Match Grid |

Six components, six keyboard maps, one dispatcher. Adding a kind is a generator function plus a payload variant — never a UI change. **This is the one architectural decision here I would not compromise on.**

### The full menu

Risk: **safe** = the key is a table lookup the parser cannot misread · **guarded** = generatable behind an explicit exclusion filter · **authored** = a generator will silently emit wrong answers, so use the 678-item bank only.

| # | Type | Shape | Example | Cost | Risk | Tier |
|---|---|---|---|---|---|---|
| 1 | **Vocab Reveal** | reveal | `der Lebenslauf` ⇄ *CV, résumé* | S | safe | **1** |
| 2 | **Typed Recall EN→DE** | typed | *the job interview* → `das Vorstellungsgespräch` | S | guarded | **1** |
| 3 | **Gender Snap** | choice | `___ Vorstellungsgespräch` → **das** | S | safe | **1** |
| 4 | **Plural Forge** | typed | `die Maus` → `die Mäuse` | S | guarded | 2 |
| 5 | **Meaning MCQ DE→EN** | choice | `der Betrieb` → *firm* / employer / profession / task | S | safe | **1** |
| 6 | **Match Grid** | pair | 6 Technology words ↔ 6 glosses | M | safe | 2 |
| 7 | **False-Friend Trap** | choice | `Das **Gift** ist tödlich.` → *gift* / **poison** | S | safe | 2 |
| 8 | **Idiom Meaning** | choice | `die Entscheidung auf die lange Bank schieben` → literal / **figurative** | S | safe | 2 |
| 9 | **Register Discrimination** | choice | `benötigen` vs `brauchen` — which is formal? | S | guarded | 3 |
| 10 | **Confusable Pair** | choice | `Wir schwimmen im ___.` → **See** / Meer | S | guarded | 2 |
| 11 | **Conjugation Cell** | typed | `nehmen — du, present` → `nimmst` | S | safe¹ | **1** |
| 12 | **Partizip Pair** | slots | `bleiben` → `geblieben` + **sein** | S | safe | **1** |
| 13 | **Ending Fill** | slots | `Wegen d__ schlecht__ Wetter__` → `es`/`en`/`s` | M | **authored** | **1** |
| 14 | **Preposition + Case** | choice | `warten ___ (den Bus)` → `auf` + Akkusativ | S | safe | 2 |
| 15 | **Case Labelling** | choice | `Der Mann sieht **das Kind**.` → Akkusativ | S | authored | 2 |
| 16 | **Umlaut Ear** | choice | 🔊 → `Mutter` / **`Mütter`** | S | voice-dep. | 3 |
| 17 | **Sentence Builder** | order | `[auf] [Ich] [um sieben Uhr] [stehe]` → `Ich stehe um sieben Uhr auf.` | M | guarded | **1** |
| 18 | **Cloze / Gap-Fill** | slots | `Ich ___ (sein) Student.` → `bin` | S | authored² | **1** |
| 19 | **Transformation** | typed | `Er spielt Fußball.` → `Spielt er Fußball?` | S | **authored** | 2 |
| 20 | **EN→DE Translation** | typed | *The child has no dog.* → `Das Kind hat keinen Hund.` | S | **authored** | 2 |
| 21 | **Grammaticality Judgement** | choice | `Er hat kommen gekonnt.` → **wrong** | S | safe | **1**ᵃ |
| 22 | **Insert-the-Word** | order | insert `auf`: `Ich ① stehe ② um sieben Uhr ③.` → ③ | S | risky³ | 3 |
| 23 | **Listen & Choose** | choice | 🔊 *"Der Akku ist leer."* → which word did you hear? | S | voice-dep. | 2 |
| 24 | **Dictation** | typed | 🔊 → type `Die Besprechung dauert eine Stunde.` | M | voice-dep. | 2 |
| 25 | **Reading Comprehension** | reveal | 300-word text + German questions, reveal-only | S | safe | 3 |
| 26 | **Writing Prompt** | *page, not a deck item* | prompt + required-construction checklist | XS | safe | 3 |

¹ Safe **only** for the verbs the corpus tabulates. Never apply the weak pattern to an arbitrary lemma — the corpus itself scatters stem changes through the vocabulary (`abfahren (fährt ab)`).
² A *vocabulary* cloze (blank the word out of its own example sentence) is safely generatable; anything grammatical is authored-only.
³ `nicht` placement is gradient — several positions are grammatical with different scope, so a generator marks correct German wrong. The separable-prefix variant *is* deterministic and safe.
ᵃ Tier 1 on merit; scheduled immediately after the first seven.

### Recommended shipping set

**Vocab Reveal → Gender Snap → Meaning MCQ → Typed Recall → Conjugation Cell → Cloze (authored) → Sentence Builder**, plus TTS speaker buttons everywhere (a capability, not a type), then **Grammaticality Judgement** — 64 items of authored gold otherwise sitting on the floor.

Seven types, four of the six shapes, all three linguistic levels, zero authored-key risk. Ordering rationale: Gender Snap has the highest drills-per-minute in the app and ~1,400 available items; Meaning MCQ proves the theme-scoped distractor machinery four later types reuse; Typed Recall forces the whole grading pipeline into existence; authored Cloze proves the exercise bank is genuinely extractable and index-matched — and if *that* is hard, it is worth discovering in week one.

### Distractors are the difference between a good drill and a free point

Generated in priority order, never by random lexicon draw:

1. **Explicit authored relations** — false friends, register pairs, `ver-`/`be-` prefix families (`kaufen`/`verkaufen`, `sprechen`/`versprechen`), synonym groups.
2. **Same theme *and* same part of speech** — all four options from *Workplace & Professions*, so the learner must know the word rather than the category.
3. **Adjacent cells of the same paradigm table** — for conjugation and declension drills, adjacent cells are precisely what learners confuse, so this is both free and pedagogically ideal.

**`confusableWith` is derived, not authored** — the corpus never names a confusable pair but structurally contains five sources, ranked by pedagogical quality: (1) the false-friend table (`bekommen ↔ werden`, `See ↔ Meer`), (2) register pairs (`benötigen ↔ brauchen`), (3) prefix families from the word-formation sections (`kaufen ↔ verkaufen`, `sprechen ↔ versprechen`, `tragen ↔ vertragen`), (4) synonym groups (`sagen: behaupten / meinen / betonen`), and (5) same theme + same POS + same CEFR as the fallback. Sources 1–4 are tagged `quality: 'authored'`, source 5 `'thematic'`. Generators prefer authored and only fall back — and the **two-option Confusable Discrimination type accepts `'authored'` only**, because a binary choice between two unrelated words is not a question.

A food noun among three verbs is a free point. Relations inferred by similarity (same theme + low edit distance) are **distractor-only** and must never drive the Confusable Pair type — `Maus` vs `Haus` teaches nothing.

### Types that look attractive and are traps

- **Generated adjective-ending / declension cloze.** Needs article class × gender × case × position simultaneously; one parser error yields a silently wrong key the learner cannot detect. Authored only, permanently.
- **Generated EN→DE translation.** Rejects correct German: `Heute lerne ich Deutsch` / `Ich lerne heute Deutsch`, `am Montag` / `montags`. The 678 authored items are safe precisely because one person wrote both prompt and key.
- **A 4-way MCQ built from the 64 struck-out forms.** Three unlabelled ungrammatical options per screen is teaching by exposure to error. Binary judgement — where the wrong form is labelled and corrected in the same second — is the only defensible use. **Architectural rule: `WrongForm` may only be rendered by the `judgement` generator.**
- **Reverse idiom production.** No compositional route from *"to keep one's fingers crossed"* to `die Daumen drücken`. Recognition only.
- **Plural drill without the `none`/`unknown` filter.** Asks for the plural of `die Milch`.

**And one trap that is not about generation at all: treating the 678 authored items as uniformly safe.** They are safe as *keys* but not as complete *answer sets*. `Heute lerne ich Deutsch.` is the key for the tokens `heute / lerne / ich / Deutsch`, and `Ich lerne heute Deutsch.` is also correct German that the key does not list. What saves it is the section's instruction — *"items 5–8 must place the time/frequency word first"* — but only if that instruction reaches the card. **Rule: no authored item ships without its section rubric attached verbatim, never summarised.** Plus a **manual review pass over the ~150 transformation and ~90 translation items** to widen `answers` where a second form is right. That pass is roughly a day, it eliminates the type's entire risk, and it must happen before anyone relies on a typed verdict.

### Generator architecture

Items are **generated in memory at session build**, for a reason stronger than symmetry with the sibling: distractors must be scope-aware. A Meaning MCQ inside a deck filtered to *Technology* must draw its distractors from *Technology* — precompute and they freeze against the whole lexicon, and the type gets worse. Direction is also chosen per lexeme per session, and ~2,560 lexemes × ~8 applicable kinds ≈ 20k items is a large eager chunk to ship to avoid a few milliseconds of `Array.map`.

The **678 authored exercises are precomputed at build** (parsing at runtime means shipping the parser and the raw markdown) and are **first-class members of the same union** via `origin: 'authored'` — not a separate system. The builder reads *"20 items · 14 generated · 6 from the book"*.

Assembly is three short passes: **claim** (round-robin across kind pools; an item is admitted only if none of its `sourceIds` is already claimed — generalising the sibling's one-card-per-term rule to arbitrary entities), **cap** (no kind exceeds 30% of a deck, or Gender Snap eats every noun deck), and **spread** (one linear pass swapping forward any item that would be the third consecutive of its kind — fifteen lines, and the cheapest quality win in the engine).

**Round-robin rather than concatenate-then-shuffle** is load-bearing here in a way it was not for the sibling, whose pools were all the same size. With ~2,560 lemmas in the vocabulary pool and 64 items in the error-spot pool, a plain shuffle over the union gives a 20-item deck roughly a one-in-two chance of containing **zero** error-spots — the highest-value items in the project, statistically invisible. Round-robin guarantees the small, high-value pools are represented.

### Filters, and the card-type question

The sibling deliberately shipped **no** card-type filter — its four variant names were jargon and two applied to a handful of terms. That reasoning does not transfer, because here the kinds differ by **modality**: someone on a train without headphones genuinely cannot do Dictation, and someone with five minutes wants only Gender Snap. But 26 checkboxes is exactly the failure the sibling was avoiding. The answer is a five-way **`mode`** chip, not per-kind controls.

```ts
export type DeckFilters = {
  lesson?: LessonId; topic?: TopicSlug; theme?: Theme; point?: PointId
  pos?: Pos; level?: Level; lexeme?: LexemeId   // 'practice this word'
  mode?: 'mixed' | 'vocab' | 'grammar' | 'production' | 'listening'   // default mixed
  unverified?: boolean     // default false
  audio?: 'off'            // set automatically when no de-* voice exists
  size?: 10 | 20 | 40 | 0  // 0 = everything; default 20
}
```

`size` is new relative to the sibling and earns it: a "Practice this topic" link that opens a 340-item deck is a link nobody clicks. Every chip writes a search param, so any deck is a bookmarkable URL — which also means every bug report is a link.

### Verified vs unverified — two levels, not one

"Unverified content is not drillable" is too blunt, because extraction risk is not uniform. Reading `| die Maus (Mäuse) | mouse |` is a table lookup; reading the case that governs a genitive blank is an interpretation. So: `verification` on every **entity**, `riskyWhenUnverified` on every **generator**.

- **Not risky** — reveal, typed-recall, gender, plural, meaning-mc, match, false-friend, idiom, register, partizip, listen-choose, dictation, judgement (struck-out forms carry their correction in the same sentence, so extraction is a paired match).
- **Risky** — ending-fill, case-label, prep-case, cloze, transform, translate, builder, confusable.

Default: unverified entities allowed for non-risky generators, blocked for risky ones; one chip flips it, reading *"+18 items from unverified lessons"*. Mid-session, every unverified item carries a small pill beside its source link. **Do not hide provenance from the person being graded** — if the learner thinks the app is wrong, the pill and the link let them check, and the app stays trustworthy. Hiding it is how a tool loses the benefit of the doubt permanently.

---

## Grading typed German

Four normalisation layers, applied identically to the learner's string and to every accepted answer. **The layer at which equality first holds is the grade** — grading is not boolean.

```
L0  raw
L1  NFC · trim · collapse whitespace · strip zero-width
L2  punctuation: strip trailing . ! ? ; normalise ’→' “”→" ; strip wrapping quotes
L3  umlaut fold: ä→ae  ö→oe  ü→ue  ß→ss   (fold BOTH sides to the ASCII digraph)
L4  case fold
```

**Fold into a comparison key; never transform the learner's input.** Rewriting `ss`→`ß` turns `Wasser` into `Waßer` and `dass` into `daß`; rewriting `ue`→`ü` destroys `Abenteuer` and `Steuer`. Folding both sides is symmetric, needs no combinatorial table, and — critically — still lets the correction screen show the real spelling every time.

| Outcome | Condition | Feedback |
|---|---|---|
| `exact` | L2 equal | ✓ green |
| `umlaut-miss` | L3 equal, L2 not | ⚠ peach — *"Right word. German spells it **Väter**"*, `ä` highlighted |
| `case-miss` | L4 equal, L3 not | ⚠ peach — *"German capitalises every noun: **das Vorstellungsgespräch**"* |
| `article-miss` | L4 equal after dropping a leading article | ⚠ peach — *"You have the noun. Its gender is **das**"* |
| `near` | Damerau–Levenshtein within radius **and** N4 permits | ⚠ peach — character diff |
| `wrong` | otherwise | ✗ red — answer and rule shown; never auto-advances. If the input matches a `WrongForm`, show the corpus's own note about that exact mistake |

**Peach is the load-bearing state.** A binary right/wrong grader on typed German is discouraging and uninformative, and *"you know the word, fix the spelling"* is the most common truthful verdict. Radius: `len ≤ 6 → 1`, `7–12 → 2`, `>12 → 3`; transpositions count as one.

### Where leniency would teach the wrong thing

**N1 — Umlaut folding is disabled when the umlaut *is* the answer.** `strictUmlaut = fold(prompt) === fold(answer) && prompt !== answer`. Covers `Vater → Väter`, `Maus → Mäuse`, `hoch → höher`, `groß → größten`. Without it the plural drill accepts the exact answer it exists to reject, and the app actively teaches that umlauts are optional. **The most important rule in the engine** — computed once per item at generation time, so it costs one comparison.

**N2 — Capitalisation is graded whenever the answer is or contains a noun** — typed recall of nouns, dictation, translation, transformation. Ignored for endings, articles, particles and isolated verb forms (`bin` and `Bin` are the same answer). Graded means `case-miss`, not failure. Dictation is where it matters most, because dictation is where capitalising nouns becomes reflex.

**N3 — The article is part of a noun, and its absence is a diagnosis, not a typo.** Never let it fall through to `near` — *"you knew the word but not its gender"* is exactly the fact worth surfacing.

**N4 — The fuzzy radius must be smaller than the distance to the nearest paradigm sibling.** Kills fuzzy matching precisely where it is dangerous: `keine`/`keinen`/`keinem`/`keiner`, `dem`/`den`/`des`/`der`, `nimmst`/`nimmt`, `dass`/`das`, `wenn`/`wann`/`denn`. Checkable at build time — if two accepted answers in one bank sit within the radius, flag the bank.

**N5 — Word order is never fuzzy.** Token-sequence equality only; a transposition is the error under test. One softening, in Translation alone: if the token *multiset* matches but the order does not, grade `almost` with *"All the right words — check the order"*.

**N6 — Never-fuzzy blocklist**, seeded from the false-friend table: `Rat`/`Rad`, `See`/`Sehe`, `Note`/`Not`.

### Typing German on an English keyboard

Both mechanisms, because neither alone suffices: **`ue`/`oe`/`ae`/`ss` are accepted** (which is why `umlaut-miss` is peach, not red), **and** `Alt`+`a`/`o`/`u`/`s` insert `ä ö ü ß` with a clickable `[ä] [ö] [ü] [ß]` row under every field. Acceptance-only means the learner never types a real umlaut; insertion-only means they never find the shortcut. The same normaliser powers search, so typing `uber` finds `über`.

---

## TTS

`src/lib/tts.ts`, ~120 lines, no dependency. Voice resolution: `de-DE` exact → any `de-*` → `lang.startsWith('de')` → **none**.

**If no German voice exists, do not speak German with an English voice.** An en-US engine reading `Ich möchte` teaches a wrong phoneme mapping. Instead: `audioAvailable()` is false for the session, every audio-requiring kind is dropped from every mode, speaker buttons are *hidden* rather than disabled (a disabled button invites clicking), and one dismissible line appears in the deck builder. Linux Chromium without `speech-dispatcher` and stock Android without the German pack both land here, so this is not hypothetical.

Five real failure modes, each with a specific handling: `getVoices()` returns `[]` on first call in Chrome — subscribe to `voiceschanged` *and* poll once at 250 ms, because that event never fires in some Firefox builds where voices were already present · iOS requires a user gesture for the first utterance — never autoplay the first item · Chrome truncates past ~15 s — queue reading texts per sentence · synthesis wedges after tab backgrounding — call `cancel()` before every `speak()`, unconditionally · `onboundary` is unreliable in Firefox — highlight per sentence via `onend`, not per word. Set `utterance.lang` as well as `utterance.voice`; some engines honour `lang` over `voice`.

Rate: three settings, no slider — Slow 0.75 / Normal 0.9 / Native 1.0, stepped with `[` and `]`, persisted like the theme. A device setting, not a study record.

---

## Application structure

### Routes

```
/                                    Lesson list
/lessons/$lessonSlug                 Lesson overview + topic list
/lessons/$lessonSlug/$topicSlug      Topic page (render: prose | vocabulary | practice | applied)
/vocabulary                          Browser, scoped by search params
/vocabulary/$wordSlug                Word detail
/grammar                             ~124 grammar points, A–Z, definitions inline
/reference                           ~41 paradigm & declension tables
/practice                            Deck builder
/practice/session                    Session (full-bleed)
/status                              Extraction health — counts, unknowns, conflicts
```

`/vocabulary`, `/grammar` and `/practice` are **single pages scoped by search params** — the sibling's rule, unchanged. A lesson footer links to `/practice?lesson=05`; a topic footer to `/practice?topic=separable-prefix-verbs`. There is no `/lessons/$id/vocabulary`, because it would be the same component with a hardcoded filter.

**`/reference` earns its place** and should be built **early**, because it is the cheapest possible validation of the extraction: if the four-case article grid and the three adjective-ending tables render correctly, the generators have good input.

**`/reference` is one long anchored page**, not an index plus a dozen sub-pages. The use case decides it: this page is opened *mid-sentence, while writing German*, to check one cell. One page means `⌘F` searches every table at once, means moving from the article grid to the adjective-ending table is a scroll rather than a navigation, and means `/reference#adj-weak` still lands you somewhere you can look around. The payload is a dozen small tables — a few KB of JSON, not lesson prose — so the lazy-body argument does not apply. The one concession to size: long lists (30 strong-verb participles, 20 Präteritum forms) render their 10 most common rows behind a `Show all 30` toggle, the same pattern the sibling uses for `Show all N terms`.

Each table carries a **`[ Drill this table → ]`** link to `/practice?point=adjective-endings-weak&mode=grammar`. The reference page and the drill are the same data one click apart, which is what makes the page **self-verifying**: if a table renders wrong you can see it, and if it renders right the generator's input is right.

#### Progressive revelation — one table, taught in slices

The corpus teaches the article grid across three lessons (Nom/Akk in 1, Dat in 2, Gen in 4), and says so explicitly about the adjective tables: *"Week 3 introduced weak, mixed, and strong adjective endings across Nominative, Accusative, and Dative — deliberately leaving out the genitive row until the case itself was taught."* That is **one table progressively revealed**. Modelling it as three tables triples the data and loses the relationship.

So `Paradigm` carries `rowIntroducedIn: Record<RowId, LessonId>`, and `<ParadigmTable>` takes an optional `asOf: LessonId`. Rows introduced later render **dimmed, not hidden**, with a footnote link — *"Dativ comes in Lesson 2 →"*. Dimmed rather than hidden for a specific reason: hiding makes the learner believe the table is complete, which is a worse lie than showing a row they have not earned. Dimming says "this exists, it is coming, do not try to use it yet", which is the truth.

**This is not progress tracking.** `asOf` is the lesson whose page you are currently reading — a fact about the *document*, not about the learner — computed from route params, in the same spirit as the sibling's `resolveRevisits`, which derives back/forward direction from ordering and never asks the author. On `/reference` there is no `asOf`, so every table is complete. Nothing is stored and reloading changes nothing.

**Slug collisions stay a tripwire even though this corpus has none of the pairs first suspected.** `der See`/`die See`, `das Gericht` (court vs. dish) and `der Band`/`das Band` all checked out false: `die See` never appears (only `der See`), `der Band` and `das Band` never appear at all, and `das Gericht` means "court" in all three of its occurrences (lessons 4, 7, 10) — no dish sense to collide with. The only genuine same-form pairs are four masculine/feminine professions (`der/die Zuschauer`, `Bekannte`, `Vorgesetzte`, `Studierende`), and those have different surface forms and therefore different slugs — no collision, just the existing `feminine-of` relation. The tripwire stays anyway, because a silent merge of two words onto one page is the worst bug this app can have and per-word routes make it possible — but the real hazard is different and worse: **column-shape mis-parsing fabricates homographs that were never there.** The concrete case is the false-friend table's `der See | sea | lake` row — `sea` sits in the *Looks Like* column, not the gloss column; read positionally as a gloss, the extractor mints a second sense for a word that has exactly one. Resolution policy: **no automatic `-2` suffix.** A residual collision is a hard failure naming both `file:line`, resolved by a hand-chosen semantic slug in `overrides/lexemes.json` (`see-der`, `gericht-recht`). Auto-suffixing is forbidden because the numbering depends on file iteration order — a re-extraction could swap which word is `-2` and silently repoint every bookmark, cross-link and override at the wrong page. `LexemeId` is `slugify(headword)` — which includes the article, resolving the gender-homograph cases — and the merge key includes `pos` so a noun and a verb never fuse.

### Wireframes

**Lesson list — `/`**

```
┌────────────────────┬──────────────────────────────────────────────────────────────┐
│ Deutsch         /  │  Lessons                                           ☾         │
│                    │                                                              │
│ ▸ 1 Foundations    │   1   Foundations & Core Grammar              A1       →     │
│ ▸ 2 Dative, Modals │       10 topics · 150 words                verified          │
│ ▸ 3 Präteritum     │                                                              │
│ ▸ 4 Genitive       │   2   Dative, Modals, Perfekt & Prepositions  A1       →     │
│ ▸ 5 Separable Verbs│       9 topics · 150 words                 verified          │
│ ▸ 6 Futur & zu+Inf │                                                              │
│ ▸ 7 Passive & K II │   3   Präteritum, Reflexives & Adjective      A2       →     │
│ ▸ 8 Double Inf.    │       Declension                                             │
│ ▸ 9 Konjunktiv I   │       7 topics · 200 words                 unverified        │
│ ▸ 10 Zustandspassiv│                                                              │
│ ▸ 11 Nominalstil   │   4   Genitive, Comparative & N-Declension    A2       →     │
│ ▸ 12 Integration   │       5 topics · 200 words                 unverified        │
│                    │                                                              │
│   Vocabulary       │  ──────────────────────────────────────────────────────      │
│   Grammar          │  2,560 words · 93 topics · A1 → B2                           │
│   Reference        │  Lessons 1–2 are hand-checked. Lessons 3–12 are extracted     │
│   Practice         │  from the source notes and marked unverified.                 │
└────────────────────┴──────────────────────────────────────────────────────────────┘
```

A list, not a grid — twelve lessons is a table of contents, not a gallery. The verified/unverified distinction is a quiet badge with one footnote, not an apology on every row.

**Topic page — `/lessons/05-separable-verbs/01-separable-prefix-verbs`**

```
┌───────────────────┬──────────────────────────────────────────┬───────────────────┐
│ Deutsch        /  │ Lesson 5 › Separable Prefix Verbs      ☾ │ ON THIS PAGE      │
│                   │                                          │ ─────────────     │
│ ▾ 5 Separable     │ Separable Prefix Verbs             A2    │ What is one?      │
│   ● Separable     │ Topic 1 of 9 · unverified                │ The prefixes      │
│     Inseparable   │ ────────────────────────────────────     │ In Präsens        │
│     Imperative    │                                          │ In Perfekt        │
│     Indirect Qs   │ A separable verb has a prefix that can   │ Subordinate       │
│     Conjunctions  │ separate from the stem. In a main clause │ 20 high-frequency │
│     Vocabulary    │ the prefix jumps to the very end.        │                   │
│     Applied Skills│                                          │                   │
│     Practice      │   Ich stehe um sieben Uhr auf.  🔊       │                   │
│                   │   └ get up at seven o'clock              │                   │
│ ▸ 6 Futur & zu    │                                          │                   │
│                   │ ## In Perfekt: ge- Between Prefix & Stem │                   │
│   Vocabulary      │                                          │                   │
│   Grammar         │   aufstehen → aufgestanden               │                   │
│   Reference       │   ✗ geaufstanden                         │                   │
│   Practice        │     └ struck, red — never write this     │                   │
│                   │                                          │                   │
│                   │  ┌──────────────────────────────────┐    │                   │
│                   │  │ Infinitive │ Partizip II  │ Aux  │    │                   │
│                   │  │ aufstehen  │ aufgestanden │ sein │ 🔊 │                   │
│                   │  │ anfangen   │ angefangen   │ haben│ 🔊 │                   │
│                   │  └──────────────────────────────────┘    │                   │
│                   │ ──────────────────────────────────────   │                   │
│                   │      Practice this topic · 24 items →    │                   │
│                   │ ← (first topic)      Inseparable Verbs → │                   │
└───────────────────┴──────────────────────────────────────────┴───────────────────┘
```

`~~strikethrough~~` renders as a red struck span with a `✗` — not hidden, since the corpus authored it as a teaching device, but marked so it can never be mistaken for a model. One line added to the `components` map in `markdown-body.tsx`.

**Vocabulary browser — `/vocabulary?lesson=05&theme=work-and-career`**

```
┌────────────────────┬──────────────────────────────────────────────────────────────┐
│ Deutsch         /  │  Vocabulary                                        ☾         │
│                    │  [ filter words…                                     ]       │
│ ▾ 5 Separable      │                                                              │
│     Separable      │  Lesson  ( All ) ( 1 ) ( 2 ) ( 3 ) ( 4 ) (• 5 ) ( 6 ) …      │
│     Inseparable    │  Theme   ( All ) (• Work & Career ) ( Technology ) …         │
│     …              │  Part    ( All ) ( Nouns ) ( Verbs ) ( Adjectives )          │
│                    │  Gender  ( All ) ( der ) ( die ) ( das )                     │
│   Vocabulary       │  ──────────────────────────────────────  Sort: Theme ▾       │
│   Grammar          │  30 words · Lesson 5 · Work & Career         unverified       │
│   Reference        │                                                              │
│   Practice         │  der  Arbeitgeber      die Arbeitgeber      employer     🔊  │
│                    │       Der Arbeitgeber zahlt das Gehalt.                      │
│                    │       ──────────────────────────────────────────────         │
│                    │  die  Bewerbung        die Bewerbungen      job application  │
│                    │       Ich schreibe eine Bewerbung.                       🔊  │
│                    │       ──────────────────────────────────────────────         │
│                    │  das  Gehalt           die Gehälter         salary (monthly) │
│                    │       Das Gehalt ist gut.                                🔊  │
│                    │       ──────────────────────────────────────────────         │
│                    │  der  Kopf             —                    head         🔊  │
│                    │       └ plural not given in the source                       │
│                    │                                                              │
│                    │  ──────────────────────────────────────────────────────      │
│                    │       Practice these 30 words  →                             │
└────────────────────┴──────────────────────────────────────────────────────────────┘
```

The article sits in its **own gender-coloured column** and the plural in another — the two facts a German noun carries, never buried in parentheses, and a gender cue present every time the word is read. Rows are virtualised (~2,560 entries is 65× the sibling's glossary) and grouped by theme by default, with A–Z as a sort toggle: alphabetical order across 2,560 words is a dictionary, and the text filter is the lookup path.

**Word detail — `/vocabulary/nehmen`**

```
┌────────────────────┬───────────────────────────────────────────────────────┐
│ Deutsch         /  │ Vocabulary › nehmen                                   │
│                    │                                                       │
│   Vocabulary       │ nehmen  🔊              strong · verb · A1            │
│   Grammar          │ to take                                               │
│   Reference        │ ────────────────────────────────────────────────      │
│   Practice         │ Präsens      ich nehme · du nimmst (e→i) · er nimmt   │
│                    │              wir nehmen · ihr nehmt · sie nehmen      │
│                    │ Präteritum   nahm                                     │
│                    │ Perfekt      hat genommen                             │
│                    │                              Full table in Reference →│
│                    │                                                       │
│                    │ Examples                                              │
│                    │  Sie nimmt ihre Jacke mit.                        🔊  │
│                    │  Ich nehme den Bus.                               🔊  │
│                    │                                                       │
│                    │ Introduced in Lesson 1 · also in Lessons 3, 5         │
│                    │ See also      mitnehmen (separable)                   │
│                    │                                                       │
│                    │      Practice this word · 6 items →                   │
└────────────────────┴───────────────────────────────────────────────────────┘
```

The hover-card in prose becomes a **preview** of this page rather than the whole story. "Practice this word" is a legitimate single-lexeme deck here — unlike the sibling, where one term yielded one card, one lexeme yields gender, plural, conjugation, cloze, both translation directions and listening.

**Mid-session — `typed`, after grading**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Exit                Lesson 5 · Production · ♪ 0.9              7 / 20      │
├──────────────────────────────────────────────────────────────────────────────┤
│                       the job interview                                      │
│                    ────────────────────────                                  │
│           ⚠  Almost — German spells it with an umlaut                        │
│                                                                              │
│              you wrote   das Vorstellungsgespr a ch                          │
│              answer      das Vorstellungsgespr ä ch          🔊              │
│                                                                              │
│              Das Vorstellungsgespräch war gut.               🔊              │
│                                                                              │
│                Lesson 5 · Work & Career  →             unverified            │
├──────────────────────────────────────────────────────────────────────────────┤
│         [ Again later ⟨A⟩ ]              [ Next ⟨Enter⟩ ]                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Mid-session — `order`, Sentence Builder**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Exit                Lesson 5 · Production · ♪ 0.9             11 / 20      │
├──────────────────────────────────────────────────────────────────────────────┤
│      Build the sentence. Start with the time expression.                     │
│                                                                              │
│      ┌────────────────────────────────────────────────────────────┐          │
│      │  Um sieben Uhr   stehe   ich   ▏                           │          │
│      └────────────────────────────────────────────────────────────┘          │
│                                                                              │
│           ① auf      ② ich ✓    ③ stehe ✓   ④ Um sieben Uhr ✓                │
│                                                                              │
│      ── ①–④ place · Backspace undo · Enter check ──                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Mid-session — `choice`, Grammaticality Judgement, after answering**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              ✓  Wrong — and here is why                                      │
│                                                                              │
│                 ✗ Er hat kommen gekonnt.                                     │
│                 ✓ Er hat kommen können.                       🔊             │
│                                                                              │
│              When a main verb infinitive is present, the modal               │
│              appears as an infinitive too, not as a participle.              │
│              gekonnt survives only with no second verb:                      │
│              Er hat es gekonnt.                                              │
│                                                                              │
│                Lesson 8 · Double Infinitive  →       unverified              │
├──────────────────────────────────────────────────────────────────────────────┤
│         [ Again later ⟨A⟩ ]              [ Next ⟨Enter⟩ ]                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Session complete**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Exit                      Session complete                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  20 items · 18 words · Lesson 5 · Production                                 │
│  14 exact · 4 almost · 2 to review                                           │
│  ──────────────────────────────────────────────────────────────────────      │
│  TO REVIEW                                                                   │
│  das  Vorstellungsgespräch   die …gespräche   job interview              🔊  │
│  ✗ Er hat kommen gekonnt.  →  ✓ Er hat kommen können.      Lesson 8  →      │
│  ──────────────────────────────────────────────────────────────────────      │
│  EVERYTHING IN THIS DECK                                                     │
│  der  Arbeitgeber   die Arbeitgeber   employer                           🔊  │
│  die  Bewerbung     die Bewerbungen   job application                    🔊  │
│  …                                                                           │
│  ──────────────────────────────────────────────────────────────────────      │
│      [  Practice again  ]     [  Change deck  ]     [  Review only ⟨R⟩  ]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

Three counts, no percentage and no grade — the within-session tally, which dies with the session. **Review only** rebuilds a deck from just the misses; the one concession to scheduling, legitimate because it lives entirely in React state. **Practice again** regenerates rather than reshuffling, so a second pass gets new directions and new distractors — a real improvement over the sibling that falls out of in-memory generation for free.

### Keyboard bindings

The payoff of the six-shape design: one table per shape, not per kind.

**Global** (no text field focused) — `Space`/`Enter`/`→` reveal then advance · `A` again later · `S` speak prompt · `Shift+S` speak answer (no-op before reveal) · `[` `]` speech rate · `G` open source topic · `Esc` exit, no confirm (nothing is lost, which is the point) · `?` bindings overlay · `/` palette.

**`choice`** — `1`–`4` select and grade immediately; `Y`/`N` for binary judgement; `D`/`F`/`S` as der/die/das aliases.
**`typed`** — focus starts in the field, `Enter` grades, `Alt+a/o/u/s` insert umlauts. **On grading, focus leaves the field**, so every global single-letter binding wakes up and the post-answer keyboard is identical across all six shapes.
**`slots`** — `Tab`/`Shift+Tab` between blanks with wrap; `Enter` from any blank grades all; per-blank feedback, because a partially right answer that does not say *which* blank failed teaches nothing.
**`order`** — `1`–`9` place, `Backspace` unplace, `Shift+Backspace` clear, `Enter` grade.
**`pair`** — `1`–`6` picks left, `a`–`f` picks partner; correct pairs lock and grey.

Every binding is printed under the controls — anything else does not get used twice.

### Components

**Reused verbatim:** `theme.css`, `vite.config.ts` (incl. `spaFallback`), `tsconfig.json`, `components.json`, `lib/{utils,theme,sidebar}.ts`, `theme-toggle.tsx`, `filter-chips.tsx` (`ChipRow` — every filter above is one), `ui/{button,badge,card,dialog,sheet,separator,command,table,hover-card}`.

**Adapted:** `markdown-body.tsx` (add `del` → struck red `✗`; speaker column in tables) · `sidebar-nav.tsx` (courses→lessons, lessons→topics, CEFR badge, unverified dot) · `glossary-row.tsx` → `lemma-row.tsx` · `term-link.tsx` → `lemma-link.tsx` + `point-link.tsx` · `search.ts` (fold the query, so `uber` finds `über`) · `command-palette.tsx` (its `isTyping` guard is reused wholesale by the session key handler) · `practice.session.tsx` (shape dispatcher replaces the single card; the `round`/queue/position state machine unchanged).

**New:** `lib/normalise.ts` · `lib/grade.ts` · `lib/tts.ts` · `lib/exercises/{types,assemble,filters}.ts` + `generators/*.ts` (one pure function per kind) · `components/exercise/{reveal,choice,typed,slots,order,pair}.tsx` · `answer-feedback.tsx` · `speak-button.tsx` · `verified-badge.tsx` · `paradigm-table.tsx` · `vocab-table.tsx` · `drill-list.tsx` · `reading-panel.tsx` · `writing-panel.tsx` · `umlaut-keys.tsx` · `key-hint.tsx`.

---

## What statelessness costs

Stated once, honestly, and then not raised again.

**The cost is real, and it is vocabulary retention.** Spaced repetition's one unambiguous win is exactly this problem: 2,560 lemmas is far past what unscheduled review handles. Without scheduling, known words keep resurfacing because a shuffle has no memory, and leeches never get surfaced because nothing counts failures across sessions. A 20-item deck drawn from a 350-word lesson gives each word roughly a 6% chance of appearing — a lottery, not a review schedule.

**What it buys.** No state to migrate or corrupt. No "340 cards due" wall that makes the app unopenable after two weeks away — the failure mode that actually kills SRS apps for real people. Zero storage, zero privacy surface. Every deck is a URL that can be bookmarked, shared and reproduced exactly. And the app holds no opinion about how often you should study, which is the right opinion for a tool that is a reference first.

**What compensates, inside the design rather than as an apology.** Filters are fine-grained enough to *exhaust* a set — a 30-word theme at `size=All` is a complete pass, not a sample. `A` re-queues within a session, the only scheduling that happens during a study block anyway. "Review only" rebuilds from the misses. And the URL is the durable artefact: `/practice/session?theme=work-and-career&mode=production&size=0` is a repeatable drill you can pin to a bookmarks bar.

**The honest boundary.** If retention across months becomes the real goal rather than review and reference, this is the wrong shape of app, and the right move is generating an Anki deck from the same lexicon — which the corpus itself recommends in `week_12.md`. That is a different tool, not a limitation to design around.

---

## Phasing

Each phase leaves something that works.

| # | Work | Gate |
|---|---|---|
| 0 | Scaffold from the sibling: `package.json`, `vite.config.ts` (incl. `spaFallback`), `tsconfig.json`, `components.json`, `theme.css`, `lib/{utils,theme,sidebar}.ts`, the nine `ui/` components, `filter-chips.tsx`, `theme-toggle.tsx` | `pnpm dev` boots an empty shell |
| 1 | `src/content/types.ts` in full. 12 hand-written `lesson.json` + `index.md`. Empty topic dirs. | `tsc --noEmit` clean |
| 2 | `build-content.ts` with the referential invariants only, over hand-written stubs — **proves the sibling's architecture transplants before any parser exists** | one real topic renders |
| 3 | `extract-corpus.ts` stages 1–5: split, classify, rewrite `Week N`, emit 93 topic `.md`. **No data extraction yet** | all 93 topics render; the no-"week" invariant is green |
| 4 | Stages 6–7 + merge/dedup + notation invariants + warnings. Iterate on `extract.config.ts` until the unknown-POS and unknown-shape warnings stop moving | 2,560 lexemes; `/vocabulary` + `/vocabulary/$word` render |
| 5 | **`/reference`** from `paradigms.json` — earliest honest proof the extraction is sound | article grid and the three adjective tables match the source by eye |
| 6 | Stages 8–10: drills, wrong forms + the drill↔key invariant | 678 items visible on practice topic pages |
| 7 | `lib/normalise.ts` + `lib/grade.ts` with N1–N6 — **before any typed exercise exists** | the N1 test below passes |
| 8 | `lib/exercises/*` + the six shape components + `/practice` + `/practice/session`, with the seven shipping kinds | a full session runs end to end |
| 9 | `lib/tts.ts` + speaker buttons, then the listening kinds | German audio, or a clean absence of it |
| 10 | Errata (6) + the 44 plural overrides + erratum-liveness invariant | unknown plurals hit 0; the warning tightens to a hard failure |
| 11 | ~124 `GrammarPoint`s + `/grammar`, lessons 1–2 first. Hand-verify lessons 1–2 topic by topic, promoting `status` | `/status` shows 17 authored |
| 12 | Grammaticality Judgement, then Tier 2 kinds as the content supports them | |

Stage 3 before stage 4 is deliberate: **93 readable topic pages with zero extracted data is already a usable app**, and it de-risks the parser by putting the navigation, the rewriting and the routing under load first.

---

## Verification

- `pnpm dev`, walk every route in both themes at mobile and desktop width.
- **Break the content deliberately** and confirm each failure is caught with a useful message: point a `revisits` entry at a non-existent point; write `[x](/grammar#nope)`; claim one point in two topics; drop a topic from `topicOrder`; leave a literal `Week 5` in a body; edit an erratum's `find` so it no longer matches; hand-edit a file under `content/extracted/`.
- **Grading, the rules most likely to be got wrong** — type `Vater` for a `Väter` key and confirm it grades **wrong**, not "almost" (N1). Type `Vorstellungsgesprach` → `umlaut-miss`. Type `Vorstellungsgespräch` without the article → `article-miss`, not `near`. Type `keinen` for a `keine` key → **wrong**, not near (N4). Type `Wasser` in any drill and confirm nothing rewrites it to `Waßer`.
- **Extraction spot-checks against the source:** `der Roman` merges from `(-e)` in lessons 5/8 and `(Romane)` in 11/12 to one entry with `form: "Romane"` · `die Verhandlung` carries all three glosses · `der Kopf` shows an em-dash plural before the override and `Köpfe` after · `waschen (wäscht)` produces `present3sg`, **not** a plural · `die Daumen drücken` is `pos: 'phrase'`, not a noun · the false-friend table's `der See | sea | lake` row does not mint a second sense — confirm `sea` from the *Looks Like* column never lands in `glosses`.
- Confirm the six errata render **visible** source-note callouts, and that `gehen` is not presented as weak anywhere.
- Spot-check the authored-item review pass: open a word-order item and confirm its **section rubric is on the card verbatim**, then confirm a transformation item with two correct forms accepts both.
- Run a session in a browser with **no German voice installed** and confirm listening kinds vanish rather than speaking German in English.
- Open `/practice?lesson=05&mode=production` directly; confirm filters render pre-selected, the count matches, and widening to `All` grows the deck. Reload mid-session and confirm it starts clean.
- `pnpm build && pnpm preview` — check a deep link like `/lessons/05-separable-verbs/01-separable-prefix-verbs` loads directly (the SPA fallback trap), and inspect the bundle to confirm the five data bundles are lazy chunks rather than in the entry.
- `rm -rf ../enciclopedia` (or just rename it) and confirm `pnpm build` still succeeds — the app must build from a clean clone without the corpus.
