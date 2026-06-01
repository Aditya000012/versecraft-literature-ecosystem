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
    descriptor: 'Emotion, longing, imagination, individuality, and sublime nature.',
    color: '#ec4899', // soft rose
  },
  {
    name: 'Modernism',
    period: 'Late 19th to Mid 20th Century',
    description: 'A self-conscious break with traditional styles, exploring alienation, stream of consciousness, and new forms.',
    descriptor: 'Fragmentation, alienation, experimentation, and inner consciousness.',
    color: '#4682b4', // steel blue
  },
  {
    name: 'Realism',
    period: 'Mid 19th to Early 20th Century',
    description: 'A movement representing familiar things as they are, focusing on everyday life and social realities.',
    descriptor: 'Ordinary life, social truth, morality, and observation.',
    color: '#a1a1aa', // slate
  },
  {
    name: 'Gothic Literature',
    period: 'Late 18th to 19th Century',
    description: 'A genre blending fiction with horror, death, romanticism, dark landscapes, and supernatural suspense.',
    descriptor: 'Darkness, obsession, ruin, dread, and sublime terror.',
    color: '#8b0000', // dark red
  },
  {
    name: 'Surrealism',
    period: '1920s to 1950s',
    description: 'An avant-garde movement seeking to release the creative potential of the unconscious mind and dream states.',
    descriptor: 'Dream logic, subconscious imagery, wonder, and disruption.',
    color: '#a855f7', // purple
  },
  {
    name: 'Existentialism',
    period: '1940s to 1960s',
    description: 'A literary movement exploring individual freedom, dread, choice, and the search for meaning.',
    descriptor: 'Freedom, dread, meaning, anxiety, and human choice.',
    color: '#6b7280', // grey
  },
  {
    name: 'Magical Realism',
    period: 'Mid 20th Century to Present',
    description: 'A style painting a realistic view of the world while also adding magical or fantastical elements.',
    descriptor: 'Reality touched by myth, memory, wonder, and impossibility.',
    color: '#10b981', // emerald
  },
  {
    name: 'Beat Generation',
    period: '1950s to 1960s',
    description: 'A literary movement exploring anti-materialism, eastern religion, drugs, sexuality, and spontaneous prose.',
    descriptor: 'Rebellion, wandering, spontaneity, spirituality, and resistance.',
    color: '#f59e0b', // amber
  },
  {
    name: 'Victorian Literature',
    period: '1837 to 1901',
    description: 'Literature written during the reign of Queen Victoria, focusing on industrialization, morality, and social class.',
    descriptor: 'Morality, industrial change, social order, and emotional restraint.',
    color: '#c084fc', // lavender
  },
  {
    name: 'Renaissance Literature',
    period: '14th to 17th Century',
    description: 'A cultural rebirth of classical learning, focusing on humanism, science, and the beauty of the world.',
    descriptor: 'Humanism, beauty, knowledge, rediscovery, and inquiry.',
    color: '#fb7185', // coral
  },
  {
    name: 'Naturalism',
    period: 'Late 19th to Early 20th Century',
    description: 'An extension of realism focusing on how heredity, environment, and social conditions shape human character.',
    descriptor: 'Environment, determinism, survival, and social conditions.',
    color: '#854d0e', // dark yellow/brown
  },
  {
    name: 'Symbolism',
    period: 'Late 19th Century',
    description: 'A French movement expressing individual emotional experiences through subtle, suggestive symbolic language.',
    descriptor: 'Emotion, metaphor, mystery, and suggestion.',
    color: '#38bdf8', // sky blue
  },
  {
    name: 'Postmodernism',
    period: 'Post-WWII to Present',
    description: 'Literature characterized by reliance on narrative techniques like fragmentation, paradox, and unreliable narrators.',
    descriptor: 'Fragmentation, paradox, irony, and instability.',
    color: '#94a3b8', // silver blue
  },
  {
    name: 'Transcendentalism',
    period: '1830s to 1860s',
    description: 'An American movement emphasizing the inherent goodness of people, self-reliance, and direct communion with nature.',
    descriptor: 'Nature, spirit, intuition, freedom, and self-reliance.',
    color: '#4ade80', // light green
  },
  {
    name: 'Harlem Renaissance',
    period: '1920s to 1930s',
    description: 'A golden age in African American culture, manifesting in literature, music, stage performance, and art.',
    descriptor: 'Identity, artistry, resistance, and Black cultural expression.',
    color: '#eab308', // warm gold
  },
  {
    name: 'Sufi Literature',
    period: '10th Century to Present',
    description: 'Mystical poetry and prose exploring direct spiritual experience, divine love, and alchemical soul purification.',
    descriptor: 'Love, mysticism, longing, transcendence, and devotion.',
    color: '#6366f1', // deep indigo/purple
  },
];

const detailIdentitySentences: Record<string, string> = {
  'Romanticism': 'A movement of emotion, longing, imagination, individuality, and sublime nature.',
  'Modernism': 'A rupture from tradition through fragmentation, experimentation, and inner consciousness.',
  'Gothic Literature': 'A world of dread, obsession, ruin, supernatural longing, and darkness.',
  'Realism': 'A literary pursuit of ordinary life, truth, morality, and social observation.',
  'Magical Realism': 'Reality infused with memory, myth, wonder, and impossibility.',
  'Existentialism': 'A meditation on freedom, anxiety, dread, meaning, and human choice.',
  'Beat Generation': 'A journey of rebellion, wandering, spontaneity, spirituality, and counter-cultural resistance.',
  'Victorian Literature': 'A study in morality, industrial transition, social order, and emotional restraint.',
  'Renaissance Literature': 'A rebirth of classical humanism, beauty, scientific inquiry, and rediscovered knowledge.',
  'Naturalism': 'A stark investigation of environment, determinism, survival, and harsh social conditions.',
  'Symbolism': 'An evocation of emotion, mystery, and personal dreamscapes through subtle suggestion.',
  'Postmodernism': 'An exploration of fragmentation, paradox, irony, and institutional instability.',
  'Transcendentalism': 'An communion with nature, spiritual intuition, self-reliance, and individual freedom.',
  'Harlem Renaissance': 'A celebration of identity, creative artistry, resistance, and Black cultural expression.',
  'Sufi Literature': 'A path of divine love, mystical longing, soul purification, and absolute transcendence.'
};

const getDetailIdentity = (name: string, description = '') => {
  const match = Object.keys(detailIdentitySentences).find(
    k => k.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(k.toLowerCase())
  );
  if (match) {
    return detailIdentitySentences[match];
  }
  return description || `A profound literary tradition exploring key ideas, aesthetics, and lasting movements.`;
};

const getHoverShadowClass = (name: string) => {
  switch (name) {
    case 'Romanticism': return 'hover:shadow-[0_8px_20px_rgba(236,72,153,0.06)] hover:border-[#ec4899]/30';
    case 'Gothic Literature': return 'hover:shadow-[0_8px_20px_rgba(139,0,0,0.06)] hover:border-[#8b0000]/30';
    case 'Modernism': return 'hover:shadow-[0_8px_20px_rgba(70,130,180,0.06)] hover:border-[#4682b4]/30';
    case 'Surrealism': return 'hover:shadow-[0_8px_20px_rgba(168,85,247,0.06)] hover:border-[#a855f7]/30';
    case 'Magical Realism': return 'hover:shadow-[0_8px_20px_rgba(16,185,129,0.06)] hover:border-[#10b981]/30';
    case 'Sufi Literature': return 'hover:shadow-[0_8px_20px_rgba(99,102,241,0.06)] hover:border-[#6366f1]/30';
    default: return 'hover:shadow-md hover:border-[#1a1a1a]/25';
  }
};

const cleanCharacteristic = (char: string) => {
  let c = char.trim();
  c = c.replace(/^(emphasis on|focus on|use of|a\s+|an\s+|the\s+)/i, '');
  c = c.split(' ')
       .map(w => w.charAt(0).toUpperCase() + w.slice(1))
       .join(' ');
  const words = c.split(' ');
  if (words.length > 4) {
    return words.slice(0, 4).join(' ') + '...';
  }
  return c;
};

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';

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

  // Find accent color for border lines
  const getAccentColor = (movementName: string) => {
    const found = curatedMovements.find(
      (m) => m.name.toLowerCase() === movementName.toLowerCase()
    );
    return found ? found.color : '#1a1a1a'; // default black
  };

  const currentAccent = detailData ? getAccentColor(detailData.name) : '#1a1a1a';

  // staggered delay animation helper
  const itemDelay = (index: number) => ({
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: index * 0.1, duration: 0.4 },
  });

  // Sanctuary Background elements helper
  const renderSanctuaryBackground = () => (
    <>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Cream background base */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#F8F4E9',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Reading Sanctuary Background Ambience */}
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      >
        <svg
          className="w-full h-full text-[#1a1a1a]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          <line x1="80" y1="200" x2="200" y2="150" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="80" y1="200" x2="140" y2="300" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="140" y1="300" x2="60" y2="480" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="1080" y1="180" x2="980" y2="280" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="980" y1="280" x2="1120" y2="350" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="1120" y1="350" x2="1000" y2="520" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />

          <text x="80" y="200" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">story</text>
          <text x="200" y="150" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">memory</text>
          <text x="140" y="300" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">silence</text>
          <text x="60" y="480" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">poetry</text>
          <text x="120" y="700" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">dream</text>

          <text x="1080" y="180" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">solitude</text>
          <text x="980" y="280" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">wonder</text>
          <text x="1120" y="350" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">myth</text>
          <text x="1000" y="520" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">λόγος</text>
        </svg>
      </motion.div>
    </>
  );

  return (
    <>
      {renderSanctuaryBackground()}
      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 selection:bg-[#1a1a1a] selection:text-[#F8F4E9]">
        {/* 1. DETAIL VIEW */}
        {nameParam ? (
          <div className="max-w-4xl mx-auto space-y-10">
            {/* Back button */}
            <div className="text-left mb-2 select-none">
              <Link
                href="/movements"
                className="text-xs text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors inline-flex items-center gap-1 font-inter font-medium"
              >
                ← All Movements
              </Link>
            </div>

            {loading ? (
              /* Loader */
              <div className="py-24 text-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center mx-auto">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.35, 0.15] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full border border-[#1a1a1a]"
                    />
                    <span className="text-xs text-[#1a1a1a]/60 select-none font-serif">✦</span>
                  </div>
                  <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">
                    Consulting the literary archives...
                  </span>
                </div>
              </div>
            ) : errorMsg ? (
              /* Error */
              <div className="bg-[#FAF7F0] border border-[#1a1a1a]/15 p-12 text-center rounded-2xl max-w-md mx-auto space-y-6 shadow-md select-none">
                <span className="text-3xl block mb-2">⚠️</span>
                <p className="font-playfair text-lg text-[#1a1a1a] italic">An archival anomaly occurred</p>
                <p className="text-xs text-[#1a1a1a]/60 leading-relaxed font-inter">{errorMsg}</p>
                <Link
                  href="/movements"
                  className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all font-inter inline-block active:scale-95 shadow-sm"
                >
                  Return to Gallery
                </Link>
              </div>
            ) : detailData ? (
              /* Deep Dive Details */
              <div className="space-y-12">
                {/* Header profile */}
                <motion.div
                  {...itemDelay(0)}
                  className="bg-[#FAF7F0] border border-[#1a1a1a]/10 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
                >
                  <div className="space-y-3 select-text">
                    <h1 className="font-playfair text-3xl sm:text-4xl font-bold text-[#1a1a1a]">
                      {detailData.name}
                    </h1>

                    {/* Literary Identity Sentence */}
                    <p className="font-playfair text-lg sm:text-xl italic text-[#1a1a1a]/85 leading-relaxed font-medium max-w-2xl">
                      {getDetailIdentity(detailData.name, detailData.overview)}
                    </p>

                    <p className="font-inter text-xs text-[#1a1a1a]/50 uppercase tracking-widest font-semibold mt-1.5 pt-3 border-t border-[#1a1a1a]/10 max-w-xs">
                      Period: {detailData.period} <span className="mx-1 text-[#1a1a1a]/20">•</span> Origin: {detailData.origin}
                    </p>
                  </div>

                  {/* Accent border line */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ backgroundColor: currentAccent }}
                  />
                </motion.div>

                {/* Overview block */}
                <motion.div
                  {...itemDelay(1)}
                  className="space-y-4"
                >
                  <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2 uppercase tracking-wider">
                    Overview
                  </h3>
                  <div className="space-y-4 select-text pt-2 max-w-3xl">
                    {detailData.overview.split('\n\n').map((para, idx) => (
                      <p key={idx} className="font-inter text-[14px] sm:text-[15.5px] text-[#1a1a1a]/80 leading-relaxed font-light tracking-wide mb-4 last:mb-0">
                        {para.trim()}
                      </p>
                    ))}
                  </div>
                </motion.div>

                {/* Famous Quote block */}
                {detailData.famousQuote && (
                  <motion.div
                    {...itemDelay(2)}
                    className="border-l-2 border-[#1a1a1a]/30 pl-6 py-2 my-8 italic"
                  >
                    <blockquote className="font-playfair italic text-lg sm:text-xl text-[#1a1a1a]/90 leading-relaxed">
                      &quot;{detailData.famousQuote}&quot;
                    </blockquote>
                    <cite className="block text-xs uppercase tracking-widest font-bold text-[#1a1a1a]/50 mt-3 font-inter">
                      — {detailData.quoteAuthor || 'Unknown'}
                    </cite>
                  </motion.div>
                )}

                {/* Characteristics block */}
                {detailData.characteristics && detailData.characteristics.length > 0 && (
                  <motion.div
                    {...itemDelay(3)}
                    className="space-y-4"
                  >
                    <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2 uppercase tracking-wider">
                      Key Characteristics
                    </h3>
                    <div className="flex flex-wrap gap-2.5 pt-2 select-none">
                      {detailData.characteristics.map((char, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-[#FAF7F0] border border-[#1a1a1a]/10 text-xs font-medium font-inter text-[#1a1a1a] rounded-lg shadow-xs hover:border-[#1a1a1a]/25 transition-all"
                        >
                          ✦ {cleanCharacteristic(char)}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Major Authors block */}
                {detailData.majorAuthors && detailData.majorAuthors.length > 0 && (
                  <motion.div
                    {...itemDelay(4)}
                    className="space-y-4"
                  >
                    <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2 uppercase tracking-wider">
                      Major Authors
                    </h3>
                    <div className="flex flex-wrap gap-2.5 pt-2 select-none">
                      {detailData.majorAuthors.map((author, index) => (
                        <Link
                          key={index}
                          href={`/authors?name=${encodeURIComponent(author)}`}
                          className="px-4 py-2 border border-[#1a1a1a]/15 hover:border-[#1a1a1a] hover:-translate-y-0.5 rounded-lg text-xs font-medium font-inter text-[#1a1a1a] bg-[#FAF7F0] hover:bg-[#1a1a1a] hover:text-[#FAF7F0] transition-all shadow-xs hover:shadow-sm active:scale-95 flex items-center gap-1.5"
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
                    className="space-y-4"
                  >
                    <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2 uppercase tracking-wider">
                      Landmark Works
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      {detailData.landmarkWorks.map((work, index) => (
                        <div
                          key={index}
                          className="p-5 rounded-xl border border-[#1a1a1a]/10 bg-[#FAF7F0] hover:border-[#1a1a1a]/25 hover:shadow-sm transition-all duration-300 flex flex-col justify-between"
                        >
                          <div>
                            <Link
                              href={`/library?q=${encodeURIComponent(work.title)}`}
                              className="font-playfair font-bold text-[#1a1a1a]/90 hover:underline text-[15px] sm:text-[16px] leading-snug line-clamp-2 transition-colors"
                            >
                              {work.title}
                            </Link>
                            <p className="font-inter text-[12px] text-[#1a1a1a]/50 mt-1">
                              by{' '}
                              <Link
                                href={`/authors?name=${encodeURIComponent(work.author)}`}
                                className="text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:underline font-medium transition-colors"
                              >
                                {work.author}
                              </Link>
                            </p>
                          </div>
                          <span className="text-[9px] font-medium text-[#1a1a1a]/40 uppercase tracking-wider font-inter block mt-4 pt-2 border-t border-[#1a1a1a]/5">
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
                  className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4"
                >
                  {/* Left Column: Influenced By */}
                  <div className="space-y-4">
                    <h4 className="font-playfair text-base font-bold text-[#1a1a1a] uppercase tracking-wider border-b border-[#1a1a1a]/10 pb-2">
                      Influenced By
                    </h4>
                    <div className="space-y-3 pt-1 select-none">
                      {detailData.influencedBy && detailData.influencedBy.length > 0 ? (
                        detailData.influencedBy.map((mov, index) => (
                          <Link
                            key={index}
                            href={`/movements?name=${encodeURIComponent(mov)}`}
                            className="block text-[13px] text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:underline font-inter py-0.5 transition-colors font-medium"
                          >
                            &larr; {mov}
                          </Link>
                        ))
                      ) : (
                        <span className="text-xs text-[#1a1a1a]/40 italic font-inter">No direct historical precursors listed.</span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Influenced */}
                  <div className="space-y-4">
                    <h4 className="font-playfair text-base font-bold text-[#1a1a1a] uppercase tracking-wider border-b border-[#1a1a1a]/10 pb-2">
                      Influenced
                    </h4>
                    <div className="space-y-3 pt-1 select-none">
                      {detailData.influenced && detailData.influenced.length > 0 ? (
                        detailData.influenced.map((mov, index) => (
                          <Link
                            key={index}
                            href={`/movements?name=${encodeURIComponent(mov)}`}
                            className="block text-[13px] text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:underline font-inter py-0.5 transition-colors font-medium text-right"
                          >
                            {mov} &rarr;
                          </Link>
                        ))
                      ) : (
                        <span className="text-xs text-[#1a1a1a]/40 italic font-inter text-right block">No direct descendants listed.</span>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Legacy block */}
                <motion.div
                  {...itemDelay(7)}
                  className="space-y-4"
                >
                  <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2 uppercase tracking-wider">
                    Legacy
                  </h3>
                  <p className="font-inter text-[14px] sm:text-[15px] text-[#1a1a1a]/80 leading-relaxed text-justify pt-2 select-text font-light">
                    {detailData.legacy}
                  </p>
                </motion.div>

                {/* CTA Toolbar buttons */}
                <motion.div
                  {...itemDelay(8)}
                  className="flex gap-4 max-w-md mx-auto pt-6 select-none"
                >
                  <Link
                    href="/authors"
                    className="flex-1 py-3.5 border border-[#1a1a1a] rounded-xl text-xs font-bold uppercase tracking-widest font-inter text-[#1a1a1a] bg-transparent hover:bg-[#1a1a1a]/5 transition-all text-center active:scale-95 animate-none"
                  >
                    Meet the Voices &rarr;
                  </Link>
                  <Link
                    href="/library"
                    className="flex-1 py-3.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-widest rounded-xl font-inter transition-all text-center shadow-sm active:scale-95 animate-none"
                  >
                    Find Their Works &rarr;
                  </Link>
                </motion.div>
              </div>
            ) : null}
          </div>
        ) : (
          /* 2. BROWSE SCREEN */
          <div className="space-y-12 select-none">
            {/* Headline titles */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a] tracking-wide">
                Literary Movements
              </h1>
              <p className="font-playfair italic text-[#1a1a1a]/60 text-sm mt-3">
                Explore the voices, ideas, and minds that shaped literature.
              </p>
              <div className="h-[1px] w-24 bg-[#1a1a1a]/15 mx-auto mt-4" />
            </div>

            {/* Search bar segment */}
            <div className="max-w-xl mx-auto shadow-xs rounded-xl">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search literary movements, ideas, and traditions..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full px-5 py-3.5 pl-12 rounded-xl outline-none bg-white/60 border border-[#1a1a1a]/15 focus:bg-white focus:border-[#1a1a1a]/30 focus:ring-1 focus:ring-[#1a1a1a]/10 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/40 shadow-xs font-inter transition-all"
                />
                <svg
                  className="absolute left-4 top-4 w-4 h-4 text-[#1a1a1a]/35"
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
                  className="absolute right-2 top-2 px-5 py-1.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-widest rounded-lg font-inter transition-all shadow-xs active:scale-95"
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
                  className={`bg-[#FAF7F0] border border-[#1a1a1a]/10 rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all duration-300 group overflow-hidden ${getHoverShadowClass(movement.name)} hover:-translate-y-[3px]`}
                >
                  <div className="space-y-2">
                    <h3 className="font-playfair text-lg sm:text-xl font-bold text-[#1a1a1a] group-hover:underline decoration-[#1a1a1a]/30 transition-colors leading-tight">
                      {movement.name}
                    </h3>
                    
                    {/* Short literary identity sentence */}
                    <p className="font-inter text-xs text-[#1a1a1a]/60 leading-relaxed font-light italic">
                      {movement.descriptor}
                    </p>

                    <span className="text-[10px] text-[#1a1a1a]/50 uppercase tracking-wider font-medium font-inter block pt-1.5">
                      {movement.period}
                    </span>
                    
                    <p className="font-inter text-xs text-[#1a1a1a]/65 leading-relaxed pt-2 line-clamp-3">
                      {movement.description}
                    </p>
                  </div>

                  {/* Explore hint link */}
                  <div className="text-right mt-6 text-[#1a1a1a]/40 group-hover:text-[#1a1a1a] transition-colors text-[10px] uppercase font-bold tracking-widest font-inter">
                    Explore &rarr;
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function MovementsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F4E9] flex flex-col items-center justify-center relative z-50 pt-20">
          <link href={FONT_LINK} rel="stylesheet" />
          <div className="text-center space-y-6">
            <div className="relative w-16 h-16 flex items-center justify-center mx-auto">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full border border-[#1a1a1a]"
              />
              <span className="text-xs text-[#1a1a1a]/60 select-none font-serif">✦</span>
            </div>
            <div className="space-y-1 text-center animate-pulse">
              <h3 className="font-playfair text-base italic text-[#1a1a1a] font-medium">
                Consulting the literary archives...
              </h3>
              <p className="text-[9px] text-[#6b6b6b]/80 font-inter tracking-wider uppercase">
                Searching history shelves
              </p>
            </div>
          </div>
        </div>
      }
    >
      <MovementsPageContent />
    </Suspense>
  );
}
