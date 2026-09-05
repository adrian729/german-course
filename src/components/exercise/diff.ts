// Character-level diff for the typed shape: the wireframe highlights the single
// differing character (`a` against `ä`), which a whole-string comparison cannot
// show.

export type DiffSeg = { kind: 'same' | 'del' | 'ins'; text: string }

/** Longer strings than this are not worth a quadratic table on every keystroke. */
const MAX = 400

/**
 * Segments `a` (what was typed) against `b` (the accepted answer) over their
 * longest common subsequence. Length mismatches fall out as `del`/`ins` runs
 * rather than being aligned positionally, so `Vater` against `Väter` reports one
 * insertion instead of re-flagging every character after the first difference.
 */
export function charDiff(a: string, b: string): DiffSeg[] {
  if (a === b) return a ? [{ kind: 'same', text: a }] : []
  if (a.length > MAX || b.length > MAX) {
    const segs: DiffSeg[] = []
    if (a) segs.push({ kind: 'del', text: a })
    if (b) segs.push({ kind: 'ins', text: b })
    return segs
  }

  const n = a.length
  const m = b.length
  // lcs[i][j] = length of the LCS of a.slice(i) and b.slice(j)
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
    }
  }

  const out: DiffSeg[] = []
  const push = (kind: DiffSeg['kind'], ch: string) => {
    const last = out[out.length - 1]
    if (last && last.kind === kind) last.text += ch
    else out.push({ kind, text: ch })
  }

  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('same', a[i]!)
      i++
      j++
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      push('del', a[i]!)
      i++
    } else {
      push('ins', b[j]!)
      j++
    }
  }
  while (i < n) push('del', a[i++]!)
  while (j < m) push('ins', b[j++]!)
  return out
}
