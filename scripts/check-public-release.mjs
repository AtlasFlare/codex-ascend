import { execFileSync } from 'node:child_process'
import { extname, basename } from 'node:path'
import { readFileSync } from 'node:fs'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' })

const binaryExtensions = new Set([
  '.gif', '.ico', '.jpeg', '.jpg', '.mov', '.mp3', '.mp4', '.pdf', '.png',
  '.tar', '.wav', '.webm', '.webp', '.woff', '.woff2', '.zip',
])

const forbiddenFiles = [
  /^\.dev\.vars(?:\.|$)/,
  /^\.env(?:\.|$)/,
  /\.(?:db|key|mobileprovision|p12|pem|pfx|sqlite|sqlite3)$/i,
]

const retiredName = ['atlas', 'flare'].join('[\\s_-]*')
const patterns = [
  { label: 'retired organization reference', regex: new RegExp(retiredName, 'i') },
  { label: 'macOS user path', regex: /\/Users\/[^/\s]+/i },
  { label: 'mounted-volume path', regex: /\/Volumes\/[^/\s]+/i },
  { label: 'Windows user path', regex: /[A-Z]:\\Users\\[^\\\s]+/i },
  { label: 'machine-local hostname', regex: /\b[A-Za-z0-9-]+-Mac-(?:Mini|Book(?:-Air|-Pro)?)\.local\b/i },
  { label: 'email address', regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { label: 'OpenAI-style secret', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: 'GitHub-style secret', regex: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { label: 'private key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
]

function candidateFiles() {
  return git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
    .split('\0')
    .filter(Boolean)
}

function inspectText(path, text, scope, findings) {
  text.split(/\r?\n/).forEach((line, index) => {
    for (const { label, regex } of patterns) {
      if (regex.test(line)) findings.push(`${scope}:${path}:${index + 1}: ${label}`)
    }
  })
}

const findings = []
const files = candidateFiles()

for (const path of files) {
  const name = basename(path)
  if (forbiddenFiles.some((pattern) => pattern.test(name)) && name !== '.env.example') {
    findings.push(`candidate:${path}: forbidden release file`)
  }
  if (binaryExtensions.has(extname(path).toLowerCase())) continue
  inspectText(path, readFileSync(path, 'utf8'), 'candidate', findings)
}

for (const revision of git('rev-list', 'HEAD').trim().split('\n').filter(Boolean)) {
  const historyFiles = git('ls-tree', '-r', '--name-only', '-z', revision).split('\0').filter(Boolean)
  for (const path of historyFiles) {
    if (binaryExtensions.has(extname(path).toLowerCase())) continue
    const text = execFileSync('git', ['show', `${revision}:${path}`], { encoding: 'utf8' })
    inspectText(path, text, `history:${revision.slice(0, 10)}`, findings)
  }
}

const identities = git('log', '--format=%h%x09%an%x09%ae%x09%cn%x09%ce', 'HEAD')
  .trim()
  .split('\n')
  .filter(Boolean)

for (const row of identities) {
  const [revision, author, authorEmail, committer, committerEmail] = row.split('\t')
  const safeEmail = (value) => value.endsWith('@users.noreply.github.com')
  if (!safeEmail(authorEmail) || !safeEmail(committerEmail)) {
    findings.push(`history:${revision}: non-anonymous commit email`)
  }
  if (/\b(?:ava|atlas[\s_-]*flare)\b/i.test(`${author} ${committer}`)) {
    findings.push(`history:${revision}: personal commit identity`)
  }
}

if (findings.length > 0) {
  console.error('Public-release audit failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`Public-release audit passed for ${files.length} candidate files and ${identities.length} commit(s).`)
