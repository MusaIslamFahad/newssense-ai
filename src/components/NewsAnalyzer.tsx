'use client';

import { useState, useRef } from 'react';
import type { AnalysisResult, ApiErrorResponse } from '@/types';
import ResultsPanel from './ResultsPanel';

const EXAMPLE_HEADLINES = [
  'Federal Reserve raises interest rates for the third consecutive quarter amid inflation concerns',
  'Scientists discover new exoplanet in habitable zone 40 light-years from Earth',
  'Premier League clubs agree on new financial fair play regulations',
  'Tech giant unveils next-generation AI chip promising 10x performance leap',
  'Climate summit ends with landmark carbon neutrality pledge by 120 nations',
];

const MAX_CHARS = 2000;

export default function NewsAnalyzer() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = text.length;
  const canSubmit = text.trim().length >= 10 && !loading;

  async function handleAnalyze() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data: AnalysisResult | ApiErrorResponse = await res.json();

      if (!res.ok || 'error' in data) {
        setError((data as ApiErrorResponse).error ?? 'Unknown error');
      } else {
        setResult(data as AnalysisResult);
        // Scroll results into view on mobile
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleExample(headline: string) {
    setText(headline);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAnalyze();
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      {/* ── Input section ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 border-t border-gilt/15" />
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-gilt/60">
            Input
          </span>
          <div className="flex-1 border-t border-gilt/15" />
        </div>

        <div
          className="relative rounded-sm overflow-hidden"
          style={{ border: '1px solid rgba(201,168,76,0.2)' }}
        >
          {/* Scan line during loading */}
          {loading && <div className="scan-line" />}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder="Paste a news headline or article excerpt (10–2000 characters)…"
            rows={5}
            className="w-full px-5 py-4 font-sans text-base text-parchment-dim
                       placeholder-parchment-muted/30 resize-none
                       leading-relaxed transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', outline: 'none' }}
            disabled={loading}
            aria-label="News text input"
          />

          {/* Counter + submit */}
          <div
            className="flex items-center justify-between px-5 py-3 border-t border-gilt/10"
            style={{ background: 'rgba(0,0,0,0.2)' }}
          >
            <span
              className="font-mono text-[10px] tabular-nums text-parchment-muted"
              aria-live="polite"
            >
              {charCount}
              <span className="text-parchment-muted/40">/{MAX_CHARS}</span>
            </span>

            <div className="flex items-center gap-3">
              {text.length > 0 && (
                <button
                  onClick={() => { setText(''); setResult(null); setError(null); }}
                  className="font-mono text-[10px] tracking-wide text-parchment-muted/50
                             hover:text-parchment-muted transition-colors uppercase"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleAnalyze}
                disabled={!canSubmit}
                className="relative px-6 py-2 font-mono text-xs tracking-widest uppercase
                           rounded-sm transition-all duration-200
                           disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: canSubmit ? 'var(--gilt)' : 'rgba(201,168,76,0.1)',
                  color: canSubmit ? 'var(--ink)' : 'var(--gilt)',
                  border: '1px solid var(--gilt)',
                }}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border border-ink/40 border-t-transparent rounded-full animate-spin" />
                    Analyzing…
                  </span>
                ) : (
                  'Analyze ⌘↵'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Example pills ──────────────────────────────── */}
        <div className="mt-4">
          <p className="font-mono text-[10px] text-parchment-muted/60 tracking-widest uppercase mb-2">
            Try an example
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_HEADLINES.map((h) => (
              <button
                key={h}
                onClick={() => handleExample(h)}
                className="font-sans text-xs text-parchment-muted/60
                           hover:text-parchment-dim hover:border-gilt/30
                           transition-all truncate max-w-xs text-left px-3 py-1 rounded-sm"
                style={{ border: '1px solid rgba(201,168,76,0.12)' }}
              >
                {h.length > 55 ? h.slice(0, 55) + '…' : h}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Error state ────────────────────────────────── */}
      {error && (
        <div
          className="mt-8 p-4 rounded-sm fade-up"
          style={{
            background: 'rgba(192,57,43,0.1)',
            border: '1px solid rgba(192,57,43,0.3)',
          }}
        >
          <p className="font-mono text-sm text-red-400">
            ⚠ {error}
          </p>
          <p className="font-mono text-[10px] text-parchment-muted mt-1">
            HuggingFace models sometimes need ~20s to warm up on first request.
          </p>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────── */}
      {loading && !result && (
        <div className="mt-8 space-y-3 fade-up">
          {[80, 60, 90, 50].map((w, i) => (
            <div
              key={i}
              className="shimmer h-6 rounded-sm"
              style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
          <p className="font-mono text-xs text-parchment-muted/50 mt-4">
            Running 3 models in parallel…
          </p>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────── */}
      {result && !loading && (
        <section
          id="results"
          className="mt-10 fade-up"
          style={{ border: '1px solid rgba(201,168,76,0.2)', borderRadius: '2px' }}
        >
          <div className="flex items-center justify-between px-6 py-3 border-b border-gilt/15"
               style={{ background: 'rgba(201,168,76,0.04)' }}>
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-gilt/60">
              Analysis Report
            </span>
            <button
              onClick={handleAnalyze}
              className="font-mono text-[10px] tracking-wide text-parchment-muted/50 hover:text-gilt/60
                         transition-colors uppercase"
            >
              Re-analyze ↺
            </button>
          </div>
          <ResultsPanel result={result} />
        </section>
      )}
    </main>
  );
}
