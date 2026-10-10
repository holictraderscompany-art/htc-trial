import './globals.css';
import SessionNavigation from '../components/session-navigation.js';

export const metadata = { title: { default: 'Holic Traders Company | Trial', template: '%s | HTC Trial' }, description: 'Introductory and educational content from Holic Traders Company during Trial.' };
export const viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f8faf9' }, { media: '(prefers-color-scheme: dark)', color: '#142326' }] };

export default function RootLayout({ children }) {
  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to main content</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href="/" aria-label="Holic Traders Company home" translate="no"><strong>HTC</strong><span>Holic Traders Company</span></a>
      <nav aria-label="Main navigation"><a href="/content">Content</a><SessionNavigation /></nav>
    </div></header>
    <main id="main" tabIndex={-1} className="page-container">{children}</main>
    <footer className="site-footer"><p>HTC Trial · September–December 2026</p></footer>
  </body></html>;
}
