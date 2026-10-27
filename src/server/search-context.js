import { headers } from 'next/headers';
import { searchPolicy } from './search-metadata.js';

export async function currentSearchPolicy() {
  const requestHeaders = await headers();
  return searchPolicy(process.env, requestHeaders.get('host'));
}
