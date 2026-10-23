// Cloudflare omits Fetch redirect:error. Preserve its fail-closed semantics here.
// This module is pure: importing/creating the adapter performs no I/O or mutation.
// https://developers.cloudflare.com/workers/runtime-apis/request/#constructor
const redirectStatuses = new Set([301,302,303,307,308]);
export const redirectRejectionMessage = 'HTC upstream redirect rejected';

export function createRedirectErrorFetch(nativeFetch) {
  if (typeof nativeFetch !== 'function') throw new TypeError('Native fetch implementation required');
  return function guardedFetch(input, init) {
    const explicit = init?.redirect;
    const mode = explicit === undefined && input instanceof Request ? input.redirect : explicit;
    if (mode !== 'error') return Reflect.apply(nativeFetch, globalThis, arguments);
    // A RequestInit dictionary reads inherited properties too. This retains all
    // original options/getters (including non-enumerable/prototyped cf options),
    // overrides only redirect, and never clones/consumes the input Request body.
    const adjusted = Object.create(init ?? null);
    Object.defineProperty(adjusted, 'redirect', { value:'manual', enumerable:true });
    const pending = Reflect.apply(nativeFetch, globalThis, [input, adjusted]);
    return Promise.resolve(pending).then(async response => {
      if (!redirectStatuses.has(response.status)) return response;
      try { await response.body?.cancel(); } catch { /* Rejection stays fail-closed. */ }
      throw new TypeError(redirectRejectionMessage);
    });
  };
}

let installed = false;
export function installRedirectErrorFetch() {
  if (installed) return;
  globalThis.fetch = createRedirectErrorFetch(globalThis.fetch);
  installed = true;
}
