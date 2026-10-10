import { redirect } from 'next/navigation';
import { FounderBoundary } from '../../components/founder-views.js';
import { getFounderAccess } from './access.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Founder' };

export default async function FounderLayout({ children }) {
  const { state } = await getFounderAccess();
  if (state === 'anonymous') redirect('/sign-in');
  return <FounderBoundary state={state}>{children}</FounderBoundary>;
}
