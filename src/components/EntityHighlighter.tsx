'use client';

import type { Entity } from '@/types';
import { ENTITY_META } from '@/types';

interface Props {
  text: string;
  entities: Entity[];
}

interface Span {
  text: string;
  entity?: Entity;
}

function buildSpans(text: string, entities: Entity[]): Span[] {
  if (!entities.length) return [{ text }];

  // Sort by start position
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const spans: Span[] = [];
  let cursor = 0;

  for (const entity of sorted) {
    if (entity.start > cursor) {
      spans.push({ text: text.slice(cursor, entity.start) });
    }
    spans.push({
      text: text.slice(entity.start, entity.end),
      entity,
    });
    cursor = entity.end;
  }

  if (cursor < text.length) {
    spans.push({ text: text.slice(cursor) });
  }

  return spans;
}

export default function EntityHighlighter({ text, entities }: Props) {
  const spans = buildSpans(text, entities);
  const uniqueTypes = Array.from(new Set(entities.map((e) => e.entity_group)));

  if (!entities.length) {
    return (
      <p className="font-sans text-sm text-parchment-dim leading-relaxed">
        {text}
        <span className="block mt-2 font-mono text-xs text-parchment-muted">
          No named entities detected.
        </span>
      </p>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {uniqueTypes.map((type) => {
          const meta = ENTITY_META[type as keyof typeof ENTITY_META];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: meta?.color ?? '#aaa' }}
              />
              <span className="font-mono text-[10px] tracking-wide uppercase text-parchment-muted">
                {meta?.label ?? type}
              </span>
            </div>
          );
        })}
      </div>

      {/* Highlighted text */}
      <p className="font-sans text-sm leading-relaxed text-parchment-dim">
        {spans.map((span, i) => {
          if (!span.entity) return <span key={i}>{span.text}</span>;

          const type = span.entity.entity_group;
          const meta = ENTITY_META[type as keyof typeof ENTITY_META];
          const conf = (span.entity.score * 100).toFixed(0);

          return (
            <span
              key={i}
              className={`entity-${type} cursor-default rounded-sm px-0.5 mx-0.5 relative group`}
              title={`${meta?.label ?? type} · ${conf}% confidence`}
            >
              {span.text}
              {/* Tooltip */}
              <span
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1
                           font-mono text-[9px] tracking-wide uppercase whitespace-nowrap
                           rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{
                  background: meta?.color ?? '#555',
                  color: '#000',
                }}
              >
                {meta?.label ?? type} · {conf}%
              </span>
            </span>
          );
        })}
      </p>

      <p className="mt-2 font-mono text-[10px] text-parchment-muted">
        {entities.length} entit{entities.length === 1 ? 'y' : 'ies'} detected
      </p>
    </div>
  );
}
