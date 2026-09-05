---
id: "12-integration/01-advanced-word-order"
lessonId: "12-integration"
number: 1
title: "Advanced Word Order"
render: "prose"
status: "extracted"
summary: ""
points: []
revisits: []
paradigms: []
source: {"file":"week_12.md","lines":[65,158],"heading":"1. Advanced Word Order","sha256":"331bdcc6d60d98ec88e837a3e60e6efe461888f73821bcc5bd2cdf16eb0bac82"}
---
This final week opens with the one structural feature that separates B2 German from everything below it: **nested subordinate clauses**. German subordination is recursive — a subordinate clause can contain another subordinate clause, which can contain another — and the finite verbs of every level gather at the end of their own clause, stacking toward the last word of the sentence. Section 1 teaches you to read and produce two-deep nesting fluently, to draw the structural diagram behind it, and to choose between a *dass*-clause and a *zu* + Infinitiv construction when the two clauses share a subject.

### 1.1. Nested Subordinate Clauses: Two-Deep Stacking (4 Diagrams)

A sentence with a main clause and one subordinate clause has **one finite verb per clause**, and the subordinate clause's verb moves to the end (verb-final, Lesson 1). When a subordinate clause contains a second subordinate clause, the inner clause behaves like a single heavy element at the end of the outer clause: the **outer clause's finite verb is placed directly before the inner clause**, and the **inner clause's verb becomes the last word of the whole sentence**. Read the four examples below from left to right and watch where the verbs land.

**Example 1 — the classic dass-dass stack:**

**Ich weiß, dass er sagt, dass er kommt.** (I know that he says that he is coming.)

```
Ich      weiß,      dass      er      sagt,      dass      er      kommt.
│         │          │         │        │          │         │        │
main    V2        conj.     subj.   V (outer)   conj.     subj.   V (inner)
clause  finite    └──────── Nebensatz 1 ────────┴──────── Nebensatz 2 ─────────┘
         (V2)               verb-final                       verb-final
```

The verbs stack at the end: the inner verb **kommt** is the last word of the sentence; the outer verb **sagt** stands immediately before the inner clause.

**Example 2 — believing and knowing:**

**Sie meint, dass sie weiß, dass das Projekt gelingt.** (She thinks that she knows that the project will succeed.)

```
Sie      meint,      dass      sie      weiß,      dass      das Projekt      gelingt.
│          │          │         │         │          │             │            │
subj.     V2        conj.     subj.    V (outer)   conj.        object       V (inner)
                   └──────── Nebensatz 1 ────────┴────────── Nebensatz 2 ───────────┘
```

**Example 3 — ob + indirect question:**

**Der Lehrer fragt, ob die Schüler wissen, wann die Prüfung beginnt.** (The teacher asks whether the pupils know when the exam begins.)

```
Der Lehrer      fragt,      ob      die Schüler      wissen,      wann      die Prüfung      beginnt.
    │              │         │            │            │            │             │            │
  subj.           V2       conj.       subj.        V (outer)    W-word         subj.       V (inner)
                         └──────── Nebensatz 1 ─────────────────┴────────── Nebensatz 2 ───────────┘
```

**Example 4 — a hope inside a hope:**

**Wir hoffen, dass der Chef versteht, warum wir zu spät kommen.** (We hope that the boss understands why we are late.)

```
Wir      hoffen,      dass      der Chef      versteht,      warum      wir      zu spät      kommen.
│           │           │           │             │             │         │         │            │
subj.       V2        conj.        subj.       V (outer)     W-word     subj.    adv.        V (inner)
                    └────────── Nebensatz 1 ─────────────────┴────────── Nebensatz 2 ─────────────┘
```

> **Note (critical):** the innermost clause's verb is always the **last word** of the sentence, and every outer verb sits at the end of its own clause — which means *before* the embedded clause that follows it. Never write ~~dass er kommt dass er sagt~~: the embedding order mirrors the logic, outer clause first, inner clause last.

### 1.2. The Verb Stack: Structural Diagram

The diagram below shows the nesting as a tree. Each box is one clause with its own finite verb; the verb-final rule applies independently at every level, and each embedded clause hangs off the end of its parent clause.

```
Satzgefüge (complex sentence)
│
├─ Hauptsatz (V2)
│    Ich weiß,
│         │
│         └─ Nebensatz 1 (verb-final)
│              dass er sagt,
│                    │
│                    └─ Nebensatz 2 (verb-final)
│                         dass er kommt.      ← innermost verb = last word
│
└─ Regel: In jedem Nebensatz steht das finite Verb am Ende. Eine eingebettete
   Nebensatz-Klammer wird als schweres Element ans Ende gestellt; das finite
   Verb des übergeordneten Satzes rückt direkt davor.
```

The rule scales to three levels without any new machinery: **Ich glaube, dass sie sagt, dass er meint, dass alles gut wird.** (I believe that she says that he thinks that everything will be fine.) The verbs form a stack: *glaubt* (main, V2), *sagt* (level 1), *meint* (level 2), *wird* (level 3, last word).

> **Trap:** when a modal or a compound tense appears at the innermost level, the stack grows a second element — the modal/auxiliary comes after the full verb group: *Ich weiß, dass er sagt, dass er **kommen muss**.* The innermost clause ends with the modal **muss**, the last word of the sentence.

### 1.3. Infinitive vs. dass-Clauses (4 Contrastive Pairs)

German offers two ways to report a dependent action. The decision rule is purely about the subject: if the dependent clause **shares the subject** of the main clause, German strongly prefers **zu + Infinitiv** (or *um ... zu* for purpose); if the subjects **differ**, only a **dass-clause** works. The four contrastive pairs below show both members of the decision side by side.

1. Same subject: **Ich hoffe, dass ich bald komme.** → **Ich hoffe, bald zu kommen.** (I hope to come soon.) — Different subject: **Ich hoffe, dass er bald kommt.** (I hope he comes soon. — zu + Infinitiv impossible: ~~Ich hoffe, er zu kommen~~)
2. Same subject: **Sie glaubt, dass sie gewinnt.** → **Sie glaubt zu gewinnen.** (She believes she will win.) — Different subject: **Sie glaubt, dass er gewinnt.** (She believes he will win.)
3. Same subject: **Er verspricht, dass er pünktlich ist.** → **Er verspricht, pünktlich zu sein.** (He promises to be on time.) — Different subject: **Er verspricht, dass sie pünktlich ist.** (He promises that she will be on time.)
4. Same subject: **Wir freuen uns, dass wir Sie wiedersehen.** → **Wir freuen uns, Sie wiederzusehen.** (We look forward to seeing you again.) — Different subject: **Wir freuen uns, dass Sie wiederkommen.** (We are glad you are coming back.)

> **Note:** the contrast is a preference, not a strict law — a *dass*-clause with a repeated subject is grammatical, if heavy. The **zu** + Infinitiv version is the idiomatic B2 choice and the one that appears in the reference tables of §8. Watch the word order in the zu-clause: it is verb-final, with **zu** fused to the infinitive (*wiederzusehen*, *zu kommen*).
