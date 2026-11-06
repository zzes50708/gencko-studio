const target=process.env.AUDIT_URL||'http://127.0.0.1:3001'
let available=false
for(let attempt=0;attempt<60;attempt++){
  try { const response=await fetch(`${target}/certificates`,{signal:AbortSignal.timeout(2000)});if(response.ok){available=true;break} } catch {}
  await new Promise(resolve=>setTimeout(resolve,1000))
}
if(!available)throw new Error('正式模式網站未在期限內就緒')
console.log('正式模式網站已就緒')
