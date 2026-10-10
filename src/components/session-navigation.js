'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function SessionNavigation() {
  const path = usePathname();
  const [session, setSession] = useState({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => { setSession({ state: 'error' }); controller.abort(); }, 25000);
    setSession({ state: 'loading' });
    fetch('/api/session', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json();
      clearTimeout(timeout);
      if (response.status === 403) { setSession({ state: 'forbidden' }); return; }
      if (!response.ok || !result.ok || typeof result.data?.authenticated !== 'boolean') throw Error();
      setSession({ state: result.data.authenticated ? 'authenticated' : 'anonymous', name: result.data.display_name });
    }).catch(() => { clearTimeout(timeout); if (!controller.signal.aborted) setSession({ state: 'error' }); });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [path, attempt]);
  if (session.state === 'loading') return <span className="session-state" role="status">Checking sign-in…</span>;
  if (session.state === 'error') return <div className="session-controls"><span role="status">Sign-in status unavailable.</span><button type="button" className="text-button" onClick={() => setAttempt(attempt + 1)}>Retry</button></div>;
  if (session.state === 'forbidden') return <div className="session-controls"><span role="status">Session access unavailable.</span><form method="post" action="/auth/sign-out"><button type="submit" className="text-button">Sign out</button></form></div>;
  if (session.state === 'anonymous') return <a href="/sign-in">Sign in</a>;
  return <div className="session-controls"><span className="session-state">{session.name ? `Signed in as ${session.name}` : 'Signed in'}</span><form method="post" action="/auth/sign-out"><button className="text-button" type="submit">Sign out</button></form></div>;
}
