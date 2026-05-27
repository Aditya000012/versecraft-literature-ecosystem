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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex flex-col items-center justify-center relative z-10 pt-20">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Consulting the archives...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center relative z-10 pt-20 px-4">
        <div className="glass-card border-white/5 p-8 rounded-2xl max-w-md text-center border">
          <span className="text-3xl block mb-3">🕯️</span>
          <h2 className="font-playfair text-lg text-cream font-bold mb-2">Volume Not Found</h2>
          <p className="font-inter text-xs text-cream/60 mb-6">{error}</p>
          <Link
            href="/authors"
            className="px-6 py-2.5 bg-[#c9a84c] hover:bg-[#c9a84c]/80 text-[#0a0a1a] font-bold rounded-xl text-xs font-inter transition-all"
          >
            ← Return to Hall
          </Link>
        </div>
      </div>
    );
  }

  if (author) {
    return (
      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-4xl mx-auto px-4 sm:px-6">
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
                className="text-xs text-[#c9a84c] hover:text-[#c9a84c]/85 transition-colors flex items-center gap-1 font-inter font-semibold"
              >
                ← Dashboard
              </Link>
              <span className="text-[#f5f0e8]/20">|</span>
              <Link
                href="/authors"
                className="text-xs text-[#f5f0e8]/60 hover:text-[#c9a84c] transition-colors flex items-center gap-1 font-inter font-medium"
              >
                ← All Authors
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 pt-2">
              <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#c9a84c]">
                {author.name}
              </h1>
              <span className="inline-block border border-[#c9a84c]/40 text-[#c9a84c] px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold font-inter w-max">
                {author.movement}
              </span>
            </div>

            <div className="text-xs text-[#f5f0e8]/50 font-inter font-medium uppercase tracking-widest flex flex-wrap gap-x-4 gap-y-1">
              <span>Born: {author.born}</span>
              <span className="hidden sm:inline">|</span>
              <span>Died: {author.died}</span>
              <span className="hidden sm:inline">|</span>
              <span>Nationality: {author.nationality}</span>
            </div>
          </motion.div>

          {/* Biography */}
          <motion.div variants={itemVariants} className="glass-card border-white/5 p-6 sm:p-8 rounded-2xl space-y-4">
            <h3 className="font-playfair text-xl font-bold text-[#c9a84c] border-b border-white/5 pb-2">
              Biography
            </h3>
            <p className="font-inter text-sm text-[#f5f0e8] leading-relaxed font-light whitespace-pre-line">
              {author.biography}
            </p>
          </motion.div>

          {/* Famous Quote */}
          {author.famousQuote && (
            <motion.div variants={itemVariants} className="border-l-4 border-[#c9a84c] pl-6 py-2 my-8 italic">
              <blockquote className="font-playfair text-lg text-[#f5f0e8] leading-relaxed">
                “ {author.famousQuote} ”
              </blockquote>
              <span className="block text-[#c9a84c] text-xs font-inter font-bold mt-2 uppercase tracking-widest">
                — {author.quoteSource}
              </span>
            </motion.div>
          )}

          {/* Major Works */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className="font-playfair text-xl font-bold text-[#c9a84c] border-b border-white/5 pb-2">
              Major Works
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {author.majorWorks.map((work) => (
                <button
                  key={work}
                  onClick={() => router.push(`/library?q=${encodeURIComponent(work)}`)}
                  className="px-3.5 py-2 bg-[#c9a84c]/5 hover:bg-[#c9a84c]/10 border border-[#c9a84c]/30 hover:border-[#c9a84c] rounded-xl text-xs font-semibold text-[#c9a84c] font-inter transition-all flex items-center gap-1.5"
                >
                  📖 {work}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Influences & Influenced side-by-side columns */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Influences By */}
            <div className="glass-card border-white/5 p-6 rounded-xl border">
              <h4 className="font-playfair text-base font-bold text-[#c9a84c] mb-3 uppercase tracking-wider">
                Influenced By
              </h4>
              <ul className="space-y-2">
                {author.influences.map((inf) => (
                  <li key={inf}>
                    <Link
                      href={`/authors?name=${encodeURIComponent(inf)}`}
                      className="text-xs text-[#f5f0e8] hover:text-[#c9a84c] transition-colors font-inter underline underline-offset-4"
                    >
                      ✦ {inf}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Influenced */}
            <div className="glass-card border-white/5 p-6 rounded-xl border">
              <h4 className="font-playfair text-base font-bold text-[#c9a84c] mb-3 uppercase tracking-wider">
                Influenced
              </h4>
              <ul className="space-y-2">
                {author.influenced.map((infd) => (
                  <li key={infd}>
                    <Link
                      href={`/authors?name=${encodeURIComponent(infd)}`}
                      className="text-xs text-[#f5f0e8] hover:text-[#c9a84c] transition-colors font-inter underline underline-offset-4"
                    >
                      ✦ {infd}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Legacy */}
          <motion.div variants={itemVariants} className="glass-card border-white/5 p-6 sm:p-8 rounded-2xl space-y-4">
            <h3 className="font-playfair text-xl font-bold text-[#c9a84c] border-b border-white/5 pb-2">
              Legacy
            </h3>
            <p className="font-inter text-sm text-[#f5f0e8] leading-relaxed font-light">
              {author.legacy}
            </p>
          </motion.div>

          {/* Bottom Action buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/5">
            <button
              onClick={() => router.push(`/chat/simple?book=${encodeURIComponent(author.name)}&author=${encodeURIComponent(author.name)}`)}
              className="flex-1 py-3.5 bg-[#c9a84c] hover:bg-[#c9a84c]/95 rounded-xl text-center text-xs font-bold uppercase tracking-wider font-inter text-[#0a0a1a] transition-all shadow-lg shadow-[#c9a84c]/10"
            >
              💬 Discuss this Author
            </button>
            <button
              onClick={() => router.push(`/library?q=${encodeURIComponent(author.name)}`)}
              className="flex-1 py-3.5 bg-transparent hover:bg-[#c9a84c]/10 border border-[#c9a84c] rounded-xl text-center text-xs font-bold uppercase tracking-wider font-inter text-[#c9a84c] transition-all"
            >
              📚 Find their Books
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Curated list view (when no name param exists)
  return (
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Dashboard Back Link */}
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="text-xs text-[#c9a84c] hover:text-[#c9a84c]/85 transition-colors flex items-center gap-1 font-inter font-medium"
        >
          ← Dashboard
        </Link>
      </div>
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#c9a84c] mb-2 tracking-wide">
          The Author&apos;s Hall
        </h1>
        <p className="font-inter text-xs text-[#f5f0e8]/40 uppercase tracking-widest font-semibold">
          Explore the minds that shaped literature
        </p>
      </div>

      {/* Centered Search Bar */}
      <form onSubmit={handleSearchSubmit} className="w-full max-w-lg mx-auto relative mb-16">
        <input
          type="text"
          placeholder="Search an author..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full px-5 py-3.5 pl-12 rounded-xl outline-none glass-input text-sm text-[#f5f0e8] shadow-inner font-inter"
        />
        <button
          type="submit"
          className="absolute left-4 top-4 text-[#f5f0e8]/40 hover:text-[#c9a84c] transition-colors"
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
            className="glass-card border-white/5 hover:border-[#c9a84c]/30 p-6 rounded-2xl border shadow-xl flex flex-col justify-between cursor-pointer min-h-[140px] group transition-all duration-300"
          >
            <div>
              <h3 className="font-playfair text-lg font-bold text-[#f5f0e8] group-hover:text-[#c9a84c] transition-colors leading-tight mb-2">
                {item.name}
              </h3>
            </div>
            <div className="border-t border-white/5 pt-3 mt-4">
              <span className="text-[10px] text-[#c9a84c]/80 font-bold uppercase tracking-wider font-inter">
                {item.movement}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default function AuthorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F4E9] flex flex-col items-center justify-center relative z-10 pt-20">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Opening the archives...</span>
        </div>
      </div>
    }>
      <AuthorsPageContent />
    </Suspense>
  );
}
