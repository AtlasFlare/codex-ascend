import { createRequire } from 'node:module'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.ASCEND_PLAYWRIGHT_PACKAGE ?? 'playwright')

const captureUrl = process.env.ASCEND_CAPTURE_URL
if (!captureUrl) throw new Error('Set ASCEND_CAPTURE_URL to the Ascend deployment or local preview URL.')

const outputRoot = path.resolve(process.argv[2] ?? 'artifacts/video/captures/v9')
const chromePath = process.env.ASCEND_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const fps = 15
const forceCapture = process.env.ASCEND_CAPTURE_FORCE === '1'
const requestedCaptures = new Set((process.env.ASCEND_CAPTURE_ONLY ?? '').split(',').filter(Boolean))
const wantsCapture = (name) => requestedCaptures.size === 0 || requestedCaptures.has(name)

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    '--hide-scrollbars',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--disable-features=Translate,MediaRouter',
  ],
})

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
})

async function openResetPage() {
  const page = await context.newPage()
  await page.addInitScript(() => {
    sessionStorage.setItem('ascend:webmcp-guide-dismissed', '1')
  })
  await page.goto(captureUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.locator('.production-hero').waitFor({ state: 'visible', timeout: 20_000 })
  await page.evaluate(() => {
    document.querySelector('[aria-label="Reset deterministic demo"]')?.click()
  })
  await page.waitForTimeout(320)
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.dataset.captureStyle = 'v9'
    style.textContent = [
      '.demo-controls { display: none !important; }',
      '.webmcp-activity-rail, .mcp-pill { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }',
      'html, body, button, a { cursor: none !important; }',
    ].join('\n')
    document.head.append(style)
    document.querySelector('.app-shell')?.classList.remove('has-demo-controls')
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(1_500)
  return page
}

async function nextEvent(page) {
  await page.evaluate(() => {
    document.querySelector('.demo-controls .primary-control')?.click()
  })
  await page.waitForTimeout(320)
}

async function selectMountainWaypoint(page, labelPrefix) {
  const clicked = await page.evaluate((prefix) => {
    const target = [...document.querySelectorAll('.position-beacon')]
      .find((button) => button.getAttribute('aria-label')?.startsWith(prefix))
    target?.click()
    return Boolean(target)
  }, labelPrefix)
  if (!clicked) throw new Error(`Mountain waypoint is unavailable: ${labelPrefix}`)
  await page.waitForTimeout(360)
}

async function choosePersistenceRepair(page) {
  const repair = page.getByRole('button', { name: /Repair persistence/ })
  if (!await repair.isVisible().catch(() => false)) {
    await selectMountainWaypoint(page, 'Camp III · Validation')
  }
  await repair.click()
  await page.waitForTimeout(360)
}

async function advanceTo(page, targetCursor) {
  let cursor = 0
  while (cursor < targetCursor) {
    if (cursor === 11) {
      await choosePersistenceRepair(page)
    }
    await nextEvent(page)
    cursor += 1
  }
}

async function capture(page, name, frames, actions = new Map()) {
  const directory = path.join(outputRoot, name)
  await mkdir(directory, { recursive: true })
  try {
    if (forceCapture) throw Object.assign(new Error('Forced capture'), { code: 'ENOENT' })
    await access(path.join(directory, 'manifest.json'))
    console.log(`Skipped ${name}: completed capture already exists`)
    return
  } catch {
    // An incomplete directory is safe to resume by overwriting its numbered frames.
  }
  const startedAt = Date.now()
  for (let frame = 0; frame < frames; frame += 1) {
    const action = actions.get(frame)
    if (action) await action(page)
    await page.evaluate((logicalTimeMs) => {
      document.getAnimations().forEach((animation) => {
        animation.pause()
        animation.currentTime = logicalTimeMs
      })
    }, (frame * 1_000) / fps)
    await page.screenshot({
      path: path.join(directory, `frame-${String(frame).padStart(4, '0')}.jpg`),
      type: 'jpeg',
      quality: 92,
      animations: 'allow',
    })
    const dueAt = startedAt + ((frame + 1) * 1_000) / fps
    const remaining = dueAt - Date.now()
    if (remaining > 0) await page.waitForTimeout(remaining)
  }
  await writeFile(path.join(directory, 'manifest.json'), `${JSON.stringify({
    fps,
    width: 1440,
    height: 900,
    frames,
    durationSeconds: frames / fps,
    captureUrl,
    capturedAt: new Date().toISOString(),
  }, null, 2)}\n`)
  console.log(`Captured ${name}: ${frames} frames`)
}

try {
  if (wantsCapture('01-basecamp-route')) {
  const basecamp = await openResetPage()
  await nextEvent(basecamp)
  await capture(basecamp, '01-basecamp-route', 255)
  await basecamp.close()
  }

  if (wantsCapture('02-blocker')) {
  const blocker = await openResetPage()
  await advanceTo(blocker, 9)
  await blocker.getByRole('button', { name: /Camp III · Validation, blocked/ }).click()
  await blocker.waitForTimeout(450)
  await capture(blocker, '02-blocker', 240)
  await blocker.close()
  }

  if (wantsCapture('03-human-decision')) {
  const decision = await openResetPage()
  await advanceTo(decision, 11)
  await capture(decision, '03-human-decision', 300, new Map([
    [78, async (page) => {
      await choosePersistenceRepair(page)
    }],
    [132, nextEvent],
  ]))
  await decision.close()
  }

  if (wantsCapture('04-scope-ridge')) {
  const scope = await openResetPage()
  await advanceTo(scope, 15)
  await capture(scope, '04-scope-ridge', 180, new Map([
    [30, nextEvent],
    [78, async (page) => {
      await selectMountainWaypoint(page, 'Security Ridge')
    }],
  ]))
  await scope.close()
  }

  if (wantsCapture('05-verified-summit')) {
  const summit = await openResetPage()
  await advanceTo(summit, 24)
  await selectMountainWaypoint(summit, 'Verified Summit')
  await capture(summit, '05-verified-summit', 150)
  await summit.close()
  }

  if (wantsCapture('06-elevation')) {
  const elevation = await openResetPage()
  await advanceTo(elevation, 24)
  await capture(elevation, '06-elevation', 150, new Map([
    [18, async (page) => {
      await page.evaluate(() => document.querySelector('#mission-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }],
    [88, async (page) => {
      await page.locator('.elevation-checkpoint').filter({ hasText: 'Security Ridge' }).click({ force: true })
      await page.waitForTimeout(400)
    }],
  ]))
  await elevation.close()
  }
} finally {
  await context.close()
  await browser.close()
}
