'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';

interface AuthorData {
  name: string;
  born: string;
  died: string;
  nationality: string;
  movement: string;
  biography: string;
  majorWorks: string[];
  influences: string[];
  influenced: string[];
  famousQuote: string;
  quoteSource: string;
  legacy: string;
}

const curatedAuthors = [
  { 
    name: 'Fyodor Dostoevsky', 
    movement: 'Existentialism & Russian Realism',
    descriptor: 'Explorer of guilt, suffering, morality, and redemption.',
    movements: ['Existentialism', 'Russian Realism']
  },
  { 
    name: 'Leo Tolstoy', 
    movement: 'Realism & Moral Philosophy',
    descriptor: 'Searcher of truth, moral struggle, history, and the human soul.',
    movements: ['Realism', 'Moral Philosophy']
  },
  { 
    name: 'Virginia Woolf', 
    movement: 'Modernism & Stream of Consciousness',
    descriptor: 'Chronicler of memory, silence, and inner consciousness.',
    movements: ['Modernism', 'Stream of Consciousness']
  },
  { 
    name: 'Franz Kafka', 
    movement: 'Modernism & Surrealist Existentialism',
    descriptor: 'Architect of absurdity, anxiety, bureaucracy, and alienation.',
    movements: ['Modernism', 'Surrealist Existentialism']
  },
  { 
    name: 'Gabriel García Márquez', 
    movement: 'Magical Realism',
    descriptor: 'Weaver of myth, longing, memory, and magical realism.',
    movements: ['Magical Realism']
  },
  { 
    name: 'Oscar Wilde', 
    movement: 'Aestheticism & Decadence',
    descriptor: 'Master of wit, beauty, decadence, and irony.',
    movements: ['Aestheticism', 'Decadence']
  },
  { 
    name: 'Emily Brontë', 
    movement: 'Victorian Gothic Romanticism',
    descriptor: 'Voice of longing, wilderness, passion, and melancholy.',
    movements: ['Victorian Gothic', 'Romanticism']
  },
  { 
    name: 'Edgar Allan Poe', 
    movement: 'Dark Romanticism & Gothic Fiction',
    descriptor: 'Poet of dread, obsession, darkness, and melancholy.',
    movements: ['Dark Romanticism', 'Gothic Fiction']
  },
  { 
    name: 'Rumi', 
    movement: 'Sufi Mysticism & Lyrical Poetry',
    descriptor: 'Mystic of love, longing, devotion, and transcendence.',
    movements: ['Sufi Mysticism', 'Lyrical Poetry']
  },
  { 
    name: 'Rabindranath Tagore', 
    movement: 'Bengali Renaissance & Modernism',
    descriptor: 'Poet of humanity, spirit, beauty, and freedom.',
    movements: ['Bengali Renaissance', 'Modernism']
  },
  { 
    name: 'James Joyce', 
    movement: 'Modernism & Stream of Consciousness',
    descriptor: 'Explorer of language, consciousness, memory, and identity.',
    movements: ['Modernism', 'Stream of Consciousness']
  },
  { 
    name: 'Sylvia Plath', 
    movement: 'Confessional Poetry & Modernism',
    descriptor: 'Voice of vulnerability, grief, intensity, and interior struggle.',
    movements: ['Confessional Poetry', 'Modernism']
  },
];

const detailIdentitySentences: Record<string, string> = {
  'Fyodor Dostoevsky': 'Chronicler of guilt, morality, suffering, redemption, and the fractured human soul.',
  'Leo Tolstoy': 'Chronicler of truth, history, moral struggle, and the human soul.',
  'Virginia Woolf': 'Explorer of memory, silence, interiority, and emotional consciousness.',
  'Franz Kafka': 'Cartographer of anxiety, absurdity, bureaucracy, and alienation.',
  'Gabriel García Márquez': 'Weaver of memory, longing, myth, and magical realism.',
  'Oscar Wilde': 'Master of wit, decadence, beauty, irony, and performance.',
  'Emily Brontë': 'Voice of longing, wilderness, emotional intensity, and melancholy.',
  'Edgar Allan Poe': 'Architect of dread, obsession, darkness, and poetic sorrow.',
  'Rumi': 'Mystic of devotion, transcendence, longing, and divine love.',
  'Rabindranath Tagore': 'Poet of beauty, humanity, spirit, and quiet revolution.',
  'James Joyce': 'Explorer of language, consciousness, memory, and identity.',
  'Sylvia Plath': 'Voice of grief, vulnerability, intensity, and emotional truth.'
};

const getDetailIdentity = (name: string, movement: string) => {
  const match = Object.keys(detailIdentitySentences).find(
    k => k.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(k.toLowerCase())
  );
  if (match) {
    return detailIdentitySentences[match];
  }
  return `A prominent voice of ${movement}, exploring the enduring questions of humanity and the creative spirit.`;
};

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';

function AuthorsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const authorName = searchParams.get('name') || '';

  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState<AuthorData | null>(null);

  useEffect(() => {
    if (!authorName) {
      setAuthor(null);
      setError(null);
      return;
    }

    const fetchAuthorInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/authors?name=${encodeURIComponent(authorName)}`);
        if (!res.ok) {
          throw new Error('Failed to fetch author metadata');
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setAuthor(data);
      } catch (err: unknown) {
        console.error('Error fetching author info:', err);
        setError(err instanceof Error ? err.message : 'Consulting the archives failed.');
        setAuthor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorInfo();
  }, [authorName]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/authors?name=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  // Stagger animation container
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

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

  if (loading) {
    return (
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
              Consulting the archives...
            </h3>
            <p className="text-[9px] text-[#6b6b6b]/80 font-inter tracking-wider uppercase">
              Searching history shelves
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex flex-col items-center justify-center relative z-10 pt-20 px-4">
        {renderSanctuaryBackground()}
        <div className="bg-[#FAF7F0] border border-[#1a1a1a]/15 p-8 rounded-2xl max-w-md text-center shadow-md select-none">
          <span className="text-3xl block mb-3">🕯️</span>
          <h2 className="font-playfair text-lg text-[#1a1a1a] font-bold mb-2">Volume Not Found</h2>
          <p className="font-inter text-xs text-[#1a1a1a]/60 mb-6">{error}</p>
          <Link
            href="/authors"
            className="inline-block px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white font-bold rounded-xl text-xs font-inter transition-all active:scale-95 shadow-sm"
          >
            ← Return to Hall
          </Link>
        </div>
      </div>
    );
  }

  if (author) {
    return (
      <>
        {renderSanctuaryBackground()}
        <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-4xl mx-auto px-4 sm:px-6 selection:bg-[#1a1a1a] selection:text-[#F8F4E9]">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-12"
          >
            {/* Top Section */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="text-xs text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors flex items-center gap-1 font-inter font-semibold"
                >
                  ← Dashboard
                </Link>
                <span className="text-[#1a1a1a]/15">|</span>
                <Link
                  href="/authors"
                  className="text-xs text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors flex items-center gap-1 font-inter font-medium"
                >
                  ← All Authors
                </Link>
              </div>
              
              <div className="space-y-4 pt-2">
                <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a] leading-tight">
                  {author.name}
                </h1>

                {/* Literary Identity Sentence */}
                <p className="font-playfair text-lg sm:text-xl italic text-[#1a1a1a]/85 leading-relaxed font-medium max-w-2xl">
                  {getDetailIdentity(author.name, author.movement)}
                </p>

                {/* Refined Metadata Hierarchy */}
                <div className="font-inter text-xs text-[#1a1a1a]/55 space-y-1 pt-3 border-t border-[#1a1a1a]/10 max-w-xs">
                  <div className="font-semibold text-[#1a1a1a] text-sm flex items-center gap-1.5">
                    <span>{author.born.match(/\b\d{4}\b/)?.[0] || 'Born'}</span>
                    <span>&mdash;</span>
                    <span>{author.died.match(/\b\d{4}\b/)?.[0] || author.died}</span>
                  </div>
                  <div>
                    {author.born.replace(/\b\d{4}\b/, '').replace(/^\s*,\s*|,\s*$/, '').trim().replace(/^,\s*/, '') || author.nationality}
                  </div>
                  <div className="italic text-[#1a1a1a]/70 font-medium">
                    {author.movement}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Biography */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2 uppercase tracking-wider">
                Biography
              </h3>
              <div className="space-y-4 select-text pt-2">
                {author.biography.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="font-inter text-[14px] sm:text-[15px] text-[#1a1a1a]/85 leading-relaxed font-light tracking-wide">
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </motion.div>

            {/* Famous Quote */}
            {author.famousQuote && (
              <motion.div variants={itemVariants} className="border-l-2 border-[#1a1a1a]/30 pl-6 py-2 my-8 italic">
                <blockquote className="font-playfair text-lg sm:text-xl text-[#1a1a1a]/90 leading-relaxed tracking-wide">
                  “{author.famousQuote}”
                </blockquote>
                <span className="block text-[10px] text-[#1a1a1a]/50 tracking-widest uppercase font-inter font-bold mt-3">
                  — {author.quoteSource}
                </span>
              </motion.div>
            )}

            {/* Major Works */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2 uppercase tracking-wider">
                Major Works
              </h3>
              <div className="flex flex-wrap gap-2.5 pt-2 select-none">
                {author.majorWorks.map((work) => (
                  <button
                    key={work}
                    onClick={() => router.push(`/library?q=${encodeURIComponent(work)}`)}
                    className="px-4 py-2 bg-[#FAF7F0] hover:bg-[#FAF7F0] border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/25 hover:-translate-y-0.5 rounded-lg text-xs font-medium text-[#1a1a1a] font-inter transition-all flex items-center gap-1.5 shadow-xs hover:shadow-sm active:scale-98"
                  >
                    📖 {work}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Influences & Influenced side-by-side columns */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Influences By */}
              <div className="space-y-4">
                <h4 className="font-playfair text-base font-bold text-[#1a1a1a] uppercase tracking-wider border-b border-[#1a1a1a]/10 pb-2">
                  Influenced By
                </h4>
                <ul className="space-y-3 pt-1">
                  {author.influences.map((inf) => (
                    <li key={inf}>
                      <Link
                        href={`/authors?name=${encodeURIComponent(inf)}`}
                        className="text-[13px] text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:underline transition-colors font-inter flex items-center gap-2"
                      >
                        ✦ {inf}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Influenced */}
              <div className="space-y-4">
                <h4 className="font-playfair text-base font-bold text-[#1a1a1a] uppercase tracking-wider border-b border-[#1a1a1a]/10 pb-2">
                  Influenced
                </h4>
                <ul className="space-y-3 pt-1">
                  {author.influenced.map((infd) => (
                    <li key={infd}>
                      <Link
                        href={`/authors?name=${encodeURIComponent(infd)}`}
                        className="text-[13px] text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:underline transition-colors font-inter flex items-center gap-2"
                      >
                        ✦ {infd}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Legacy */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2 uppercase tracking-wider">
                Legacy
              </h3>
              <p className="font-inter text-[14px] sm:text-[15px] text-[#1a1a1a]/80 leading-relaxed font-light select-text pt-2">
                {author.legacy}
              </p>
            </motion.div>

            {/* Bottom Action buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-[#1a1a1a]/10">
              <button
                onClick={() => router.push(`/chat/simple?book=${encodeURIComponent(author.name)}&author=${encodeURIComponent(author.name)}`)}
                className="flex-grow py-3.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] rounded-xl text-center text-xs font-bold uppercase tracking-widest font-inter text-white transition-all shadow-sm active:scale-95"
              >
                Discuss Their Ideas &rarr;
              </button>
              <button
                onClick={() => router.push(`/library?q=${encodeURIComponent(author.name)}`)}
                className="flex-grow py-3.5 bg-transparent hover:bg-[#1a1a1a]/5 border border-[#1a1a1a] rounded-xl text-center text-xs font-bold uppercase tracking-widest font-inter text-[#1a1a1a] transition-all active:scale-95"
              >
                Find Their Books &rarr;
              </button>
            </motion.div>
          </motion.div>
        </div>
      </>
    );
  }

  // Curated list view (when no name param exists)
  return (
    <>
      {renderSanctuaryBackground()}
      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 selection:bg-[#1a1a1a] selection:text-[#F8F4E9]">
        {/* Dashboard Back Link */}
        <div className="mb-4 select-none">
          <Link
            href="/dashboard"
            className="text-xs text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors flex items-center gap-1 font-inter font-medium"
          >
            ← Dashboard
          </Link>
        </div>
        {/* Title */}
        <div className="text-center mb-12 select-none space-y-4 max-w-2xl mx-auto">
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a] tracking-wide">
            The Author&apos;s Hall
          </h1>
          <p className="font-inter text-xs text-[#1a1a1a]/50 uppercase tracking-widest font-semibold">
            Explore the voices, ideas, and minds that shaped literature.
          </p>
          <div className="h-[1px] w-24 bg-[#1a1a1a]/15 mx-auto mt-4" />
        </div>

        {/* Centered Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-lg mx-auto relative mb-16 shadow-xs rounded-xl">
          <input
            type="text"
            placeholder="Search literary minds, voices, and movements..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-5 py-3.5 pl-12 rounded-xl outline-none bg-white/60 border border-[#1a1a1a]/15 focus:bg-white focus:border-[#1a1a1a]/30 focus:ring-1 focus:ring-[#1a1a1a]/10 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/40 shadow-xs font-inter transition-all"
          />
          <button
            type="submit"
            className="absolute left-4 top-4 text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>

        {/* Curated Grid of 12 click cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {curatedAuthors.map((item) => (
            <motion.div
              key={item.name}
              variants={itemVariants}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/authors?name=${encodeURIComponent(item.name)}`)}
              className="bg-[#FAF7F0] border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/25 p-6 rounded-2xl shadow-sm hover:shadow-md flex flex-col justify-between cursor-pointer min-h-[175px] group transition-all duration-300"
            >
              <div className="space-y-2">
                <h3 className="font-playfair text-lg sm:text-xl font-bold text-[#1a1a1a] group-hover:underline decoration-[#1a1a1a]/30 transition-all leading-tight">
                  {item.name}
                </h3>
                {/* One-line literary identity sentence */}
                <p className="font-inter text-xs text-[#1a1a1a]/60 leading-relaxed font-light italic">
                  {item.descriptor}
                </p>
              </div>
              
              {/* Movements Chips */}
              <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-[#1a1a1a]/5">
                {item.movements.map((mov) => (
                  <span 
                    key={mov} 
                    className="text-[9px] font-bold uppercase tracking-wider text-[#1a1a1a]/60 border border-[#1a1a1a]/10 bg-[#FAF7F0] px-2 py-0.5 rounded font-inter"
                  >
                    {mov}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </>
  );
}

export default function AuthorsPage() {
  return (
    <Suspense fallback={
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
              Opening the archives...
            </h3>
            <p className="text-[9px] text-[#6b6b6b]/80 font-inter tracking-wider uppercase">
              Searching history shelves
            </p>
          </div>
        </div>
      </div>
    }>
      <AuthorsPageContent />
    </Suspense>
  );
}
