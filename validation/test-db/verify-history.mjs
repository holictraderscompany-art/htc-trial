import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('./', import.meta.url);
const json = name => JSON.parse(readFileSync(new URL(name, root)));
const history = json('history.json');
const scope = json('source-scope.json');
const remote = process.argv[2] ? JSON.parse(readFileSync(process.argv[2])) : json('remote-history-20261015.json');
for (const record of [history, scope, remote]) assert.equal(record.project_id, 'uzhkzhmncxjplrdtdzgd');
assert.deepEqual(history.migrations, remote.migrations, 'Recorded TEST history differs');
assert.equal(history.migrations.length, 8);
const included = history.migrations.filter(row => scope.included_source_versions.includes(row.version));
const excluded = history.migrations.filter(row => !scope.included_source_versions.includes(row.version));
assert.deepEqual(excluded, scope.excluded_historical_sources.map(({ reason, ...row }) => row));
assert.deepEqual(excluded.map(row => row.version), ['20261012062323', '20261012062809']);
assert.deepEqual(readdirSync(new URL('supabase/migrations/', root)).sort(), included.map(row => row.version + '_' + row.name + '.sql').sort());
for (const row of included) {
  const body = readFileSync(new URL('supabase/migrations/' + row.version + '_' + row.name + '.sql', root));
  assert.equal(createHash('sha256').update(body).digest('hex'), row.source_sha256, row.name);
}
console.log('PASS 8/8 recorded TEST history; 6/6 SQL source hashes; 2 historical T14-T16 sources excluded by exact version/hash. No database access.');
