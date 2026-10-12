import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Static contract checks only. SQL fixtures prove behavior in a disposable DB;
// the isolation spec requires PostgreSQL's isolationtester and two sessions.
const sql = readFileSync(new URL('../supabase/migrations/20261011090000_trial_content_draft_only.sql', import.meta.url), 'utf8');

test('draft RPC authorizes before lookup and narrows execution without changing RLS', () => {
  assert.match(sql, /security definer\s+set search_path = ''/);
  assert.match(sql, /auth\.uid\(\) is null or public\.is_founder\(\) is distinct from true/);
  assert.ok(sql.indexOf("errcode = '42501'") < sql.indexOf('select * into content'));
  assert.match(sql, /revoke all on function public\.update_trial_content_draft\(jsonb\) from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.update_trial_content_draft\(jsonb\) to authenticated;/);
  assert.doesNotMatch(sql, /(?:create|alter|drop)\s+(?:table|policy)|grant\s+\w+\s+on\s+(?:table\s+)?public\.trial_content\b/i);
});

test('draft guard and nested update share a database row lock', () => {
  assert.match(sql, /where id = \(payload->>'id'\)::uuid for update;/);
  const guard = sql.indexOf("if content.state is distinct from 'DRAFT'");
  const update = sql.indexOf('result := public.manage_trial_content');
  assert.ok(guard > sql.indexOf('for update;') && guard < update);
  assert.match(sql.slice(guard, update), /return jsonb_build_object\('outcome', 'not_draft'\)/);
  assert.equal((sql.match(/public\.manage_trial_content\(/g) ?? []).length, 1);
  assert.doesNotMatch(sql, /\b(?:commit|rollback|insert|delete)\b|\bexecute\s+(?:format|payload)|update public\./i);
});

test('only editable fields enter a fixed update action', () => {
  assert.match(sql, /required constant text\[\] := array\['id', 'category', 'title', 'body'\]/);
  assert.match(sql, /payload \?& required/);
  assert.match(sql, /jsonb_object_keys\(payload\).*not \(k = any\(required\)\)/);
  assert.match(sql, /jsonb_typeof\(payload->k\) is distinct from 'string'/);
  assert.match(sql, /payload->>'id' !~\*/);
  assert.match(sql, /'action', 'update', 'id', content\.id/);
  assert.doesNotMatch(sql, /payload->>'(?:action|state|released_at|created_at|role)'/);
});

test('success checks identifier and lifecycle invariants; failures are controlled', () => {
  for (const fragment of ["'not_found'", "'not_draft'", "'saved'", "result->>'id' is distinct from content.id::text", "result->>'state' is distinct from 'DRAFT'", "result->'released_at' is distinct from 'null'::jsonb", "result->'created_at' is distinct from to_jsonb(content.created_at)"]) {
    assert.ok(sql.includes(fragment), fragment);
  }
  assert.match(sql, /exception when check_violation then[\s\S]*raise exception 'Invalid request' using errcode = '22023'/);
  assert.match(sql, /raise exception 'Request could not be completed' using errcode = 'XX000'/);
  assert.doesNotMatch(sql, /\b(?:sqlerrm|raise notice|raise log|dblink|pg_sleep)\b/i);
});
