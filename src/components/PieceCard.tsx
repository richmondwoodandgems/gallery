import { asset } from '../asset';
import type { Piece } from '../types';

interface Props {
  piece: Piece;
  /** Exact width in px, computed by the justified layout. */
  width: number;
  onOpen: () => void;
}

/**
 * The grid is intentionally caption-free so the photographs carry the page.
 * Titles and descriptions live in the lightbox instead.
 */
export default function PieceCard({ piece, width, onOpen }: Props) {
  const extras = piece.photos.length - 1;

  return (
    <button
      type="button"
      className="card"
      style={{ width }}
      onClick={onOpen}
      aria-label={`View ${piece.title}`}
    >
      <div className="card-frame">
        <img
          src={asset(piece.photos[0].thumb)}
          srcSet={`${asset(piece.photos[0].thumbSmall)} 700w, ${asset(piece.photos[0].thumb)} 1400w`}
          sizes={`${Math.round(width)}px`}
          alt={piece.title}
          loading="lazy"
          decoding="async"
        />
        {extras > 0 && <span className="badge">{piece.photos.length} photos</span>}
      </div>
    </button>
  );
}
