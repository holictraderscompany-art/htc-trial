import { redirect } from 'next/navigation';
import { getFounderAccess } from '../access.js';
import FounderContentWorkspace from '../../../components/founder-content-workspace.js';

export const dynamic = 'force-dynamic';

export default async function FounderContentPage() {
  const { state } = await getFounderAccess();
  if (state === 'anonymous') redirect('/sign-in');
  if (state !== 'founder') return null;
  return <FounderContentWorkspace />;
}
