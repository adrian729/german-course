// shadcn 4.x installs the compiled `cn` package (clsx + tailwind-merge in one).
// Re-exported here so app code has a single stable import site and the merge
// logic exists in exactly one implementation.
export { cn } from 'cn'
