import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);
const json = name => JSON.parse(readFileSync(new URL(name, root)));
const manifest = json('validation/t13/commit-manifest.json');
const equivalence = json('validation/t13/source-equivalence.json');
const results = json('validation/t13/reconciliation-results.json');
for (const row of manifest.files) {
  const actual = createHash('sha256').update(readFileSync(new URL(row.path, root))).digest('hex');
  assert.equal(actual, row.sha256, row.path);
}
for (const row of equivalence.byte_identical_validated_files) {
  assert.equal(row.source_sha256, row.candidate_sha256, row.file);
  assert.equal(createHash('sha256').update(readFileSync(new URL(row.file, root))).digest('hex'), row.source_sha256, row.file);
}
for (const name of equivalence.excluded_whole_files) assert.equal(existsSync(new URL(name, root)), false, name);
assert.equal(results.application.fail, 0);
assert.equal(results.sqlite.fail, 0);
assert.equal(results.build.exit_code, 0);
assert.equal(results.browser.failed, 0);
assert.equal(results.verdict, 'READY FOR FOUNDER COMMIT APPROVAL');
console.log('PASS candidate file hashes, exact validated T13 sources, explicit scope exclusions and recorded validation. Manifest excludes its own self-hash; this is offline integrity verification, not a live test.');
