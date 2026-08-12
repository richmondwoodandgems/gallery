import { useCallback, useEffect, useState } from 'react';
import manifestData from './data/manifest.json';
import Lightbox from './components/Lightbox';
import JustifiedGrid from './components/JustifiedGrid';
import EmptyState from './components/EmptyState';
import Prose from './components/Prose';
import { asset } from './asset';
import type { Manifest, Piece } from './types';

const manifest = manifestData as Manifest;

const bySlug = (slug: string) => manifest.items.find((i) => i.slug === slug) ?? null;

const COLLECTION = [
  {
    name: 'Charcuterie Boards',
    blurb: 'Perfect for cheese, charcuterie, appetizers, liquor displays, or elegant serving.',
  },
  {
    name: 'Cocktail Napkin Holder',
    blurb: 'Ideal for entertaining, bar accessories, and luxury home décor.',
  },
  {
    name: 'Vanity Tray / Guest Towel Napkin Holder',
    blurb: 'Perfect for guest towels, vanity items, perfumes, and luxury home décor.',
  },
  {
    name: 'Phone / Business Card / Glasses Holder',
    blurb: 'Perfect for desk organization.',
  },
];

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
        {manifest.intro && (
          <div className="intro">
            <Prose text={manifest.intro} />
          </div>
        )}
      </header>

      {manifest.showcase.length > 0 && (
        <section className="showcase" aria-label="Pieces at home">
          {manifest.showcase.map((photo) => (
            <img
              key={photo.thumb}
              src={asset(photo.thumbSmall)}
              srcSet={`${asset(photo.thumbSmall)} 700w, ${asset(photo.thumb)} 1400w`}
              sizes="480px"
              alt=""
              loading="lazy"
              decoding="async"
            />
          ))}
        </section>
      )}

      <section className="collection" aria-label="Our collection">
        <h2>Our Collection</h2>
        <ul>
          {COLLECTION.map((item) => (
            <li key={item.name}>
              <span className="collection-name">{item.name}</span>
              <span className="collection-blurb">{item.blurb}</span>
            </li>
          ))}
        </ul>
      </section>

      <main>
        {manifest.items.length === 0 ? <EmptyState /> : <JustifiedGrid items={manifest.items} onOpen={open} />}
      </main>

      <footer className="footer">
        <p className="contact">
          For inquiries or purchase:{' '}
          <a href="mailto:Richmondwoodandgems@gmail.com">Richmondwoodandgems@gmail.com</a>
        </p>

        <section className="care" aria-label="Care instructions">
          <h2>Care Instructions</h2>
          <p>Clean with mild soap and water, then wipe dry with a soft cloth.</p>
          <p>To preserve its beauty, do not use sharp objects.</p>
          <p>Small surface scratches can be gently polished with food-safe beeswax.</p>
          <p>Store wrapped in soft cloth or paper (avoid plastic or bubble wrap, as it may affect the resin finish).</p>
        </section>

        <p className="muted">© {new Date().getFullYear()} Richmond Wood &amp; Gems</p>
      </footer>

      {openPiece && <Lightbox piece={openPiece} onClose={close} />}
    </div>
  );
}
