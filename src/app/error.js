'use client';
export default function PublicError({ reset }) {
  return <section className="page-state" role="alert"><h1>This page could not be loaded</h1><p>Please try again or return to content.</p><button type="button" className="button" onClick={reset}>Try again</button><p><a href="/content">Browse content</a></p></section>;
}
