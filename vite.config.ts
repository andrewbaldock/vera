import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

/**
 * What is running, and what it was built from. A deployed link that cannot say
 * which build it is makes every "is that fixed yet?" a guess for both sides.
 */
function buildSha(): string {
  try {
    // execFile rather than exec: no shell, so nothing here can be a command.
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    // Built from a tarball rather than a checkout. The version still applies.
    return 'unknown'
  }
}

/**
 * The same two facts as a static file, so a deploy can be checked with `curl`
 * rather than by opening the app and finding the menu.
 */
function versionFile(version: string, sha: string): Plugin {
  return {
    name: 'vera-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version, sha }, null, 2),
      })
    },
  }
}

const VERSION = pkg.version
const SHA = buildSha()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile(VERSION, SHA)],
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
    __BUILD_SHA__: JSON.stringify(SHA),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 1337,
    strictPort: true,
  },
})
