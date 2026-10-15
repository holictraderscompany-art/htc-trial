import test from 'node:test';
import assert from 'node:assert/strict';
import { supabaseConfiguration } from '../src/server/api-foundation.js';

test('T13 TEST transport requires explicit opt-in and rejects target/key substitution', () => {
  const env = { HTC_SUPABASE_TARGET: 'test', SUPABASE_URL: 'https://uzhkzhmncxjplrdtdzgd.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_test' };
  assert.equal(supabaseConfiguration(env).url, env.SUPABASE_URL);
  for (const invalid of [{ ...env, HTC_SUPABASE_TARGET: undefined }, { ...env, SUPABASE_URL: 'https://evil.test' },
    { ...env, HTC_SUPABASE_TARGET: 'production' }, { ...env, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_bad' }]) {
    assert.throws(() => supabaseConfiguration(invalid));
  }
});
