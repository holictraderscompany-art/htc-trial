async page => {
  const origin='http://localhost:3104',results=[];
  const check=(name,ok)=>{results.push({name,result:ok?'LOCAL PASS':'FAIL'});if(!ok)throw Error(name);};
  const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const session=async role=>{await page.goto(`${origin}/__fixture/session?role=${role}`);};
  const loaded=()=>page.getByRole('status').filter({hasText:'Snapshot loaded.'}).waitFor();
  const open=async route=>{await page.goto(origin+route);await loaded();};
  const select=async n=>{await page.getByRole('combobox',{name:'Content',exact:true}).selectOption(id(n));await page.getByRole('status').filter({hasText:'Content relations loaded.'}).waitFor();};
  const operation=async payload=>page.evaluate(async payload=>{const r=await fetch('/api/founder/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,body:await r.json()};},payload);
  const transition=async name=>{await page.getByRole('button',{name,exact:true}).click();await page.getByRole('status').filter({hasText:'Operation confirmed.'}).waitFor();};
  await session('founder');await open('/founder/publishing');
  check('T15 existing protected publishing route and LOCAL label',await page.getByRole('heading',{name:'Publishing operations',exact:true}).count()===1&&await page.getByText(/LOCAL SQLite fixture/).count()===1);
  check('T15 no action without selected content',await page.getByRole('button',{name:'Release content',exact:true}).isDisabled()&&await page.getByRole('button',{name:'Withdraw content',exact:true}).isDisabled());
  await select(11);check('DRAFT release allowed, withdrawal disabled',await page.getByRole('button',{name:'Release content',exact:true}).isEnabled()&&await page.getByRole('button',{name:'Withdraw content',exact:true}).isDisabled());
  await transition('Release content');await select(11);
  check('Confirmed release readback and buttons',await page.getByText('Selected state: RELEASED',{exact:true}).count()===1&&await page.getByRole('button',{name:'Release content',exact:true}).isDisabled());
  let r=await page.request.get(origin+'/api/content?id='+id(11));check('Released fixture visible through existing public API',r.status()===200&&(await r.json()).data.id===id(11));
  check('Repeated release rejected by API',(await operation({action:'release',id:id(11)})).status===409);
  await transition('Withdraw content');await select(11);
  check('Confirmed withdrawal readback',await page.getByText('Selected state: WITHDRAWN',{exact:true}).count()===1);
  r=await page.request.get(origin+'/api/content?id='+id(11));check('Withdrawn fixture absent from public API',r.status()===404);
  check('Repeated withdrawal rejected by API',(await operation({action:'withdraw',id:id(11)})).status===409);
  await select(12);await page.request.get(origin+'/__fixture/uncertain');
  await page.getByRole('button',{name:'Release content',exact:true}).click();await page.getByRole('status').filter({hasText:'Operation result is uncertain.'}).waitFor();
  check('Ambiguous release blocks blind retry',await page.getByRole('button',{name:'Release content',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();await loaded();await select(12);
  check('Explicit reload recovers committed release',await page.getByText('Selected state: RELEASED',{exact:true}).count()===1);
  await transition('Withdraw content');
  await open('/founder/operations');
  check('T16 known content counts',await page.getByText('DRAFT: 49',{exact:true}).count()===1&&await page.getByText('RELEASED: 1',{exact:true}).count()===1&&await page.getByText('WITHDRAWN: 3',{exact:true}).count()===1);
  check('T16 known asset counts',await page.getByText('PENDING: 1',{exact:true}).count()===1&&await page.getByText('READY: 1',{exact:true}).count()===1&&await page.getByText('DELETING: 1',{exact:true}).count()===1);
  check('T16 truthful source, capture time, read-only UI',await page.getByText(/LOCAL SQLite fixture/).count()===1&&await page.getByText(/Snapshot captured:/).count()===1&&await page.getByRole('button').filter({hasText:/Release content|Withdraw content|Delete unlinked asset|Upload private asset/}).count()===0);
  for(const [name,route] of [['Content workspace','/founder/content'],['Asset workspace','/founder/assets'],['Publishing','/founder/publishing']]){
    const link=page.getByRole('navigation',{name:'Founder navigation'}).getByRole('link',{name,exact:true});await link.click();check('T16 navigation '+name,new URL(page.url()).pathname===route);await open('/founder/operations');
  }
  await page.request.get(origin+'/__fixture/unavailable?enabled=1');await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();await page.getByRole('status').filter({hasText:'Unavailable.'}).waitFor();
  check('T16 unavailable displays stale warning, never healthy',await page.getByText('Snapshot stale or unavailable. Reload to verify current state.',{exact:true}).count()===1&&await page.getByText('DRAFT: 49',{exact:true}).count()===1);
  await page.request.get(origin+'/__fixture/unavailable?enabled=0');await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();await loaded();
  for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});check('T16 responsive '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.request.get(origin+'/__fixture/session?role=expired',{maxRedirects:0});await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();await page.getByRole('status').filter({hasText:'Session expired.'}).waitFor();
  check('Expired session removes private summary',await page.getByText(/Snapshot captured:/).count()===0&&await page.getByText('DRAFT: 49',{exact:true}).count()===0);
  await session('user');
  for(const route of ['/founder/publishing','/founder/operations']){await page.goto(origin+route);await page.getByRole('heading',{name:'Access denied',exact:true}).waitFor();check('USER direct URL denial '+route,await page.getByRole('heading',{name:/Publishing operations|Operations overview/}).count()===0);}
  for(const p of [{action:'summary'},{action:'release',id:id(11)},{action:'withdraw',id:id(11)}])check('USER API denial '+p.action,(await operation(p)).status===403);
  await session('anonymous');for(const route of ['/founder/publishing','/founder/operations']){await page.goto(origin+route);check('Anonymous redirect '+route,new URL(page.url()).pathname==='/sign-in');}
  await session('founder');await page.request.get(origin+'/__fixture/empty');await open('/founder/operations');
  check('T16 genuine empty snapshot has six zeros',await page.getByText(/^(DRAFT|RELEASED|WITHDRAWN|PENDING|READY|DELETING): 0$/).count()===6);
  return {scope:'LOCAL SQLite only; synthetic identities, no live OAuth/Storage/PostgreSQL concurrency',results};
}
