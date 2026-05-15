// ─────────────────────────────────────────────────────────────
// POST /api/analyze
// Runs classification, sentiment, and NER in parallel.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { classifyNews, analyzeSentiment, extractEntities } from '@/lib/hf-client';
import type { AnalysisResult, ApiErrorResponse } from '@/types';

// Edge runtime for faster cold starts on Vercel
export const runtime = 'nodejs';
export const maxDuration = 60; // seconds — Vercel Hobby limit

// Simple in-memory rate limiting (per-process; fine for Vercel's serverless)
const requestLog = new Map<string, number[]>();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_RPM ?? '10', 10);
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<AnalysisResult | ApiErrorResponse>> {
  // ── Rate limiting ──────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  // ── Input validation ───────────────────────────────────────
  let text: string;
  try {
    const body = await req.json();
    text = (body?.text ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!text || text.length < 10) {
    return NextResponse.json(
      { error: 'Text must be at least 10 characters.' },
      { status: 400 }
    );
  }

  if (text.length > 2000) {
    return NextResponse.json(
      { error: 'Text must be under 2000 characters.' },
      { status: 400 }
    );
  }

  // ── Run all models in parallel ─────────────────────────────
  const start = Date.now();

  const [classificationResult, sentimentResult, entitiesResult] =
    await Promise.allSettled([
      classifyNews(text),
      analyzeSentiment(text),
      extractEntities(text),
    ]);

  // Classification is critical — propagate its error
  if (classificationResult.status === 'rejected') {
    console.error('[analyze] Classification failed:', classificationResult.reason);
    return NextResponse.json(
      {
        error: 'Analysis failed. The AI model may be loading — try again in 20s.',
        details: String(classificationResult.reason),
      },
      { status: 502 }
    );
  }

  const classification = classificationResult.value;
  const sentiment =
    sentimentResult.status === 'fulfilled'
      ? sentimentResult.value
      : { label: 'neutral' as const, score: 0 };
  const entities =
    entitiesResult.status === 'fulfilled' ? entitiesResult.value : [];

  const result: AnalysisResult = {
    input: text,
    classification,
    topCategory: classification[0],
    sentiment,
    entities,
    processingTime: Date.now() - start,
  };

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
