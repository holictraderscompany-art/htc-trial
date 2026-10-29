import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, linkSync, readdirSync, statSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { patchedRuntime, originalHash, patchedHash, writeRuntimeAtomically, applyBackport } from '../validation/t21/next-not-found-backport.mjs';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'htc-t21-backport-'));
  t.after(() => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  });
  return directory;
}

function fakeNext(directory) {
  const packageRoot = join(directory, 'node_modules', 'next');
  const runtime = join(packageRoot, 'dist', 'compiled', 'next-server', 'app-page.runtime.prod.js');
  mkdirSync(dirname(runtime), { recursive: true });
  writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name: 'next', version: '16.4.1' }));
  writeFileSync(runtime, 'unknown fixture runtime');
  return runtime;
}

test('backport rejects another Next version before any write', () => {
  assert.throws(() => patchedRuntime(Buffer.from('unknown'), '16.4.2'), /T21_BACKPORT_UNSUPPORTED_NEXT/);
});
test('backport rejects unknown or altered runtime bytes', () => {
  for (const value of ['', 'b.d={r:y,p:!1,v:null};', '__next_error__', 'malicious runtime']) {
    assert.throws(() => patchedRuntime(Buffer.from(value), '16.4.1'), /T21_BACKPORT_UNKNOWN_RUNTIME/);
  }
});
test('backport has distinct immutable original and result identities', () => {
  assert.match(originalHash, /^[a-f0-9]{64}$/); assert.match(patchedHash, /^[a-f0-9]{64}$/);
  assert.notEqual(originalHash, patchedHash);
});
test('build applies backport explicitly without dependency version changes', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(pkg.scripts.build, 'node validation/t21/next-not-found-backport.mjs && next build --webpack');
  assert.deepEqual(pkg.dependencies, { next: '16.4.1', react: '19.3.0', 'react-dom': '19.3.0' });
  assert(!pkg.scripts.postinstall && !pkg.scripts.preinstall);
});
test('original accessible content loading remains byte-identical in Git canonical form', () => {
  const source = readFileSync(new URL('../src/app/(public)/content/loading.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(source, 'export default function ContentLoading() {\n  return <section className="page-state" aria-busy="true"><h1>Content</h1><p role="status">Loading content…</p></section>;\n}\n');
});

test('atomic runtime replacement leaves pnpm-style shared hardlinks unchanged', t => {
  const directory = fixture(t);
  const shared = join(directory, 'shared-store-runtime.js');
  const target = join(directory, 'runtime.js');
  const original = Buffer.from('original framework runtime');
  const patched = Buffer.from('patched framework runtime');
  writeFileSync(shared, original);
  linkSync(shared, target);
  if (process.platform !== 'win32') chmodSync(target, 0o660);
  const mode = statSync(target).mode & 0o777;
  assert.equal(writeRuntimeAtomically(target, original, patched), true);
  assert.deepEqual(readFileSync(target), patched);
  assert.deepEqual(readFileSync(shared), original);
  assert.equal(statSync(target).mode & 0o777, mode);
  assert.deepEqual(readdirSync(directory).sort(), ['runtime.js', 'shared-store-runtime.js']);
});

test('already-patched atomic write is a true no-op for shared files', t => {
  const directory = fixture(t);
  const shared = join(directory, 'shared.js');
  const target = join(directory, 'runtime.js');
  const patched = Buffer.from('already patched');
  writeFileSync(shared, patched);
  linkSync(shared, target);
  const before = statSync(target);
  assert.equal(writeRuntimeAtomically(target, patched, patched), false);
  const after = statSync(target);
  assert.equal(after.ino, before.ino);
  assert.equal(after.mtimeMs, before.mtimeMs);
  assert.equal(after.nlink, before.nlink);
  assert.deepEqual(readdirSync(directory).sort(), ['runtime.js', 'shared.js']);
});

test('atomic write rejects a changed preimage without creating a temporary file', t => {
  const directory = fixture(t);
  const target = join(directory, 'runtime.js');
  writeFileSync(target, 'unexpected runtime');
  assert.throws(() => writeRuntimeAtomically(target, Buffer.from('expected runtime'), Buffer.from('patch')), /T21_BACKPORT_RUNTIME_CHANGED/);
  assert.equal(readFileSync(target, 'utf8'), 'unexpected runtime');
  assert.deepEqual(readdirSync(directory), ['runtime.js']);
});

test('backport cannot mutate a Next install resolved from outside the project', t => {
  const directory = fixture(t);
  const runtime = fakeNext(directory);
  const project = join(directory, 'nested-project');
  mkdirSync(project);
  writeFileSync(join(project, 'package.json'), '{}');
  assert.throws(() => applyBackport(project), /T21_BACKPORT_PROJECT_SCOPE/);
  assert.equal(readFileSync(runtime, 'utf8'), 'unknown fixture runtime');
});

test('unsupported local runtime fails closed before changing any package file', t => {
  const directory = fixture(t);
  const runtime = fakeNext(directory);
  writeFileSync(join(directory, 'package.json'), '{}');
  assert.throws(() => applyBackport(directory), /T21_BACKPORT_UNKNOWN_RUNTIME/);
  assert.equal(readFileSync(runtime, 'utf8'), 'unknown fixture runtime');
  assert.deepEqual(readdirSync(dirname(runtime)), ['app-page.runtime.prod.js']);
});
