'use client';

import { CATEGORY_META, type CategoryScore } from '@/types';

interface Props {
  scores: CategoryScore[];
}

const COLORS = [
  '#c9a84c', '#e74c3c', '#27ae60', '#2980b9', '#9b59b6',
  '#1abc9c', '#e67e22', '#3498db', '#95a5a6', '#2ecc71',
];

export default function ConfidenceChart({ scores }: Props) {
  const sorted = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
  const top = sorted[0];

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => {
        const meta = CATEGORY_META[item.label];
        const isTop = item.label === top.label;
        const pct = (item.score * 100).toFixed(1);
        const color = meta ? CATEGORY_META[item.label]?.color ?? COLORS[i] : COLORS[i];

        return (
          <div key={item.label} className={`group ${isTop ? 'opacity-100' : 'opacity-60 hover:opacity-80'} transition-opacity`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{meta?.emoji ?? '📰'}</span>
                <span
                  className="font-mono text-xs tracking-wide uppercase"
                  style={{ color: isTop ? color : 'var(--parchment-dim)' }}
                >
                  {item.label}
                </span>
                {isTop && (
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm tracking-widest uppercase"
                    style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                  >
                    Top
                  </span>
                )}
              </div>
              <span
                className="font-mono text-xs tabular-nums"
                style={{ color: isTop ? color : 'var(--parchment-muted)' }}
              >
                {pct}%
              </span>
            </div>

            {/* Bar track */}
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="h-full rounded-full bar-animate"
                style={{
                  '--bar-width': `${pct}%`,
                  background: isTop
                    ? `linear-gradient(90deg, ${color}88, ${color})`
                    : `${color}55`,
                } as React.CSSProperties}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
