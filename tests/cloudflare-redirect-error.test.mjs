import assert from 'node:assert/strict';
import { test } from 'node:test';
const initialFetch = globalThis.fetch;
const { createRedirectErrorFetch, installRedirectErrorFetch, redirectRejectionMessage } = await import('../cloudflare/redirect-error-fetch.mjs');
const url = 'https://synthetic.invalid/read-only';

test('pure module import and adapter creation perform no network or global installation', () => {
  assert.equal(globalThis.fetch, initialFetch);
  let calls=0;
  createRedirectErrorFetch(() => { calls++; throw new Error('must not run'); });
  assert.equal(calls,0);
});
test('native unsupported error mode is translated to one successful manual request', async () => {
  let calls=0;
  function native(input, init) {
    if(init?.redirect === 'error') throw new TypeError('Workers unsupported redirect mode');
    calls++; assert.equal(this,globalThis); assert.equal(input,url); assert.equal(init.redirect,'manual');
    return Promise.resolve(new Response('safe',{status:200}));
  }
  assert.throws(() => native(url,{redirect:'error'}),TypeError);
  assert.equal(calls,0);
  const response=await createRedirectErrorFetch(native)(url,{redirect:'error'});
  assert.equal(response.status,200); assert.equal(await response.text(),'safe'); assert.equal(calls,1);
});
for(const status of [301,302,303,307,308]) test(`redirect ${status} cancels the body, rejects safely and never follows`, async () => {
  let calls=0, cancelled=0;
  const body=new ReadableStream({cancel(){cancelled++;}});
  const native=(_input,init) => {
    calls++; assert.equal(init.redirect,'manual');
    return Promise.resolve(new Response(body,{status,headers:{Location:'https://sensitive.invalid/private?token=never-report-this'}}));
  };
  await assert.rejects(createRedirectErrorFetch(native)(url,{redirect:'error'}),error => error instanceof TypeError && error.message === redirectRejectionMessage && !error.message.includes('token'));
  assert.equal(calls,1); assert.equal(cancelled,1);
});
test('304 and other non-redirect responses are returned unchanged', async () => {
  for(const status of [200,204,300,304,400,401,403,500]) {
    const response=new Response(null,{status});
    assert.equal(await createRedirectErrorFetch(() => Promise.resolve(response))(url,{redirect:'error'}),response);
  }
});
test('manual, follow and unspecified modes retain original arguments and native this', async () => {
  for(const init of [undefined,{redirect:'manual'},{redirect:'follow'},{redirect:null}]) {
    const response=new Response(null,{status:302});
    const adapted=createRedirectErrorFetch(function(input,received){assert.equal(this,globalThis);assert.equal(input,url);assert.equal(received,init);return Promise.resolve(response);});
    assert.equal(await adapted(url,init),response);
  }
  const adapted=createRedirectErrorFetch(function(){assert.equal(arguments.length,1);return Promise.resolve(new Response());});
  await adapted(url);
});
test('all RequestInit options and input body identity survive without mutation', async () => {
  const signal=new AbortController().signal;
  const headers=new Headers({Authorization:'synthetic-test-only'});
  const cf={cacheEverything:false};
  const init=Object.create({method:'POST',body:'synthetic body'});
  Object.defineProperty(init,'headers',{value:headers});
  Object.assign(init,{redirect:'error',signal,cf,cache:'no-store',duplex:'half'});
  const input=new Request(url,{method:'POST',body:'original Request body'});
  let calls=0;
  const adapted=createRedirectErrorFetch((received,options)=>{
    calls++; assert.equal(received,input); assert.equal(options.redirect,'manual');
    for(const key of ['method','body','headers','signal','cf','cache','duplex']) assert.equal(options[key],init[key]);
    assert.equal(input.bodyUsed,false); return Promise.resolve(new Response());
  });
  await adapted(input,init);
  assert.equal(init.redirect,'error'); assert.equal(Object.hasOwn(init,'method'),false);
  assert.equal(input.bodyUsed,false); assert.equal(calls,1);
});
test('Request mode and explicit init precedence follow the Fetch contract', async () => {
  const input=new Request(url,{redirect:'error'});
  let observed;
  const adapted=createRedirectErrorFetch((received,init)=>{assert.equal(received,input);observed=init;return Promise.resolve(new Response());});
  await adapted(input); assert.equal(observed.redirect,'manual'); assert.equal(input.redirect,'error');
  const override={redirect:'follow'}; await adapted(input,override); assert.equal(observed,override);
  const inherit={redirect:undefined}; await adapted(input,inherit); assert.equal(observed.redirect,'manual');
});
test('native rejection and synchronous failure propagate without retries or replacement', async () => {
  const sentinel=new Error('synthetic transport failure'); let calls=0;
  const rejected=createRedirectErrorFetch(()=>{calls++;return Promise.reject(sentinel);});
  await assert.rejects(rejected(url,{redirect:'error'}),error=>error===sentinel); assert.equal(calls,1);
  const thrown=createRedirectErrorFetch(()=>{throw sentinel;});
  assert.throws(()=>thrown(url,{redirect:'error'}),error=>error===sentinel);
});
test('body cancellation failure cannot expose or permit a redirect', async () => {
  let calls=0;
  const response=new Response(new ReadableStream({cancel(){throw new Error('private synthetic detail');}}),{status:302,headers:{Location:url}});
  await assert.rejects(createRedirectErrorFetch(()=>{calls++;return Promise.resolve(response);})(url,{redirect:'error'}),error=>error instanceof TypeError && error.message===redirectRejectionMessage);
  assert.equal(calls,1);
});
test('explicit startup installer is idempotent and performs zero network calls', async () => {
  const original=globalThis.fetch; let calls=0;
  const native=()=>{calls++;return Promise.resolve(new Response());};
  try {
    globalThis.fetch=native;
    await import('../cloudflare/install-redirect-error-fetch.mjs');
    const first=globalThis.fetch;
    assert.notEqual(first,native); installRedirectErrorFetch(); assert.equal(globalThis.fetch,first);
    assert.equal(calls,0);
    await globalThis.fetch(url,{redirect:'error'}); assert.equal(calls,1);
  } finally {globalThis.fetch=original;}
});
