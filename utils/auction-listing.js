import { MAX_BID_AMOUNT } from './auction-bid-contract.js'

export function taipeiDateTime(epoch) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
    .format(epoch)
    .replace(' ', 'T')
}

export function parseTaipeiDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '')) return null
  const epoch = Date.parse(`${value}:00+08:00`)
  if (!Number.isFinite(epoch) || taipeiDateTime(epoch) !== value) return null
  return new Date(epoch).toISOString()
}

export function listingError(form, now) {
  if (!form.animalId) return '請先選取一隻個體。'
  if (
    !Number.isSafeInteger(form.startPrice) ||
    form.startPrice < 0 ||
    form.startPrice > MAX_BID_AMOUNT
  )
    return '起標價須為非負整數。'
  if (
    !Number.isSafeInteger(form.increment) ||
    form.increment < 1 ||
    form.startPrice + form.increment > MAX_BID_AMOUNT
  )
    return '最低增額須為正整數，且金額不可超出上限。'
  const start = form.mode === 'scheduled' ? parseTaipeiDateTime(form.startTime) : null
  const end = parseTaipeiDateTime(form.endTime)
  if (form.mode === 'scheduled' && (!start || Date.parse(start) <= now))
    return '預約開標時間須晚於現在（台灣時間）。'
  if (!end || Date.parse(end) <= (start ? Date.parse(start) : now))
    return '結標時間須晚於開標時間（台灣時間）。'
  return ''
}

/** 恢復的是原請求，不重新檢查「未來時間」，已成立的舊請求也必須能取回回執。 */
export function restoreListingIntent(raw) {
  try {
    const saved = JSON.parse(raw || 'null')
    if (
      !saved ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(saved.p_request_id || '') ||
      typeof saved.p_animal_id !== 'string' ||
      !saved.p_animal_id.trim() ||
      !Number.isSafeInteger(saved.p_start_price) ||
      saved.p_start_price < 0 ||
      !Number.isSafeInteger(saved.p_min_increment) ||
      saved.p_min_increment < 1 ||
      saved.p_start_price + saved.p_min_increment > MAX_BID_AMOUNT ||
      typeof saved.p_end_time !== 'string' ||
      !Number.isFinite(Date.parse(saved.p_end_time)) ||
      (saved.p_start_time !== null &&
        (typeof saved.p_start_time !== 'string' ||
          !Number.isFinite(Date.parse(saved.p_start_time)) ||
          Date.parse(saved.p_start_time) >= Date.parse(saved.p_end_time)))
    )
      return null
    const textFields = {
      p_note: 3000,
      p_shipping_info: 500,
      p_diet: 200,
      p_feeding_freq: 100,
      p_tongs_fed: 30
    }
    for (const [key, limit] of Object.entries(textFields)) {
      if (typeof saved[key] !== 'string' || [...saved[key]].length > limit) return null
    }
    saved.p_request_id = saved.p_request_id.toLowerCase()
    return Object.fromEntries(
      [
        'p_request_id',
        'p_animal_id',
        'p_start_price',
        'p_min_increment',
        'p_start_time',
        'p_end_time',
        ...Object.keys(textFields)
      ].map((key) => [key, saved[key]])
    )
  } catch {
    return null
  }
}
