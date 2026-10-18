async page => {
  const results=[];
  const check=(name,ok)=>{results.push({name,result:ok?'LOCAL PASS':'FAIL'});if(!ok)throw Error(name);};
  const origin='http://localhost:3103';
  const session=async role=>{await page.goto(`${origin}/__fixture/session?role=${role}`);};
  const loaded=async()=>{await page.getByRole('status').filter({hasText:'Snapshot loaded.'}).waitFor();};
  const reload=async()=>{await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();await loaded();};
  const choose=async()=>{
    await page.getByRole('combobox',{name:'Content',exact:true}).selectOption('00000000-0000-4000-8000-000000000010');
    await page.getByRole('status').filter({hasText:'Content relations loaded.'}).waitFor();
    await page.getByRole('combobox',{name:'Asset metadata',exact:true}).selectOption('00000000-0000-4000-8000-000000000070');
  };
  await session('founder');await page.goto(origin+'/founder/assets');await loaded();
  check('T14 workspace and explicit LOCAL fixture label',await page.getByRole('heading',{name:'Media and asset workspace',exact:true}).count()===1 && await page.getByText(/LOCAL SQLite fixture/).count()===1);
  check('T14 navigation without T15/T16 pages',await page.getByRole('link',{name:'Asset workspace',exact:true}).count()===1 && await page.locator('a[href="/founder/publishing"],a[href="/founder/operations"]').count()===0);
  const options=await page.getByRole('combobox',{name:'Asset metadata',exact:true}).innerText();
  check('PENDING READY DELETING metadata',options.includes('PENDING')&&options.includes('READY')&&options.includes('DELETING'));
  check('No fake live binary upload in SQLite',await page.getByText('Upload unavailable in SQLite: metadata fixtures do not contain binary objects.').count()===1 && await page.getByRole('button',{name:'Upload private asset',exact:true}).count()===0);
  await choose();await page.getByRole('button',{name:'Attach asset',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Operation confirmed.'}).waitFor();
  await choose();check('READY attach and relation readback',await page.getByText('PRIMARY · 00000000-0000-4000-8000-000000000070',{exact:true}).count()===1);
  await page.getByRole('button',{name:'Delete unlinked asset',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Operation rejected.'}).waitFor();
  check('Linked delete denied and mutation blocked',await page.getByRole('button',{name:'Attach asset',exact:true}).isDisabled());
  await reload();await choose();await page.getByRole('button',{name:'Detach asset',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Operation confirmed.'}).waitFor();
  await choose();check('DRAFT detach readback',await page.getByText('PRIMARY · 00000000-0000-4000-8000-000000000070',{exact:true}).count()===0);
  await page.request.get(origin+'/__fixture/uncertain');
  await page.getByRole('button',{name:'Attach asset',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Operation result is uncertain.'}).waitFor();
  check('Ambiguous committed relation blocks blind retry',await page.getByRole('button',{name:'Attach asset',exact:true}).isDisabled());
  await reload();await choose();
  check('Explicit reload recovers committed relation',await page.getByText('PRIMARY · 00000000-0000-4000-8000-000000000070',{exact:true}).count()===1);
  await page.getByRole('combobox',{name:'Asset metadata',exact:true}).selectOption('00000000-0000-4000-8000-000000000071');
  check('PENDING attach disabled',await page.getByRole('button',{name:'Attach asset',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Load more content',exact:true}).click();
  await page.getByRole('status').filter({hasText:'More content loaded.'}).waitFor();
  for(const value of ['00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000062']){
    await page.getByRole('combobox',{name:'Content',exact:true}).selectOption(value);
    await page.getByRole('status').filter({hasText:'Content relations loaded.'}).waitFor();
    await page.getByRole('combobox',{name:'Asset metadata',exact:true}).selectOption('00000000-0000-4000-8000-000000000070');
    check('Non-DRAFT relation controls disabled '+value.slice(-2),await page.getByRole('button',{name:'Attach asset',exact:true}).isDisabled() && await page.getByRole('button',{name:'Detach asset',exact:true}).isDisabled());
  }
  for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});check('Responsive no overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  const excluded=await page.evaluate(async()=>{const r=await fetch('/api/founder/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'summary'})});return r.status;});
  check('T15/T16 actions absent from T14 endpoint',excluded===400);
  await session('user');await page.goto(origin+'/founder/assets');
  await page.getByRole('heading',{name:'Access denied',exact:true}).waitFor();
  check('USER direct URL denied without private workspace',await page.getByRole('combobox',{name:'Asset metadata',exact:true}).count()===0);
  const denial=await page.evaluate(async()=>{const r=await fetch('/api/founder/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'assets',cursor:null})});return r.status;});
  check('USER operation denied',denial===403);
  await session('founder');await page.goto(origin+'/founder/assets');await loaded();
  await page.request.get(origin+'/__fixture/session?role=expired',{maxRedirects:0});
  await page.getByRole('button',{name:'Reload snapshot',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Session expired.'}).waitFor();
  check('Session expiry clears private metadata and blocks mutations',await page.getByRole('combobox',{name:'Asset metadata',exact:true}).locator('option').count()===1 && await page.getByRole('button',{name:'Attach asset',exact:true}).isDisabled());
  await session('anonymous');await page.goto(origin+'/founder/assets');
  check('Anonymous direct URL redirects to sign-in',new URL(page.url()).pathname==='/sign-in');
  return {scope:'LOCAL SQLite, synthetic auth, no binary Storage or live OAuth',results};
}
