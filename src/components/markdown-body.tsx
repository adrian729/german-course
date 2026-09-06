 
 
 
 
 

import type { ComponentPropsWithoutRef } from 'react'
import { Markdown } from '@tanstack/markdown/react'
import { ContentAnchor } from '@/components/content-anchor'
import { cn } from '@/lib/utils'

export type MarkdownComponentProps<T extends keyof React.JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>

const components = {
  a: ContentAnchor,
  h2: (p: MarkdownComponentProps<'h2'>) => (
    <h2 {...p} className="mt-10 mb-3 scroll-mt-20 text-lg font-semibold tracking-tight" />
  ),
  h3: (p: MarkdownComponentProps<'h3'>) => (
    <h3 {...p} className="mt-7 mb-2 scroll-mt-20 font-semibold tracking-tight" />
  ),
  p: (p: MarkdownComponentProps<'p'>) => <p {...p} className="my-4 leading-7" />,
  ul: (p: MarkdownComponentProps<'ul'>) => (
    <ul {...p} className="my-4 ml-5 list-disc space-y-1.5 marker:text-muted-foreground" />
  ),
  ol: (p: MarkdownComponentProps<'ol'>) => (
    <ol {...p} className="my-4 ml-5 list-decimal space-y-1.5 marker:text-muted-foreground" />
  ),
  li: (p: MarkdownComponentProps<'li'>) => <li {...p} className="leading-7 pl-1" />,
  strong: (p: MarkdownComponentProps<'strong'>) => <strong {...p} className="font-semibold" />,
  del: (p: MarkdownComponentProps<'del'>) => (
    <del {...p} className="text-destructive rounded bg-red-100/60 px-1 no-underline dark:bg-red-900/30" title="Never write this">
      ✗ <span className="line-through decoration-2">{p.children}</span>
    </del>
  ),
  blockquote: (p: MarkdownComponentProps<'blockquote'>) => (
    <blockquote {...p} className="border-primary/40 text-muted-foreground my-5 border-l-2 pl-4 italic" />
  ),
  hr: (p: MarkdownComponentProps<'hr'>) => <hr {...p} className="border-border my-8" />,
  code: (p: MarkdownComponentProps<'code'>) => (
    <code
      {...p}
      className={cn(
        'font-mono text-[0.85em]',
        'bg-muted rounded px-1.5 py-0.5 [pre_&]:bg-transparent [pre_&]:p-0',
      )}
    />
  ),
  pre: (p: MarkdownComponentProps<'pre'>) => (
    <pre {...p} className="bg-muted my-5 overflow-x-auto rounded-lg p-4 text-sm leading-relaxed" />
  ),
  table: (p: MarkdownComponentProps<'table'>) => (
    <div className="border-border my-6 w-full overflow-x-auto rounded-lg border">
      <table {...p} className="w-full border-collapse text-sm" />
    </div>
  ),
  thead: (p: MarkdownComponentProps<'thead'>) => <thead {...p} className="bg-muted/60" />,
  th: (p: MarkdownComponentProps<'th'>) => (
    <th {...p} className="border-border border-b px-4 py-2.5 text-left font-semibold" />
  ),
  td: (p: MarkdownComponentProps<'td'>) => (
    <td {...p} className="border-border/60 border-b px-4 py-2.5 align-top last:border-0" />
  ),
  tr: (p: MarkdownComponentProps<'tr'>) => <tr {...p} className="last:[&>td]:border-b-0" />,
}

export function MarkdownBody({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn('text-[0.95rem]', className)}>
      <Markdown components={components} frontmatter headingIds>
        {source}
      </Markdown>
    </div>
  )
}