import { defineConfig, type Plugin } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync } from 'node:fs'
import path from 'node:path'

/**
 * GitHub Pages has no rewrite rules — it serves 404.html for any path it cannot
 * find on disk. Shipping a copy of index.html under that name is what makes a
 * deep link like /lessons/05-separable-verbs/01-separable-prefix-verbs boot the
 * SPA instead of showing GitHub's 404 page.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const out = path.resolve(import.meta.dirname, 'dist')
      copyFileSync(path.join(out, 'index.html'), path.join(out, '404.html'))
    },
  }
}

export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/, so assets need that
  // prefix. Unset locally, where the app is served from the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    // Must precede the React plugin so generated routes are transformed.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    spaFallback(),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
