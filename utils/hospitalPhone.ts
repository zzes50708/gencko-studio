export function hospitalPhone(value: unknown) {
  const text = String(value || '').trim()
  const match = text.match(/^(.*?)(?:#|分機|轉|ext\.?|extension)\s*[:：]?\s*(\d+)\s*$/i)
  const number = (match ? match[1] : text)?.trim() || ''
  const digits = number.replace(/\D/g, '')
  return {
    number,
    extension: match?.[2] || '',
    href: digits ? `tel:${number.startsWith('+') ? '+' : ''}${digits}` : ''
  }
}

export function hospitalPhoneE164(value: unknown) {
  const { number } = hospitalPhone(value)
  const digits = number.replace(/\D/g, '')
  if (!digits) return null
  if (number.startsWith('+')) return `+${digits}`
  return `+886${digits.startsWith('0') ? digits.slice(1) : digits}`
}
