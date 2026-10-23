// ESM evaluates this dependency before evaluating the generated OpenNext module.
import './install-redirect-error-fetch.mjs';
import worker from '../.open-next/worker.js';

// Preserve the generated default handler and every named export/Durable Object.
export * from '../.open-next/worker.js';
export default worker;
