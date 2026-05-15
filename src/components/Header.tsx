'use client';

const TICKER_ITEMS = [
  'BREAKING: AI classifies news at human-level accuracy',
  'ZERO-SHOT LEARNING powered by BART-Large-MNLI',
  'NAMED ENTITIES extracted via BERT-NER',
  'SENTIMENT analysis via RoBERTa',
  'OPEN SOURCE — fork on GitHub',
  '10 categories · 3 models · <3s response',
];

export default function Header() {
  return (
    <header className="border-b border-gilt/20">
      {/* ── Dateline bar ────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-gilt/10 text-parchment-muted font-mono text-[10px] tracking-widest uppercase">
        <span>Established 2025</span>
        <span className="text-gilt/60">◆</span>
        <span>Intelligence · Accuracy · Context</span>
      </div>

      {/* ── Masthead ─────────────────────────────────────── */}
      <div className="text-center px-6 py-8 border-b border-gilt/20">
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-parchment-muted mb-3">
          The Artificial Intelligence News Desk
        </p>

        <h1
          className="font-serif font-black text-5xl md:text-7xl tracking-tight"
          style={{ color: 'var(--parchment)', letterSpacing: '-0.02em' }}
        >
          News
          <span style={{ color: 'var(--gilt)' }}>Sense</span>
          <span className="font-mono font-light text-3xl md:text-4xl ml-2" style={{ color: 'var(--gilt)' }}>
            AI
          </span>
        </h1>

        <div className="rule-double mt-4 mb-3 max-w-xs mx-auto" />

        <p className="font-sans font-light text-sm text-parchment-dim max-w-md mx-auto leading-relaxed">
          Classify · Analyze Sentiment · Extract Entities
          <br />
          <span className="text-parchment-muted text-xs font-mono">
            Powered by BART · RoBERTa · BERT
          </span>
        </p>
      </div>

      {/* ── Ticker ───────────────────────────────────────── */}
      <div
        className="ticker-wrap py-2 border-b border-gilt/10"
        style={{ background: 'rgba(201,168,76,0.06)' }}
      >
        <div className="ticker-inner font-mono text-[11px] text-gilt/70 tracking-widest">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="mx-10">
              ◆ {item}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
