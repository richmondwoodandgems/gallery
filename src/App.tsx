import { useState } from 'react';
import manifestData from './data/manifest.json';
import Lightbox from './components/Lightbox';
import PieceCard from './components/PieceCard';
import EmptyState from './components/EmptyState';
import type { Manifest, Piece } from './types';

const manifest = manifestData as Manifest;

export default function App() {
  const [openPiece, setOpenPiece] = useState<Piece | null>(null);

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Handmade in Richmond</p>
        <h1>
          Richmond Wood <span className="amp">&amp;</span> Gems
        </h1>
        <p className="tagline">Live-edge boards, hand-set with gemstones and sealed under glass-clear resin.</p>
      </header>

      <main>
        {manifest.items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid">
            {manifest.items.map((piece) => (
              <PieceCard key={piece.id} piece={piece} onOpen={() => setOpenPiece(piece)} />
            ))}
          </div>
        )}
      </main>

      {manifest.about && <section className="story">{manifest.about}</section>}

      <footer className="footer">
        <p>A gallery of finished work — pieces are not sold through this site.</p>
        <p className="muted">© {new Date().getFullYear()} Richmond Wood &amp; Gems</p>
      </footer>

      {openPiece && <Lightbox piece={openPiece} onClose={() => setOpenPiece(null)} />}
    </div>
  );
}
