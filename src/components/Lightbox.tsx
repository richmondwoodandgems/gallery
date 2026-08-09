import { useCallback, useEffect, useRef, useState } from 'react';
import { asset } from '../asset';
import type { Piece } from '../types';

interface Props {
  piece: Piece;
  onClose: () => void;
}

export default function Lightbox({ piece, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const count = piece.photos.length;
  const photo = piece.photos[index];
  const stripRef = useRef<HTMLDivElement>(null);

  const step = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

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
        <div className="lb-frame">
          {/* Keyed by src so the entrance animation replays on next/prev. */}
          <img key={photo.full} src={asset(photo.full)} alt={`${piece.title} (${index + 1} of ${count})`} />

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
