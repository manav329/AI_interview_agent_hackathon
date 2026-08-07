export const metadata = {
  title: 'AI Interview Agent',
  description: 'Serverless functions for AI Interview Agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
