import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
function parseArgs(argv) {
  const args = {
    force: false,
    chapter: null,
    plan: path.join('video', 'contest-demo-plan.json'),
    outputName: 'codex-ascend-voiceover',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--force') args.force = true
    else if (value === '--chapter') args.chapter = argv[index += 1]
    else if (value === '--plan') args.plan = argv[index += 1]
    else if (value === '--output-name') args.outputName = argv[index += 1]
    else throw new Error(`Unknown argument: ${value}`)
  }

  return args
}

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

  try {
    const localValues = parseEnvFile(await readFile(path.join(ROOT, '.dev.vars'), 'utf8'))
    if (localValues.OPENAI_API_KEY?.trim()) return localValues.OPENAI_API_KEY.trim()
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  throw new Error('OPENAI_API_KEY is unavailable. Add it to the environment or ignored .dev.vars file.')
}

function findChunk(buffer, chunkName) {
  let offset = 12
  while (offset + 8 <= buffer.length) {
    const name = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const dataStart = offset + 8
    if (name === chunkName) return { dataStart, size }
    offset = dataStart + size + (size % 2)
  }
  throw new Error(`WAV chunk ${chunkName} was not found.`)
}

function parseWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('OpenAI response was not a RIFF/WAVE file.')
  }

  const formatChunk = findChunk(buffer, 'fmt ')
  const dataChunk = findChunk(buffer, 'data')
  const format = Buffer.from(buffer.subarray(formatChunk.dataStart, formatChunk.dataStart + formatChunk.size))
  const audioFormat = format.readUInt16LE(0)
  const channels = format.readUInt16LE(2)
  const sampleRate = format.readUInt32LE(4)
  const byteRate = format.readUInt32LE(8)
  const blockAlign = format.readUInt16LE(12)
  const bitsPerSample = format.readUInt16LE(14)

  if (audioFormat !== 1) throw new Error(`Expected PCM WAV audio, received format ${audioFormat}.`)

  return {
    format,
    signature: `${audioFormat}:${channels}:${sampleRate}:${bitsPerSample}`,
    sampleRate,
    byteRate,
    blockAlign,
    data: Buffer.from(buffer.subarray(dataChunk.dataStart, dataChunk.dataStart + dataChunk.size)),
  }
}

function buildWav(format, data) {
  const formatPadding = format.length % 2
  const dataPadding = data.length % 2
  const totalSize = 12 + 8 + format.length + formatPadding + 8 + data.length + dataPadding
  const output = Buffer.alloc(totalSize)
  output.write('RIFF', 0, 'ascii')
  output.writeUInt32LE(totalSize - 8, 4)
  output.write('WAVE', 8, 'ascii')
  output.write('fmt ', 12, 'ascii')
  output.writeUInt32LE(format.length, 16)
  format.copy(output, 20)
  let offset = 20 + format.length + formatPadding
  output.write('data', offset, 'ascii')
  output.writeUInt32LE(data.length, offset + 4)
  data.copy(output, offset + 8)
  return output
}

function silenceBuffer(seconds, wav) {
  const requestedBytes = Math.round(seconds * wav.byteRate)
  const alignedBytes = requestedBytes - (requestedBytes % wav.blockAlign)
  return Buffer.alloc(alignedBytes)
}

function formatTimestamp(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const secs = Math.floor((milliseconds % 60_000) / 1000)
  const millis = milliseconds % 1000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function captionCues(chapter, start, end) {
  const sentences = chapter.narration.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)?.map((item) => item.trim()) ?? [chapter.narration]
  const totalWeight = sentences.reduce((sum, sentence) => sum + sentence.length, 0)
  let cursor = start

  return sentences.map((sentence, index) => {
    const sentenceEnd = index === sentences.length - 1
      ? end
      : cursor + ((end - start) * sentence.length) / totalWeight
    const cue = { start: cursor, end: sentenceEnd, text: sentence }
    cursor = sentenceEnd
    return cue
  })
}

async function fileExists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function generateChapter(apiKey, plan, chapter, outputPath) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: plan.voice.model,
      voice: plan.voice.name,
      response_format: plan.voice.format,
      input: chapter.narration,
      instructions: `${plan.voice.instructions} This chapter should finish in approximately ${chapter.targetSeconds} seconds.`,
    }),
  })

  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const payload = await response.json()
      detail = payload?.error?.message ?? detail
    } catch {
      // The status code remains sufficient and does not risk logging credentials.
    }
    throw new Error(`Voice generation failed for ${chapter.id}: ${detail}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  parseWav(bytes)
  await writeFile(outputPath, bytes)
  console.log(`Generated ${chapter.id} (${Math.round(bytes.length / 1024)} KB)`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const planPath = path.resolve(ROOT, args.plan)
  const outputDir = path.join(ROOT, 'artifacts', 'video', 'voiceover', args.outputName)
  const chapterDir = path.join(outputDir, 'chapters')
  const plan = JSON.parse(await readFile(planPath, 'utf8'))
  const selectedChapters = args.chapter
    ? plan.chapters.filter((chapter) => chapter.id === args.chapter)
    : plan.chapters

  if (selectedChapters.length === 0) throw new Error(`Unknown chapter: ${args.chapter}`)

  await mkdir(chapterDir, { recursive: true })
  const apiKey = await getApiKey()

  for (const chapter of selectedChapters) {
    const outputPath = path.join(chapterDir, `${chapter.id}.wav`)
    if (!args.force && await fileExists(outputPath)) {
      console.log(`Reusing ${chapter.id}`)
      continue
    }
    await generateChapter(apiKey, plan, chapter, outputPath)
  }

  const missingChapter = plan.chapters.find((chapter) => !selectedChapters.some((selected) => selected.id === chapter.id))
  if (args.chapter && missingChapter && !await fileExists(path.join(chapterDir, `${missingChapter.id}.wav`))) {
    console.log('Chapter generated. Run without --chapter after all chapters exist to assemble the master track.')
    return
  }

  const leadSeconds = 0.25
  const gapSeconds = 0.3
  const tailSeconds = 0.45
  const parsedChapters = []

  for (const chapter of plan.chapters) {
    const bytes = await readFile(path.join(chapterDir, `${chapter.id}.wav`))
    parsedChapters.push({ chapter, wav: parseWav(bytes) })
  }

  const signature = parsedChapters[0].wav.signature
  if (parsedChapters.some(({ wav }) => wav.signature !== signature)) {
    throw new Error('Generated chapter WAV formats do not match and cannot be assembled safely.')
  }

  const reference = parsedChapters[0].wav
  const audioParts = [silenceBuffer(leadSeconds, reference)]
  const timings = []
  let cursor = leadSeconds

  parsedChapters.forEach(({ chapter, wav }, index) => {
    const durationSeconds = wav.data.length / wav.byteRate
    const startSeconds = cursor
    const endSeconds = startSeconds + durationSeconds
    audioParts.push(wav.data)
    timings.push({
      id: chapter.id,
      label: chapter.label,
      startSeconds,
      endSeconds,
      durationSeconds,
      targetSeconds: chapter.targetSeconds,
      deltaSeconds: durationSeconds - chapter.targetSeconds,
      shots: chapter.shots,
    })
    cursor = endSeconds
    if (index < parsedChapters.length - 1) {
      audioParts.push(silenceBuffer(gapSeconds, reference))
      cursor += gapSeconds
    }
  })

  audioParts.push(silenceBuffer(tailSeconds, reference))
  cursor += tailSeconds
  if (plan.targetDurationSeconds && cursor < plan.targetDurationSeconds) {
    audioParts.push(silenceBuffer(plan.targetDurationSeconds - cursor, reference))
    cursor = plan.targetDurationSeconds
  }
  const masterPath = path.join(outputDir, `${args.outputName}.wav`)
  await writeFile(masterPath, buildWav(reference.format, Buffer.concat(audioParts)))

  const cueSheet = {
    title: plan.title,
    disclosure: plan.disclosure,
    generatedAt: new Date().toISOString(),
    totalDurationSeconds: cursor,
    chapters: timings,
  }
  await writeFile(path.join(outputDir, 'director-cues.json'), `${JSON.stringify(cueSheet, null, 2)}\n`)

  const cues = timings.flatMap((timing, index) => captionCues(plan.chapters[index], timing.startSeconds, timing.endSeconds))
  const vtt = ['WEBVTT', '', ...cues.flatMap((cue, index) => [
    String(index + 1),
    `${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`,
    cue.text,
    '',
  ])].join('\n')
  await writeFile(path.join(outputDir, `${args.outputName}.vtt`), vtt)

  console.log(`Master track: ${cursor.toFixed(2)} seconds`)
  for (const timing of timings) {
    const delta = timing.deltaSeconds >= 0 ? `+${timing.deltaSeconds.toFixed(2)}` : timing.deltaSeconds.toFixed(2)
    console.log(`${timing.id}: ${timing.durationSeconds.toFixed(2)}s (target ${timing.targetSeconds}s, ${delta}s)`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
