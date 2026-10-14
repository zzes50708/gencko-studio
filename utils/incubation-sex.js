// 依提供的孵化溫度表顯示預期比例，不視為已確認性別。
export function getIncubationEstimate(species, value) {
  const raw = String(value ?? '')
    .normalize('NFKC')
    .trim()
  if (!/^\d+(?:\.\d+)?(?:\s*(?:°?C|℃|度))?$/i.test(raw)) return { label: '', tone: 'mix' }
  const t = Number.parseFloat(raw)
  if (species === '豹紋守宮') {
    if (t >= 24 && t < 27) return { label: '絕大多數母', tone: 'female' }
    if (t >= 27 && t < 28) return { label: '約25%公／75%母', tone: 'female' }
    if (t >= 28 && t < 30) return { label: '公母各約50%', tone: 'mix' }
    if (t >= 30 && t < 31) return { label: '約70～75%公／25%母', tone: 'male' }
    if (t >= 31 && t <= 33) return { label: '絕大多數公', tone: 'male' }
  }
  if (species === '肥尾守宮') {
    if (t >= 32) return { label: '多為高溫母，不建議', tone: 'female' }
    if (t >= 26 && t < 28) return { label: '絕大多數母', tone: 'female' }
    if (t >= 28 && t <= 29.5) return { label: '公母各約50%', tone: 'mix' }
    if (t >= 30 && t < 32) return { label: '絕大多數公', tone: 'male' }
  }
  return { label: '比例未提供', tone: 'mix' }
}

export function formatAnimalSex(item, { disclaimer = true, fallback = '未登錄' } = {}) {
  const type = String(item?.GenderType ?? '').trim()
  if (type !== '溫控') return type || fallback
  const raw = String(item?.GenderValue ?? '')
    .normalize('NFKC')
    .trim()
  const estimate = getIncubationEstimate(item?.Species, raw).label
  const temperature = raw ? `孵化溫度:${raw.replace(/\s*(?:°?C|℃|度)$/i, '')}度` : '孵化溫度未登錄'
  const notes = [estimate, disclaimer ? '不保證性別' : ''].filter(Boolean)
  return `${temperature}${notes.length ? `（${notes.join('，')}）` : ''}`
}

export function getAnimalSexTone(item) {
  if (item?.GenderType === '公') return 'male'
  if (item?.GenderType === '母') return 'female'
  return item?.GenderType === '溫控'
    ? getIncubationEstimate(item.Species, item.GenderValue).tone
    : 'mix'
}
