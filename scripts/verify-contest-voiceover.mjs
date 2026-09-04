import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()

function parseEnvFile(contents) {
  const values = {}
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[match[1]] = value
  }
  return values
}

async function getApiKey() {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim()
  const values = parseEnvFile(await readFile(path.join(ROOT, '.dev.vars'), 'utf8'))
  if (values.OPENAI_API_KEY?.trim()) return values.OPENAI_API_KEY.trim()
  throw new Error('OPENAI_API_KEY is unavailable.')
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
}

async function main() {
  const inputArg = process.argv[2]
  if (!inputArg) throw new Error('Usage: node scripts/verify-contest-voiceover.mjs <audio-file> [transcript-output]')

  const inputPath = path.resolve(ROOT, inputArg)
  const outputPath = path.resolve(ROOT, process.argv[3] ?? `${inputArg}.asr.txt`)
  const audioBytes = await readFile(inputPath)
  const form = new FormData()
  form.append('model', 'gpt-4o-transcribe')
  form.append('prompt', 'Codex Ascend. Web M C P. Ascend dynamically generates a mission-specific mountain and scenario-card imagery. Persistence checks report an error. Report obstacle. Deterministic mission engine. Camp Three. Verified Summit.')
  form.append('file', new Blob([audioBytes], { type: 'audio/wav' }), path.basename(inputPath))

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await getApiKey()}` },
    body: form,
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const payload = await response.json()
      detail = payload?.error?.message ?? detail
    } catch {
      // Preserve the safe status-only fallback.
    }
    throw new Error(`Voiceover transcription failed: ${detail}`)
  }

  const payload = await response.json()
  const transcript = payload?.text?.trim()
  if (!transcript) throw new Error('Voiceover transcription returned no text.')
  await writeFile(outputPath, `${transcript}\n`)

  const normalized = normalize(transcript)
  const checks = [
    [
      'ascend dynamically generates a mission specific mountain and scenario card imagery',
      'openai turns that mission into a unique mountain and original scenario card imagery',
      'open ai turns that mission into a unique mountain and original scenario card imagery',
      'openai generates a unique mountain and original scenario card imagery for that mission',
      'open ai generates a unique mountain and original scenario card imagery for that mission',
    ],
    [
      'camps dependencies and route are composed for that climb',
      'camps dependencies and a route are composed for that specific climb',
      'camps dependencies and the route are composed for that specific climb',
      'camps dependencies and the route are composed for that climb',
      'camps dependencies and the route are composed for the specific climb',
    ],
    [
      'eighteen webmcp tools use one deterministic mission engine',
      'eighteen web m c p tools use one deterministic mission engine',
      'eighteen webmcp tools use the same deterministic mission engine',
      'eighteen web m c p tools use the same deterministic mission engine',
      'eighteen web mcp tools use the same deterministic mission engine',
      '18 webmcp tools use one deterministic mission engine',
      '18 web mcp tools use one deterministic mission engine',
      '18 webmcp tools use the same deterministic mission engine',
      '18 web mcp tools use the same deterministic mission engine',
      'eighteen webmcp tools share the interfaces deterministic mission engine',
      'eighteen web mcp tools share the interfaces deterministic mission engine',
      'eighteen webmcp tools share the interface s deterministic mission engine',
      'eighteen web m c p tools share the interface s deterministic mission engine',
      'eighteen web mcp tools share the interface s deterministic mission engine',
      'eighteen web mcp tools share the interfaces deterministic mission engine',
      '18 webmcp tools share the interface s deterministic mission engine',
      '18 web m c p tools share the interface s deterministic mission engine',
      '18 web mcp tools share the interface s deterministic mission engine',
    ],
    ['when persistence checks report an error'],
    ['report obstacle changes the world'],
    ['who selects repair persistence directly on the mountain', 'the user chooses repair persistence directly on the mountain'],
    ['the result confirms that exact choice'],
    [
      'one topology map drives the camera waypoints evidence and live elevation profile',
      'one topology map drives the camera waypoints evidence and a live elevation profile',
      'one topology map drives the camera waypoints evidence and elevation profile',
      'one topology map drives the camera waypoints evidence and an elevation profile',
    ],
    ['choose a waypoint in the profile', 'choose a waypoint'],
    ['from basecamp to a verified summit', 'from base camp to a verified summit'],
  ]
  let failed = false
  for (const alternatives of checks) {
    const passed = alternatives.some((phrase) => normalized.includes(normalize(phrase)))
    console.log(`${passed ? 'PASS' : 'FAIL'}: ${alternatives[0]}`)
    failed ||= !passed
  }
  console.log(`Transcript: ${outputPath}`)
  if (failed) process.exitCode = 2
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
