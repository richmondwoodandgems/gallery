import { useCallback, useEffect, useRef, useState } from 'react';
import { asset } from '../asset';
import type { Piece } from '../types';

interface Props {
  piece: Piece;
  onClose: () => void;
}

/** Live state of a finger (or mouse) drag across the photo. */
interface Drag {
  id: number;
  x: number;
  y: number;
  startedAt: number;
  /** '?' until the first few pixels reveal the intent; 'off' hands it back to the browser. */
  axis: '?' | 'x' | 'off';
}

export default function Lightbox({ piece, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const count = piece.photos.length;
  const photo = piece.photos[index];
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const step = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Secondary pointers mean a pinch-zoom; leave those to the browser.
    if (count < 2 || !event.isPrimary) return;
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startedAt: performance.now(), axis: '?' };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    if (drag.axis === '?') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // A mostly-vertical first move is a scroll or zoom, not a swipe.
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'off';
      if (drag.axis === 'x') {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }
    }

    if (drag.axis !== 'x') return;
    setDragX(dx);
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.id) return;

    const dx = event.clientX - drag.x;
    const distance = Math.abs(dx);
    const elapsed = performance.now() - drag.startedAt;
    const width = event.currentTarget.clientWidth || 1;

    // Either drag the photo well across, or flick it quickly.
    const dragged = distance > Math.min(70, width * 0.18);
    const flicked = distance > 24 && distance / elapsed > 0.45;

    if (drag.axis === 'x' && (dragged || flicked)) step(dx < 0 ? 1 : -1);

    dragRef.current = null;
    setDragging(false);
    setDragX(0);
  }

  // Decode the neighboring photos ahead of time so next/prev feels instant.
  useEffect(() => {
    if (count < 2) return;
    for (const delta of [1, -1]) {
      const preload = new Image();
      preload.src = asset(piece.photos[(index + delta + count) % count].full);
    }
  }, [index, count, piece]);

  // Keep the active thumbnail in view as the visitor pages through.
  useEffect(() => {
    const active = stripRef.current?.children[index];
    if (!(active instanceof HTMLElement)) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    active.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') step(1);
      else if (event.key === 'ArrowLeft') step(-1);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, step]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={piece.title} onClick={onClose}>
      <button type="button" className="lb-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <figure
        className={count > 1 ? 'lb-stage lb-stage-strip' : 'lb-stage'}
        onClick={(event) => event.stopPropagation()}
      >
        {/* The arrows anchor to the photo itself, not the caption or filmstrip. */}
        <div
          className={dragging ? 'lb-frame lb-frame-dragging' : 'lb-frame'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {/* Keyed by src so the entrance animation replays on next/prev. */}
          <img
            key={photo.full}
            src={asset(photo.full)}
            alt={`${piece.title} (${index + 1} of ${count})`}
            style={dragX ? { transform: `translateX(${dragX}px)` } : undefined}
          />

          {count > 1 && (
            <>
              <button type="button" className="lb-nav lb-prev" onClick={() => step(-1)} aria-label="Previous photo">
                ‹
              </button>
              <button type="button" className="lb-nav lb-next" onClick={() => step(1)} aria-label="Next photo">
                ›
              </button>
            </>
          )}
        </div>

        <figcaption>
          <h2>{piece.title}</h2>
          {piece.description && <p>{piece.description}</p>}
          {count > 1 && (
            <p className="muted">
              {index + 1} of {count}
            </p>
          )}
        </figcaption>

        {count > 1 && (
          <div className="lb-strip" ref={stripRef} role="tablist" aria-label={`Photos of ${piece.title}`}>
            {piece.photos.map((thumb, i) => (
              <button
                key={thumb.thumb}
                type="button"
                role="tab"
                className={i === index ? 'lb-thumb lb-thumb-active' : 'lb-thumb'}
                aria-selected={i === index}
                aria-label={`Photo ${i + 1} of ${count}`}
                onClick={() => setIndex(i)}
              >
                <img src={asset(thumb.thumb)} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </figure>
    </div>
  );
}
