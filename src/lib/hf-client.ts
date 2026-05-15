// ─────────────────────────────────────────────────────────────
// NewsSense AI — HuggingFace Inference Client
// All model calls are server-side only (API routes).
// ─────────────────────────────────────────────────────────────

import type { CategoryScore, SentimentResult, Entity, SentimentLabel } from '@/types';

const HF_API = 'https://api-inference.huggingface.co/models';

// Vercel Hobby allows up to 60s per function; set just under the limit.
const FETCH_TIMEOUT_MS = 55_000;

function getHeaders(): HeadersInit {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error(
      'HF_TOKEN is not set. Add it in Vercel → Project → Settings → Environment Variables.'
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ─── Core fetch: wait_for_model blocks until warm ─────────────
// This is the key fix for cold-start 503s.
// Instead of retrying after a 503, we tell HuggingFace to hold
// the connection open until the model finishes loading.
async function hfFetch(url: string, payload: object): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        ...payload,
        options: {
          wait_for_model: true, // blocks until model is loaded, no 503 flip-flop
          use_cache: false,     // always run fresh inference
        },
      }),
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Raw category labels for zero-shot prompt ────────────────
const CANDIDATE_LABELS = [
  'politics and government',
  'business and finance',
  'technology and innovation',
  'sports and athletics',
  'entertainment and culture',
  'health and medicine',
  'science and research',
  'world affairs and geopolitics',
  'crime and law enforcement',
  'environment and climate change',
];

const LABEL_MAP: Record<string, string> = {
  'politics and government':       'Politics',
  'business and finance':          'Business',
  'technology and innovation':     'Technology',
  'sports and athletics':          'Sports',
  'entertainment and culture':     'Entertainment',
  'health and medicine':           'Health',
  'science and research':          'Science',
  'world affairs and geopolitics': 'World Affairs',
  'crime and law enforcement':     'Crime & Law',
  'environment and climate change':'Environment',
};

// ─── 1. Zero-shot news classification ────────────────────────
export async function classifyNews(text: string): Promise<CategoryScore[]> {
  const res = await hfFetch(`${HF_API}/facebook/bart-large-mnli`, {
    inputs: text,
    parameters: {
      candidate_labels: CANDIDATE_LABELS,
      multi_label: false,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Classification failed (HTTP ${res.status}): ${body}`);
  }

  const data = await res.json();

  return (data.labels as string[]).map((raw: string, i: number) => ({
    label: LABEL_MAP[raw] ?? raw,
    score: data.scores[i] as number,
  }));
}

// ─── 2. Sentiment analysis ────────────────────────────────────
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const res = await hfFetch(
    `${HF_API}/cardiffnlp/twitter-roberta-base-sentiment-latest`,
    { inputs: text.slice(0, 512) }  // model has short context window
  );

  if (!res.ok) {
    // Sentiment is non-critical — degrade gracefully
    return { label: 'neutral', score: 0 };
  }

  const data = await res.json();
  const sorted = [...(data[0] as { label: string; score: number }[])].sort(
    (a, b) => b.score - a.score
  );

  const rawLabel = sorted[0].label.toLowerCase();
  const label: SentimentLabel =
    rawLabel === 'positive' || rawLabel === 'negative' ? rawLabel : 'neutral';

  return { label, score: sorted[0].score };
}

// ─── 3. Named-entity recognition ─────────────────────────────
export async function extractEntities(text: string): Promise<Entity[]> {
  const res = await hfFetch(`${HF_API}/dslim/bert-base-NER`, {
    inputs: text,
    parameters: { aggregation_strategy: 'simple' },
  });

  if (!res.ok) return []; // NER is non-critical

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  const validTypes = new Set(['PER', 'ORG', 'LOC', 'MISC']);
  return (data as Entity[]).filter(
    (e) => e.score >= 0.8 && validTypes.has(e.entity_group)
  );
}
