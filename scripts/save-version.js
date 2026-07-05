import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '..')

try {
  const hash = execSync('git log -1 --format="%H"', { encoding: 'utf8', timeout: 5000 }).trim()
  const msg = execSync('git log -1 --format="%s"', { encoding: 'utf8', timeout: 5000 }).trim()
  const date = execSync('git log -1 --format="%ai"', { encoding: 'utf8', timeout: 5000 }).trim()
  fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ hash, msg, date }, null, 2))
} catch {}
