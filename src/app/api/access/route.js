import { createHandler } from '../../../server/api-foundation.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const POST = createHandler('authenticated');
