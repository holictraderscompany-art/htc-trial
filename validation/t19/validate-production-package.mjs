import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { contentCategories, validateContentRequest } from '../../src/server/content-release.js';

const taxonomy = JSON.parse(readFileSync(new URL('../../docs/t18-content-taxonomy.json', import.meta.url), 'utf8'));
const inventory = JSON.parse(readFileSync(new URL('../../docs/t19-brand-reference-inventory.json', import.meta.url), 'utf8'));
const slug = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const digest = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const characters = Object.fromEntries(Object.entries(inventory.current_characters).map(([role, c]) => [role, c.name]));
const masterReferences = { logo: 'official-logo', watermark: 'official-watermark',
  ...Object.fromEntries(Object.entries(inventory.current_characters).map(([role, c]) => [role, c.master_reference])) };
const brandPurpose = role => ['logo', 'watermark'].includes(role) ? role.toUpperCase() : 'CHARACTER_MASTER';
const reviewKeys = ['factual_accuracy', 'trial_eligibility', 'brand_authenticity', 'visual_continuity', 'localization', 'accessibility'];
const forbidden = new Set(['ACTUAL_LESSON', 'OPEN_CURRICULUM', 'LEARNING_MODULE', 'QUIZ', 'ASSESSMENT', 'ENROLLMENT', 'LEARNING_PROGRESS', 'PUBLIC_LMS_DASHBOARD', 'TRADING_SIGNAL', 'GUARANTEED_PROFIT']);
const text = v => typeof v === 'string' && v.trim().length > 0;
const language = v => { try { return typeof v === 'string' && new Intl.Locale(v).toString() === v; } catch { return false; } };
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const unique = values => new Set(values).size === values.length;

// References are opaque. Validation never opens them, fetches URLs or uploads media.
export function validReference(value) {
  if (!text(value)) return false;
  if (value.startsWith('private:')) return /^private:[a-z0-9][a-z0-9._/-]*$/i.test(value) && !value.includes('..');
  if (value.startsWith('repo:')) return /^repo:[a-z0-9][a-z0-9._/-]*$/i.test(value) && !value.includes('..') && !value.includes('//');
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && Boolean(url.hostname);
  } catch { return false; }
}

// Approval is excluded to avoid a self-referential seal. All other package data is bound.
export function packageDigest(value) {
  const normalize = v => Array.isArray(v) ? v.map(normalize) : record(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, normalize(v[k])])) : v;
  const { approval_evidence, ...content } = value;
  return createHash('sha256').update(JSON.stringify(normalize(content))).digest('hex');
}

export function validateProductionPackage(value, brandInventory = inventory) {
  const errors = [], visualBlockers = ['OFFLINE_BRAND_AUTHENTICITY_AND_VISUAL_QC_REQUIRE_HUMAN_VERIFICATION'];
  const error = (path, code) => errors.push({ path, code });
  const check = (condition, path, code) => { if (!condition) error(path, code); };
  const shape = (v, keys, path) => {
    const ok = record(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
    check(ok, path, 'EXACT_FIELDS_REQUIRED'); return ok;
  };
  const list = (v, path, minimum = 1) => { const ok = Array.isArray(v) && v.length >= minimum && v.length <= 500; check(ok, path, 'INVALID_LIST'); return ok ? v : []; };
  const references = (v, allowed, path, minimum = 1) => {
    const items = list(v, path, minimum);
    check(items.every(k => typeof k === 'string' && allowed.has(k)) && unique(items), path, 'UNRESOLVED_OR_DUPLICATE_REFERENCE');
    return items;
  };
  const finish = () => ({
    structural_valid: errors.length === 0, errors,
    editorial_readiness: errors.length ? 'BLOCKED' : 'STRUCTURALLY_VALID_HUMAN_REVIEW_REQUIRED',
    visual_production_readiness: 'BLOCKED', visual_blockers: [...new Set(visualBlockers)],
    founder_approval_readiness: 'BLOCKED_PENDING_AUTHENTICATED_FOUNDER_REVIEW',
    publishing_readiness: 'EXISTING_FOUNDER_RELEASE_AUTHORIZATION_REQUIRED',
  });
  if (!shape(value, ['contract_version', 'illustrative_only', 'topic_key', 'revision', 'category', 'pillar', 'classification', 'audience', 'central_message', 'sources', 'claims', 'source_language', 'target_languages', 'trial', 'shared_script', 'characters', 'chapters', 'brand_references', 'assets', 'derivatives', 'reviews', 'approval_evidence', 'cms'], 'package')) return finish();
  const p = value;
  check(p.contract_version === 2 && typeof p.illustrative_only === 'boolean', 'contract_version', 'INVALID_CONTRACT');
  if (p.illustrative_only) visualBlockers.push('ILLUSTRATIVE_PACKAGE_NOT_AUTHORIZED_FOR_PRODUCTION');
  check(text(p.topic_key) && slug.test(p.topic_key), 'topic_key', 'INVALID_TOPIC_KEY');
  check(Number.isSafeInteger(p.revision) && p.revision > 0, 'revision', 'INVALID_REVISION');
  check(contentCategories.includes(p.category) && Object.hasOwn(taxonomy.category_purpose, p.category), 'category', 'INVALID_CATEGORY');
  check(typeof p.pillar === 'string' && Object.hasOwn(taxonomy.pillars, p.pillar), 'pillar', 'INVALID_PILLAR');
  check(typeof p.classification === 'string' && Object.hasOwn(taxonomy.classifications, p.classification), 'classification', 'INVALID_CLASSIFICATION');
  references(p.audience, new Set(Object.keys(taxonomy.audiences)), 'audience');
  check(text(p.central_message), 'central_message', 'REQUIRED_TEXT');
  check(language(p.source_language), 'source_language', 'INVALID_LANGUAGE');
  const languages = list(p.target_languages, 'target_languages');
  check(languages.every(language) && unique(languages), 'target_languages', 'INVALID_LANGUAGE');
  if (shape(p.trial, ['eligible', 'content_kind', 'features'], 'trial')) {
    check([null, true, false].includes(p.trial.eligible), 'trial.eligible', 'INVALID_REVIEW_RESULT');
    check(['INTRODUCTION', 'BRAND_PRESENTATION', 'PUBLIC_INFORMATION', 'EDUCATIONAL_AWARENESS'].includes(p.trial.content_kind), 'trial.content_kind', 'FORBIDDEN_TRIAL_KIND');
    const features = list(p.trial.features, 'trial.features', 0);
    check(features.every(f => typeof f === 'string' && !forbidden.has(f)) && features.length === 0, 'trial.features', 'FORBIDDEN_OR_UNKNOWN_TRIAL_FEATURE');
    if (p.trial.eligible !== true) visualBlockers.push('TRIAL_ELIGIBILITY_UNREVIEWED_OR_REJECTED');
  }

  const sourceKeys = new Set();
  for (const [i, s] of list(p.sources, 'sources').entries()) {
    if (!shape(s, ['key', 'reference', 'revision', 'locator'], `sources.${i}`)) continue;
    check(text(s.key) && slug.test(s.key) && !sourceKeys.has(s.key), `sources.${i}.key`, 'DUPLICATE_OR_INVALID_SOURCE');
    sourceKeys.add(s.key);
    check(validReference(s.reference), `sources.${i}.reference`, 'INVALID_SOURCE_REFERENCE');
    check(typeof s.revision === 'string' && /^sha256:[a-f0-9]{64}$/.test(s.revision), `sources.${i}.revision`, 'SOURCE_HASH_REQUIRED');
    check(text(s.locator), `sources.${i}.locator`, 'SOURCE_LOCATOR_REQUIRED');
  }
  const claimKeys = new Set();
  for (const [i, c] of list(p.claims, 'claims').entries()) {
    if (!shape(c, ['key', 'statement', 'source_refs'], `claims.${i}`)) continue;
    check(text(c.key) && slug.test(c.key) && !claimKeys.has(c.key), `claims.${i}.key`, 'DUPLICATE_OR_INVALID_CLAIM');
    claimKeys.add(c.key); check(text(c.statement), `claims.${i}.statement`, 'REQUIRED_TEXT');
    references(c.source_refs, sourceKeys, `claims.${i}.source_refs`);
  }
  const sourceSegments = new Map();
  for (const [i, s] of list(p.shared_script, 'shared_script').entries()) {
    if (!shape(s, ['key', 'narrative_purpose', 'narration', 'claim_refs'], `shared_script.${i}`)) continue;
    check(text(s.key) && slug.test(s.key) && !sourceSegments.has(s.key), `shared_script.${i}.key`, 'INVALID_SOURCE_SEGMENT');
    sourceSegments.set(s.key, s);
    check(text(s.narrative_purpose) && text(s.narration), `shared_script.${i}`, 'INCOMPLETE_SCRIPT');
    references(s.claim_refs, claimKeys, `shared_script.${i}.claim_refs`);
  }

  const brandKeys = Object.keys(masterReferences);
  const rawEntries = Array.isArray(brandInventory?.references) ? brandInventory.references : [];
  check(rawEntries.length > 0 && rawEntries.every(record), 'brand_inventory', 'INVALID_BRAND_INVENTORY');
  const entries = rawEntries.filter(record);
  check(unique(entries.map(e => e.key)) && entries.every(e => text(e.key) && ['INTEGRITY_VERIFIED', 'VERIFIED', 'UNVERIFIED', 'NOT FOUND', 'INACCESSIBLE'].includes(e.status)), 'brand_inventory', 'INVALID_BRAND_INVENTORY');
  const entryMap = new Map(entries.map(e => [e.key, e]));
  if (shape(p.brand_references, brandKeys, 'brand_references')) for (const role of brandKeys) {
    const entry = entryMap.get(p.brand_references[role]);
    check(Boolean(entry) && entry.role === role && p.brand_references[role] === masterReferences[role], `brand_references.${role}`, 'BRAND_REFERENCE_REQUIRED');
    const observed = inventory.references.find(e => e.key === masterReferences[role]);
    if (!entry || entry.status !== 'INTEGRITY_VERIFIED' || !validReference(entry.location)
      || typeof entry.sha256 !== 'string' || !digest.test(entry.sha256) || entry.sha256 !== observed?.sha256
      || entry.mime_type !== 'image/jpeg' || entry.byte_size !== observed?.byte_size) visualBlockers.push(`BRAND_UNVERIFIED:${role}`);
    // Local file integrity and Founder designation never establish current cloud
    // READY, human production QC or authenticated production/publishing approval.
  }
  if (shape(p.characters, Object.keys(characters), 'characters')) for (const [key, name] of Object.entries(characters)) {
    const c = p.characters[key];
    if (!shape(c, ['name', 'master_reference'], `characters.${key}`)) continue;
    check(c.name === name && c.master_reference === masterReferences[key] && c.master_reference === p.brand_references?.[key], `characters.${key}`, 'LOCKED_CHARACTER_REFERENCE_REQUIRED');
  }
  const chapterMap = new Map();
  for (const [i, c] of list(p.chapters, 'chapters').entries()) {
    if (!shape(c, ['key', 'wardrobe'], `chapters.${i}`)) continue;
    check(text(c.key) && slug.test(c.key) && !chapterMap.has(c.key), `chapters.${i}.key`, 'INVALID_CHAPTER');
    chapterMap.set(c.key, c);
    if (shape(c.wardrobe, Object.keys(characters), `chapters.${i}.wardrobe`)) check(Object.values(c.wardrobe).every(text), `chapters.${i}.wardrobe`, 'WARDROBE_REQUIRED');
  }
  const assetKeys = new Set();
  for (const [i, a] of list(p.assets, 'assets').entries()) {
    if (!shape(a, ['key', 'purpose', 'reference', 'asset_id', 'readiness_evidence_ref'], `assets.${i}`)) continue;
    check(text(a.key) && slug.test(a.key) && !assetKeys.has(a.key), `assets.${i}.key`, 'INVALID_ASSET_KEY'); assetKeys.add(a.key);
    check(['LOGO', 'WATERMARK', 'CHARACTER_MASTER', 'SCENE'].includes(a.purpose), `assets.${i}.purpose`, 'INVALID_ASSET_PURPOSE');
    check(a.asset_id === null || (typeof a.asset_id === 'string' && uuid.test(a.asset_id)), `assets.${i}.asset_id`, 'INVALID_ASSET_ID');
    check(a.reference === null || entryMap.has(a.reference) || validReference(a.reference), `assets.${i}.reference`, 'INVALID_ASSET_REFERENCE');
    check(a.readiness_evidence_ref === null || validReference(a.readiness_evidence_ref), `assets.${i}.readiness_evidence_ref`, 'INVALID_ASSET_EVIDENCE');
    if (!a.reference || !a.readiness_evidence_ref) visualBlockers.push('ASSET_READINESS_UNVERIFIED');
  }
  for (const role of brandKeys) {
    const purpose = brandPurpose(role);
    check(Array.isArray(p.assets) && p.assets.some(a => a?.purpose === purpose && a.reference === p.brand_references?.[role]), `assets.${role}`, 'REQUIRED_BRAND_ASSET_PLAN_MISSING');
  }

  const pairs = new Set();
  for (const [i, d] of list(p.derivatives, 'derivatives').entries()) {
    const at = `derivatives.${i}`;
    if (!shape(d, ['recipe', 'format', 'language', 'source_topic_key', 'source_revision', 'translation_review_ref', 'duration_seconds', 'script', 'storyboard', 'article'], at)) continue;
    const recipe = taxonomy.platform_recipes.find(r => r.key === d.recipe);
    check(Boolean(recipe) && recipe.formats.includes(d.format), `${at}.recipe`, 'INVALID_PLATFORM_FORMAT');
    check(language(d.language) && languages.includes(d.language), `${at}.language`, 'UNDECLARED_LANGUAGE');
    const pair = `${d.recipe}:${d.language}`;
    check(!pairs.has(pair), at, 'DUPLICATE_RECIPE_LANGUAGE'); pairs.add(pair);
    check(d.source_topic_key === p.topic_key, `${at}.source_topic_key`, 'ORPHAN_DERIVATIVE');
    check(d.source_revision === p.revision, `${at}.source_revision`, 'STALE_OR_MISSING_REVISION');
    check(d.translation_review_ref === null || validReference(d.translation_review_ref), `${at}.translation_review_ref`, 'INVALID_TRANSLATION_EVIDENCE');
    if (d.language !== p.source_language && !d.translation_review_ref) visualBlockers.push('TRANSLATION_REVIEW_MISSING');
    if (d.recipe === 'website-article') {
      if (shape(d.article, ['title', 'body', 'claim_refs'], `${at}.article`)) {
        try { validateContentRequest({ action: 'create', category: p.category, title: d.article.title, body: d.article.body }); }
        catch { error(`${at}.article`, 'CMS_PAYLOAD_INCOMPATIBLE'); }
        references(d.article.claim_refs, claimKeys, `${at}.article.claim_refs`);
      }
      check(Array.isArray(d.script) && !d.script.length && Array.isArray(d.storyboard) && !d.storyboard.length && d.duration_seconds === null, at, 'ARTICLE_HAS_NO_VISUAL_TIMELINE');
      continue;
    }
    check(d.article === null, `${at}.article`, 'ARTICLE_ONLY_ON_WEBSITE_RECIPE');
    const video = Boolean(recipe?.style);
    check(video ? Number.isFinite(d.duration_seconds) && d.duration_seconds > 0 : d.duration_seconds === null, `${at}.duration_seconds`, 'INVALID_TIMING');
    if (recipe?.duration_seconds) check(d.duration_seconds >= recipe.duration_seconds.min && d.duration_seconds <= recipe.duration_seconds.max, `${at}.duration_seconds`, 'LONG_FORM_DURATION_OUT_OF_RANGE');
    const scripts = list(d.script, `${at}.script`), scriptMap = new Map();
    for (const [j, s] of scripts.entries()) {
      if (!shape(s, ['key', 'source_segment_ref', 'narrative_purpose', 'narration', 'dialogue', 'caption', 'claim_refs'], `${at}.script.${j}`)) continue;
      check(text(s.key) && slug.test(s.key) && !scriptMap.has(s.key), `${at}.script.${j}.key`, 'DUPLICATE_SCRIPT_SEGMENT'); scriptMap.set(s.key, s);
      check(sourceSegments.has(s.source_segment_ref), `${at}.script.${j}.source_segment_ref`, 'UNKNOWN_SOURCE_SEGMENT');
      check(text(s.narrative_purpose) && text(s.caption) && typeof s.narration === 'string', `${at}.script.${j}`, 'INCOMPLETE_SCRIPT');
      const dialogue = list(s.dialogue, `${at}.script.${j}.dialogue`, 0);
      check(text(s.narration) || dialogue.length > 0, `${at}.script.${j}`, 'NARRATION_OR_DIALOGUE_REQUIRED');
      for (const [k, line] of dialogue.entries()) if (shape(line, ['character', 'text'], `${at}.script.${j}.dialogue.${k}`)) check(typeof line.character === 'string' && Object.hasOwn(characters, line.character) && text(line.text), `${at}.script.${j}.dialogue.${k}`, 'INVALID_DIALOGUE');
      const refs = references(s.claim_refs, claimKeys, `${at}.script.${j}.claim_refs`);
      const original = sourceSegments.get(s.source_segment_ref);
      check(Boolean(original) && Array.isArray(original.claim_refs) && refs.every(k => original.claim_refs.includes(k)), `${at}.script.${j}.claim_refs`, 'SOURCE_SEGMENT_CLAIM_MISMATCH');
    }
    const boards = list(d.storyboard, `${at}.storyboard`), covered = new Set(); let duration = 0;
    if (recipe?.slides) check(boards.length >= recipe.slides.min && boards.length <= recipe.slides.max, `${at}.storyboard`, 'CAROUSEL_SLIDE_LIMIT');
    for (const [j, b] of boards.entries()) {
      const bp = `${at}.storyboard.${j}`;
      if (!shape(b, ['order', 'script_ref', 'chapter', 'characters', 'wardrobe', 'composition', 'camera', 'continuity_notes', 'claim_refs', 'asset_requirements', 'duration_seconds'], bp)) continue;
      check(b.order === j + 1, `${bp}.order`, 'NON_SEQUENTIAL_STORYBOARD');
      const script = scriptMap.get(b.script_ref), chapter = chapterMap.get(b.chapter);
      check(Boolean(script) && !covered.has(b.script_ref), `${bp}.script_ref`, 'INVALID_STORYBOARD_SCRIPT_LINK'); covered.add(b.script_ref);
      check(Boolean(chapter), `${bp}.chapter`, 'UNKNOWN_CHAPTER');
      check([b.composition, b.camera, b.continuity_notes].every(text), bp, 'INCOMPLETE_STORYBOARD');
      const participating = references(b.characters, new Set(Object.keys(characters)), `${bp}.characters`, 0)
        .filter(key => typeof key === 'string' && Object.hasOwn(characters, key));
      if (record(b.wardrobe)) {
        check(Object.keys(b.wardrobe).length === participating.length && participating.every(key => b.wardrobe[key] === chapter?.wardrobe?.[key]), `${bp}.wardrobe`, 'CHAPTER_WARDROBE_DRIFT');
      } else error(`${bp}.wardrobe`, 'WARDROBE_REQUIRED');
      if (script) check(Array.isArray(script.dialogue) && script.dialogue.every(line => participating.includes(line?.character)), `${bp}.characters`, 'DIALOGUE_CHARACTER_ABSENT');
      const claimRefs = references(b.claim_refs, claimKeys, `${bp}.claim_refs`);
      if (script) check(Array.isArray(script.claim_refs) && script.claim_refs.every(key => claimRefs.includes(key)), `${bp}.claim_refs`, 'SCRIPT_CLAIM_NOT_STORYBOARDED');
      const assets = references(b.asset_requirements, assetKeys, `${bp}.asset_requirements`);
      for (const role of ['logo', 'watermark', ...participating]) {
        const purpose = brandPurpose(role);
        check(Array.isArray(p.assets) && p.assets.some(a => a && a.purpose === purpose && a.reference === p.brand_references?.[role] && assets.includes(a.key)), `${bp}.asset_requirements`, 'REQUIRED_VISUAL_BRAND_REFERENCE_MISSING');
      }
      check(video ? Number.isFinite(b.duration_seconds) && b.duration_seconds > 0 : b.duration_seconds === null, `${bp}.duration_seconds`, 'INVALID_SCENE_TIMING');
      if (video && Number.isFinite(b.duration_seconds)) duration += b.duration_seconds;
    }
    check(covered.size === scripts.length && boards.length === scripts.length, at, 'SCRIPT_STORYBOARD_COVERAGE_MISMATCH');
    if (video) check(Math.abs(duration - d.duration_seconds) < 0.001, `${at}.duration_seconds`, 'TIMELINE_DURATION_MISMATCH');
  }
  for (const locale of languages) for (const recipe of taxonomy.platform_recipes) check(pairs.has(`${recipe.key}:${locale}`), 'derivatives', 'MISSING_RECIPE_LANGUAGE');

  if (shape(p.reviews, reviewKeys, 'reviews')) for (const key of reviewKeys) {
    check(p.reviews[key] === null || validReference(p.reviews[key]), `reviews.${key}`, 'INVALID_REVIEW_EVIDENCE');
    if (!p.reviews[key]) visualBlockers.push(`HUMAN_REVIEW_MISSING:${key}`);
  }
  if (p.approval_evidence !== null && shape(p.approval_evidence, ['reference', 'scope', 'topic_key', 'revision', 'package_digest'], 'approval_evidence')) {
    const a = p.approval_evidence;
    check(validReference(a.reference) && a.scope === 'PRODUCTION_HANDOFF' && a.topic_key === p.topic_key && a.revision === p.revision && a.package_digest === packageDigest(p), 'approval_evidence', 'INVALID_OR_STALE_APPROVAL_EVIDENCE');
  }
  if (shape(p.cms, ['content_id', 'observed_state'], 'cms')) {
    check(p.cms.content_id === null || (typeof p.cms.content_id === 'string' && uuid.test(p.cms.content_id)), 'cms.content_id', 'INVALID_CONTENT_ID');
    check(p.cms.content_id === null ? p.cms.observed_state === null : ['DRAFT', 'RELEASED', 'WITHDRAWN'].includes(p.cms.observed_state), 'cms.observed_state', 'INVALID_CMS_OBSERVATION');
  }
  return finish();
}

// Pure projection only. No persistence, no update/release action, no private metadata.
export function projectCmsCreate(value, locale) {
  if (!validateProductionPackage(value).structural_valid) throw Error('Invalid editorial contract');
  if (value.cms.content_id !== null) throw Error('Existing content must use the protected Founder workspace');
  const article = value.derivatives.find(d => d.recipe === 'website-article' && d.language === locale)?.article;
  if (!article) throw Error('Missing localized article');
  const payload = { action: 'create', category: value.category, title: article.title, body: article.body };
  validateContentRequest(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw Error('Select one local package');
    const result = validateProductionPackage(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.structural_valid ? 0 : 1;
  } catch {
    console.error(JSON.stringify({ structural_valid: false, errors: [{ path: 'package', code: 'UNREADABLE_OR_INVALID_JSON' }] }));
    process.exitCode = 1;
  }
}
