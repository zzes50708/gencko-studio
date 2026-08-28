import { access, mkdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const inputDir = resolve(
  process.env.HERO_CAPTURE_OUTPUT ?? 'C:/Users/User/AppData/Local/Temp/gencko-hero-atlas',
  'clips'
)
const outputDir = resolve(process.env.HERO_CAPTURE_ATLAS_OUTPUT ?? 'public/previews')
const ffmpeg = process.env.HERO_CAPTURE_FFMPEG ?? 'ffmpeg'
const clipPaths = Array.from({ length: 8 }, (_, index) =>
  resolve(inputDir, `${String(index).padStart(2, '0')}.webm`)
)

function tileFilter(index, width, height) {
  return `[${index}:v]fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${index}]`
}

function atlasFilter(width, height) {
  const filters = clipPaths.map((_, index) => tileFilter(index, width, height))
  // 卡片索引 0-3 在影像上排，索引 4-7 在影像下排；WebGL UV 會在材質取樣時反轉 Y 軸。
  filters.push('[v0][v1][v2][v3]hstack=inputs=4[top]')
  filters.push('[v4][v5][v6][v7]hstack=inputs=4[bottom]')
  filters.push('[top][bottom]vstack=inputs=2[out]')
  return filters.join(';')
}

async function composeAtlas(filename, width, height) {
  const outputPath = resolve(outputDir, filename)
  const args = [
    '-y',
    ...clipPaths.flatMap((clipPath) => ['-i', clipPath]),
    '-filter_complex',
    atlasFilter(width, height),
    '-map',
    '[out]',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath
  ]

  await execFileAsync(ffmpeg, args, { windowsHide: true })
  console.log(`[hero-atlas] ${outputPath}`)
}

for (const clipPath of clipPaths) {
  await access(clipPath)
}
await mkdir(outputDir, { recursive: true })
await composeAtlas('hero-card-atlas.mp4', 480, 270)
await composeAtlas('hero-card-atlas-mobile.mp4', 240, 136)
