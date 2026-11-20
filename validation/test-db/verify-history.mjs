import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('./', import.meta.url);
const history = JSON.parse(readFileSync(new URL('history.json', root)));
assert.equal(history.project_id, 'uzhkzhmncxjplrdtdzgd', 'Test project required');
const files = readdirSync(new URL('supabase/migrations/', root)).sort();
const expected = history.migrations.map(row => `${row.version}_${row.name}.sql`).sort();
assert.deepEqual(files, expected, 'Unexpected or missing migration');
for (const row of history.migrations) {
  const body = readFileSync(new URL(`supabase/migrations/${row.version}_${row.name}.sql`, root));
  assert.equal(createHash('sha256').update(body).digest('hex'), row.source_sha256, row.name);
}
if (process.argv[2]) {
  const remote = JSON.parse(readFileSync(process.argv[2]));
  assert.equal(remote.project_id, history.project_id, 'Remote project mismatch');
  assert.deepEqual(remote.migrations, history.migrations, 'Live migration history differs');
}
console.log(`PASS ${files.length}/${files.length} migration versions and source hashes${process.argv[2] ? ' against remote snapshot' : ' against recorded manifest'}`);
