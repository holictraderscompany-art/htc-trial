import { notFound } from 'next/navigation';
import { detailContent } from '../../../server/public-experience.js';
import { ContentArticle, PageState } from '../../../components/content-views.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Read content' };
export default async function DetailPage({ params }) {
  const { id } = await params;
  const result = await detailContent(id);
  if ([400, 404].includes(result.status)) notFound();
  if (result.status !== 200) return <PageState title="Content is unavailable" href={`/content/${encodeURIComponent(id)}`} action="Try again" alert>This content could not be loaded. Please try again.</PageState>;
  return <ContentArticle item={result.data} />;
}
