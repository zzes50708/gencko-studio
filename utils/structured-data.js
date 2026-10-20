/** JSON-LD 放入 HTML script 前必須轉義，不能讓資料中的結束標籤跳出 script。 */
export function serializeJsonLd(value) {
  const escapes = {
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
  }
  return JSON.stringify(value ?? null).replace(
    /[<>&\u2028\u2029]/g,
    (character) => escapes[character]
  )
}
