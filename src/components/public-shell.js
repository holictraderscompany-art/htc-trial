import SessionNavigation from './session-navigation.js';

export default function PublicShell({ children }) {
  return <>
    <a className="skip-link" href="#main">Skip to main content</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="/" aria-label="Holic Traders Company home" translate="no"><strong>HTC</strong><span>Holic Traders Company</span></a>
      <nav aria-label="Main navigation"><a href="/content">Content</a><SessionNavigation /></nav>
    </div></header>
    <main id="main" tabIndex={-1} className="page-container">{children}</main>
    <footer className="site-footer"><p>HTC Trial · September–December 2026</p></footer>
  </>;
}
