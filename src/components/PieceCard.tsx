import { asset } from '../asset';
import type { Piece } from '../types';

interface Props {
  piece: Piece;
  onOpen: () => void;
}

/**
 * The grid is intentionally caption-free so the photographs carry the page.
 * Titles and descriptions live in the lightbox instead.
 */
export default function PieceCard({ piece, onOpen }: Props) {
  const cover = piece.photos[0];
  const extras = piece.photos.length - 1;

  return (
    <button type="button" className="card" onClick={onOpen} aria-label={`View ${piece.title}`}>
      <div className="card-frame" style={{ aspectRatio: `${cover.width} / ${cover.height}` }}>
        <img
          src={asset(cover.thumb)}
          srcSet={`${asset(cover.thumbSmall)} 700w, ${asset(cover.thumb)} 1400w`}
          sizes="(max-width: 720px) 94vw, min(46vw, 660px)"
          alt={piece.title}
          loading="lazy"
          decoding="async"
        />
        {extras > 0 && <span className="badge">{piece.photos.length} photos</span>}
      </div>
    </button>
  );
}
