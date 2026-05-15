'use client';

import type { SentimentResult } from '@/types';

interface Props {
  sentiment: SentimentResult;
}

const CONFIG = {
  positive: {
    label: 'Positive',
    icon: '↑',
    color: '#27ae60',
    bg: 'rgba(39, 174, 96, 0.12)',
    border: 'rgba(39, 174, 96, 0.3)',
    desc: 'Optimistic or favorable framing',
  },
  negative: {
    label: 'Negative',
    icon: '↓',
    color: '#c0392b',
    bg: 'rgba(192, 57, 43, 0.12)',
    border: 'rgba(192, 57, 43, 0.3)',
    desc: 'Critical or unfavorable framing',
  },
  neutral: {
    label: 'Neutral',
    icon: '—',
    color: '#95a5a6',
    bg: 'rgba(149, 165, 166, 0.1)',
    border: 'rgba(149, 165, 166, 0.25)',
    desc: 'Objective or factual framing',
  },
};

export default function SentimentBadge({ sentiment }: Props) {
  const cfg = CONFIG[sentiment.label] ?? CONFIG.neutral;
  const pct = (sentiment.score * 100).toFixed(0);

  return (
    <div
      className="rounded-sm p-4"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-xl font-bold leading-none"
            style={{ color: cfg.color }}
          >
            {cfg.icon}
          </span>
          <span
            className="font-mono text-sm font-medium tracking-widest uppercase"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
        <span
          className="font-mono text-xs tabular-nums px-2 py-0.5 rounded-sm"
          style={{ background: `${cfg.color}22`, color: cfg.color }}
        >
          {pct}% confidence
        </span>
      </div>

      {/* Score bar */}
      <div
        className="h-1 w-full rounded-full overflow-hidden mb-2"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full bar-animate"
          style={{
            '--bar-width': `${pct}%`,
            background: cfg.color,
          } as React.CSSProperties}
        />
      </div>

      <p className="font-sans text-xs text-parchment-muted">{cfg.desc}</p>
    </div>
  );
}
