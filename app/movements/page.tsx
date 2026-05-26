'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface LandmarkWork {
  title: string;
  author: string;
  year: string;
}

interface MovementDetail {
  name: string;
  period: string;
  origin: string;
  overview: string;
  characteristics: string[];
  majorAuthors: string[];
  landmarkWorks: LandmarkWork[];
  influenced: string[];
  influencedBy: string[];
  famousQuote: string;
  quoteAuthor: string;
  legacy: string;
}

const curatedMovements = [
  {
    name: 'Romanticism',
    period: 'Late 18th to Mid 19th Century',
    description: 'An artistic and intellectual movement focused on emotion, nature, individualism, and the sublime.',
    color: '#ec4899', // soft rose
  },
  {
    name: 'Modernism',
    period: 'Late 19th to Mid 20th Century',
    description: 'A self-conscious break with traditional styles, exploring alienation, stream of consciousness, and new forms.',
    color: '#4682b4', // steel blue
  },
  {
    name: 'Realism',
    period: 'Mid 19th to Early 20th Century',
    description: 'A movement representing familiar things as they are, focusing on everyday life and social realities.',
    color: '#a1a1aa', // slate
  },
  {
    name: 'Gothic Literature',
    period: 'Late 18th to 19th Century',
    description: 'A genre blending fiction with horror, death, romanticism, dark landscapes, and supernatural suspense.',
    color: '#8b0000', // dark red
  },
  {
    name: 'Surrealism',
    period: '1920s to 1950s',
    description: 'An avant-garde movement seeking to release the creative potential of the unconscious mind and dream states.',
    color: '#a855f7', // purple
  },
  {
    name: 'Existentialism',
    period: '1940s to 1960s',
    description: 'A philosophical literary movement exploring individual freedom, dread, choice, and the search for meaning.',
    color: '#6b7280', // grey
  },
  {
    name: 'Magical Realism',
    period: 'Mid 20th Century to Present',
    description: 'A style painting a realistic view of the world while also adding magical or fantastical elements.',
    color: '#10b981', // emerald
  },
  {
    name: 'Beat Generation',
    period: '1950s to 1960s',
    description: 'A literary movement exploring anti-materialism, eastern religion, drugs, sexuality, and spontaneous prose.',
    color: '#f59e0b', // amber
  },
  {
    name: 'Victorian Literature',
    period: '1837 to 1901',
    description: 'Literature written during the reign of Queen Victoria, focusing on industrialization, morality, and social class.',
    color: '#c084fc', // lavender
  },
  {
    name: 'Renaissance Literature',
    period: '14th to 17th Century',
    description: 'A cultural rebirth of classical learning, focusing on humanism, science, and the beauty of the world.',
    color: '#fb7185', // coral
  },
  {
    name: 'Naturalism',
    period: 'Late 19th to Early 20th Century',
    description: 'An extension of realism focusing on how heredity, environment, and social conditions shape human character.',
    color: '#854d0e', // dark yellow/brown
  },
  {
    name: 'Symbolism',
    period: 'Late 19th Century',
    description: 'A French movement expressing individual emotional experiences through subtle, suggestive symbolic language.',
    color: '#38bdf8', // sky blue
  },
  {
    name: 'Postmodernism',
    period: 'Post-WWII to Present',
    description: 'Literature characterized by reliance on narrative techniques like fragmentation, paradox, and unreliable narrators.',
    color: '#94a3b8', // silver blue
  },
  {
    name: 'Transcendentalism',
    period: '1830s to 1860s',
    description: 'An American movement emphasizing the inherent goodness of people, self-reliance, and direct communion with nature.',
    color: '#4ade80', // light green
  },
  {
    name: 'Harlem Renaissance',
    period: '1920s to 1930s',
    description: 'A golden age in African American culture, manifesting in literature, music, stage performance, and art.',
    color: '#eab308', // warm gold
  },
  {
    name: 'Sufi Literature',
    period: '10th Century to Present',
    description: 'Mystical poetry and prose exploring direct spiritual experience, divine love, and alchemical soul purification.',
    color: '#6366f1', // deep indigo/purple
  },
];

function MovementsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nameParam = searchParams.get('name');

  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [detailData, setDetailData] = useState<MovementDetail | null>(null);

  // Sync state with name query parameter
  useEffect(() => {
    if (!nameParam) {
      setDetailData(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const response = await fetch(`/api/movements?name=${encodeURIComponent(nameParam)}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Movement not found');
        }
        setDetailData(data);
      } catch (err) {
        console.error(err);
        setErrorMsg((err as Error).message || 'Consultation with archives failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [nameParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/movements?name=${encodeURIComponent(searchInput.trim())}`);
      setSearchInput('');
    }
  };

  // Find accent color for headers
  const getAccentColor = (movementName: string) => {
    const found = curatedMovements.find(
      (m) => m.name.toLowerCase() === movementName.toLowerCase()
    );
    return found ? found.color : '#c9a84c'; // default gold
  };

  const currentAccent = detailData ? getAccentColor(detailData.name) : '#c9a84c';

  // staggered delay animation helper
  const itemDelay = (index: number) => ({
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: index * 0.1, duration: 0.4 },
  });

  return (
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. DETAIL VIEW */}
      {nameParam ? (
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Back button */}
          <div className="text-left mb-2">
            <Link
              href="/movements"
              className="text-xs text-gold hover:text-gold-light transition-colors inline-flex items-center gap-1 font-inter font-medium"
            >
              ← All Movements
            </Link>
          </div>

          {loading ? (
            /* Loader */
            <div className="py-24 text-center">
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
                <span className="font-playfair text-lg text-gold font-medium italic">
                  Consulting the literary archives...
                </span>
              </div>
            </div>
          ) : errorMsg ? (
            /* Error */
            <div className="glass-card border-white/5 p-12 text-center rounded-2xl max-w-md mx-auto space-y-6">
              <span className="text-3xl block mb-2">⚠️</span>
              <p className="font-playfair text-lg text-gold italic">A archival anomaly occurred</p>
              <p className="text-xs text-cream/40 leading-relaxed font-inter">{errorMsg}</p>
              <Link
                href="/movements"
                className="px-6 py-2 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all font-inter inline-block"
              >
                Return to Gallery
              </Link>
            </div>
          ) : detailData ? (
            /* Deep Dive Details */
            <div className="space-y-10">
              {/* Header profile */}
              <motion.div
                {...itemDelay(0)}
                className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="space-y-2">
                  <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-gold">
                    {detailData.name}
                  </h1>
                  <p className="font-inter text-xs text-cream/50 uppercase tracking-widest font-semibold">
                    Period: {detailData.period} • Origin: {detailData.origin}
                  </p>
                </div>

                {/* Left accent border bar */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: currentAccent }}
                />
              </motion.div>

              {/* Overview block */}
              <motion.div
                {...itemDelay(1)}
                className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4"
              >
                <h3 className="font-playfair text-xl font-bold text-gold">Overview</h3>
                <div className="font-inter text-sm text-cream/80 leading-relaxed space-y-4 text-justify whitespace-pre-wrap">
                  {detailData.overview}
                </div>
              </motion.div>

              {/* Famous Quote block */}
              {detailData.famousQuote && (
                <motion.div
                  {...itemDelay(2)}
                  className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl border-l-4 relative bg-purple-dark/5"
                  style={{ borderLeftColor: currentAccent }}
                >
                  <blockquote className="font-playfair italic text-lg sm:text-xl text-cream/90 leading-relaxed text-center px-4">
                    &quot;{detailData.famousQuote}&quot;
                  </blockquote>
                  <cite className="block text-right text-xs uppercase tracking-wider font-bold text-gold mt-4 font-inter">
                    — {detailData.quoteAuthor || 'Unknown'}
                  </cite>
                </motion.div>
              )}

              {/* Characteristics block */}
              {detailData.characteristics && detailData.characteristics.length > 0 && (
                <motion.div
                  {...itemDelay(3)}
                  className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4"
                >
                  <h3 className="font-playfair text-xl font-bold text-gold">Key Characteristics</h3>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {detailData.characteristics.map((char, index) => (
                      <span
                        key={index}
                        className="px-3.5 py-1.5 glass-card border-white/5 text-xs font-semibold font-inter text-gold shadow-sm hover:border-gold/15 transition-all"
                      >
                        ✦ {char}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Major Authors block */}
              {detailData.majorAuthors && detailData.majorAuthors.length > 0 && (
                <motion.div
                  {...itemDelay(4)}
                  className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4"
                >
                  <h3 className="font-playfair text-xl font-bold text-gold">Major Authors</h3>
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {detailData.majorAuthors.map((author, index) => (
                      <Link
                        key={index}
                        href={`/authors?name=${encodeURIComponent(author)}`}
                        className="px-4 py-2 border border-gold/30 rounded-xl text-xs font-bold font-inter text-gold bg-gold/5 transition-all hover:bg-gold hover:text-navy shadow shadow-gold/10"
                      >
                        🖋️ {author}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Landmark Works block */}
              {detailData.landmarkWorks && detailData.landmarkWorks.length > 0 && (
                <motion.div
                  {...itemDelay(5)}
                  className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4"
                >
                  <h3 className="font-playfair text-xl font-bold text-gold">Landmark Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {detailData.landmarkWorks.map((work, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between hover:border-gold/10 transition-all shadow"
                      >
                        <div>
                          <Link
                            href={`/library?q=${encodeURIComponent(work.title)}`}
                            className="font-playfair font-bold text-cream hover:text-gold text-sm line-clamp-2 leading-snug transition-colors"
                          >
                            {work.title}
                          </Link>
                          <p className="font-inter text-[11px] text-cream/40 mt-1">
                            by{' '}
                            <Link
                              href={`/authors?name=${encodeURIComponent(work.author)}`}
                              className="text-gold hover:text-gold-light hover:underline transition-all font-medium"
                            >
                              {work.author}
                            </Link>
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-cream/30 uppercase tracking-widest font-inter block mt-4 border-t border-white/5 pt-2 text-right">
                          Released: {work.year}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Influenced / Connections block */}
              <motion.div
                {...itemDelay(6)}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Left Column: Influenced By */}
                <div className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4">
                  <h3 className="font-playfair text-lg font-bold text-gold border-b border-white/5 pb-2">
                    Influenced By
                  </h3>
                  <div className="space-y-2 pt-2">
                    {detailData.influencedBy && detailData.influencedBy.length > 0 ? (
                      detailData.influencedBy.map((mov, index) => (
                        <Link
                          key={index}
                          href={`/movements?name=${encodeURIComponent(mov)}`}
                          className="block text-xs text-cream/70 hover:text-gold font-inter py-1 transition-colors flex items-center gap-1.5 font-medium"
                        >
                          ← {mov}
                        </Link>
                      ))
                    ) : (
                      <span className="text-xs text-cream/40 italic font-inter">No direct historical precursors listed.</span>
                    )}
                  </div>
                </div>

                {/* Right Column: Influenced */}
                <div className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4">
                  <h3 className="font-playfair text-lg font-bold text-gold border-b border-white/5 pb-2">
                    Influenced
                  </h3>
                  <div className="space-y-2 pt-2">
                    {detailData.influenced && detailData.influenced.length > 0 ? (
                      detailData.influenced.map((mov, index) => (
                        <Link
                          key={index}
                          href={`/movements?name=${encodeURIComponent(mov)}`}
                          className="block text-xs text-cream/70 hover:text-gold font-inter py-1 transition-colors flex items-center justify-end gap-1.5 font-medium"
                        >
                          {mov} →
                        </Link>
                      ))
                    ) : (
                      <span className="text-xs text-cream/40 italic font-inter text-right block">No direct descendants listed.</span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Legacy block */}
              <motion.div
                {...itemDelay(7)}
                className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-4"
              >
                <h3 className="font-playfair text-xl font-bold text-gold">Legacy</h3>
                <p className="font-inter text-sm text-cream/80 leading-relaxed text-justify">
                  {detailData.legacy}
                </p>
              </motion.div>

              {/* CTA Toolbar buttons */}
              <motion.div
                {...itemDelay(8)}
                className="flex gap-4 max-w-md mx-auto pt-6"
              >
                <Link
                  href="/authors"
                  className="flex-1 py-3 border border-gold/45 rounded-xl text-xs font-bold uppercase tracking-wider font-inter text-gold transition-all hover:bg-gold/5 text-center shadow shadow-gold/5"
                >
                  Explore Authors
                </Link>
                <Link
                  href="/library"
                  className="flex-1 py-3 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all text-center shadow shadow-gold/15"
                >
                  Find Books
                </Link>
              </motion.div>
            </div>
          ) : null}
        </div>
      ) : (
        /* 2. BROWSE SCREEN */
        <div className="space-y-12">
          {/* Headline titles */}
          <div className="text-center">
            <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-gold tracking-wide">
              Literary Movements
            </h1>
            <p className="font-playfair italic text-cream/70 text-sm mt-3">
              The currents that shaped the written word
            </p>
          </div>

          {/* Search bar segment */}
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search a movement..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full px-4 py-3 pl-11 rounded-2xl outline-none glass-input text-sm text-cream placeholder-cream/25 focus:border-gold/45 transition-all shadow-xl"
              />
              <svg
                className="absolute left-4 top-3.5 w-4 h-4 text-[#f5f0e8]/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <button
                type="submit"
                className="absolute right-2 top-2 px-4 py-1.5 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all shadow"
              >
                Search
              </button>
            </form>
          </div>

          {/* Grid display items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {curatedMovements.map((movement, idx) => (
              <Link
                key={idx}
                href={`/movements?name=${encodeURIComponent(movement.name)}`}
                className="glass-card border-white/5 hover:border-gold/15 rounded-2xl p-6 shadow-2xl relative flex flex-col justify-between transition-all group overflow-hidden"
                style={{ borderLeft: `4px solid ${movement.color}` }}
              >
                <div>
                  <h3 className="font-playfair text-lg font-bold text-gold group-hover:text-gold-light transition-colors line-clamp-1">
                    {movement.name}
                  </h3>
                  <span className="text-[10px] text-cream/40 uppercase tracking-widest font-bold font-inter block mt-1">
                    {movement.period}
                  </span>
                  <p className="font-inter text-xs text-cream/60 leading-relaxed mt-4 line-clamp-3">
                    {movement.description}
                  </p>
                </div>

                {/* Arrow hint icon */}
                <div className="text-right mt-6 text-gold/40 group-hover:text-gold transition-colors text-[10px] uppercase font-bold tracking-widest font-inter">
                  Explore →
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MovementsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
            <span className="font-playfair text-lg text-gold font-medium italic">
              Consulting the literary archives...
            </span>
          </div>
        </div>
      }
    >
      <MovementsPageContent />
    </Suspense>
  );
}
