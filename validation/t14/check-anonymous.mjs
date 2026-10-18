import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const origin='http://localhost:3103',results=[];
for(const [path,payload] of [
  ['/api/founder/assets',{action:'reserve',request_id:'00000000-0000-4000-8000-000000000014',asset_type:'IMAGE',mime_type:'image/png',original_filename:'synthetic.png',byte_size:68}],
  ['/api/founder/operations',{action:'assets',cursor:null}],
]){
  const r=await fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'manual'});
  assert.equal(r.headers.get('x-htc-validation-target'),'SUPABASE-TEST-uzhkzhmncxjplrdtdzgd');
  assert.equal(r.status,401);await r.body?.cancel();results.push({path,status:r.status,result:'LIVE ANONYMOUS DENIAL PASS'});
}
const page=await fetch(origin+'/founder/assets',{redirect:'manual'});
assert.ok([303,307].includes(page.status));assert.equal(new URL(page.headers.get('location'),origin).pathname,'/sign-in');
await page.body?.cancel();results.push({path:'/founder/assets',status:page.status,result:'LIVE ANONYMOUS REDIRECT PASS'});
const proxy=await fetch(origin+'/api/founder/assets/upload',{method:'POST',redirect:'manual'});
assert.equal(proxy.status,404);await proxy.body?.cancel();results.push({path:'/api/founder/assets/upload',status:404,result:'OBSOLETE BINARY PROXY ABSENT'});
writeFileSync(new URL('./live-anonymous-results.json',import.meta.url),JSON.stringify({target:'uzhkzhmncxjplrdtdzgd',syntheticAuth:false,results},null,2)+'\n');
console.log(JSON.stringify({checks:results.length,result:'PASS',scope:'Live TEST runner; unauthenticated requests only, no binary or Founder session proof'}));
