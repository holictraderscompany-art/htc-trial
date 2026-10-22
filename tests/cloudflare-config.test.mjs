import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const config = JSON.parse(read('wrangler.jsonc'));
const pkg = JSON.parse(read('package.json'));

test('Workers preparation is explicit TEST with no active public route', () => {
  assert.equal(config.vars.HTC_SUPABASE_TARGET, 'test');
  assert.equal(config.vars.SUPABASE_URL, 'https://uzhkzhmncxjplrdtdzgd.supabase.co');
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.routes, []);
  assert.equal(config.account_id, undefined);
  assert.equal(config.vars.SUPABASE_PUBLISHABLE_KEY, undefined);
});
test('Workers uses Node compatibility and routes requests through the application', () => {
  assert(config.compatibility_flags.includes('nodejs_compat'));
  assert(Date.parse(config.compatibility_date) >= Date.parse('2024-09-23'));
  assert.equal(config.main, '.open-next/worker.js');
  assert.equal(config.assets.directory, '.open-next/assets');
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.services[0].service, config.name);
  assert.equal(config.upload_source_maps, false);
  assert.equal(config.observability.enabled, false);
});
test('Existing Next defaults and workflow are retained; new scripts do not deploy', async () => {
  assert.deepEqual((await import(new URL('next.config.mjs', root))).default, {});
  assert.equal(pkg.dependencies.next, '16.4.1');
  assert.equal(pkg.scripts.build, 'next build --webpack');
  assert.equal(pkg.scripts['build:workers'], 'opennextjs-cloudflare build');
  assert.match(pkg.scripts['preview:workers'], /dev --local/);
  assert.match(pkg.scripts['dry-run:workers'], /deploy --dry-run/);
  assert.equal(pkg.scripts.deploy, undefined);
  assert.equal(pkg.scripts.upload, undefined);
  assert.equal(pkg.scripts.postinstall, undefined);
});
test('Secrets and generated artifacts are excluded; Netlify and validated sources are preserved', () => {
  const ignored = read('.gitignore');
  for (const pattern of ['.open-next/', '.wrangler/', '.cloudflare-dry-run/', '.dev.vars*']) assert(ignored.includes(pattern));
  const protectedChanges = cp.execFileSync('git', ['diff', '4e8e07b18c1040722169223196add2112751cfeb', '--name-only', '--',
    'src', 'supabase', 'validation/test-db', 'validation/t13', 'validation/t14', 'validation/t15-master',
    'validation/t16-r1', 'validation/t16-r2', 'validation/t16-final', 'netlify.toml', '.netlify', 'config'], { cwd: root, encoding: 'utf8' });
  assert.equal(protectedChanges.trim(), '');
});
