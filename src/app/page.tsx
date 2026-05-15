import Header from '@/components/Header';
import NewsAnalyzer from '@/components/NewsAnalyzer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ink)' }}>
      <Header />
      <NewsAnalyzer />

      <footer className="mt-auto border-t border-gilt/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="font-mono text-[10px] text-parchment-muted/40 tracking-wide">
            © 2025 NewsSense AI · Built with Next.js · Deployed on Vercel
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://huggingface.co/facebook/bart-large-mnli"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-parchment-muted/40 hover:text-gilt/60 transition-colors uppercase tracking-wide"
            >
              BART-MNLI
            </a>
            <span className="text-parchment-muted/20">·</span>
            <a
              href="https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-parchment-muted/40 hover:text-gilt/60 transition-colors uppercase tracking-wide"
            >
              RoBERTa
            </a>
            <span className="text-parchment-muted/20">·</span>
            <a
              href="https://huggingface.co/dslim/bert-base-NER"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-parchment-muted/40 hover:text-gilt/60 transition-colors uppercase tracking-wide"
            >
              BERT-NER
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
