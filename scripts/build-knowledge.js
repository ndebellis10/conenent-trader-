/**
 * Bundles knowledge/*.md into a single generated JS module.
 *
 * Why generate a module instead of reading the folder at runtime?
 * Vercel traces static `import`s to decide which files ship with a serverless
 * function. A runtime `readdirSync` is invisible to that tracing, so the
 * knowledge folder would be missing in production. A generated module is a
 * plain import — it always ships.
 *
 * Run after adding or editing any knowledge file:
 *   npm run knowledge:build
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'knowledge')
const OUT = join(ROOT, 'backend', 'endpoints', '_lib', 'knowledge-data.js')

// Sorted — the byte order of this string is a prompt-cache prefix. If the
// order changes between deploys, every cached prefix is invalidated.
const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort()

const knowledge = files
  .map((file) => {
    const title = file.replace(/\.md$/, '').replace(/^\d+-/, '').replace(/-/g, ' ')
    return `\n\n===== ${title.toUpperCase()} (${file}) =====\n\n${readFileSync(join(SRC, file), 'utf8').trim()}`
  })
  .join('\n')
  .trim()

// JSON.stringify produces a safe JS string literal — escapes backticks,
// ${...}, backslashes, and newlines that would otherwise break the module.
writeFileSync(
  OUT,
  `// GENERATED FILE — do not edit by hand.\n` +
    `// Source: knowledge/*.md  |  Regenerate: npm run knowledge:build\n` +
    `// ${files.length} files, ${knowledge.length} chars\n\n` +
    `export default ${JSON.stringify(knowledge)}\n`,
  'utf8',
)

console.log(`✅ Bundled ${files.length} files → ${knowledge.length} chars (~${Math.round(knowledge.length / 4 / 1000)}k tokens)`)
console.log(`   ${OUT}`)
