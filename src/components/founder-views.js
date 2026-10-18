import { createElement as h } from 'react';

export function FounderBoundary({ state, children }) {
  if (state !== 'founder') {
    const denied = state === 'denied';
    const anonymous = state === 'anonymous';
    return h('main', { id: 'main', tabIndex: -1, className: 'page-container' },
      h('section', { className: 'page-state', role: 'alert' },
        h('h1', null, denied ? 'Access denied' : anonymous ? 'Sign in required' : 'Access is unavailable'),
        h('p', null, denied ? 'This area is unavailable for this account.' : anonymous ? 'Sign in to continue.' : 'Access could not be verified. Please try again.'),
        h('p', null, h('a', { href: anonymous ? '/sign-in' : denied ? '/content' : '/founder' }, anonymous ? 'Sign in' : denied ? 'Browse content' : 'Try again')),
        !anonymous && h('form', { method: 'post', action: '/auth/sign-out' },
          h('button', { type: 'submit', className: 'text-button' }, 'Sign out'))));
  }
  return h('div', { style: { display: 'contents' } },
    h('a', { className: 'skip-link', href: '#main' }, 'Skip to main content'),
    h('header', { className: 'site-header' }, h('div', { className: 'header-inner' },
      h('a', { className: 'brand', href: '/founder', 'aria-label': 'HTC Founder home' }, h('strong', null, 'HTC'), h('span', null, 'Founder workspace')),
      h('nav', { 'aria-label': 'Founder navigation' },
        h('a', { href: '/founder' }, 'Founder home'),
        h('a', { href: '/founder/content' }, 'Content workspace'),
        h('a', { href: '/founder/assets' }, 'Asset workspace'),
        h('a', { href: '/content' }, 'Public content'),
        h('form', { method: 'post', action: '/auth/sign-out' }, h('button', { type: 'submit', className: 'text-button' }, 'Sign out'))))),
    h('main', { id: 'main', tabIndex: -1, className: 'page-container' }, children));
}

export function FounderEntry({ state }) {
  if (state !== 'founder') return null;
  return h('section', { className: 'page-state' },
    h('p', { className: 'category' }, 'HTC Trial'),
    h('h1', null, 'Founder application'),
    h('p', null, 'Your HTC Trial workspace.'));
}
