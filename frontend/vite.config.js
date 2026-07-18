import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// This config lives in frontend/, so the project root IS this directory.
const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  // .env files stay at the repo root (shared with the backend), not in frontend/.
  envDir: resolve(root, '..'),
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // Emit to <repo-root>/dist so vercel.json's outputDirectory ("dist") still matches.
    outDir: resolve(root, '../dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
})
