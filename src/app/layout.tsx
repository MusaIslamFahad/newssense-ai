import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NewsSense AI — Intelligent News Understanding',
  description:
    'Classify any news headline or article into categories, detect sentiment, and extract named entities — powered by state-of-the-art NLP transformers.',
  keywords: ['news classification', 'NLP', 'AI', 'sentiment analysis', 'named entity recognition'],
  openGraph: {
    title: 'NewsSense AI',
    description: 'Classify, understand, and dissect any news in seconds.',
    type: 'website',
  },
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
