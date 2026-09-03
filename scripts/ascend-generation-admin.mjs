import { readFile } from 'node:fs/promises'

const [command, baseUrlRaw, ...args] = process.argv.slice(2)
const baseUrl = baseUrlRaw?.replace(/\/$/, '')
if (!command || !baseUrl) {
  throw new Error('Usage: node scripts/ascend-generation-admin.mjs <command> <base-url> [...args]')
}

const vars = Object.fromEntries(
  (await readFile('.dev.vars', 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const at = line.indexOf('=')
      return [line.slice(0, at), line.slice(at + 1)]
    }),
)
const token = vars.ASCEND_GENERATION_ADMIN_TOKEN
if (!token) throw new Error('ASCEND_GENERATION_ADMIN_TOKEN is not configured in .dev.vars.')

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const body = await response.json()
  process.stdout.write(`${JSON.stringify({ httpStatus: response.status, ...body }, null, 2)}\n`)
  if (!response.ok) process.exitCode = 1
}

if (command === 'health') {
  await request('/api/generation/health', { headers: {} })
} else if (command === 'provider-check') {
  await request('/api/generation/provider-check', { headers: {} })
} else if (command === 'master' || command === 'focus' || command === 'card') {
  const payload = await readFile(args[0], 'utf8')
  await request(`/api/generation/${command}`, { method: 'POST', body: payload })
} else if (command === 'world') {
  await request(`/api/generation/world?missionId=${encodeURIComponent(args[0])}`)
} else if (command === 'status') {
  await request(`/api/generation/status/${encodeURIComponent(args[0])}/${encodeURIComponent(args[1])}`)
} else if (['accept', 'reject'].includes(command)) {
  await request(`/api/generation/review/${encodeURIComponent(args[0])}/${encodeURIComponent(args[1])}/${command}`, { method: 'POST' })
} else if (command === 'retry') {
  await request(`/api/generation/review/${encodeURIComponent(args[0])}/${encodeURIComponent(args[1])}/retry`, {
    method: 'POST',
    body: JSON.stringify({ retryNonce: args[2] }),
  })
} else {
  throw new Error(`Unknown generation command: ${command}`)
}
