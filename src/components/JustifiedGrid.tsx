import { useEffect, useRef, useState } from 'react';
import PieceCard from './PieceCard';
import type { Piece } from '../types';

interface Props {
  items: Piece[];
  onOpen: (piece: Piece) => void;
}

const GAP = 14;

/** Ultrawide boards would otherwise consume an entire row at a sliver of height. */
function aspectOf(piece: Piece): number {
  const cover = piece.photos[0];
  return Math.min(Math.max(cover.width / cover.height, 0.6), 3.2);
}

interface Row {
  pieces: { piece: Piece; width: number }[];
  height: number;
}

/**
 * Flickr-style justified layout: walk the catalog in order, accumulating
 * photos into a row until the row's exact-fit height drops to the target,
 * then close it. Every row fills the container edge to edge, so the photos
 * read tightly, one after another, in catalog order.
 */
function buildRows(items: Piece[], width: number, target: number): Row[] {
  const rows: Row[] = [];
  let pending: { piece: Piece; ar: number }[] = [];
  let sumAr = 0;

  const heightFor = (n: number, ars: number) => (width - GAP * (n - 1)) / ars;

  for (const piece of items) {
    const ar = aspectOf(piece);
    pending.push({ piece, ar });
    sumAr += ar;
    const height = heightFor(pending.length, sumAr);
    if (height <= target) {
      rows.push({ height, pieces: pending.map((p) => ({ piece: p.piece, width: p.ar * height })) });
      pending = [];
      sumAr = 0;
    }
  }

  // The last row keeps its natural size instead of stretching to fill.
  if (pending.length > 0) {
    const height = Math.min(target, heightFor(pending.length, sumAr));
    rows.push({ height, pieces: pending.map((p) => ({ piece: p.piece, width: p.ar * height })) });
  }

  return rows;
}

export default function JustifiedGrid({ items, onOpen }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const target = width < 720 ? 200 : 300;
  const rows = width > 0 ? buildRows(items, width, target) : [];

  return (
    <div className="justified" ref={containerRef}>
      {rows.map((row, i) => (
        <div className="jrow" key={i} style={{ height: row.height }}>
          {row.pieces.map(({ piece, width: w }) => (
            <PieceCard key={piece.id} piece={piece} width={w} onOpen={() => onOpen(piece)} />
          ))}
        </div>
      ))}
    </div>
  );
}
