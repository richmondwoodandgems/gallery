import { useCallback, useEffect, useState } from 'react';
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

  const step = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

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

      <figure className="lb-stage" onClick={(event) => event.stopPropagation()}>
        <img src={asset(photo.full)} alt={`${piece.title} (${index + 1} of ${count})`} />
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
          <>
            <button type="button" className="lb-nav lb-prev" onClick={() => step(-1)} aria-label="Previous photo">
              ‹
            </button>
            <button type="button" className="lb-nav lb-next" onClick={() => step(1)} aria-label="Next photo">
              ›
            </button>
          </>
        )}
      </figure>
    </div>
  );
}
