// ─────────────────────────────────────────────────────────────
// NewsSense AI — Shared Types
// ─────────────────────────────────────────────────────────────

export type SentimentLabel = 'positive' | 'negative' | 'neutral';

export type EntityType = 'PER' | 'ORG' | 'LOC' | 'MISC';

export interface CategoryScore {
  label: string;
  score: number;
}

export interface SentimentResult {
  label: SentimentLabel;
  score: number;
}

export interface Entity {
  word: string;
  entity_group: EntityType;
  score: number;
  start: number;
  end: number;
}

export interface AnalysisResult {
  input: string;
  classification: CategoryScore[];
  topCategory: CategoryScore;
  sentiment: SentimentResult;
  entities: Entity[];
  processingTime: number;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

// Category metadata for display
export const CATEGORY_META: Record<
  string,
  { emoji: string; color: string; description: string }
> = {
  Politics: {
    emoji: '🏛️',
    color: '#e74c3c',
    description: 'Government, elections, policy, diplomacy',
  },
  Business: {
    emoji: '📈',
    color: '#27ae60',
    description: 'Markets, companies, economy, finance',
  },
  Technology: {
    emoji: '⚡',
    color: '#2980b9',
    description: 'Tech industry, AI, software, hardware',
  },
  Sports: {
    emoji: '⚽',
    color: '#e67e22',
    description: 'Athletics, leagues, competitions',
  },
  Entertainment: {
    emoji: '🎬',
    color: '#9b59b6',
    description: 'Film, music, celebrity, culture',
  },
  Health: {
    emoji: '🏥',
    color: '#1abc9c',
    description: 'Medicine, research, public health',
  },
  Science: {
    emoji: '🔬',
    color: '#3498db',
    description: 'Research, discoveries, space, physics',
  },
  'World Affairs': {
    emoji: '🌍',
    color: '#e74c3c',
    description: 'International relations, geopolitics',
  },
  'Crime & Law': {
    emoji: '⚖️',
    color: '#95a5a6',
    description: 'Courts, crime, law enforcement',
  },
  Environment: {
    emoji: '🌱',
    color: '#2ecc71',
    description: 'Climate, ecology, sustainability',
  },
};

export const ENTITY_META: Record<EntityType, { label: string; color: string }> = {
  PER: { label: 'Person', color: '#c9a84c' },
  ORG: { label: 'Organization', color: '#2980b9' },
  LOC: { label: 'Location', color: '#27ae60' },
  MISC: { label: 'Misc', color: '#9b59b6' },
};
