import { asset } from '../asset';
import type { Piece } from '../types';

interface Props {
  piece: Piece;
  onOpen: () => void;
}

export default function PieceCard({ piece, onOpen }: Props) {
  const cover = piece.photos[0];
  const extras = piece.photos.length - 1;

  return (
    <button type="button" className="card" onClick={onOpen}>
      <div className="card-frame" style={{ aspectRatio: `${cover.width} / ${cover.height}` }}>
        <img src={asset(cover.thumb)} alt={piece.title} loading="lazy" decoding="async" />
        {extras > 0 && <span className="badge">+{extras}</span>}
      </div>
      <div className="card-body">
        <h2>{piece.title}</h2>
        {piece.description && <p>{piece.description}</p>}
      </div>
    </button>
  );
}
