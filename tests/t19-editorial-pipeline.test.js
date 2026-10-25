import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateProductionPackage, projectCmsCreate, packageDigest, validReference } from '../validation/t19/validate-production-package.mjs';
import { validateContentRequest } from '../src/server/content-release.js';

const template = JSON.parse(readFileSync(new URL('../docs/templates/t19-production-package.json', import.meta.url), 'utf8'));
const inventory = JSON.parse(readFileSync(new URL('../docs/t19-brand-reference-inventory.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(template);
const derivative = (p, key) => p.derivatives.find(d => d.recipe === key);
function invalid(mutate, code) {
  const p = clone(); mutate(p);
  const result = validateProductionPackage(p);
  assert.equal(result.structural_valid, false);
  if (code) assert.ok(result.errors.some(e => e.code === code), JSON.stringify(result.errors));
  return result;
}

test('T19 valid brief supports all nine recipes and reports separate blocked production/approval gates', () => {
  const result = validateProductionPackage(clone());
  assert.deepEqual(result.errors, []);
  assert.equal(result.structural_valid, true);
  assert.equal(template.derivatives.length, 9);
  assert.equal(result.editorial_readiness, 'STRUCTURALLY_VALID_HUMAN_REVIEW_REQUIRED');
  assert.equal(result.visual_production_readiness, 'BLOCKED');
  assert.equal(result.founder_approval_readiness, 'BLOCKED_PENDING_AUTHENTICATED_FOUNDER_REVIEW');
});

test('T19 invalid category, pillar, classification or audience is rejected against T18', () => {
  invalid(p => { p.category = 'EDUCATION'; }, 'INVALID_CATEGORY');
  invalid(p => { p.pillar = 'INTRODUCTION'; }, 'INVALID_PILLAR');
  invalid(p => { p.classification = 'beginner-course'; }, 'INVALID_CLASSIFICATION');
  invalid(p => { p.audience = ['admin']; }, 'UNRESOLVED_OR_DUPLICATE_REFERENCE');
});

test('T19 missing topic fields and unknown approval/state fields cannot bypass exact contracts', () => {
  for (const key of ['topic_key', 'central_message', 'source_language', 'asset_requirements']) {
    if (key === 'asset_requirements') invalid(p => { delete p.derivatives[0].storyboard[0][key]; }, 'EXACT_FIELDS_REQUIRED');
    else invalid(p => { delete p[key]; }, 'EXACT_FIELDS_REQUIRED');
  }
  invalid(p => { p.approved = true; }, 'EXACT_FIELDS_REQUIRED');
  invalid(p => { p.state = 'RELEASED'; }, 'EXACT_FIELDS_REQUIRED');
});

test('T19 sources require safe references, hash revisions and claim locators', () => {
  for (const reference of ['repo:../.env', 'repo:/etc/passwd', 'file:///secret', 'https://user:pass@example.test/source', 'https://example.test/?token=secret']) {
    assert.equal(validReference(reference), false);
    invalid(p => { p.sources[0].reference = reference; }, 'INVALID_SOURCE_REFERENCE');
  }
  invalid(p => { p.sources[0].revision = ''; }, 'SOURCE_HASH_REQUIRED');
  invalid(p => { p.sources[0].locator = ''; }, 'SOURCE_LOCATOR_REQUIRED');
  invalid(p => { p.claims[0].source_refs = ['missing-source']; }, 'UNRESOLVED_OR_DUPLICATE_REFERENCE');
  assert.equal(validReference('https://example.test/public-source'), true);
  assert.equal(validReference('private:review/receipt-1'), true);
});

test('T19 missing/stale source revision and orphan derivative fail traceability', () => {
  invalid(p => { p.revision = 0; }, 'INVALID_REVISION');
  invalid(p => { delete p.derivatives[0].source_revision; }, 'EXACT_FIELDS_REQUIRED');
  invalid(p => { p.derivatives[0].source_revision = 2; }, 'STALE_OR_MISSING_REVISION');
  invalid(p => { p.derivatives[0].source_topic_key = 'another-topic'; }, 'ORPHAN_DERIVATIVE');
});

test('T19 duplicate or missing recipes and incompatible platform formats are rejected', () => {
  invalid(p => { p.derivatives.push(structuredClone(p.derivatives[0])); }, 'DUPLICATE_RECIPE_LANGUAGE');
  invalid(p => { p.derivatives.pop(); }, 'MISSING_RECIPE_LANGUAGE');
  invalid(p => { p.derivatives[0].format = 'REEL'; }, 'INVALID_PLATFORM_FORMAT');
  invalid(p => { p.derivatives[0].recipe = 'unapproved-platform'; }, 'INVALID_PLATFORM_FORMAT');
});

function resizeCarousel(p, recipe, count) {
  const d = derivative(p, recipe), script = d.script[0], board = d.storyboard[0];
  d.script = Array.from({ length: count }, (_, i) => ({ ...structuredClone(script), key: `beat-${i + 1}` }));
  d.storyboard = Array.from({ length: count }, (_, i) => ({ ...structuredClone(board), order: i + 1, script_ref: `beat-${i + 1}` }));
}
test('T19 Instagram and TikTok carousels enforce 1-8 slides', () => {
  for (const recipe of ['instagram-carousel', 'tiktok-photo-carousel']) {
    invalid(p => resizeCarousel(p, recipe, 0), 'CAROUSEL_SLIDE_LIMIT');
    invalid(p => resizeCarousel(p, recipe, 9), 'CAROUSEL_SLIDE_LIMIT');
    const p = clone(); resizeCarousel(p, recipe, 8); assert.equal(validateProductionPackage(p).structural_valid, true);
  }
});

test('T19 Facebook album supports more than eight slides without an invented limit', () => {
  const p = clone(); resizeCarousel(p, 'facebook-static', 9);
  derivative(p, 'facebook-static').format = 'ALBUM';
  assert.deepEqual(validateProductionPackage(p).errors, []);
});

test('T19 long-form duration must be 600-900 seconds with matching scene totals', () => {
  for (const seconds of [599, 901]) invalid(p => { derivative(p, 'youtube-explainer').duration_seconds = seconds; }, 'LONG_FORM_DURATION_OUT_OF_RANGE');
  invalid(p => { derivative(p, 'youtube-explainer').storyboard[0].duration_seconds += 1; }, 'TIMELINE_DURATION_MISMATCH');
});

test('T19 storyboards require explicit order, script links and all narrative/camera/caption fields', () => {
  invalid(p => { p.derivatives[0].storyboard[0].order = 2; }, 'NON_SEQUENTIAL_STORYBOARD');
  invalid(p => { p.derivatives[0].storyboard[0].script_ref = 'unknown'; }, 'INVALID_STORYBOARD_SCRIPT_LINK');
  invalid(p => { p.derivatives[0].script[0].source_segment_ref = 'unknown'; }, 'UNKNOWN_SOURCE_SEGMENT');
  invalid(p => { p.derivatives[0].script[0].caption = ''; }, 'INCOMPLETE_SCRIPT');
  invalid(p => { p.derivatives[0].storyboard[0].camera = ''; }, 'INCOMPLETE_STORYBOARD');
  invalid(p => { p.derivatives[0].storyboard = []; }, 'SCRIPT_STORYBOARD_COVERAGE_MISMATCH');
});

test('T19 character names/master references and chapter wardrobe cannot drift', () => {
  invalid(p => { p.characters.founder.master_reference = null; }, 'LOCKED_CHARACTER_REFERENCE_REQUIRED');
  invalid(p => { p.characters.learner.name = 'Replacement character'; }, 'LOCKED_CHARACTER_REFERENCE_REQUIRED');
  invalid(p => { p.derivatives[0].storyboard[0].wardrobe.founder = 'Unapproved costume change'; }, 'CHAPTER_WARDROBE_DRIFT');
  invalid(p => { p.derivatives[0].storyboard[0].chapter = 'unknown'; }, 'UNKNOWN_CHAPTER');
});

test('T19 missing watermark/logo/character master requirements reject visual plans', () => {
  invalid(p => { p.brand_references.watermark = null; }, 'BRAND_REFERENCE_REQUIRED');
  invalid(p => { p.assets = p.assets.filter(a => a.purpose !== 'LOGO'); }, 'REQUIRED_BRAND_ASSET_PLAN_MISSING');
  for (const key of ['logo-overlay', 'watermark-overlay', 'character-reference']) {
    invalid(p => { p.derivatives[0].storyboard[0].asset_requirements = p.derivatives[0].storyboard[0].asset_requirements.filter(a => a !== key); }, 'REQUIRED_VISUAL_BRAND_REFERENCE_MISSING');
  }
});

test('T19 unavailable brand references block visuals without blocking structurally valid editorial work', () => {
  const result = validateProductionPackage(clone());
  assert.equal(result.structural_valid, true);
  for (const role of ['logo', 'watermark', 'character_master']) assert.ok(result.visual_blockers.includes(`BRAND_UNVERIFIED:${role}`));
  assert.equal(inventory.verified_master_count, 0);
});

test('T19 a locally edited VERIFIED inventory is not authenticated brand approval', () => {
  const fake = structuredClone(inventory);
  for (const item of fake.references) Object.assign(item, { status: 'VERIFIED', location: 'private:forged/master', sha256: 'a'.repeat(64), approval_evidence_ref: 'private:forged/approval' });
  const p = clone(); p.illustrative_only = false; p.trial.eligible = true;
  const result = validateProductionPackage(p, fake);
  assert.equal(result.visual_production_readiness, 'BLOCKED');
  assert.ok(result.visual_blockers.includes('OFFLINE_BRAND_AUTHENTICITY_AND_VISUAL_QC_REQUIRE_HUMAN_VERIFICATION'));
});

test('T19 approval evidence rejects booleans, wrong scope, stale revision and incorrect digest', () => {
  invalid(p => { p.approval_evidence = true; }, 'EXACT_FIELDS_REQUIRED');
  const approval = p => ({ reference: 'private:founder/review-1', scope: 'PRODUCTION_HANDOFF', topic_key: p.topic_key, revision: p.revision, package_digest: packageDigest(p) });
  invalid(p => { p.approval_evidence = { ...approval(p), scope: 'RELEASE' }; }, 'INVALID_OR_STALE_APPROVAL_EVIDENCE');
  invalid(p => { p.approval_evidence = { ...approval(p), revision: 2 }; }, 'INVALID_OR_STALE_APPROVAL_EVIDENCE');
  invalid(p => { p.approval_evidence = { ...approval(p), package_digest: 'a'.repeat(64) }; }, 'INVALID_OR_STALE_APPROVAL_EVIDENCE');
  const p = clone(); p.approval_evidence = approval(p);
  assert.equal(validateProductionPackage(p).structural_valid, true);
  assert.equal(validateProductionPackage(p).founder_approval_readiness, 'BLOCKED_PENDING_AUTHENTICATED_FOUNDER_REVIEW');
  p.central_message = 'Changed after review';
  assert.equal(validateProductionPackage(p).structural_valid, false);
});

test('T19 declared Trial violations are rejected, including signals and guaranteed profits', () => {
  for (const feature of ['ACTUAL_LESSON', 'OPEN_CURRICULUM', 'LEARNING_MODULE', 'QUIZ', 'ASSESSMENT', 'ENROLLMENT', 'LEARNING_PROGRESS', 'PUBLIC_LMS_DASHBOARD', 'TRADING_SIGNAL', 'GUARANTEED_PROFIT', 'UNKNOWN_BYPASS']) {
    invalid(p => { p.trial.features = [feature]; }, 'FORBIDDEN_OR_UNKNOWN_TRIAL_FEATURE');
  }
  invalid(p => { p.trial.content_kind = 'LESSON'; }, 'FORBIDDEN_TRIAL_KIND');
});

test('T19 unknown claim references fail in scripts, articles and storyboards', () => {
  invalid(p => { p.derivatives[0].script[0].claim_refs = ['invented-claim']; }, 'UNRESOLVED_OR_DUPLICATE_REFERENCE');
  invalid(p => { derivative(p, 'website-article').article.claim_refs = ['invented-claim']; }, 'UNRESOLVED_OR_DUPLICATE_REFERENCE');
  invalid(p => { p.derivatives[0].storyboard[0].claim_refs = []; }, 'SCRIPT_CLAIM_NOT_STORYBOARDED');
});

test('T19 languages use actual BCP 47 tags and translations retain topic/revision plus human review gate', () => {
  invalid(p => { p.source_language = 'en_US'; }, 'INVALID_LANGUAGE');
  invalid(p => { p.derivatives[0].language = 'id'; }, 'UNDECLARED_LANGUAGE');
  const p = clone(); p.target_languages.push('id');
  p.derivatives.push(...p.derivatives.map(d => ({ ...structuredClone(d), language: 'id' })));
  const result = validateProductionPackage(p);
  assert.equal(result.structural_valid, true);
  assert.ok(result.visual_blockers.includes('TRANSLATION_REVIEW_MISSING'));
});

test('T19 asset readiness and human review flags cannot be self-approved', () => {
  invalid(p => { p.assets[0].readiness_evidence_ref = true; }, 'INVALID_ASSET_EVIDENCE');
  invalid(p => { p.reviews.factual_accuracy = true; }, 'INVALID_REVIEW_EVIDENCE');
  invalid(p => { p.assets[0].asset_id = 'invented-id'; }, 'INVALID_ASSET_ID');
  assert.ok(validateProductionPackage(clone()).visual_blockers.includes('ASSET_READINESS_UNVERIFIED'));
});

test('T19 CMS create projection has only allowed public article fields and no release action', () => {
  const p = clone(); p.sources[0].reference = 'private:research/confidential-review';
  const payload = projectCmsCreate(p, 'en');
  assert.deepEqual(Object.keys(payload), ['action', 'category', 'title', 'body']);
  assert.equal(payload.action, 'create');
  assert.doesNotThrow(() => validateContentRequest(payload));
  assert.ok(!JSON.stringify(payload).includes('confidential-review'));
  assert.ok(!Object.hasOwn(payload, 'state'));
  assert.throws(() => projectCmsCreate(p, 'id'));
  // Synthetic identifier only: no database record is created or queried.
  p.cms = { content_id: '00000000-0000-4000-8000-000000000019', observed_state: 'RELEASED' };
  assert.throws(() => projectCmsCreate(p, 'en'));
  invalid(v => { v.cms.observed_state = 'RELEASED'; }, 'INVALID_CMS_OBSERVATION');
});

test('T19 CMS limits remain unchanged; private metadata cannot be added as article fields', () => {
  invalid(p => { derivative(p, 'website-article').article.body = 'x'.repeat(8001); }, 'CMS_PAYLOAD_INCOMPATIBLE');
  invalid(p => { derivative(p, 'website-article').article.internal_notes = 'private'; }, 'EXACT_FIELDS_REQUIRED');
  invalid(p => { p.cms.state = 'RELEASED'; }, 'EXACT_FIELDS_REQUIRED');
});

test('T19 offline CLI emits only validation codes/gates, never package prose or private references', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const cli = execFileSync(process.execPath, ['validation/t19/validate-production-package.mjs', 'docs/templates/t19-production-package.json'], { cwd: root, encoding: 'utf8' });
  const result = JSON.parse(cli);
  assert.equal(result.structural_valid, true);
  assert.ok(!cli.includes(template.central_message));
  assert.ok(!cli.includes(template.sources[0].reference));
  const invalidInput = spawnSync(process.execPath, ['validation/t19/validate-production-package.mjs', 'docs/t19-brand-reference-inventory.json'], { cwd: root, encoding: 'utf8' });
  assert.equal(invalidInput.status, 1);
  assert.equal(JSON.parse(invalidInput.stdout).structural_valid, false);
});

test('T19 malformed nested inputs return controlled errors without evaluating references', () => {
  for (const field of ['sources', 'claims', 'assets', 'characters', 'brand_references', 'derivatives', 'reviews', 'cms']) {
    for (const value of [null, false, 'private-sensitive-value', [null]]) {
      const p = clone(); p[field] = value;
      const result = validateProductionPackage(p);
      assert.equal(result.structural_valid, false);
      assert.ok(!JSON.stringify(result).includes('private-sensitive-value'));
    }
  }
  assert.equal(validateProductionPackage(clone(), { references: [null] }).structural_valid, false);
  invalid(p => { p.derivatives[0].script[0].dialogue[0].character = { toString: null }; }, 'INVALID_DIALOGUE');
  const malformedInventory = structuredClone(inventory);
  Object.assign(malformedInventory.references[0], { status: 'VERIFIED', location: 'private:synthetic/master', sha256: { toString: null }, approval_evidence_ref: 'private:synthetic/receipt' });
  const result = validateProductionPackage(clone(), malformedInventory);
  assert.ok(result.visual_blockers.includes('BRAND_UNVERIFIED:logo'));
  assert.equal(result.visual_production_readiness, 'BLOCKED');
});

test('T19 derivative claims must belong to their linked source script segment', () => {
  invalid(p => {
    p.claims.push({ key: 'other-claim', statement: 'Separate source statement', source_refs: ['prd-v3'] });
    p.derivatives[0].script[0].claim_refs = ['other-claim'];
    p.derivatives[0].storyboard[0].claim_refs = ['other-claim'];
  }, 'SOURCE_SEGMENT_CLAIM_MISMATCH');
});

test('T19 taxonomy fields require scalar strings without JavaScript key coercion', () => {
  for (const [field, valid, code] of [['pillar', 'Education', 'INVALID_PILLAR'], ['classification', 'htc-orientation', 'INVALID_CLASSIFICATION']]) {
    for (const value of [[valid], { toString: null }, {}, null]) {
      invalid(p => { p[field] = value; }, code);
    }
  }
});

test('T19 storyboard brand references must match the required asset purpose', () => {
  for (const [role, key] of [['logo', 'logo-overlay'], ['watermark', 'watermark-overlay'], ['character_master', 'character-reference']]) {
    invalid(p => {
      p.assets.push({ key: 'wrong-purpose-alias', purpose: 'SCENE', reference: p.brand_references[role], asset_id: null, readiness_evidence_ref: null });
      p.derivatives[0].storyboard[0].asset_requirements = p.derivatives[0].storyboard[0].asset_requirements.map(k => k === key ? 'wrong-purpose-alias' : k);
    }, 'REQUIRED_VISUAL_BRAND_REFERENCE_MISSING');
  }
});
