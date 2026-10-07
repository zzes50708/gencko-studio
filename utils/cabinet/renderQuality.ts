export function cabinetQualityProfile(options: {
  touch: boolean
  pixelRatio: number
  cores?: number
  memory?: number
  width: number
  height: number
}) {
  const limited =
    (options.cores !== undefined && options.cores <= 4) ||
    (options.memory !== undefined && options.memory <= 4)
  const pixels = Math.max(1, options.width * options.height)
  const budget = limited ? 900000 : options.touch ? 1500000 : 2400000
  const native = options.touch ? Math.max(1, options.pixelRatio) : Math.max(1.5, options.pixelRatio)
  const resting = Math.min(
    native,
    limited ? 1.25 : options.touch ? 1.75 : 2,
    Math.sqrt(budget / pixels)
  )
  const active = Math.min(resting, options.touch ? 1 : 1.25)
  return {
    resting,
    active,
    minimum: Math.min(active, options.touch ? 0.65 : 0.85),
    shadowSize: limited ? 512 : options.touch ? 1024 : 2048
  }
}

/** 只採計連續操作的有效幀，避開待機間隔與首次建立的暖機時間。 */
export function createCabinetQualitySampler(profile: ReturnType<typeof cabinetQualityProfile>) {
  let ratio = profile.active,
    average = 0,
    count = 0
  return {
    get ratio() {
      return ratio
    },
    reset() {
      average = 0
      count = 0
    },
    sample(milliseconds: number) {
      if (!Number.isFinite(milliseconds) || milliseconds < 1 || milliseconds > 250) return ratio
      average = average ? average * 0.8 + milliseconds * 0.2 : milliseconds
      count++
      if (count >= 12) {
        if (average > 28) ratio = Math.max(profile.minimum, ratio - 0.1)
        else if (average < 18) ratio = Math.min(profile.active, ratio + 0.05)
        ratio = Math.min(profile.active, Math.max(profile.minimum, Math.round(ratio * 100) / 100))
        count = 0
      }
      return ratio
    }
  }
}
