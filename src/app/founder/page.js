import { redirect } from 'next/navigation';
import { FounderEntry } from '../../components/founder-views.js';
import { getFounderAccess } from './access.js';

export const dynamic = 'force-dynamic';

export default async function FounderPage() {
  // Independently gate the page: a parent layout is not a data-access boundary.
  const { state } = await getFounderAccess();
  if (state === 'anonymous') redirect('/sign-in');
  return <FounderEntry state={state} />;
}
