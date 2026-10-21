import { createClient } from '@supabase/supabase-js'
import { codeCipher, hash, validFlow, validProof } from '../_shared/line-login-relay.ts'

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'private, no-store','referrer-policy':'no-referrer'}})

// 此入口處理尚未登入的 OAuth 流程，自行驗證每次發起的 256 位元秘密。
// 不接受客戶端提供的會員身分、verifier、access token 或 refresh token。
Deno.serve(async req=>{
  if(req.method!=='POST') return json({error:'METHOD_NOT_ALLOWED'},405)
  if(Number(req.headers.get('content-length'))>4096) return json({error:'INVALID_REQUEST'},400)
  const url=Deno.env.get('SUPABASE_URL')||'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
  if(!url||!key) return json({error:'UNAVAILABLE'},503)
  try {
    const raw=await req.text()
    if(raw.length>4096) return json({error:'INVALID_REQUEST'},400)
    const body=JSON.parse(raw)
    if(!validFlow(body.flow)) return json({error:'INVALID_REQUEST'},400)
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
    const table=()=>client.from('line_login_relays')
    const current=new Date().toISOString()
    if(body.action==='start') {
      if(!validProof(body.proof)) return json({error:'INVALID_REQUEST'},400)
      const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'
      const ipHash=await hash(`${key}:${ip}`)
      const {error}=await client.rpc('start_line_login_relay',{p_id:body.flow,p_proof:body.proof,p_ip_hash:ipHash})
      if(error) return json({error:'TRY_LATER'},429)
      return json({status:'ok'})
    }
    if(body.action==='complete') {
      if(typeof body.code!=='string'|| !/^[\w-]{10,2048}$/.test(body.code)||!validProof(body.returnProof)) return json({error:'INVALID_REQUEST'},400)
      const cipher=await codeCipher(key)
      // 只能完成一次，不讓重播或較舊回程覆寫。
      const {data,error}=await table().update({status:'ready',return_proof:body.returnProof,encrypted_code:await cipher.seal(body.code,body.flow),expires_at:new Date(Date.now()+4*60*1000).toISOString()})
        .eq('id',body.flow).eq('status','pending').gt('expires_at',current).select('id')
      if(error) return json({error:'UNAVAILABLE'},503)
      return json({status:data?.length?'ready':'expired'})
    }
    if(body.action==='fail') {
      await table().update({status:'failed'}).eq('id',body.flow).eq('status','pending').gt('expires_at',current)
      return json({status:'failed'})
    }
    if(!['read','ack'].includes(body.action)||!validProof(body.secret)) return json({error:'INVALID_REQUEST'},400)
    const proof=await hash(body.secret)
    if(body.action==='ack') {
      const {error}=await table().delete().eq('id',body.flow).eq('proof',proof)
      return error?json({error:'UNAVAILABLE'},503):json({status:'ok'})
    }
    const {data,error}=await table().select('status,encrypted_code,return_proof').eq('id',body.flow).eq('proof',proof).gt('expires_at',current).maybeSingle()
    if(error) return json({error:'UNAVAILABLE'},503)
    if(!data) return json({status:'expired'})
    if(data.status!=='ready') return json({status:data.status})
    if(!validProof(body.returnSecret) || await hash(body.returnSecret)!==data.return_proof)
      return json({status:'needs_transfer'})
    return json({status:'ready',code:await (await codeCipher(key)).open(data.encrypted_code,body.flow)})
  } catch { return json({error:'UNAVAILABLE'},503) }
})
