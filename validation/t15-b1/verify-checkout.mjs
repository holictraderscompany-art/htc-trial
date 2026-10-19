// Read-only post-commit verification. Never regenerates historical manifests or evidence.
// Run: node validation/t15-b1/verify-checkout.mjs [--checkout-root <export directory>]
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--checkout-root'), 'Invalid arguments');
const root = args.length ? path.resolve(args[1]) : repository;
const original = '68ecb871736489db25f592e5683d23124e0ef5b1';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (...args) => cp.execFileSync('git', args, { cwd: repository, maxBuffer: 32 * 1024 * 1024 });
const read = name => fs.readFileSync(path.join(root, name));
const parse = bytes => JSON.parse(bytes.toString('utf8'));
const originalJson = name => parse(git('show', original + ':' + name));
git('merge-base', '--is-ancestor', original, 'HEAD');

// These seals were independently checked against the approved T15 commit, not regenerated.
const seals = {
  'validation/t15-master/commit-manifest.json': 'f5d821c77c8dee45b508f4073529494de465603735151e9489a8db0cc593dae9',
  'validation/t15-r1/file-manifest.json': 'c75bbaa3d53b1261b5500a8a8a957398580880c203084084638a7f0cb0f70752',
};
for (const [name, digest] of Object.entries(seals)) {
  assert.equal(sha(git('show', original + ':' + name)), digest, 'Original manifest seal: ' + name);
  assert.equal(sha(read(name)), digest, 'Checkout manifest seal: ' + name);
}
const master = originalJson('validation/t15-master/commit-manifest.json');
const r1 = originalJson('validation/t15-r1/file-manifest.json');
assert.equal(master.files.length, 60);
assert.equal(master.includedPaths.length, 61);
assert.equal(r1.files.length, 23);

// Read original blobs in one request. Preserve binary bytes and reject missing objects.
const packed = cp.execFileSync('git', ['cat-file', '--batch'], {
  cwd: repository, input: master.files.map(f => original + ':' + f.path).join('\n') + '\n',
  maxBuffer: 32 * 1024 * 1024,
});
const originals = new Map();
let offset = 0;
for (const record of master.files) {
  const end = packed.indexOf(10, offset);
  const header = packed.subarray(offset, end).toString('utf8');
  assert.match(header, /^[a-f0-9]{40} blob \d+$/);
  const size = Number(header.split(' ')[2]);
  const blob = packed.subarray(end + 1, end + 1 + size);
  assert.equal(sha(blob), record.canonical_lf_sha256, 'Original Git blob: ' + record.path);
  // Git stored canonical LF for six historically CRLF files. Reconstruct only if
  // the result matches the already sealed original working-byte digest exactly.
  const historical = sha(blob) === record.working_tree_sha256 ? blob
    : Buffer.from(blob.toString('utf8').replace(/\n/g, '\r\n'), 'utf8');
  assert.equal(sha(historical), record.working_tree_sha256, 'Historical bytes: ' + record.path);
  originals.set(record.path, historical);
  offset = end + 1 + size;
  assert.equal(packed[offset++], 10);
}
assert.equal(offset, packed.length);

const policy = parse(read('validation/t15-b1/checkout-policy.json'));
assert.equal(policy.original_commit, original);
assert.equal(sha(originals.get('.gitattributes')), policy.original_attributes_sha256);
const expectedAttributes = Buffer.concat([originals.get('.gitattributes'), Buffer.from(policy.attributes_suffix, 'utf8')]);
assert.equal(sha(expectedAttributes), policy.corrected_attributes_sha256);
assert.deepEqual(read('.gitattributes'), expectedAttributes, 'Only the reviewed additive EOL rules are permitted');

// The historical .gitattributes snapshot remains valid at original; the sole
// intentional current delta is checked exactly above, never silently exempted.
for (const record of master.files) {
  if (record.path !== '.gitattributes') {
    assert.equal(sha(read(record.path)), record.working_tree_sha256, 'Exact checkout bytes: ' + record.path);
  }
}
const r1Results = r1.files.map(record => {
  assert.equal(sha(originals.get(record.path)), record.sha256, 'R1 original seal: ' + record.path);
  const actual = sha(read(record.path));
  if (record.path !== '.gitattributes') assert.equal(actual, record.sha256, 'R1 checkout bytes: ' + record.path);
  return { path: record.path, historical_sha256: record.sha256, checkout_sha256: actual,
    result: record.path === '.gitattributes' ? 'PASS_APPROVED_EOL_CONFIGURATION_DELTA' : 'PASS_EXACT_BYTES' };
});
const preserved = parse(read('validation/t15-master/r2c-integrity.json'));
assert.equal(preserved.copies.length, 5);
for (const file of preserved.copies) {
  assert.equal(sha(read('validation/t15-master/r2c-preserved/' + file.file)), file.sha256, 'R2C seal: ' + file.file);
}
assert.equal(sha(read('validation/t15-master/r2c-preserved/final-verification.json')),
  '64bbbcadb9b89780b166c6a86c1f68d78e88363167e9bc148c0db692b85e88c3');
const history = parse(read('validation/test-db/history.json'));
assert.equal(history.project_id, 'uzhkzhmncxjplrdtdzgd');
assert.equal(history.migrations.length, 10);
for (const record of history.migrations) {
  assert.equal(sha(read('validation/test-db/supabase/migrations/' + record.version + '_' + record.name + '.sql')),
    record.source_sha256, 'Recorded TEST SQL: ' + record.name);
}
console.log(JSON.stringify({ result: 'PASS', original_commit: original, r1_snapshots: 23,
  r1_exact_current_bytes: 22, approved_configuration_deltas: 1,
  master_exact_current_files: 59, original_master_manifest_unchanged: true,
  r2c_preserved_files: 5, recorded_test_sql_hashes: 10,
  note: 'Byte integrity only; no database access, runtime replay, or historical evidence regeneration.',
  r1_results: r1Results }, null, 2));
