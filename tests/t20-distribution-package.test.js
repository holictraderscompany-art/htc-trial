import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareDistributionPackage, validateDistributionPackage, distributionIdentity,
  distributionDigest, prepareDistributionHandoff, classifyAttemptObservation } from '../validation/t20/distribution-package.mjs';

const source = () => JSON.parse(readFileSync(new URL('../docs/templates/t19-production-package.json', import.meta.url), 'utf8'));
const taxonomy = JSON.parse(readFileSync(new URL('../docs/t18-content-taxonomy.json', import.meta.url), 'utf8'));
const bundle = () => { const p = source(); return [p, prepareDistributionPackage(p)]; };
const check = (m, p = source()) => validateDistributionPackage(p, m);
const bad = (mutate, code) => {
  const [p, m] = bundle(); mutate(m);
  const result = check(m, p);
  assert.equal(result.structural_valid, false);
  if (code) assert.ok(result.errors.some(e => e.code === code), JSON.stringify(result.errors));
  assert.equal(result.executable, false);
};
const localReceipt = m => ({ reference: 'private:approval/example', scope: 'DISTRIBUTION_HANDOFF',
  manifest_digest: distributionDigest(m), source_digest: m.source.package_digest,
  source_revision: m.source.editorial_revision, distribution_ids: m.items.map(i => i.distribution_id) });

test('T20 valid T19 input produces a deterministic nine-recipe manifest without mutating input', () => {
  const p = source(), original = JSON.stringify(p), m = prepareDistributionPackage(p);
  assert.equal(JSON.stringify(p), original);
  assert.deepEqual(m, prepareDistributionPackage(p));
  assert.equal(m.items.length, 9);
  assert.deepEqual(m.items.map(i => [i.recipe, i.platform, i.format]), taxonomy.platform_recipes.map(r => [r.key, r.platform, r.formats[0]]));
  assert.equal(check(m, p).structural_valid, true);
});

test('T20 invalid production package is rejected before derivation and during validation', () => {
  for (const p of [null, [], {}, { ...source(), revision: 0 }, { ...source(), approval_evidence: true }]) {
    assert.throws(() => prepareDistributionPackage(p), /INVALID_SOURCE_PACKAGE/);
    assert.equal(check({}, p).errors[0].code, 'INVALID_SOURCE_PACKAGE');
  }
});

test('T20 taxonomy mismatch cannot replace the authoritative T18 categories or pillars', () => {
  for (const key of ['category', 'pillar', 'classification']) {
    const p = source(); p[key] = 'invented';
    assert.throws(() => prepareDistributionPackage(p), /INVALID_SOURCE_PACKAGE/);
  }
});

test('T20 unsupported recipe and incorrect platform/format pairing fail closed', () => {
  bad(m => { m.items[0].recipe = 'podcast'; }, 'DERIVATION_MISMATCH');
  bad(m => { m.items[0].format = 'REEL'; }, 'DERIVATION_MISMATCH');
  bad(m => { m.items[0].platform = 'TikTok'; }, 'DERIVATION_MISMATCH');
});

test('T20 source revision, package digest and per-derivative provenance are bound', () => {
  const [p, m] = bundle();
  p.revision++; p.derivatives.forEach(d => { d.source_revision = p.revision; });
  assert.equal(check(m, p).structural_valid, false);
  const revised = prepareDistributionPackage(p);
  assert.notEqual(revised.package_id, m.package_id);
  assert.notEqual(revised.items[0].distribution_id, m.items[0].distribution_id);
  assert.equal(revised.source.editorial_revision, 2);
  bad(x => { x.items[0].content_ref = '/derivatives/1'; }, 'DERIVATION_MISMATCH');
});

test('T20 editing source at the same revision invalidates the stale manifest digest', () => {
  const [p, m] = bundle(); p.central_message += ' Source clarification.';
  assert.equal(check(m, p).structural_valid, false);
  assert.notEqual(prepareDistributionPackage(p).source.package_digest, m.source.package_digest);
});

test('T20 required platform metadata fields cannot be removed or invented', () => {
  bad(m => { delete m.items[0].metadata.caption; }, 'PLATFORM_METADATA_REQUIRED');
  bad(m => { m.items[0].metadata.description = 'Invented field'; }, 'PLATFORM_METADATA_REQUIRED');
  const [, m] = bundle();
  assert.deepEqual(Object.keys(m.items[6].metadata), ['title', 'description']);
  assert.deepEqual(Object.keys(m.items[8].metadata), ['title']);
  assert.ok(check(m).blockers.includes('PUBLIC_COPY_INCOMPLETE'));
});

test('T20 prepared public metadata is validated without copying editorial prose', () => {
  const [p, m] = bundle();
  p.shared_script[0].narration = 'INTERNAL EDITORIAL CANARY';
  const clean = prepareDistributionPackage(p);
  assert.ok(!JSON.stringify(clean).includes('INTERNAL EDITORIAL CANARY'));
  m.items[0].metadata.caption = 'Introductory HTC awareness. Curriculum remains unavailable during Trial.';
  assert.equal(check(m).structural_valid, true);
});

test('T20 ordering preserves all source scenes for carousel and compiled video', () => {
  bad(m => { m.items[0].media_sequence[0].order = 2; }, 'MEDIA_ORDER_OR_SOURCE_MISMATCH');
  bad(m => { m.items[1].media_sequence[0].source_units = [2]; }, 'MEDIA_ORDER_OR_SOURCE_MISMATCH');
  bad(m => { m.items[0].media_sequence = []; }, 'MEDIA_SEQUENCE_REQUIRED');
  bad(m => { m.items[0].media_sequence[0].source_asset_keys = []; }, 'MEDIA_ORDER_OR_SOURCE_MISMATCH');
});

test('T20 attribution and original claims/qualifications cannot be silently dropped', () => {
  bad(m => { m.items[0].attribution = []; }, 'ATTRIBUTION_REQUIRED');
  bad(m => { m.items[0].attribution[0].source_refs = []; }, 'CLAIM_PROVENANCE_MISMATCH');
  bad(m => { m.items[0].claim_refs = []; }, 'DERIVATION_MISMATCH');
  bad(m => { m.items[0].qualification_claim_refs = []; }, 'DERIVATION_MISMATCH');
});

test('T20 accessibility, captions and thumbnail plans are platform-specific', () => {
  bad(m => { delete m.items[0].accessibility; }, 'EXACT_FIELDS_REQUIRED');
  bad(m => { m.items[0].accessibility.requirement = 'NONE'; }, 'ACCESSIBILITY_REQUIRED');
  bad(m => { m.items[0].accessibility.subtitle_ref = 'private:subtitles/example'; }, 'SUBTITLES_ONLY_FOR_VIDEO');
  bad(m => { m.items[0].thumbnail = { asset_id: null }; }, 'UNSUPPORTED_METADATA_FIELD');
  assert.ok(check(bundle()[1]).blockers.includes('ACCESSIBILITY_REVIEW_OR_SUBTITLES_MISSING'));
});

test('T20 invalid assets/URL receipts are rejected and syntactic UUIDs do not prove READY', () => {
  bad(m => { m.items[0].media_sequence[0].asset_id = 'not-a-uuid'; }, 'INVALID_ASSET_ID');
  bad(m => { m.items[0].media_sequence[0].readiness_evidence_ref = 'https://example.invalid/signed?token=secret'; }, 'INVALID_PRIVATE_RECEIPT');
  const [, m] = bundle();
  // Synthetic test identifier only; never generated or assigned to a real manifest.
  m.items[0].media_sequence[0].asset_id = '00000000-0000-4000-8000-000000000001';
  m.items[0].media_sequence[0].readiness_evidence_ref = 'private:test/ready';
  assert.equal(check(m).structural_valid, true);
  assert.equal(check(m).actual_media_readiness, 'BLOCKED');
  assert.ok(check(m).blockers.includes('ASSET_READY_OBJECT_IDENTITY_MIME_SIZE_AND_OWNERSHIP_UNVERIFIED'));
});

test('T20 absent or locally forged Founder receipt never authorizes handoff execution', () => {
  const [p, m] = bundle();
  assert.equal(check(m).publishing_authorization, 'BLOCKED');
  m.approval_evidence = localReceipt(m);
  assert.equal(check(m).structural_valid, true);
  assert.equal(check(m).publishing_authorization, 'BLOCKED');
  assert.equal(prepareDistributionHandoff(p, m).executable, false);
  bad(x => { x.approval_evidence = true; }, 'INVALID_APPROVAL_RECEIPT');
  bad(x => { x.approved = true; }, 'EXACT_FIELDS_REQUIRED');
});

test('T20 metadata, asset and destination changes invalidate locally matching approval receipts', () => {
  for (const mutate of [m => { m.items[0].metadata.caption = 'Changed caption'; },
    m => { m.items[0].destination.account_ref = 'private:accounts/changed'; },
    m => { m.items[0].media_sequence[0].asset_id = '00000000-0000-4000-8000-000000000002'; }]) {
    bad(m => { m.approval_evidence = localReceipt(m); mutate(m); }, 'STALE_OR_MISSCOPED_APPROVAL');
  }
});

test('T20 stale source revision and editorial approval cannot become distribution approval', () => {
  bad(m => { m.source.editorial_revision++; }, 'SOURCE_OR_CONTRACT_MISMATCH');
  bad(m => { m.approval_evidence = { ...localReceipt(m), scope: 'PRODUCTION_HANDOFF' }; }, 'STALE_OR_MISSCOPED_APPROVAL');
  bad(m => { m.approval_evidence = { ...localReceipt(m), source_revision: 99 }; }, 'STALE_OR_MISSCOPED_APPROVAL');
});

test('T20 unresolved originals and human visual QC remain explicit blockers', () => {
  const result = check(bundle()[1]);
  for (const role of ['logo', 'watermark', 'character_master']) assert.ok(result.blockers.includes(`T19:BRAND_UNVERIFIED:${role}`));
  assert.equal(result.actual_media_readiness, 'BLOCKED');
  assert.equal(result.external_platform_integration, 'NOT_IMPLEMENTED');
});

test('T20 deterministic identity distinguishes intentional variants and rejects duplicates', () => {
  const p = source(), a = prepareDistributionPackage(p), b = prepareDistributionPackage(p, { variant: 'alternate-hook' });
  assert.notEqual(a.items[0].distribution_id, b.items[0].distribution_id);
  assert.equal(new Set(a.items.map(i => i.distribution_id)).size, 9);
  bad(m => { m.items[1] = structuredClone(m.items[0]); }, 'DUPLICATE_DISTRIBUTION_ID');
  assert.throws(() => prepareDistributionPackage(p, { variant: [] }), /INVALID_VARIANT/);
  assert.throws(() => distributionIdentity({}), /INVALID_IDENTITY/);
});

test('T20 private source refs and review receipts are not copied into public-copy fields', () => {
  const p = source(); p.sources[0].reference = 'private:research/not-for-publication';
  p.reviews.factual_accuracy = 'private:review/confidential';
  const m = prepareDistributionPackage(p), text = JSON.stringify(m);
  assert.ok(!text.includes('private:research/not-for-publication'));
  assert.ok(!text.includes('private:review/confidential'));
  for (const payload of ['private:research/secret', 'repo:docs/internal.md', 'Bearer sample', 'https://example.invalid/signed?token=test', '<script>alert(1)</script>', 'C:\\private\\asset.png', 'api_key=example'])
    bad(x => { x.items[0].metadata.caption = payload; }, 'UNSAFE_PUBLIC_TEXT');
  bad(x => { x.items[0].metadata.internal_notes = 'secret'; }, 'PLATFORM_METADATA_REQUIRED');
});

test('T20 rejects media delivery URLs and fabricated account/platform fields', () => {
  bad(m => { m.items[0].media_sequence[0].url = 'https://example.invalid/media'; }, 'EXACT_FIELDS_REQUIRED');
  bad(m => { m.items[0].destination.account_ref = '123456'; }, 'OPAQUE_PRIVATE_BINDING_REQUIRED');
  bad(m => { m.items[0].destination.public_destination_ref = 'https://example.invalid/article'; }, 'OPAQUE_PRIVATE_BINDING_REQUIRED');
  bad(m => { m.items[0].platform_post_id = 'fake'; }, 'EXACT_FIELDS_REQUIRED');
});

test('T20 Trial restrictions and CTA qualifications survive derivation', () => {
  for (const feature of ['ACTUAL_LESSON', 'QUIZ', 'ENROLLMENT', 'GUARANTEED_PROFIT', 'UNKNOWN']) {
    const p = source(); p.trial.features = [feature];
    assert.throws(() => prepareDistributionPackage(p), /INVALID_SOURCE_PACKAGE/);
  }
  bad(m => { m.trial.eligible = true; }, 'SOURCE_OR_CONTRACT_MISMATCH');
  bad(m => { m.items[0].cta = 'ENROLL_NOW'; }, 'FORBIDDEN_CTA');
  bad(m => { m.items[0].cta = 'READ_APPROVED_PUBLIC_ARTICLE'; }, 'APPROVED_PUBLIC_DESTINATION_REQUIRED');
});

test('T20 website preparation retains T15 ownership without creating or releasing CMS records', () => {
  const [, m] = bundle(); const article = m.items.find(i => i.recipe === 'website-article');
  assert.equal(article.cms_content_id, null); assert.deepEqual(article.media_sequence, []);
  assert.equal(article.destination.public_destination_ref, null);
  assert.ok(check(m).blockers.includes('WEBSITE_REMAINS_UNDER_EXISTING_T15_FOUNDER_RELEASE'));
  bad(x => { x.items[8].cms_content_id = '00000000-0000-4000-8000-000000000003'; }, 'DERIVATION_MISMATCH');
});

test('T20 Facebook album may contain nine images without inventing an eight-image maximum', () => {
  const p = source(), d = p.derivatives.find(d => d.recipe === 'facebook-static'); d.format = 'ALBUM';
  const script = d.script[0], board = d.storyboard[0];
  d.script = Array.from({ length: 9 }, (_, i) => ({ ...structuredClone(script), key: `beat-${i + 1}` }));
  d.storyboard = Array.from({ length: 9 }, (_, i) => ({ ...structuredClone(board), order: i + 1, script_ref: `beat-${i + 1}` }));
  const m = prepareDistributionPackage(p);
  assert.equal(m.items[2].media_sequence.length, 9);
  assert.equal(check(m, p).structural_valid, true);
});

test('T20 Instagram/TikTok carousel and YouTube long duration retain T18 limits', () => {
  for (const recipe of ['instagram-carousel', 'tiktok-photo-carousel']) {
    const p = source(), d = p.derivatives.find(d => d.recipe === recipe);
    const script = d.script[0], board = d.storyboard[0];
    d.script = Array.from({ length: 9 }, (_, i) => ({ ...structuredClone(script), key: `beat-${i + 1}` }));
    d.storyboard = Array.from({ length: 9 }, (_, i) => ({ ...structuredClone(board), order: i + 1, script_ref: `beat-${i + 1}` }));
    assert.throws(() => prepareDistributionPackage(p), /INVALID_SOURCE_PACKAGE/);
  }
  const p = source(); p.derivatives.find(d => d.recipe === 'youtube-explainer').duration_seconds = 599;
  assert.throws(() => prepareDistributionPackage(p), /INVALID_SOURCE_PACKAGE/);
});

test('T20 localized derivatives retain source language and independent distribution identity', () => {
  const p = source(); p.target_languages.push('id');
  p.derivatives.push(...p.derivatives.map(d => ({ ...structuredClone(d), language: 'id', translation_review_ref: 'private:test/localization' })));
  const m = prepareDistributionPackage(p);
  assert.equal(m.items.length, 18); assert.equal(new Set(m.items.map(i => i.distribution_id)).size, 18);
  assert.equal(m.source.source_language, 'en'); assert.equal(check(m, p).structural_valid, true);
});

test('T20 malformed nested JSON returns controlled errors without private input echo', () => {
  const [, original] = bundle();
  for (const v of [null, [], 1, true, 'private:canary', {}, { ...original, variant: [] }, { ...original, items: [null] }]) {
    const result = check(v); assert.equal(result.structural_valid, false);
    assert.ok(!JSON.stringify(result).includes('private:canary'));
  }
  for (const key of ['metadata', 'attribution', 'media_sequence', 'accessibility', 'thumbnail', 'destination', 'tracking'])
    bad(m => { m.items[6][key] = null; });
  const circular = {}; circular.self = circular;
  assert.equal(check(circular).structural_valid, false);
});

test('T20 local tracking cannot claim upload, results, attempts or successful publication', () => {
  for (const change of [{ status: 'PUBLISHED' }, { attempt_id: 'fake' }, { external_result_ref: 'private:fake/result' }, { error_class: 'timeout' }])
    bad(m => { Object.assign(m.items[0].tracking, change); }, 'DERIVATION_MISMATCH');
});

test('T20 ambiguous timeout requires reconciliation and never authorizes automatic retry', () => {
  const result = classifyAttemptObservation({ outcome: 'TIMEOUT', external_result_ref: null });
  assert.equal(result.reconciliation_required, true);
  assert.equal(result.retry_eligibility, 'NO_AUTOMATIC_RETRY'); assert.equal(result.executable, false);
});

test('T20 transient rejection, revocation and permanent rejection have distinct retry contracts', () => {
  assert.equal(classifyAttemptObservation({ outcome: 'TRANSIENT_REJECTION', external_result_ref: null }).retry_eligibility, 'ONLY_AFTER_NO_SIDE_EFFECT_CONFIRMED_AND_REAUTHORIZATION');
  for (const outcome of ['AUTH_REVOKED', 'PERMANENT_REJECTION']) assert.equal(classifyAttemptObservation({ outcome, external_result_ref: null }).retry_eligibility, 'NO_AUTOMATIC_RETRY');
  assert.throws(() => classifyAttemptObservation({ outcome: 'CONFIRMED', external_result_ref: null }), /RESULT_EVIDENCE_REQUIRED/);
  assert.throws(() => classifyAttemptObservation({ outcome: 'TIMEOUT', external_result_ref: 'private:test/result' }), /CONFLICTING_RESULT/);
  const confirmed = classifyAttemptObservation({ outcome: 'CONFIRMED', external_result_ref: 'private:test/result' });
  assert.equal(confirmed.evidence_verified, false); assert.equal(confirmed.executable, false);
});

test('T20 review handoff is isolated and side-effect-free even with matching local evidence', () => {
  const [p, m] = bundle(), oldFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = () => { calls++; throw Error('Unexpected network'); };
  try {
    const h = prepareDistributionHandoff(p, m);
    h.manifest.items[0].metadata.caption = 'Changed review copy';
    assert.equal(m.items[0].metadata.caption, null);
    assert.equal(h.executable, false); assert.equal(calls, 0);
    assert.throws(() => prepareDistributionHandoff(p, {}), /INVALID_DISTRIBUTION_PACKAGE/);
  } finally { globalThis.fetch = oldFetch; }
  const utility = readFileSync(new URL('../validation/t20/distribution-package.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(utility, /\b(?:fetch|writeFileSync|writeFile|execFileSync|setInterval|setTimeout)\s*\(/);
  assert.doesNotMatch(utility, /from ['"](?:node:)?(?:http|https|net|child_process|timers)['"]/);
});

test('T20 checked-in distribution template equals deterministic preparation', () => {
  const reference = JSON.parse(readFileSync(new URL('../docs/templates/t20-distribution-package.json', import.meta.url), 'utf8'));
  assert.deepEqual(reference, prepareDistributionPackage(source()));
  assert.equal(check(reference).structural_valid, true);
});

test('T20 CLI validates structure only and redacts missing-file errors', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, ['validation/t20/distribution-package.mjs', ...args], { cwd: root, encoding: 'utf8' });
  const valid = run('validate', 'docs/templates/t19-production-package.json', 'docs/templates/t20-distribution-package.json');
  assert.equal(valid.status, 0, valid.stderr);
  const result = JSON.parse(valid.stdout); assert.equal(result.publishing_authorization, 'BLOCKED');
  const invalid = run('validate', 'private-path-canary-does-not-exist', 'private-path-canary-does-not-exist');
  assert.equal(invalid.status, 1); assert.ok(!invalid.stderr.includes('private-path-canary'));
  assert.equal(JSON.parse(invalid.stderr).errors[0].code, 'UNREADABLE_OR_INVALID_INPUT');
});

test('T20 review regression: storyboard-only qualifications preserve claims and attribution', () => {
  const p = source();
  p.claims.push({ key: 'risk-qualification', statement: 'Illustrative source qualification.', source_refs: ['prd-v3'] });
  p.derivatives[0].storyboard[0].claim_refs.push('risk-qualification');
  const m = prepareDistributionPackage(p), item = m.items[0];
  assert.ok(item.claim_refs.includes('risk-qualification'));
  assert.ok(item.qualification_claim_refs.includes('risk-qualification'));
  assert.deepEqual(item.attribution.find(a => a.claim_ref === 'risk-qualification').source_refs, ['prd-v3']);
  assert.equal(check(m, p).structural_valid, true);
  item.qualification_claim_refs = ['trial-scope'];
  assert.equal(check(m, p).structural_valid, false);
});

test('T20 review regression: private filesystem and Storage paths fail every public-copy slot', () => {
  const paths = ['/home/founder/private/master.png', 'C:/private/master.png', 'C:\\private\\master.png',
    '\\\\server\\private\\master.png', '~/private/master.png', 'private/master.png',
    'trial-assets/image/private-master.png', 'image/00000000-0000-4000-8000-000000000001/asset.png',
    '/storage/v1/object/authenticated/trial-assets/image/master.png'];
  for (const text of paths) for (const assign of [
    m => { m.items[0].metadata.caption = text; },
    m => { m.items[0].attribution[0].public_text = text; },
    m => { m.items[0].media_sequence[0].alt_text = text; },
  ]) bad(assign, 'UNSAFE_PUBLIC_TEXT');
});

test('T20 review regression: malformed helper inputs use fixed controlled errors', () => {
  const p = source(), circular = {}; circular.self = circular;
  for (const input of [undefined, null, [], 1, 'private:canary', circular]) {
    assert.throws(() => distributionIdentity(input), e => e.code === 'INVALID_IDENTITY' && e.name !== 'TypeError');
    assert.throws(() => distributionDigest(input), e => e.code === 'INVALID_DISTRIBUTION_PACKAGE' && !e.message.includes('canary'));
    assert.throws(() => prepareDistributionHandoff(p, input), e => e.code === 'INVALID_DISTRIBUTION_PACKAGE');
    assert.throws(() => classifyAttemptObservation(input), e => e.code === 'INVALID_ATTEMPT_OBSERVATION');
  }
  for (const options of [null, [], true, 'private:canary', { unexpected: true }])
    assert.throws(() => prepareDistributionPackage(p, options), e => e.code === 'INVALID_OPTIONS');
});
