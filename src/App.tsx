import { useCallback, useEffect, useState } from 'react';
import manifestData from './data/manifest.json';
import Lightbox from './components/Lightbox';
import JustifiedGrid from './components/JustifiedGrid';
import EmptyState from './components/EmptyState';
import Prose from './components/Prose';
import type { Manifest, Piece } from './types';

const manifest = manifestData as Manifest;

const bySlug = (slug: string) => manifest.items.find((i) => i.slug === slug) ?? null;

/**
 * The open piece lives in the URL hash (/#a13) so pieces can be shared by
 * link, and so the phone back button closes the lightbox instead of leaving
 * the site.
 */
export default function App() {
  const [openPiece, setOpenPiece] = useState<Piece | null>(() => bySlug(window.location.hash.slice(1)));

  useEffect(() => {
    const onPopState = () => setOpenPiece(bySlug(window.location.hash.slice(1)));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const open = useCallback((piece: Piece) => {
    history.pushState({ lightbox: true }, '', `#${piece.slug}`);
    setOpenPiece(piece);
  }, []);

  const close = useCallback(() => {
    // Opened here: step back to the gallery entry. Arrived by direct link:
    // there is nothing behind us on this site, so strip the hash in place.
    if (history.state?.lightbox) {
      history.back();
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      setOpenPiece(null);
    }
  }, []);

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
        {manifest.items.length === 0 ? <EmptyState /> : <JustifiedGrid items={manifest.items} onOpen={open} />}
      </main>

      {manifest.about && (
        <section className="story">
          <Prose text={manifest.about} />
        </section>
      )}

      <footer className="footer">
        <p>A gallery of finished work — pieces are not sold through this site.</p>
        <p className="muted">© {new Date().getFullYear()} Richmond Wood &amp; Gems</p>
      </footer>

      {openPiece && <Lightbox piece={openPiece} onClose={close} />}
    </div>
  );
}
