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
  { name: 'Fyodor Dostoevsky', movement: 'Existentialism & Russian Realism' },
  { name: 'Leo Tolstoy', movement: 'Realism & Moral Philosophy' },
  { name: 'Virginia Woolf', movement: 'Modernism & Stream of Consciousness' },
  { name: 'Franz Kafka', movement: 'Modernism & Surrealist Existentialism' },
  { name: 'Gabriel García Márquez', movement: 'Magical Realism' },
  { name: 'Oscar Wilde', movement: 'Aestheticism & Decadence' },
  { name: 'Emily Brontë', movement: 'Victorian Gothic Romanticism' },
  { name: 'Edgar Allan Poe', movement: 'Dark Romanticism & Gothic Fiction' },
  { name: 'Rumi', movement: 'Sufi Mysticism & Lyrical Poetry' },
  { name: 'Rabindranath Tagore', movement: 'Bengali Renaissance & Modernism' },
  { name: 'James Joyce', movement: 'Modernism & Stream of Consciousness' },
  { name: 'Sylvia Plath', movement: 'Confessional Poetry & Modernism' },
];

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
            className="space-y-10"
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
              
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 pt-2">
                <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a]">
                  {author.name}
                </h1>
                <span className="inline-block border border-[#1a1a1a]/20 text-[#1a1a1a]/70 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold font-inter w-max">
                  {author.movement}
                </span>
              </div>

              <div className="text-xs text-[#1a1a1a]/50 font-inter font-medium uppercase tracking-widest flex flex-wrap gap-x-4 gap-y-1">
                <span>Born: {author.born}</span>
                <span className="hidden sm:inline text-[#1a1a1a]/15">|</span>
                <span>Died: {author.died}</span>
                <span className="hidden sm:inline text-[#1a1a1a]/15">|</span>
                <span>Nationality: {author.nationality}</span>
              </div>
            </motion.div>

            {/* Biography */}
            <motion.div variants={itemVariants} className="bg-[#FAF7F0] border border-[#1a1a1a]/10 p-6 sm:p-8 rounded-2xl space-y-4 shadow-sm">
              <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2">
                Biography
              </h3>
              <p className="font-inter text-sm text-[#1a1a1a]/85 leading-relaxed font-light whitespace-pre-line">
                {author.biography}
              </p>
            </motion.div>

            {/* Famous Quote */}
            {author.famousQuote && (
              <motion.div variants={itemVariants} className="border-l-4 border-[#1a1a1a]/40 pl-6 py-2 my-8 italic">
                <blockquote className="font-playfair text-lg text-[#1a1a1a]/90 leading-relaxed">
                  “ {author.famousQuote} ”
                </blockquote>
                <span className="block text-[#1a1a1a]/70 text-xs font-inter font-bold mt-2 uppercase tracking-widest">
                  — {author.quoteSource}
                </span>
              </motion.div>
            )}

            {/* Major Works */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2">
                Major Works
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                {author.majorWorks.map((work) => (
                  <button
                    key={work}
                    onClick={() => router.push(`/library?q=${encodeURIComponent(work)}`)}
                    className="px-3.5 py-2 bg-[#FAF7F0] hover:bg-[#1a1a1a] hover:text-[#FAF7F0] border border-[#1a1a1a]/15 hover:border-[#1a1a1a] rounded-xl text-xs font-semibold text-[#1a1a1a] font-inter transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                  >
                    📖 {work}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Influences & Influenced side-by-side columns */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Influences By */}
              <div className="bg-[#FAF7F0] border border-[#1a1a1a]/10 p-6 rounded-xl shadow-xs">
                <h4 className="font-playfair text-base font-bold text-[#1a1a1a] mb-3 uppercase tracking-wider">
                  Influenced By
                </h4>
                <ul className="space-y-2">
                  {author.influences.map((inf) => (
                    <li key={inf}>
                      <Link
                        href={`/authors?name=${encodeURIComponent(inf)}`}
                        className="text-xs text-[#1a1a1a]/80 hover:text-[#1a1a1a] transition-colors font-inter underline underline-offset-4 decoration-[#1a1a1a]/20"
                      >
                        ✦ {inf}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Influenced */}
              <div className="bg-[#FAF7F0] border border-[#1a1a1a]/10 p-6 rounded-xl shadow-xs">
                <h4 className="font-playfair text-base font-bold text-[#1a1a1a] mb-3 uppercase tracking-wider">
                  Influenced
                </h4>
                <ul className="space-y-2">
                  {author.influenced.map((infd) => (
                    <li key={infd}>
                      <Link
                        href={`/authors?name=${encodeURIComponent(infd)}`}
                        className="text-xs text-[#1a1a1a]/80 hover:text-[#1a1a1a] transition-colors font-inter underline underline-offset-4 decoration-[#1a1a1a]/20"
                      >
                        ✦ {infd}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Legacy */}
            <motion.div variants={itemVariants} className="bg-[#FAF7F0] border border-[#1a1a1a]/10 p-6 sm:p-8 rounded-2xl space-y-4 shadow-sm">
              <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2">
                Legacy
              </h3>
              <p className="font-inter text-sm text-[#1a1a1a]/85 leading-relaxed font-light">
                {author.legacy}
              </p>
            </motion.div>

            {/* Bottom Action buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-[#1a1a1a]/10">
              <button
                onClick={() => router.push(`/chat/simple?book=${encodeURIComponent(author.name)}&author=${encodeURIComponent(author.name)}`)}
                className="flex-1 py-3.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] rounded-xl text-center text-xs font-bold uppercase tracking-wider font-inter text-white transition-all shadow-sm active:scale-95"
              >
                💬 Discuss this Author
              </button>
              <button
                onClick={() => router.push(`/library?q=${encodeURIComponent(author.name)}`)}
                className="flex-1 py-3.5 bg-transparent hover:bg-[#1a1a1a]/5 border border-[#1a1a1a] rounded-xl text-center text-xs font-bold uppercase tracking-wider font-inter text-[#1a1a1a] transition-all active:scale-95"
              >
                📚 Find their Books
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
            Explore the minds that shaped literature
          </p>
          <div className="h-[1px] w-24 bg-[#1a1a1a]/15 mx-auto mt-4" />
        </div>

        {/* Centered Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-lg mx-auto relative mb-16 shadow-xs rounded-xl">
          <input
            type="text"
            placeholder="Search an author..."
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
              whileHover={{ scale: 1.03, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/authors?name=${encodeURIComponent(item.name)}`)}
              className="bg-[#FAF7F0] border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/30 p-6 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer min-h-[140px] group transition-all duration-300"
            >
              <div>
                <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] group-hover:text-[#1a1a1a]/70 transition-colors leading-tight mb-2">
                  {item.name}
                </h3>
              </div>
              <div className="border-t border-[#1a1a1a]/10 pt-3 mt-4">
                <span className="text-[10px] text-[#1a1a1a]/60 font-bold uppercase tracking-wider font-inter">
                  {item.movement}
                </span>
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
