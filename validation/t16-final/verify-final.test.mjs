import test from 'node:test';
import assert from 'node:assert/strict';
import { read, verifyHistorical, verifyClosure } from './verify-final.mjs';

const replaceJson = (name, change) => file => {
  if (file !== name) return read(file);
  const value = JSON.parse(read(file));
  change(value);
  return Buffer.from(JSON.stringify(value));
};

test('original R1/R2 bytes and exact additive attribute correction verify', () => {
  assert.deepEqual(verifyHistorical(), { R1_records_including_manifest: 19, R2_records_including_manifest: 28 });
});
test('EOL conversion of historical R2 evidence is rejected', () => {
  const records = JSON.parse(read('validation/t16-r2/manifest.json')).files;
  const file = records.find(f => !read(f.path).equals(Buffer.from(read(f.path).toString().replace(/\r?\n/g, '\r\n')))).path;
  assert.throws(() => verifyHistorical(name => name === file ? Buffer.from(read(name).toString().replace(/\r?\n/g, '\r\n')) : read(name)));
});
test('regenerating a historical manifest cannot authorize a changed hash', () => {
  assert.throws(() => verifyHistorical(replaceJson('validation/t16-r2/manifest.json', m => { m.files[0].sha256 = '0'.repeat(64); })));
});
test('changing previous SQL EOL rules is rejected', () => {
  assert.throws(() => verifyHistorical(name => name === '.gitattributes'
    ? Buffer.from(read(name).toString().replace('20261011090000_trial_content_draft_only.sql text eol=crlf', '20261011090000_trial_content_draft_only.sql text eol=lf')) : read(name)));
});
test('preserved Auth, API/UI refresh and cleanup closure verify', () => {
  assert.equal(verifyClosure().auth, 'preserved LIVE PASS');
});
test('expiry accepted as authenticated cannot be relabeled PASS', () => {
  assert.throws(() => verifyClosure(replaceJson('validation/t16-final/closure.json', c => {
    c.auth.events.find(e => e.phase === 'AFTER_ORIGINAL_EXP_PLUS_90_SECONDS').protected_api_status = 200;
  })));
});
test('inconsistent UI counts or nonempty cleanup fail closed', () => {
  for (const mutate of [c => { c.nonempty.new_job.details.content.DRAFT = 2; }, c => { c.content_cleanup.after_snapshot.storage_objects = 1; }]) {
    assert.throws(() => verifyClosure(replaceJson('validation/t16-final/closure.json', mutate)));
  }
});
