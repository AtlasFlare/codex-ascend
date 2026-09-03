import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const captureUrl = process.env.ASCEND_CAPTURE_URL
if (!captureUrl) throw new Error('Set ASCEND_CAPTURE_URL to the Ascend deployment or local preview URL.')

const outputDirectory = path.resolve(process.argv[2] ?? 'artifacts/video/captures/v8-route-reveal')
const lowerPanelScreenshot = path.resolve(
  process.env.ASCEND_LOWER_SCREENSHOT ?? 'artifacts/screenshots/lower-panels.png',
)
const chromePath = process.env.ASCEND_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const fps = 15
const frames = 150

await mkdir(outputDirectory, { recursive: true })
await mkdir(path.dirname(lowerPanelScreenshot), { recursive: true })

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

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    sessionStorage.setItem('ascend:webmcp-guide-dismissed', '1')
  })
  await page.goto(captureUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.locator('.production-hero').waitFor({ state: 'visible', timeout: 20_000 })
  await page.getByRole('button', { name: 'Reset deterministic demo' }).click()
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.dataset.captureStyle = 'v8'
    style.textContent = [
      '.demo-controls { display: none !important; }',
      'html, body, button, a { cursor: none !important; }',
    ].join('\n')
    document.head.append(style)
    document.querySelector('.app-shell')?.classList.remove('has-demo-controls')
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(2_500)

  const startedAt = Date.now()
  for (let frame = 0; frame < frames; frame += 1) {
    if (frame === 24) {
      await page.evaluate(() => {
        document.querySelector('.demo-controls .primary-control')?.click()
      })
    }
    const filename = `frame-${String(frame).padStart(4, '0')}.jpg`
    await page.screenshot({
      path: path.join(outputDirectory, filename),
      type: 'jpeg',
      quality: 94,
      animations: 'allow',
    })
    const dueAt = startedAt + ((frame + 1) * 1_000) / fps
    const remaining = dueAt - Date.now()
    if (remaining > 0) await page.waitForTimeout(remaining)
  }

  // Continue the deterministic mission until Camp III is active, then capture
  // the real information architecture without development controls or an open
  // scenario card obscuring the panels this image is meant to demonstrate.
  for (let cursor = 1; cursor < 8; cursor += 1) {
    await page.evaluate(() => {
      document.querySelector('.demo-controls .primary-control')?.click()
    })
    await page.waitForTimeout(260)
  }
  await page.evaluate(() => {
    const detail = document.querySelector('#mission-detail')
    const top = detail instanceof HTMLElement ? detail.offsetTop - 400 : 400
    window.scrollTo(0, Math.max(0, top))
  })
  await page.waitForTimeout(900)
  await page.screenshot({ path: lowerPanelScreenshot, type: 'png', animations: 'disabled' })

  const manifest = {
    fps,
    width: 1440,
    height: 900,
    frames,
    durationSeconds: frames / fps,
    actionFrame: 24,
    action: 'discover_mission through the deterministic demo control',
    presentation: 'development controls hidden; current waypoint projection',
    capturedAt: new Date().toISOString(),
  }
  await writeFile(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Captured ${frames} V8 route frames in ${outputDirectory}`)
  console.log(`Captured lower-panel review image at ${lowerPanelScreenshot}`)
} finally {
  await browser.close()
}
