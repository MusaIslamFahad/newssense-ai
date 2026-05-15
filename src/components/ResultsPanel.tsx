'use client';

import type { AnalysisResult } from '@/types';
import { CATEGORY_META } from '@/types';
import ConfidenceChart from './ConfidenceChart';
import SentimentBadge from './SentimentBadge';
import EntityHighlighter from './EntityHighlighter';

interface Props {
  result: AnalysisResult;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-gilt/70">
        {label}
      </span>
      <div className="flex-1 border-t border-gilt/15" />
    </div>
  );
}

export default function ResultsPanel({ result }: Props) {
  const { topCategory, classification, sentiment, entities, input, processingTime } =
    result;
  const topMeta = CATEGORY_META[topCategory.label];

  return (
    <div className="space-y-0 fade-up">
      {/* ── Top verdict banner ──────────────────────────── */}
      <div
        className="p-6 border-b border-gilt/20 fade-up"
        style={{ background: `${topMeta?.color ?? '#c9a84c'}0a` }}
      >
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-parchment-muted mb-2">
          Primary Classification
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="font-serif text-4xl font-bold leading-none mb-1"
              style={{ color: topMeta?.color ?? 'var(--gilt)' }}
            >
              {topMeta?.emoji ?? '📰'} {topCategory.label}
            </h2>
            <p className="font-sans text-sm text-parchment-muted">
              {topMeta?.description ?? ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div
              className="font-mono text-3xl font-bold tabular-nums"
              style={{ color: topMeta?.color ?? 'var(--gilt)' }}
            >
              {(topCategory.score * 100).toFixed(1)}
              <span className="text-sm font-normal">%</span>
            </div>
            <p className="font-mono text-[10px] text-parchment-muted tracking-wide">
              confidence
            </p>
          </div>
        </div>
      </div>

      {/* ── Three-column grid (adapts to single column on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gilt/15">
        {/* Col 1: Full distribution */}
        <div className="p-6 fade-up fade-up-delay-1">
          <SectionHeader label="Category Distribution" />
          <ConfidenceChart scores={classification} />
        </div>

        {/* Col 2: Sentiment */}
        <div className="p-6 fade-up fade-up-delay-2">
          <SectionHeader label="Sentiment Analysis" />
          <SentimentBadge sentiment={sentiment} />

          {/* Mini stats */}
          <div className="mt-4 pt-4 border-t border-gilt/10 space-y-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-gilt/50">
              Signal Distribution
            </p>
            {(['positive', 'negative', 'neutral'] as const).map((s) => {
              const active = sentiment.label === s;
              return (
                <div
                  key={s}
                  className="flex items-center justify-between font-mono text-xs"
                >
                  <span className={active ? 'text-parchment-dim' : 'text-parchment-muted/40'}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                  <span className={active ? 'text-gilt' : 'text-parchment-muted/30'}>
                    {active ? `${(sentiment.score * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 3: Entities */}
        <div className="p-6 fade-up fade-up-delay-3">
          <SectionHeader label="Named Entities" />
          <EntityHighlighter text={input} entities={entities} />
        </div>
      </div>

      {/* ── Footer metadata ──────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-3 border-t border-gilt/10 fade-up fade-up-delay-4"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-parchment-muted tracking-wide">
            Models:{' '}
            <span className="text-gilt/60">
              BART-MNLI · RoBERTa-Sentiment · BERT-NER
            </span>
          </span>
        </div>
        <span className="font-mono text-[10px] text-parchment-muted">
          Analyzed in{' '}
          <span className="text-gilt/60">{(processingTime / 1000).toFixed(2)}s</span>
        </span>
      </div>
    </div>
  );
}
