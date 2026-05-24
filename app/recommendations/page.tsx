'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

interface Recommendation {
  id: string;
  title: string;
  authors?: string[];
  author?: string;
  thumbnail: string;
  description: string;
  infoLink: string;
  poeticReason: string;
}

interface WishlistItem {
  bookId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  infoLink?: string;
  addedAt: Date | string | { seconds: number; nanoseconds: number } | null;
}

const genres = [
  { id: '', name: 'Any Genre' },
  { id: 'gothic', name: 'Gothic' },
  { id: 'sufi', name: 'Sufi' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'romance', name: 'Romance' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'classics', name: 'Classics' },
];

const eras = [
  { id: '', name: 'Any Era' },
  { id: 'victorian', name: 'Victorian' },
  { id: 'ancient', name: 'Ancient' },
  { id: 'renaissance', name: 'Renaissance' },
  { id: 'modernist', name: 'Modernist' },
  { id: 'romantic', name: 'Romantic' },
];

const languages = [
  { id: 'english', name: 'English' },
  { id: 'urdu', name: 'Urdu' },
  { id: 'hindi', name: 'Hindi' },
  { id: 'french', name: 'French' },
  { id: 'spanish', name: 'Spanish' },
];

export default function RecommendationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Filters state
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedEra, setSelectedEra] = useState('');
  const [authorVibe, setAuthorVibe] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('english');

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [curating, setCurating] = useState(false);

  // Load wishlist from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchWishlist = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setWishlist(docSnap.data().wishlist || []);
        }
      } catch (err) {
        console.error('Error fetching wishlist:', err);
      }
    };

    fetchWishlist();
  }, [user]);

  // Load recommendation cards using user's Firestore preferences on mount
  useEffect(() => {
    if (!user) return;

    const fetchRecommendationsFromPrefs = async () => {
      console.log('[Recommendations Page] Mounting. Fetching recommendations based on Firestore user preferences...');
      setCurating(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        let genre = '';
        let era = '';

        if (docSnap.exists()) {
          const data = docSnap.data();
          genre = data.interestedGenres?.[0] || data.preferences?.favoriteGenre || '';
          era = data.interestedEras?.[0] || data.preferences?.favoriteEra || '';

          console.log('[Recommendations Page] Loaded user preference filters from Firestore:', { genre, era });
          // Set filter panel values
          setSelectedGenre(genre);
          setSelectedEra(era);
        } else {
          console.log('[Recommendations Page] No user preferences document found in Firestore. Querying empty filters.');
        }

        console.log('[Recommendations Page] Sending initial POST request to /api/recommendations...');
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genre,
            era,
            author: '',
            language: 'english',
          }),
        });

        console.log('[Recommendations Page] Initial response status code:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('[Recommendations Page] Parsed initial recommendations array length:', data.recommendations?.length ?? 0);
          setRecommendations(data.recommendations || []);
        } else {
          console.error('[Recommendations Page] Initial recommendations fetch failed with status:', res.status);
        }
      } catch (err) {
        console.error('[Recommendations Page] Failed initial curation error:', err);
      } finally {
        setCurating(false);
      }
    };

    fetchRecommendationsFromPrefs();
  }, [user]);

  const handleCuration = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Recommendations Page] "Invoke the Curator" clicked. Selected parameters:', {
      genre: selectedGenre,
      era: selectedEra,
      author: authorVibe.trim(),
      language: selectedLanguage
    });
    setCurating(true);

    try {
      console.log('[Recommendations Page] Sending POST request to /api/recommendations...');
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: selectedGenre,
          era: selectedEra,
          author: authorVibe.trim(),
          language: selectedLanguage,
        }),
      });

      console.log('[Recommendations Page] Received response status code:', res.status);
      if (!res.ok) throw new Error(`Curation server returned status code ${res.status}`);

      const data = await res.json();
      console.log('[Recommendations Page] Parsed response JSON. Recommendations array size:', data.recommendations?.length ?? 0);
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('[Recommendations Page] Curation request failed with error:', err);
    } finally {
      setCurating(false);
    }
  };

  const isBookInWishlist = (bookId: string) => {
    return wishlist.some((item) => item.bookId === bookId);
  };

  const toggleWishlist = async (rec: Recommendation) => {
    if (!user) {
      router.push('/auth?mode=login');
      return;
    }

    const inWishlist = isBookInWishlist(rec.id);
    const userRef = doc(db, 'users', user.uid);

    const item: WishlistItem = {
      bookId: rec.id,
      title: rec.title,
      authors: Array.isArray(rec.authors) ? rec.authors : (rec.author ? [rec.author] : ['Unknown Author']),
      thumbnail: rec.thumbnail,
      infoLink: rec.infoLink,
      addedAt: new Date(),
    };

    try {
      if (inWishlist) {
        const updatedList = wishlist.filter((w) => w.bookId !== rec.id);
        await updateDoc(userRef, {
          wishlist: updatedList,
        });
        setWishlist(updatedList);
      } else {
        await updateDoc(userRef, {
          wishlist: arrayUnion(item),
        });
        setWishlist((prev) => [...prev, item]);
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Attuning recommended coordinates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Dashboard Back Link */}
      <div className="mb-4 text-left">
        <Link
          href="/dashboard"
          className="text-xs text-gold hover:text-gold-light transition-colors inline-flex items-center gap-1 font-inter font-medium"
        >
          ← Dashboard
        </Link>
      </div>
      {/* Title */}
      <div className="text-center mb-10">
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-gold/80 block mb-2 font-inter">THE ORACLE&apos;S CHOICE</span>
        <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-cream">The Curated Alcove</h1>
        <p className="font-inter text-xs text-cream/40 mt-3 max-w-xl mx-auto font-light leading-relaxed uppercase tracking-wider">
          AI curates the books. Gemini writes the poetic reason. All book details come direct from the library catalogs.
        </p>
      </div>

      {/* Filter panel Form */}
      <form onSubmit={handleCuration} className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl mb-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Genre selection */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gold font-bold mb-2 font-inter">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full px-3 py-2 rounded-xl outline-none glass-input text-xs font-semibold text-cream cursor-pointer"
            >
              {genres.map((g) => (
                <option key={g.id} value={g.id} className="bg-navy text-cream">
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Era selection */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gold font-bold mb-2 font-inter">Era</label>
            <select
              value={selectedEra}
              onChange={(e) => setSelectedEra(e.target.value)}
              className="w-full px-3 py-2 rounded-xl outline-none glass-input text-xs font-semibold text-cream cursor-pointer"
            >
              {eras.map((era) => (
                <option key={era.id} value={era.id} className="bg-navy text-cream">
                  {era.name}
                </option>
              ))}
            </select>
          </div>

          {/* Author Vibe */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gold font-bold mb-2 font-inter">Author Vibe</label>
            <input
              type="text"
              placeholder="e.g. Orwell, Keats..."
              value={authorVibe}
              onChange={(e) => setAuthorVibe(e.target.value)}
              className="w-full px-3 py-2 rounded-xl outline-none glass-input text-xs text-cream placeholder-cream/25"
            />
          </div>

          {/* Language choice */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gold font-bold mb-2 font-inter">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl outline-none glass-input text-xs font-semibold text-cream cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.id} value={l.id} className="bg-navy text-cream">
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6 border-t border-white/5 pt-5 text-center">
          <button
            type="submit"
            disabled={curating}
            className="px-8 py-3 bg-gold hover:bg-gold-light disabled:bg-gray-800 disabled:text-cream/30 text-navy font-bold uppercase tracking-wider rounded-xl text-xs font-inter transition-all shadow-md shadow-gold/15"
          >
            Invoke the Curator
          </button>
        </div>
      </form>

      {/* Recommendations grid stream */}
      <AnimatePresence mode="wait">
        {curating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-28 gap-4"
          >
            <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
            <div className="text-center">
              <span className="font-playfair text-gold italic text-base block animate-pulse">Scribing poetic alignments...</span>
              <span className="text-[10px] text-cream/40 font-inter uppercase tracking-widest mt-1 block">Consulting central literary indexes</span>
            </div>
          </motion.div>
        ) : recommendations.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card border-white/5 rounded-xl p-12 text-center max-w-lg mx-auto"
          >
            <span className="text-3xl block mb-3">🕯️</span>
            <p className="font-playfair text-lg text-cream italic">The Oracle is silent.</p>
            <p className="text-xs text-cream/40 mt-1 font-inter">Modify your parameters and request a new alignment.</p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {recommendations.map((rec) => {
              const inWishlist = isBookInWishlist(rec.id);
              return (
                <div
                  key={rec.id}
                  className="glass-card border-white/5 hover:border-gold/25 rounded-2xl p-6 shadow-2xl transition-all duration-300 flex flex-col md:flex-row gap-6 relative overflow-hidden group"
                >
                  {/* Book cover left */}
                  <div className="w-full md:w-1/3 aspect-[3/4] bg-black/40 rounded-xl overflow-hidden shadow flex-shrink-0 relative">
                    <img
                      src={rec.thumbnail}
                      alt={rec.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details and Poetic Reason right */}
                  <div className="flex-grow flex flex-col justify-between">
                    <div>
                      {/* Meta header */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-[9px] uppercase tracking-widest text-gold font-bold font-inter">
                          Oracle Selection
                        </span>
                        {/* Wishlist button */}
                        <button
                          onClick={() => toggleWishlist(rec)}
                          className={`p-1.5 rounded-full border transition-colors ${
                            inWishlist
                              ? 'bg-red-500/20 border-red-500 text-red-400'
                              : 'bg-white/5 border-white/10 text-cream/40 hover:text-gold hover:border-gold'
                          }`}
                          title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>
                      </div>

                      <h3 className="font-playfair text-xl font-bold text-cream group-hover:text-gold transition-colors line-clamp-2">
                        {rec.title}
                      </h3>
                      <p className="font-inter text-xs text-cream/50 mt-0.5 mb-4">
                        by{' '}
                        {rec.author ? (
                          <span
                            onClick={() => router.push(`/authors?name=${encodeURIComponent(rec.author!)}`)}
                            className="cursor-pointer hover:text-[#c9a84c] transition-colors duration-200 underline underline-offset-2"
                          >
                            {rec.author}
                          </span>
                        ) : rec.authors && rec.authors.length > 0 ? (
                          rec.authors.map((authorName, index) => (
                            <React.Fragment key={authorName}>
                              {index > 0 && ', '}
                              <span
                                onClick={() => router.push(`/authors?name=${encodeURIComponent(authorName)}`)}
                                className="cursor-pointer hover:text-[#c9a84c] transition-colors duration-200 underline underline-offset-2"
                              >
                                {authorName}
                              </span>
                            </React.Fragment>
                          ))
                        ) : (
                          'Unknown Author'
                        )}
                      </p>

                      {/* POETIC MATCH CARD BLOCK */}
                      <div className="p-4 bg-purple-dark/20 border border-gold/15 rounded-xl mb-4 shadow-[0_0_12px_rgba(201,168,76,0.03)]">
                        <span className="text-[9px] uppercase tracking-wider text-gold font-bold font-inter block mb-1">
                          Why this fits your vibe:
                        </span>
                        <p className="font-playfair italic text-xs text-gold leading-relaxed font-light">
                          “ {rec.poeticReason} ”
                        </p>
                      </div>

                      <p className="font-inter text-[11px] text-cream/60 leading-relaxed font-light line-clamp-2">
                        {rec.description}
                      </p>
                    </div>

                    {/* Acquisition links block */}
                    <div className="mt-6 pt-3 border-t border-white/5">
                      <a
                        href={rec.infoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 bg-white/5 border border-white/10 hover:border-gold/50 hover:bg-gold/10 rounded-xl text-center text-xs font-bold uppercase tracking-wider font-inter text-cream hover:text-gold transition-all flex items-center justify-center gap-1.5 w-full"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Acquire Volume
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
