import { useMemo, useState } from 'react';
import manifestData from './data/manifest.json';
import Lightbox from './components/Lightbox';
import PieceCard from './components/PieceCard';
import EmptyState from './components/EmptyState';
import type { Manifest, Piece } from './types';

const manifest = manifestData as Manifest;

const ALL = 'All';

export default function App() {
  const [collection, setCollection] = useState(ALL);
  const [openPiece, setOpenPiece] = useState<Piece | null>(null);

  const filtered = useMemo(
    () => (collection === ALL ? manifest.items : manifest.items.filter((i) => i.collection === collection)),
    [collection],
  );

  // A single unnamed collection is not worth a filter bar.
  const showFilters = manifest.collections.length > 1;

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Handmade in Richmond</p>
        <h1>Richmond Wood &amp; Gems</h1>
        <p className="tagline">
          Live edge boards finished in resin, set with gemstones and rough rock. Every piece is one of a kind.
        </p>
        {manifest.about && <p className="about">{manifest.about}</p>}
      </header>

      {showFilters && (
        <nav className="filters" aria-label="Filter by collection">
          {[ALL, ...manifest.collections].map((name) => (
            <button
              key={name}
              type="button"
              className={name === collection ? 'chip chip-active' : 'chip'}
              aria-pressed={name === collection}
              onClick={() => setCollection(name)}
            >
              {name}
            </button>
          ))}
        </nav>
      )}

      <main>
        {manifest.items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid">
            {filtered.map((piece) => (
              <PieceCard key={piece.id} piece={piece} onOpen={() => setOpenPiece(piece)} />
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Photographs are for reference only — pieces are not sold through this site.</p>
        <p className="muted">© {new Date().getFullYear()} Richmond Wood &amp; Gems</p>
      </footer>

      {openPiece && <Lightbox piece={openPiece} onClose={() => setOpenPiece(null)} />}
    </div>
  );
}
