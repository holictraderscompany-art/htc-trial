import './globals.css';

// Protected, error and unknown surfaces inherit noindex. Only verified public
// page metadata may override it; NODE_ENV=production alone is not index authority.
export const metadata = { title: { default: 'Holic Traders Company | Trial', template: '%s | HTC Trial' }, description: 'Introductory and educational content from Holic Traders Company during Trial.', robots: { index: false, follow: false } };
export const viewport = { themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f8faf9' }, { media: '(prefers-color-scheme: dark)', color: '#142326' }] };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
