async page => {
  const origin='http://localhost:3104',results=[];
  const id='00000000-0000-4000-8000-000000000011';
  const check=(name,ok)=>{results.push({name,result:ok?'LOCAL PASS':'FAIL'});if(!ok)throw Error(name);};
  const pageErrors=[];
  const recordPageError=error=>pageErrors.push(error.name);
  page.on('pageerror',recordPageError);
  await page.context().route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const session=async role=>{await page.goto(`${origin}/__fixture/session?role=${role}`);};
  const loaded=()=>page.getByRole('status').filter({hasText:'Snapshot loaded.'}).waitFor();
  const open=async()=>{await page.goto(origin+'/founder/publishing');await loaded();};
  const select=async()=>{await page.getByRole('combobox',{name:'Content',exact:true}).selectOption(id);await page.getByRole('status').filter({hasText:'Content relations loaded.'}).waitFor();};
  const release=()=>page.getByRole('button',{name:'Release content',exact:true});
  const withdraw=()=>page.getByRole('button',{name:'Withdraw content',exact:true});
  const transition=async button=>{await button.click();await page.getByRole('status').filter({hasText:'Operation confirmed.'}).waitFor();};
  const operation=async payload=>page.evaluate(async payload=>{
    const r=await fetch('/api/founder/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});return r.status;
  },payload);
  await session('founder');await open();
  check('Protected publishing UI and explicit LOCAL fixture source',await page.getByRole('heading',{name:'Publishing operations',exact:true}).count()===1&&await page.getByText(/LOCAL SQLite fixture/).count()===1);
  check('Publishing navigation present; T16 navigation absent',await page.getByRole('navigation',{name:'Founder navigation'}).getByRole('link',{name:'Publishing',exact:true}).count()===1&&await page.locator('a[href="/founder/operations"]').count()===0);
  check('No publishing operation without content selection',await release().isDisabled()&&await withdraw().isDisabled());
  check('Publishing view has no upload or asset mutation controls',await page.getByRole('button').filter({hasText:/Upload private asset|Delete unlinked asset|Attach asset/}).count()===0);
  await select();check('DRAFT release allowed and withdrawal disabled',await release().isEnabled()&&await withdraw().isDisabled());
  await transition(release());await select();
  check('RELEASED readback disables duplicate release',await page.getByText('Selected state: RELEASED',{exact:true}).count()===1&&await release().isDisabled()&&await withdraw().isEnabled());
  check('Duplicate release API returns409',await operation({action:'release',id})===409);
  await transition(withdraw());await select();
  check('WITHDRAWN readback allows existing re-release contract',await page.getByText('Selected state: WITHDRAWN',{exact:true}).count()===1&&await release().isEnabled()&&await withdraw().isDisabled());
  check('Duplicate withdrawal API returns409',await operation({action:'withdraw',id})===409);
  await transition(release());await select();
  check('Re-release confirmed by current readback',await page.getByText('Selected state: RELEASED',{exact:true}).count()===1);
  await page.request.get(origin+'/__fixture/uncertain');await withdraw().click();
  await page.getByRole('status').filter({hasText:'Operation result is uncertain.'}).waitFor();
  check('Ambiguous committed transition blocks blind retry',await release().isDisabled()&&await withdraw().isDisabled());
  await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();await loaded();await select();
  check('Explicit reload recovers committed withdrawal',await page.getByText('Selected state: WITHDRAWN',{exact:true}).count()===1&&await release().isEnabled());
  check('T16 summary operation still rejected',await operation({action:'summary'})===400);
  for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:900});check('Publishing responsive without overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.request.get(origin+'/__fixture/session?role=expired',{maxRedirects:0});
  await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();await page.getByRole('status').filter({hasText:'Session expired.'}).waitFor();
  check('Expired session clears content and disables transitions',await page.getByRole('combobox',{name:'Content',exact:true}).locator('option').count()===1&&await release().isDisabled()&&await withdraw().isDisabled());
  await session('user');await page.goto(origin+'/founder/publishing');await page.getByRole('heading',{name:'Access denied',exact:true}).waitFor();
  check('USER route denied without publishing controls',await page.getByRole('heading',{name:'Publishing operations',exact:true}).count()===0);
  for(const action of ['release','withdraw'])check('USER server/API denial '+action,await operation({action,id})===403);
  await session('anonymous');await page.goto(origin+'/founder/publishing');
  check('Anonymous direct URL redirects to sign-in',new URL(page.url()).pathname==='/sign-in');
  for(const action of ['release','withdraw'])check('Anonymous API denial '+action,await operation({action,id})===401);
  check('No uncaught publishing browser JavaScript errors',pageErrors.length===0);
  page.off('pageerror',recordPageError);
  return {scope:'T15-R1 LOCAL SQLite/browser only; synthetic identity and metadata; no live OAuth, Storage or PostgreSQL concurrency',results};
}
