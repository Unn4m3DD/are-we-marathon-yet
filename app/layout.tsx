import './globals.css';

export const metadata = {
  title: 'Are We Marathon Yet',
  description: 'On-demand marathon readiness coach',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
        {children}
      </body>
    </html>
  );
}
