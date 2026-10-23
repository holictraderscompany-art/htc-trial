// ESM evaluates this dependency before evaluating the generated OpenNext module.
import './install-redirect-error-fetch.mjs';
import worker from '../.open-next/worker.js';
import { withTestAccessCheck } from './test-access-check.mjs';

// All application requests/other handlers and named exports remain generated.
// The additional inert diagnostic document is guarded to the exact TEST host.
export * from '../.open-next/worker.js';
export default withTestAccessCheck(worker);
