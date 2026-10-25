import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { validateProductionPackage, packageDigest } from '../t19/validate-production-package.mjs';

const taxonomy = JSON.parse(readFileSync(new URL('../../docs/t18-content-taxonomy.json', import.meta.url), 'utf8'));
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const shape = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const slug = v => typeof v === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(v);
const uuid = v => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const receipt = v => typeof v === 'string' && /^private:[a-z0-9][a-z0-9._/-]*$/i.test(v) && !v.includes('..') && !v.includes('//');
const canonical = v => Array.isArray(v) ? v.map(canonical) : object(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const hash = v => createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const copy = v => JSON.parse(JSON.stringify(v));
const failure = code => Object.assign(new Error(code), { code });
const fields = platform => platform === 'YouTube' ? ['title', 'description']
  : platform === 'HTC Website' ? ['title'] : ['caption'];
const privatePath = /(?:^|[\s("'=])(?:\/|~[\\/]|[a-z]:[\\/]|\\\\)|\b(?:trial-assets|storage)[\\/]|(?:\b[a-z_][\w.-]*[\\/]){2,}[\w.-]+|\b[\w.-]+[\\/][\w.-]+\.(?:png|jpe?g|webp|mp4|mp3|pdf)\b/i;

// This is an HTC editorial field profile, not a claim that a provider accepts it.
const publicText = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 8000
  && !/[<>\u0000-\u001f\u007f]/.test(v)
  && !privatePath.test(v)
  && !/(?:private:|repo:|https?:\/\/|file:|[a-z]:\\|bearer\s|api[_-]?key|access[_-]?token|service[_-]?role|-----BEGIN|gh[pousr]_|github_pat_|sk_live_)/i.test(v);

function sourceSnapshot(value) {
  try {
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > 5_000_000) throw failure('INVALID_SOURCE_PACKAGE');
    const p = JSON.parse(serialized);
    if (!validateProductionPackage(p).structural_valid) throw failure('INVALID_SOURCE_PACKAGE');
    return p;
  } catch { throw failure('INVALID_SOURCE_PACKAGE'); }
}

export function distributionIdentity(value) {
  if (!shape(value, ['topic_key', 'revision', 'recipe', 'format', 'language', 'variant'])) throw failure('INVALID_IDENTITY');
  const { topic_key, revision, recipe, format, language, variant } = value;
  const r = taxonomy.platform_recipes.find(r => r.key === recipe);
  if (!slug(topic_key) || !Number.isSafeInteger(revision) || revision < 1 || !r?.formats.includes(format)
    || !slug(variant) || typeof language !== 'string') throw failure('INVALID_IDENTITY');
  try { if (new Intl.Locale(language).toString() !== language) throw Error(); }
  catch { throw failure('INVALID_IDENTITY'); }
  return `dist-${hash([topic_key, revision, r.platform, recipe, format, language, variant])}`;
}

// No original private source locations, prose, account IDs or URLs are copied.
function derive(p, variant) {
  if (!slug(variant)) throw failure('INVALID_VARIANT');
  const source = { topic_key: p.topic_key, editorial_revision: p.revision, package_digest: packageDigest(p), source_language: p.source_language };
  return {
    contract_version: 1, package_id: `bundle-${hash([source, variant])}`, source, variant,
    trial: copy(p.trial), brand_requirements: copy(p.brand_references),
    items: p.derivatives.map((d, index) => {
      const recipe = taxonomy.platform_recipes.find(r => r.key === d.recipe);
      const article = d.recipe === 'website-article', video = Boolean(recipe.style);
      const base = `/derivatives/${index}`;
      const claims = [...new Set(article ? d.article.claim_refs
        : [...d.script.flatMap(s => s.claim_refs), ...d.storyboard.flatMap(b => b.claim_refs)])];
      const unitOrders = d.storyboard.map(b => b.order);
      const media = article ? [] : (video ? [unitOrders] : unitOrders.map(n => [n]));
      return {
        distribution_id: distributionIdentity({ topic_key: p.topic_key, revision: p.revision, recipe: d.recipe, format: d.format, language: d.language, variant }),
        platform: recipe.platform, recipe: d.recipe, format: d.format, language: d.language,
        content_ref: base, caption_description_ref: article ? `${base}/article` : `${base}/script`,
        claim_refs: claims, qualification_claim_refs: [...claims],
        attribution: claims.map(key => ({ claim_ref: key, source_refs: [...p.claims.find(c => c.key === key).source_refs], public_text: null })),
        duration_seconds: d.duration_seconds,
        media_sequence: media.map((orders, i) => ({ order: i + 1, source_units: orders,
          source_asset_keys: [...new Set(d.storyboard.filter(b => orders.includes(b.order)).flatMap(b => b.asset_requirements))],
          kind: video ? 'VIDEO' : 'IMAGE', asset_id: null, readiness_evidence_ref: null, alt_text: null })),
        metadata: Object.fromEntries(fields(recipe.platform).map(k => [k, null])),
        accessibility: { requirement: article ? 'ARTICLE_READABILITY' : video ? 'CAPTIONS_AND_TRANSCRIPT_REVIEW' : 'PER_IMAGE_ALT_TEXT',
          subtitle_ref: null, review_ref: null },
        thumbnail: recipe.platform === 'YouTube' ? { asset_id: null, readiness_evidence_ref: null } : null,
        cta: 'NONE', destination: { account_ref: null, public_destination_ref: null, delivery_contract_ref: null },
        cms_content_id: article ? p.cms.content_id : null,
        approval_requirement: 'AUTHENTICATED_FOUNDER_DISTRIBUTION_APPROVAL',
        tracking: { status: 'PREPARED_OFFLINE', attempt_id: null, external_result_ref: null, error_class: null },
      };
    }), approval_evidence: null,
  };
}

export function prepareDistributionPackage(source, options = {}) {
  if (!object(options) || Object.keys(options).some(k => k !== 'variant')) throw failure('INVALID_OPTIONS');
  const { variant = 'primary' } = options;
  return derive(sourceSnapshot(source), variant);
}

// Receipt excluded to avoid a circular digest; all other data, including destinations,
// captions, asset bindings, ordering and source digest, is sealed. Never authority.
export function distributionDigest(manifest) {
  try {
    const m = copy(manifest);
    if (!object(m)) throw Error();
    const { approval_evidence, ...snapshot } = m;
    return hash(snapshot);
  } catch { throw failure('INVALID_DISTRIBUTION_PACKAGE'); }
}

export function validateDistributionPackage(source, value) {
  const errors = [], blockers = new Set(['AUTHENTICATED_FOUNDER_APPROVAL_REQUIRED', 'HUMAN_TRIAL_FACTUAL_LOCALIZATION_AND_PRIVACY_REVIEW_REQUIRED']);
  const error = (path, code) => errors.push({ path, code });
  const check = (ok, path, code) => { if (!ok) error(path, code); return ok; };
  const finish = () => ({ structural_valid: errors.length === 0, errors,
    foundation_readiness: errors.length ? 'BLOCKED' : 'STRUCTURALLY_VALID_HUMAN_REVIEW_REQUIRED',
    external_platform_integration: 'NOT_IMPLEMENTED', actual_media_readiness: 'BLOCKED',
    publishing_authorization: 'BLOCKED', executable: false, blockers: [...blockers].sort() });
  try {
    const p = sourceSnapshot(source), m = copy(value);
    const expected = derive(p, m?.variant);
    if (!check(shape(m, Object.keys(expected)), 'manifest', 'EXACT_FIELDS_REQUIRED')) return finish();
    for (const key of ['contract_version', 'package_id', 'source', 'variant', 'trial', 'brand_requirements'])
      check(equal(m[key], expected[key]), key, 'SOURCE_OR_CONTRACT_MISMATCH');
    if (!check(Array.isArray(m.items) && m.items.length === expected.items.length, 'items', 'RECIPE_COVERAGE_MISMATCH')) return finish();
    const ids = new Set();
    for (const [i, item] of m.items.entries()) {
      const e = expected.items[i], at = `items.${i}`;
      if (!check(shape(item, Object.keys(e)), at, 'EXACT_FIELDS_REQUIRED')) continue;
      check(!ids.has(item.distribution_id), `${at}.distribution_id`, 'DUPLICATE_DISTRIBUTION_ID'); ids.add(item.distribution_id);
      const editable = new Set(['metadata', 'attribution', 'media_sequence', 'accessibility', 'thumbnail', 'destination', 'cta']);
      for (const key of Object.keys(e).filter(k => !editable.has(k))) check(equal(item[key], e[key]), `${at}.${key}`, 'DERIVATION_MISMATCH');
      if (check(shape(item.metadata, Object.keys(e.metadata)), `${at}.metadata`, 'PLATFORM_METADATA_REQUIRED'))
        for (const key of Object.keys(e.metadata)) {
          check(item.metadata[key] === null || publicText(item.metadata[key]), `${at}.metadata.${key}`, 'UNSAFE_PUBLIC_TEXT');
          if (item.metadata[key] === null) blockers.add('PUBLIC_COPY_INCOMPLETE');
        }
      if (check(Array.isArray(item.attribution) && item.attribution.length === e.attribution.length, `${at}.attribution`, 'ATTRIBUTION_REQUIRED'))
        for (const [j, a] of item.attribution.entries()) {
          const original = e.attribution[j];
          if (!check(shape(a, Object.keys(original)), `${at}.attribution.${j}`, 'ATTRIBUTION_REQUIRED')) continue;
          check(equal(a.claim_ref, original.claim_ref) && equal(a.source_refs, original.source_refs), `${at}.attribution.${j}`, 'CLAIM_PROVENANCE_MISMATCH');
          check(a.public_text === null || publicText(a.public_text), `${at}.attribution.${j}.public_text`, 'UNSAFE_PUBLIC_TEXT');
          if (a.public_text === null) blockers.add('PUBLIC_ATTRIBUTION_INCOMPLETE');
        }
      if (check(Array.isArray(item.media_sequence) && item.media_sequence.length === e.media_sequence.length, `${at}.media_sequence`, 'MEDIA_SEQUENCE_REQUIRED'))
        for (const [j, media] of item.media_sequence.entries()) {
          const original = e.media_sequence[j];
          if (!check(shape(media, Object.keys(original)), `${at}.media_sequence.${j}`, 'EXACT_FIELDS_REQUIRED')) continue;
          for (const key of ['order', 'source_units', 'source_asset_keys', 'kind']) check(equal(media[key], original[key]), `${at}.media_sequence.${j}.${key}`, 'MEDIA_ORDER_OR_SOURCE_MISMATCH');
          check(media.asset_id === null || uuid(media.asset_id), `${at}.media_sequence.${j}.asset_id`, 'INVALID_ASSET_ID');
          check(media.readiness_evidence_ref === null || receipt(media.readiness_evidence_ref), `${at}.media_sequence.${j}.readiness_evidence_ref`, 'INVALID_PRIVATE_RECEIPT');
          check(media.alt_text === null || publicText(media.alt_text), `${at}.media_sequence.${j}.alt_text`, 'UNSAFE_PUBLIC_TEXT');
          if (media.kind === 'IMAGE' && media.alt_text === null) blockers.add('ALT_TEXT_INCOMPLETE');
          blockers.add('ASSET_READY_OBJECT_IDENTITY_MIME_SIZE_AND_OWNERSHIP_UNVERIFIED');
        }
      if (check(shape(item.accessibility, Object.keys(e.accessibility)), `${at}.accessibility`, 'ACCESSIBILITY_REQUIRED')) {
        check(item.accessibility.requirement === e.accessibility.requirement, `${at}.accessibility.requirement`, 'ACCESSIBILITY_REQUIRED');
        for (const key of ['subtitle_ref', 'review_ref']) check(item.accessibility[key] === null || receipt(item.accessibility[key]), `${at}.accessibility.${key}`, 'INVALID_PRIVATE_RECEIPT');
        check(e.duration_seconds !== null || item.accessibility.subtitle_ref === null, `${at}.accessibility.subtitle_ref`, 'SUBTITLES_ONLY_FOR_VIDEO');
        if (!item.accessibility.review_ref || (e.duration_seconds !== null && !item.accessibility.subtitle_ref)) blockers.add('ACCESSIBILITY_REVIEW_OR_SUBTITLES_MISSING');
      }
      if (e.thumbnail === null) check(item.thumbnail === null, `${at}.thumbnail`, 'UNSUPPORTED_METADATA_FIELD');
      else if (check(shape(item.thumbnail, Object.keys(e.thumbnail)), `${at}.thumbnail`, 'THUMBNAIL_REQUIRED')) {
        check(item.thumbnail.asset_id === null || uuid(item.thumbnail.asset_id), `${at}.thumbnail.asset_id`, 'INVALID_ASSET_ID');
        check(item.thumbnail.readiness_evidence_ref === null || receipt(item.thumbnail.readiness_evidence_ref), `${at}.thumbnail.readiness_evidence_ref`, 'INVALID_PRIVATE_RECEIPT');
        blockers.add('THUMBNAIL_SELECTION_AND_PROVIDER_SUPPORT_UNVERIFIED');
      }
      if (check(shape(item.destination, Object.keys(e.destination)), `${at}.destination`, 'DESTINATION_REQUIRED')) {
        for (const key of Object.keys(e.destination)) check(item.destination[key] === null || receipt(item.destination[key]), `${at}.destination.${key}`, 'OPAQUE_PRIVATE_BINDING_REQUIRED');
        if (Object.values(item.destination).some(v => v === null)) blockers.add('DESTINATION_AND_APPROVED_DELIVERY_CONTRACT_REQUIRED');
      }
      check(['NONE', 'READ_APPROVED_PUBLIC_ARTICLE'].includes(item.cta), `${at}.cta`, 'FORBIDDEN_CTA');
      if (item.cta === 'READ_APPROVED_PUBLIC_ARTICLE') check(Boolean(item.destination?.public_destination_ref), `${at}.cta`, 'APPROVED_PUBLIC_DESTINATION_REQUIRED');
    }
    if (m.approval_evidence !== null) {
      const a = m.approval_evidence;
      if (check(shape(a, ['reference', 'scope', 'manifest_digest', 'source_digest', 'source_revision', 'distribution_ids']), 'approval_evidence', 'INVALID_APPROVAL_RECEIPT'))
        check(receipt(a.reference) && a.scope === 'DISTRIBUTION_HANDOFF' && a.manifest_digest === distributionDigest(m)
          && a.source_digest === expected.source.package_digest && a.source_revision === p.revision
          && equal(a.distribution_ids, expected.items.map(x => x.distribution_id)), 'approval_evidence', 'STALE_OR_MISSCOPED_APPROVAL');
    }
    const production = validateProductionPackage(p);
    for (const code of production.visual_blockers) blockers.add(`T19:${code}`);
    blockers.add('SOURCE_AND_BRAND_AUTHENTICITY_NOT_VERIFIED_OFFLINE');
    blockers.add('WEBSITE_REMAINS_UNDER_EXISTING_T15_FOUNDER_RELEASE');
    blockers.add('EXTERNAL_ADAPTER_AND_PROVIDER_CAPABILITIES_NOT_VERIFIED');
    return finish();
  } catch (e) {
    error('manifest', e?.code === 'INVALID_SOURCE_PACKAGE' ? 'INVALID_SOURCE_PACKAGE' : 'MALFORMED_DISTRIBUTION_PACKAGE');
    return finish();
  }
}

// A review snapshot only; no adapter, transport payload, dispatch or state mutation.
export function prepareDistributionHandoff(source, manifest) {
  try {
    const snapshot = copy(manifest), result = validateDistributionPackage(source, snapshot);
    if (!result.structural_valid) throw Error();
    return { contract: 'T20_REVIEW_ONLY', manifest_digest: distributionDigest(snapshot),
      manifest: snapshot, readiness: result, executable: false };
  } catch { throw failure('INVALID_DISTRIBUTION_PACKAGE'); }
}

// Future adapter decision vocabulary, never an execution/retry engine.
export function classifyAttemptObservation(value) {
  if (!shape(value, ['outcome', 'external_result_ref'])
    || !['CONFIRMED', 'TIMEOUT', 'TRANSIENT_REJECTION', 'PERMANENT_REJECTION', 'AUTH_REVOKED'].includes(value.outcome)
    || !(value.external_result_ref === null || receipt(value.external_result_ref))) throw failure('INVALID_ATTEMPT_OBSERVATION');
  if (value.outcome === 'CONFIRMED' && !value.external_result_ref) throw failure('RESULT_EVIDENCE_REQUIRED');
  if (value.outcome !== 'CONFIRMED' && value.external_result_ref !== null) throw failure('CONFLICTING_RESULT');
  return { classification: value.outcome, reconciliation_required: ['TIMEOUT', 'CONFIRMED'].includes(value.outcome),
    retry_eligibility: value.outcome === 'TRANSIENT_REJECTION' ? 'ONLY_AFTER_NO_SIDE_EFFECT_CONFIRMED_AND_REAUTHORIZATION' : 'NO_AUTOMATIC_RETRY',
    executable: false, evidence_verified: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [mode, sourcePath, manifestPath] = process.argv.slice(2);
    if (!['prepare', 'validate'].includes(mode) || !sourcePath || (mode === 'validate' ? !manifestPath || process.argv.length !== 5 : process.argv.length !== 4)) throw Error();
    const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
    const manifest = mode === 'prepare' ? prepareDistributionPackage(source) : JSON.parse(readFileSync(manifestPath, 'utf8'));
    const result = validateDistributionPackage(source, manifest);
    console.log(JSON.stringify(mode === 'prepare' ? { manifest, validation: result } : result, null, 2));
    process.exitCode = result.structural_valid ? 0 : 1;
  } catch {
    console.error(JSON.stringify({ structural_valid: false, errors: [{ path: 'input', code: 'UNREADABLE_OR_INVALID_INPUT' }] }));
    process.exitCode = 1;
  }
}
