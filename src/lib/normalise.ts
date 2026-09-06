 
 
 
 
 
 
 
 
 
 
 
 

export const FOLD = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  Ä: 'ae',
  Ö: 'oe',
  Ü: 'ue',
  ẞ: 'ss',
} as const

export const umlautFold = (s: string): string => s.replace(/[äöüßÄÖÜẞ]/g, (c) => FOLD[c as keyof typeof FOLD])

export const nfc = (s: string): string => s.normalize('NFC')

export const stripZeroWidth = (s: string): string => s.replace(/[\u200B-\u200D\uFEFF]/g, '')

export function l1(s: string): string {
  return stripZeroWidth(nfc(s)).trim().replace(/\s+/g, ' ')
}

export function l2(s: string): string {
  return l1(s)
    .replace(/[’‘]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/(^["']+)|(["']+$)/g, '')
    .replace(/[.!?;]+$/, '')
}

export function l3(s: string): string {
  return umlautFold(l2(s))
}

export function l4(s: string): string {
  return l3(s).toLowerCase()
}

/** The comparison key used for grading (L4) and for search indexing. */
export const foldForSearch = (s: string): string => l4(s)

/** The key used when equality must ignore everything except the umlauts that
 *  ARE the answer — see grade.ts, N1. */
export const foldUmlautStrict = (s: string): string => umlautFold(s)

/** Split a German answer into tokens (for multiset / word-order grading). */
export const tokens = (s: string): string[] => l4(s).split(/\s+/).filter(Boolean)