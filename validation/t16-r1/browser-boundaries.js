async page => {
  const origin='http://localhost:3104',results=[],requests=[],pageErrors=[];
  const check=(name,ok)=>{results.push({name,result:ok?'LOCAL PASS':'FAIL'});if(!ok)throw Error(name);};
  const errorListener=error=>pageErrors.push(error.name);
  const requestListener=request=>{const url=new URL(request.url());if(url.origin===origin&&url.pathname.startsWith('/api/founder/'))requests.push({path:url.pathname,action:request.postDataJSON()?.action});};
  page.on('pageerror',errorListener);page.on('request',requestListener);
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const hold=async route=>{if(route.request().postDataJSON()?.action==='summary')await gate;await route.continue();};
  await page.route(origin+'/api/founder/operations',hold);
  try {
    await page.goto(origin+'/founder/operations');
    await page.getByRole('status').filter({hasText:'Working…'}).waitFor();
    check('T16 pending snapshot exposes busy state and disables reload',
      await page.locator('section[aria-busy="true"]').count()===1&&await page.getByRole('button',{name:'Reload snapshot',exact:true}).isDisabled());
    check('T16 pending source stays unverified without a service health claim',
      await page.getByText('Database source not verified until a snapshot loads. No service health claim.',{exact:true}).count()===1&&await page.getByText(/Snapshot captured:/).count()===0);
  } finally {
    release();
  }
  await page.getByRole('status').filter({hasText:'Snapshot loaded.'}).waitFor();
  await page.unroute(origin+'/api/founder/operations',hold);
  check('T16 dashboard load issues one summary request and no content/asset listing',
    requests.length===1&&requests[0].path==='/api/founder/operations'&&requests[0].action==='summary');
  const summary=()=>page.request.post(origin+'/api/founder/operations',{headers:{Origin:origin},data:{action:'summary'}});
  let response=await summary();const body=await response.json();
  check('T16 authenticated summary is no-store with only source/time and six counts',
    response.status()===200&&response.headers()['cache-control']==='no-store'&&body.data.source==='LOCAL_SQLITE_FIXTURE'&&
    Object.keys(body.data).join(',')==='source,captured_at,content,assets'&&Object.keys(body.data.content).length===3&&Object.keys(body.data.assets).length===3);
  await page.request.get(origin+'/__fixture/session?role=user',{maxRedirects:0});
  await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Access denied.'}).waitFor();
  response=await summary();
  check('T16 synthetic USER receives server 403 and prior private snapshot disappears',
    response.status()===403&&await page.getByText(/Snapshot captured:/).count()===0&&await page.getByText(/^(DRAFT|RELEASED|WITHDRAWN|PENDING|READY|DELETING): \d+$/).count()===0);
  await page.request.get(origin+'/__fixture/session?role=anonymous',{maxRedirects:0});
  response=await summary();
  check('T16 anonymous browser request receives server 401',response.status()===401);
  page.off('pageerror',errorListener);page.off('request',requestListener);
  if(pageErrors.length)throw Error('Unexpected page JavaScript error');
  return {scope:'LOCAL SQLite and synthetic session only; no live authentication',results,page_errors:pageErrors};
}
