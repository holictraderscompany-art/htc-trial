import { notFound } from 'next/navigation';
import { cache } from 'react';
import { detailContent } from '../../../../server/public-experience.js';
import { ContentArticle, PageState } from '../../../../components/content-views.js';
import { currentSearchPolicy } from '../../../../server/search-context.js';
import { articleMetadata } from '../../../../server/search-metadata.js';

export const dynamic = 'force-dynamic';
// React request memoization shares one current anonymous read between head/body;
// it is not a persistent cache and does not retain released content across requests.
const readDetail = cache(detailContent);
export async function generateMetadata({ params }) {
  const { id } = await params;
  const result = await readDetail(id);
  if ([400, 404].includes(result.status)) notFound();
  return articleMetadata(id, result, await currentSearchPolicy());
}
export default async function DetailPage({ params }) {
  const { id } = await params;
  const result = await readDetail(id);
  if ([400, 404].includes(result.status)) notFound();
  if (result.status !== 200) return <PageState title="Content is unavailable" href={`/content/${encodeURIComponent(id)}`} action="Try again" alert>This content could not be loaded. Please try again.</PageState>;
  return <ContentArticle item={result.data} />;
}
