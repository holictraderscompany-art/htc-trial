import { discoveryContent } from '../../../server/public-experience.js';
import { cache } from 'react';
import { categoryLabels, continuationPath } from '../../../public/content-presentation.js';
import { ContentList, PageState } from '../../../components/content-views.js';
import { currentSearchPolicy } from '../../../server/search-context.js';
import { publicPageMetadata } from '../../../server/search-metadata.js';

export const dynamic = 'force-dynamic';
const readDiscovery = cache(discoveryContent);
export async function generateMetadata({ searchParams }) {
  const parameters = await searchParams;
  const result = await readDiscovery(parameters);
  return publicPageMetadata('content', await currentSearchPolicy(), parameters, result.status === 200);
}
export default async function DiscoveryPage({ searchParams }) {
  const parameters = await searchParams;
  const result = await readDiscovery(parameters);
  if (result.status === 400) return <PageState title="Invalid content request">Choose a category from the content page to start again.</PageState>;
  if (result.status !== 200) return <PageState title="Content is unavailable" action="Try again" alert>Content could not be loaded. Please try again.</PageState>;
  const category = parameters.category ?? '';
  return <section className="discovery">
    <div className="page-heading"><h1>Content</h1><p>Introductory and educational reading during HTC Trial.</p></div>
    <form className="filter-form" action="/content" method="get"><div><label htmlFor="category">Category</label>
      <select id="category" name="category" defaultValue={category}><option value="">All categories</option>
        {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></div><button type="submit" className="button secondary">Apply filter</button></form>
    {parameters.cursor && <p><a href={category ? `/content?category=${encodeURIComponent(category)}` : '/content'}>Back to first page</a></p>}
    <ContentList items={result.data.items} />
    {result.data.next_cursor && <nav className="pagination" aria-label="Content pagination"><a className="button secondary" href={continuationPath(result.data.next_cursor, category)}>Next page</a></nav>}
  </section>;
}
