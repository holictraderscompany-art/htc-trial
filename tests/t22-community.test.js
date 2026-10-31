import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { access } from 'node:fs/promises';
import CommunityPage, { metadata } from '../src/app/(public)/community/page.js';

const render = props => renderToStaticMarkup(h(CommunityPage, props));

test('T22 server rendering provides a complete semantic community entry', () => {
  const html = render();
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1 id="community-heading">HTC Community<\/h1>/);
  assert.match(html, /aria-labelledby="community-heading"/);
  assert.equal((html.match(/<h2\b/g) ?? []).length, 3);
  for (const id of ['participation-heading', 'availability-heading', 'community-trial-heading']) {
    assert(html.includes(`aria-labelledby="${id}"`));
    assert(html.includes(`<h2 id="${id}">`));
  }
});

test('T22 explains the approved HTC purpose and present reading participation', () => {
  const html = render();
  assert.match(html, /Educate • Empower • Elevate/);
  assert.match(html, /Education, Learning, Knowledge and Community/);
  assert.match(html, /respectful participation/);
  assert.match(html, /read without signing in/);
  assert.match(html, /Reflect independently/);
});

test('T22 reports unavailable tools honestly without implying membership', () => {
  const html = render();
  assert.match(html, /Participation tools are not yet enabled/);
  assert.match(html, /Community registration, question submission, comments, feedback submission and notifications are not available/);
  assert.match(html, /Reading or signing in does not register you/);
  assert.doesNotMatch(html, /Join now|Send a question|Subscribe now|members online|testimonials/i);
});

test('T22 preserves Trial timing and exposes no curriculum or enrollment action', () => {
  const html = render();
  assert.match(html, /September–December 2026/);
  assert.match(html, /Official curriculum begins January 2027/);
  assert.match(html, /Courses, lessons, assessments, enrollment and learning progress are not part of this Trial/);
  assert.doesNotMatch(html, /href="[^"]*(?:lesson|course|quiz|enroll|progress|dashboard)/i);
});

test('T22 calls to action resolve only to existing anonymous HTC pages', async () => {
  const links = [...render().matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(links, ['/content', '/']);
  for (const link of links) {
    await access(new URL(`../src/app/(public)${link === '/' ? '' : link}/page.js`, import.meta.url));
  }
});

test('T22 adds no collection controls, privileged links or external services', () => {
  const html = render();
  assert.doesNotMatch(html, /<(?:form|input|textarea|select|button|iframe|script|img|video|audio)\b/i);
  assert.doesNotMatch(html, /(?:href|src|action)="(?:https?:|\/\/|\/founder|\/admin|\/api|\/auth)/i);
});

test('T22 renders without fetching or reflecting request or identity input', t => {
  const transport = t.mock.method(globalThis, 'fetch', () => { throw Error('Unexpected community transport'); });
  const html = render({ searchParams: { question: 'PRIVATE_QUERY_CANARY' }, session: { name: 'PRIVATE_IDENTITY_CANARY' } });
  assert.equal(transport.mock.calls.length, 0);
  assert.doesNotMatch(html, /PRIVATE_QUERY_CANARY|PRIVATE_IDENTITY_CANARY/);
  assert.match(html, /HTC Community/);
});

test('T22 metadata is accurate and never activates indexing or canonical URLs', () => {
  assert.equal(metadata.title, 'HTC Community');
  assert.match(metadata.description, /participation tools are not yet enabled/);
  assert.deepEqual(metadata.robots, { index: false, follow: false });
  assert.deepEqual(metadata.alternates, {});
  assert.equal(metadata.openGraph?.url, undefined);
  assert.equal(metadata.metadataBase, undefined);
});
