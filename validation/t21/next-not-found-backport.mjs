import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync, lstatSync, openSync, closeSync, fchmodSync, renameSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, sep, relative, isAbsolute } from 'node:path';

// Temporary, version-bound backport of next.js#100648 for HTC's dynamic detail route.
// No changes to authorization, content resolution, metadata or the SSR verifier.
export const originalHash = '76557c74ce6f2e8a592ef8c0810c58b8563f1e8b6e86aa71ca933eafc87902a4';
export const patchedHash = '3f86228bcdb279e219f78fc1c7482a9f1ef85d36e2530990390ecfbddac97e95';
const hash = value => createHash('sha256').update(value).digest('hex');
const recoveryAnchor = 'b.d={r:y,p:!1,v:null};';
const loadingAnchor = 'eV=(nw(e,eD,"loading"),ez?[ez,eg,ey]:null)';
const recovery = "\nif(n===\"not-found\"&&a&&/^\\/(?:\\(public\\)\\/)?content\\/\\[id\\](?:\\/page)?$/.test(t.pagePath)){\n try{\n  const nearest=function(tree){\n   const [segment,slots,components,siblings]=tree;\n   const child=slots.children;\n   if(child){const nested=nearest(child);if(nested!==null)return[segment,{...slots,children:nested},components,siblings];}\n   const fallback=components[\"not-found\"];\n   return fallback?[segment,{...slots,children:[\"__PAGE__\",{},{page:fallback},null]},components,siblings]:null;\n  };\n  const tree=nearest(e);\n  if(tree!==null)b=await nS({ctx:t,loaderTree:tree,parentParams:{},parentOptionalCatchAllParamName:null,parentRuntimePrefetchable:false,\n   rootLayoutIncluded:false,injectedCSS:new Set(),injectedJS:new Set(),injectedFontPreloadTags:new Set(),preloadCallbacks:[],\n   authInterrupts:t.renderOpts.experimental.authInterrupts,MetadataOutlet:()=>null,isPrerendering:false,hintTree:m});\n }catch{}\n}\n";
const loading = 'eV=(nw(e,eD,"loading"),ez&&!( !h && /^\\/(?:\\(public\\)\\/)?content\\/\\[id\\](?:\\/page)?$/.test(l.pagePath) && l.parsedRequestHeaders.isRSCRequest===false)?[ez,eg,ey]:null)';

export function patchedRuntime(bytes, version) {
  assert.equal(version, '16.4.1', 'T21_BACKPORT_UNSUPPORTED_NEXT');
  const digest = hash(bytes);
  if (digest === patchedHash) return bytes;
  assert.equal(digest, originalHash, 'T21_BACKPORT_UNKNOWN_RUNTIME');
  const source = bytes.toString('utf8');
  assert.equal(source.split(recoveryAnchor).length, 2, 'T21_BACKPORT_RECOVERY_ANCHOR');
  assert.equal(source.split(loadingAnchor).length, 2, 'T21_BACKPORT_LOADING_ANCHOR');
  const result = Buffer.from(source.replace(recoveryAnchor, recoveryAnchor + recovery).replace(loadingAnchor, loading));
  assert.equal(hash(result), patchedHash, 'T21_BACKPORT_RESULT_MISMATCH');
  return result;
}

// Replace the directory entry rather than modifying an inode shared with pnpm's store.
export function writeRuntimeAtomically(target, original, result) {
  if (original.equals(result)) return false;
  const stat = lstatSync(target);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'T21_BACKPORT_REGULAR_FILE');
  assert(readFileSync(target).equals(original), 'T21_BACKPORT_RUNTIME_CHANGED');
  const temporary = resolve(dirname(target), `.htc-t21-${randomUUID()}.tmp`);
  let descriptor;
  let ownsTemporary = false;
  try {
    descriptor = openSync(temporary, 'wx', stat.mode & 0o777);
    ownsTemporary = true;
    writeFileSync(descriptor, result);
    fchmodSync(descriptor, stat.mode & 0o777);
    const writtenDescriptor = descriptor;
    descriptor = undefined;
    closeSync(writtenDescriptor);
    assert(readFileSync(target).equals(original), 'T21_BACKPORT_RUNTIME_CHANGED');
    renameSync(temporary, target);
    ownsTemporary = false;
    return true;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (ownsTemporary) unlinkSync(temporary);
  }
}

export function applyBackport(root = process.cwd()) {
  const projectRoot = realpathSync(root);
  const require = createRequire(resolve(projectRoot, 'package.json'));
  const packagePath = require.resolve('next/package.json');
  const target = require.resolve('next/dist/compiled/next-server/app-page.runtime.prod.js');
  const packageRoot = realpathSync(dirname(packagePath));
  const packageRelative = relative(projectRoot, packageRoot);
  assert(packageRelative && packageRelative !== '..' && !packageRelative.startsWith('..' + sep) && !isAbsolute(packageRelative), 'T21_BACKPORT_PROJECT_SCOPE');
  assert(lstatSync(target).isFile() && !lstatSync(target).isSymbolicLink(), 'T21_BACKPORT_REGULAR_FILE');
  assert(realpathSync(target).startsWith(packageRoot + sep), 'T21_BACKPORT_PACKAGE_SCOPE');
  const bytes = readFileSync(target);
  const result = patchedRuntime(bytes, JSON.parse(readFileSync(packagePath)).version);
  writeRuntimeAtomically(target, bytes, result);
  console.log(JSON.stringify({ stage: 'T21_FRAMEWORK_BACKPORT', version: '16.4.1', sha256: hash(result) }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) applyBackport();
