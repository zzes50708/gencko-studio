const encoder = new TextEncoder()
export const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('')
export const hash = async (value:string) => hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)))
export const validFlow = (value:unknown) => typeof value==='string' && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value)
export const validProof = (value:unknown) => typeof value==='string' && /^[\da-f]{64}$/.test(value)

/** 短效授權碼在私人暫存區仍加密，金鑰只由 Edge Function 持有。 */
export async function codeCipher(secret:string) {
  const key=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(`line-relay-v1:${secret}`)),{name:'AES-GCM'},false,['encrypt','decrypt'])
  return {
    async seal(value:string, flow:string) {
      const iv=crypto.getRandomValues(new Uint8Array(12))
      const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(flow)},key,encoder.encode(value))
      return `${hex(iv.buffer)}.${hex(encrypted)}`
    },
    async open(value:string, flow:string) {
      const [iv,encrypted]=value.split('.')
      const bytes=(h:string)=>new Uint8Array(h.match(/../g)!.map(v=>parseInt(v,16)))
      const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:encoder.encode(flow)},key,bytes(encrypted))
      return new TextDecoder().decode(decoded)
    }
  }
}
