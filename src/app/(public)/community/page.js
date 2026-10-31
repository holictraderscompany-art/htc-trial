import { createElement as h } from 'react';

export const metadata = {
  title: 'HTC Community',
  description: 'Explore HTC community values and introductory content during Trial. Community participation tools are not yet enabled.',
  robots: { index: false, follow: false },
  alternates: {},
};

export default function CommunityPage() {
  return h('section', { className: 'entry', 'aria-labelledby': 'community-heading' },
    h('p', { className: 'category' }, 'HTC Trial · Community'),
    h('h1', { id: 'community-heading' }, 'HTC Community'),
    h('p', { className: 'entry-intro' }, 'Educate • Empower • Elevate.'),
    h('p', null, 'Community is one of the four HTC pillars: Education, Learning, Knowledge and Community. It connects curiosity, shared values and respectful participation.'),
    h('section', { className: 'trial-context', 'aria-labelledby': 'participation-heading' },
      h('h2', { id: 'participation-heading' }, 'Ways to take part during Trial'),
      h('p', null, 'Start with the introductory and educational content already released by HTC. You can read without signing in.'),
      h('ul', null,
        h('li', null, 'Read released articles to explore HTC ideas and values.'),
        h('li', null, 'Reflect independently on what you read and the questions it raises.'),
        h('li', null, 'Return to the content page to discover available reading.')),
      h('div', { className: 'workspace-actions' },
        h('a', { className: 'button', href: '/content' }, 'Browse introductory content'),
        h('a', { className: 'button secondary', href: '/' }, 'Introduction to HTC'))),
    h('section', { className: 'trial-context', 'aria-labelledby': 'availability-heading' },
      h('h2', { id: 'availability-heading' }, 'Participation tools are not yet enabled'),
      h('p', { className: 'notice' }, 'Community registration, question submission, comments, feedback submission and notifications are not available on this page.'),
      h('p', null, 'Reading or signing in does not register you for a community service. There is no participation form to complete.')),
    h('section', { className: 'trial-context', 'aria-labelledby': 'community-trial-heading' },
      h('h2', { id: 'community-trial-heading' }, 'During HTC Trial'),
      h('p', null, 'September–December 2026 is HTC Trial. Content is introductory and educational.'),
      h('p', null, 'Official curriculum begins January 2027. Courses, lessons, assessments, enrollment and learning progress are not part of this Trial.')));
}
