import './globals.css';
export const metadata = {
  title: 'Cartology - Something remembers',
  icons: { icon: './favicon.svg' },
  description:
    'An ecological exploration game. Observe, adapt, and carry your discoveries across lives.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
