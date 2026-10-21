// Read-only consolidation verifier. No network, database, report generation or Git mutation.
// Run from any directory: node validation/t16-final/verify-final.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const target = 'uzhkzhmncxjplrdtdzgd';
const baseline = '510d94473d9ddd42f774472f6ebd2423764a66b1';
const r1Seal = '70d1641831632f02a9f19392fb7cd879a2325720945d1673c9957440105a29ae';
const r2Seal = '5608c98c80413ae016fae200bc79008dbeaa2ce504f39c0bd3e26e2aacb4bf61';
const originalAttributesSeal = '395e0ad83cc7d9391ae185826348e6f3f62b89d9ebcc5abad862fecadac6ddce';
const suffix = '# T16 final audit: preserve raw historical R2 bytes (including mixed EOL).\n'
  + 'validation/t16-r2/** -text\n'
  + '# Approved input documents remain byte-identical to Founder-supplied files.\n'
  + 'docs/HTC-TRIAL-PRD-TASK-MAP-v3.0.md -text\n'
  + 'docs/HTC-GROUP3-IMPLEMENTATION-CONTRACT.md -text\n'
  + 'docs/group03-baseline-and-t16-closure.md text eol=lf\n'
  + 'validation/t16-final/** text eol=lf\n';
export const read = name => fs.readFileSync(path.join(root, name));
const parse = (readBytes, name) => JSON.parse(readBytes(name));
const counts = (record, value) => {
  assert.deepEqual(record.content, { DRAFT: value, RELEASED: value, WITHDRAWN: value });
  assert.deepEqual(record.assets, { PENDING: value, READY: value, DELETING: value });
};

export function verifyHistorical(readBytes = read) {
  assert.equal(sha(readBytes('validation/t16-r1/reconciliation-manifest.json')), r1Seal, 'Original R1 manifest');
  assert.equal(sha(readBytes('validation/t16-r2/manifest.json')), r2Seal, 'Original R2 manifest');
  const r1 = parse(readBytes, 'validation/t16-r1/reconciliation-manifest.json');
  const r2 = parse(readBytes, 'validation/t16-r2/manifest.json');
  assert.equal(r1.files.length, 18);
  assert.equal(r2.files.length, 27);
  assert.equal(r2.R1_manifest_sha256, r1Seal);
  const attributes = readBytes('.gitattributes');
  assert(attributes.subarray(-Buffer.byteLength(suffix)).equals(Buffer.from(suffix)), 'Exact additive EOL correction');
  const original = attributes.subarray(0, -Buffer.byteLength(suffix));
  assert.equal(sha(original), originalAttributesSeal, 'Every previous attribute rule preserved');
  for (const f of [...r1.files, ...r2.files]) {
    assert.equal(sha(f.path === '.gitattributes' ? original : readBytes(f.path)), f.sha256, f.path);
  }
  return { R1_records_including_manifest: 19, R2_records_including_manifest: 28 };
}

export function verifyClosure(readBytes = read) {
  const c = parse(readBytes, 'validation/t16-final/closure.json');
  assert.equal(c.target, target);
  assert.equal(c.verdict, 'T16 FULL PASS');
  assert.equal(c.no_new_mutations, true);
  assert.equal(c.T17_started, false);
  assert.equal(c.checkout_policy.historical_hashes_regenerated, false);
  assert.equal(c.checkout_policy.original_gitattributes_sha256, originalAttributesSeal);
  assert.equal(c.checkout_policy.append_utf8, suffix);
  assert.equal(c.checkout_policy.result_sha256, sha(readBytes('.gitattributes')));
  assert.equal(c.checkout_policy.historical_R1_manifest_sha256, r1Seal);
  assert.equal(c.checkout_policy.historical_R2_manifest_sha256, r2Seal);
  for (const f of c.baseline.source_documents) assert.equal(sha(readBytes(f.path)), f.sha256, f.path);
  assert.equal(c.provenance.verified_linked_sources, 13);
  assert.equal(c.provenance.sources.length, 13);
  assert.equal(c.provenance.originals_preserved, true);
  const provenance = new Map(c.provenance.sources.map(s => [s.file, s.sha256]));
  for (const s of c.provenance.sources) {
    assert.match(s.sha256, /^[a-f0-9]{64}$/);
    if (s.archive === 'repository') assert.equal(sha(readBytes(s.file)), s.sha256);
  }
  assert.equal(c.auth.source_sha256, provenance.get('auth-runtime.json'));
  assert.equal(c.nonempty.source_sha256, provenance.get('UI-ALL111-RECOVERY-20261022-PASS.json'));
  assert.equal(c.asset_cleanup.source_sha256, provenance.get('ASSET-CLEANUP-20261022-PASS.json'));
  const a = c.auth;
  assert.equal(a.target, target);
  assert.equal(a.logout_attempts, 1);
  assert(a.official_local_logout_confirmed && a.expiry_observation_complete && a.volatile_token_discarded);
  assert.equal(a.original_ttl_seconds, 3600);
  assert.equal(a.events.find(e => e.event === 'official_local_logout_response').provider_status, 204);
  const observations = a.events.filter(e => e.event === 'jwt_observation');
  assert.equal(observations.length, 3);
  assert.equal(observations[0].protected_api_status, 200);
  for (const e of observations.slice(1)) {
    assert.equal(e.provider_status, 403);
    assert.equal(e.protected_api_status, 401);
    assert.equal(e.count_rpc_calls, 0);
  }
  assert.equal(observations[2].phase, 'AFTER_ORIGINAL_EXP_PLUS_90_SECONDS');
  assert.equal(observations[2].provider_expiry_explicit, true);
  assert(Date.parse(observations[2].at) >= Date.parse(a.expiry_probe_scheduled_at));
  const n = c.nonempty;
  assert.equal(n.target, target);
  assert.equal(n.old_job.status, 'FAILED');
  assert(n.old_job.stop_preserved && n.exactly_one_successor && !n.active_job);
  assert.equal(n.new_job.ok, true);
  assert.deepEqual(n.new_job.statuses, [200]);
  assert.equal(n.dashboard_http.status, 200);
  counts(n.postgresql, 1);
  counts(n.new_job.details, 1);
  assert.equal(n.new_job.details.source, 'SUPABASE_DATABASE');
  assert(Date.parse(n.new_job.details.refresh_captured_at) > Date.parse(n.new_job.details.captured_at));
  assert.equal(n.count_api_events.length, 2);
  for (const [i, event] of n.count_api_events.entries()) {
    assert.equal(event.status, 200);
    assert.equal(event.path, '/rest/v1/rpc/founder_operation_counts');
    assert.equal(event.summary.source, 'SUPABASE_DATABASE');
    counts(event.summary, 1);
    assert.equal(event.summary.captured_at, i ? n.new_job.details.refresh_captured_at : n.new_job.details.captured_at);
  }
  const cleanup = c.asset_cleanup;
  assert.deepEqual(cleanup.operations.map(o => o.slot), ['AP', 'AR', 'AD']);
  assert.equal(new Set(cleanup.operations.map(o => o.id)).size, 3);
  for (const o of cleanup.operations) {
    assert.equal(o.bucket, 'trial-assets');
    assert.equal(o.exact_path, `image/${o.id}/asset.png`);
    assert(o.receipt.ok);
    assert.deepEqual(o.receipt.statuses, [200]);
    assert(o.server_events.some(e => e.path === '/storage/v1/object/trial-assets' && e.method === 'DELETE' && e.status === 200));
    assert.equal(o.after.relations, 0);
  }
  assert.equal(cleanup.automatic_retries, 0);
  assert(cleanup.content_rows_unchanged && cleanup.migration_and_security_hashes_unchanged && cleanup.old_STOP_receipts_claims_unchanged);
  assert(Object.values(cleanup.final.assets).every(x => x === 0));
  assert.equal(cleanup.final.storage_objects, 0);
  const end = c.content_cleanup;
  assert(end.execution_success && end.do_not_replay);
  assert.equal(end.R2_submission_count, 1);
  assert.equal(end.automatic_retries, 0);
  assert.equal(end.deleted_content_rows, 3);
  assert.deepEqual(end.deleted_ids, [
    '0bf0a5d2-e13f-40af-b366-3b3ce4baa02c',
    'fcd2cb3e-f23e-4cfb-8da6-26f254b5c31c',
    '3b5b15be-df37-40d9-8cf1-3bdb2e044287',
  ]);
  assert.deepEqual(end.execution_receipt.exact_ids, end.deleted_ids);
  assert.equal(end.sql_sha256, provenance.get('content-cleanup-guard-fixed-20261022-review.sql'));
  assert.equal(end.execution_receipt.sql_sha256, end.sql_sha256);
  assert.equal(end.execution_result.isError, false);
  assert.deepEqual(end.execution_result.sql_result, []);
  counts(end.after_snapshot, 0);
  assert.equal(end.after_snapshot.relations, 0);
  assert.equal(end.after_snapshot.storage_objects, 0);
  assert.equal(end.after_snapshot.history_count, 10);
  for (const key of Object.keys(end.after_snapshot).filter(k => k.endsWith('_sha256'))) {
    assert.equal(end.after_snapshot[key], end.before_security_snapshot[key], key);
  }
  assert.equal(parse(readBytes, 'validation/t16-r2/results.json').verdict, 'PARTIAL');
  const user = parse(readBytes, 'validation/t16-r2/user-live.json');
  assert(user.session.authenticated && !user.session.founder);
  assert.equal(user.summary.status, 403);
  const founder = parse(readBytes, 'validation/t16-r2/founder-ui.json');
  assert(founder.server_authenticated && founder.server_founder && founder.six_counts_match_independent_SQL);
  counts(founder, 0);
  const anonymous = parse(readBytes, 'validation/t16-r2/anonymous.json');
  assert.equal(anonymous.find(e => e.path === '/api/founder/operations').status, 401);
  return { auth: 'preserved LIVE PASS', nonempty_SQL_API_UI_refresh: 'preserved LIVE PASS', final_zero: 'preserved PostgreSQL PASS' };
}

function git(...args) {
  return cp.execFileSync('git', args, { cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 32 * 1024 * 1024 });
}

export function verifyCandidate() {
  const historical = verifyHistorical(), closure = verifyClosure();
  git('merge-base', '--is-ancestor', baseline, 'HEAD');
  const r1 = parse(read, 'validation/t16-r1/reconciliation-manifest.json');
  assert.equal(git('diff', 'HEAD', '--name-only', '--', ...r1.protected_paths).toString().trim(), '', 'Protected paths unchanged');
  const manifest = parse(read, 'validation/t16-final/commit-manifest.json');
  assert.equal(manifest.baseline, baseline);
  assert.equal(manifest.files.length + 1, manifest.included_paths.length);
  assert.equal(new Set(manifest.included_paths).size, manifest.included_paths.length);
  for (const file of manifest.files) {
    assert.equal(sha(read(file.path)), file.sha256, 'Candidate seal: ' + file.path);
    assert(!/(?:^|\/)(?:\.env(?:\..*)?|node_modules|\.next|.*\.sqlite(?:-.*)?|.*\.log)$/.test(file.path), 'Excluded path: ' + file.path);
    const body = read(file.path).toString('utf8');
    assert(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}|(?:sb_secret_|sbp_)[A-Za-z0-9]{20,}|postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/.test(body), 'Sensitive value: ' + file.path);
  }
  assert(!manifest.included_paths.includes('validation/t16-r2/server-http.json'));
  const archive = parse(read, 'validation/test-db/history.json');
  assert.equal(archive.project_id, target);
  assert.equal(archive.migrations.length, 10);
  for (const row of archive.migrations) {
    assert.equal(sha(read(`validation/test-db/supabase/migrations/${row.version}_${row.name}.sql`)), row.source_sha256);
  }
  // Git's actual clean filters, with Windows and Linux autocrlf settings. No index or object writes.
  // This is cross-setting byte/filter verification on Windows, not a claimed Linux OS execution.
  const r2 = parse(read, 'validation/t16-r2/manifest.json');
  const paths = [...r2.files.map(f => f.path), 'validation/t16-r2/manifest.json', ...parse(read, 'validation/t16-final/closure.json').baseline.source_documents.map(f => f.path)];
  for (const setting of ['true', 'false']) {
    const attrs = cp.execFileSync('git', ['-c', `core.autocrlf=${setting}`, 'check-attr', 'text', '--stdin'], { cwd: root, input: paths.join('\n') + '\n', encoding: 'utf8' });
    assert.equal(attrs.trimEnd().split('\n').length, paths.length);
    assert(attrs.trimEnd().split('\n').every(line => line.endsWith(': text: unset')), 'Raw byte attributes');
    for (const name of paths) {
      const bytes = read(name);
      const expected = crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
      const actual = cp.execFileSync('git', ['-c', `core.autocrlf=${setting}`, 'hash-object', '--stdin', '--path', name], { cwd: root, input: bytes }).toString().trim();
      assert.equal(actual, expected, `Byte conversion autocrlf=${setting}: ${name}`);
    }
  }
  return { result: 'PASS', ...historical, ...closure, candidate_files: manifest.included_paths.length, archived_SQL_hashes: 10,
    EOL: { platform: process.platform, autocrlf_true_raw_bytes: paths.length, autocrlf_false_raw_bytes: paths.length, Linux_OS_execution: false },
    new_LIVE_tests: 0, database_requests: 0, staging_commit_push: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2, 'No mutating modes or arguments supported');
  console.log(JSON.stringify(verifyCandidate(), null, 2));
}
