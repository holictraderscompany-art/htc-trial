import { createElement as h } from 'react';
import { categoryLabels, mimeLabels, roleLabels } from '../public/content-presentation.js';

export function PageState({ title, children, href = '/content', action = 'Browse content', alert = false }) {
  return h('section', { className: 'page-state', role: alert ? 'alert' : undefined },
    h('h1', null, title), h('p', null, children), h('a', { className: 'button', href }, action));
}

export function MediaMetadata({ assets }) {
  if (!assets?.length) return null;
  return h('section', { className: 'media-metadata', 'aria-labelledby': 'media-heading' },
    h('h2', { id: 'media-heading' }, 'Media information'),
    h('p', { className: 'muted' }, 'Media information is available during Trial. Playback and downloads are not available.'),
    h('ul', null, assets.map(asset => h('li', { key: asset.id },
      h('span', null, roleLabels[asset.role]), ': ', mimeLabels[asset.mime_type],
      asset.width && asset.height ? ` (${asset.width} × ${asset.height})` : null,
      asset.duration_seconds !== null ? `, ${asset.duration_seconds} seconds` : null))));
}

export function ContentList({ items }) {
  if (!items.length) return h('section', { className: 'empty-state', 'aria-labelledby': 'empty-heading' },
    h('h2', { id: 'empty-heading' }, 'No content available'),
    h('p', null, 'There is no released content in this view yet. Try another category or check back later.'));
  return h('ul', { className: 'content-list', 'aria-label': 'Released content' }, items.map(item =>
    h('li', { key: item.id }, h('article', null,
      h('p', { className: 'category' }, categoryLabels[item.category]),
      h('h2', null, h('a', { href: `/content/${item.id}` }, item.title)),
      h('p', { className: 'excerpt' }, item.body.length > 180 ? `${item.body.slice(0, 180)}…` : item.body),
      item.assets?.length ? h('p', { className: 'muted' }, `${item.assets.length} media reference${item.assets.length === 1 ? '' : 's'}`) : null))));
}

export function ContentArticle({ item }) {
  return h('article', { className: 'reading' },
    h('a', { className: 'back-link', href: '/content' }, 'Back to content'),
    h('p', { className: 'category' }, categoryLabels[item.category]),
    h('h1', null, item.title),
    h('div', { className: 'content-body' }, item.body.split(/\n\s*\n/).map((paragraph, index) =>
      h('p', { key: index }, paragraph))),
    h(MediaMetadata, { assets: item.assets }));
}
