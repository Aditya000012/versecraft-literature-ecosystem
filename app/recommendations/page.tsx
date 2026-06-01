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
  genre?: string;
  era?: string;
  tone?: string;
  category?: string;
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
  { id: 'romance', name: 'Romance' },
  { id: 'gothic', name: 'Gothic' },
  { id: 'horror', name: 'Horror' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'realism', name: 'Realism' },
  { id: 'sufi', name: 'Sufi' },
  { id: 'classical', name: 'Classical' },
  { id: 'science-fiction', name: 'Science Fiction' },
  { id: 'dystopian', name: 'Dystopian' },
  { id: 'magical-realism', name: 'Magical Realism' },
  { id: 'historical-fiction', name: 'Historical Fiction' },
  { id: 'psychological-thriller', name: 'Psychological Thriller' },
  { id: 'adventure', name: 'Adventure' },
  { id: 'satire', name: 'Satire' },
  { id: 'tragedy', name: 'Tragedy' },
  { id: 'comedy', name: 'Comedy' },
  { id: 'epic', name: 'Epic' },
  { id: 'noir', name: 'Noir' },
  { id: 'existential', name: 'Existential' },
  { id: 'supernatural', name: 'Supernatural' },
  { id: 'war-literature', name: 'War Literature' },
  { id: 'political-fiction', name: 'Political Fiction' },
  { id: 'philosophical-fiction', name: 'Philosophical Fiction' },
  { id: 'literary-fiction', name: 'Literary Fiction' },
];

const eras = [
  { id: '', name: 'Any Era' },
  { id: 'ancient', name: 'Ancient (before 500 AD)' },
  { id: 'medieval', name: 'Medieval (500-1400)' },
  { id: 'renaissance', name: 'Renaissance (1400-1600)' },
  { id: 'baroque', name: 'Baroque (1600-1700)' },
  { id: 'enlightenment', name: 'Enlightenment (1700-1800)' },
  { id: 'romantic', name: 'Romantic Period (1800-1850)' },
  { id: 'victorian', name: 'Victorian (1850-1900)' },
  { id: 'edwardian', name: 'Edwardian (1900-1914)' },
  { id: 'modernist', name: 'Modernist (1914-1945)' },
  { id: 'mid-century', name: 'Mid-Century (1945-1970)' },
  { id: 'postmodern', name: 'Postmodern (1970-1990)' },
  { id: 'contemporary', name: 'Contemporary (1990-2010)' },
  { id: 'present-day', name: 'Present Day (2010 onwards)' },
];

const languages = [
  { id: 'english', name: 'English' },
  { id: 'urdu', name: 'Urdu (اردو)' },
  { id: 'hindi', name: 'Hindi (हिन्दी)' },
  { id: 'french', name: 'French (Français)' },
  { id: 'spanish', name: 'Spanish (Español)' },
];

const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';

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

  const [activeListDropdown, setActiveListDropdown] = useState<string | null>(null);
  const [readingLists, setReadingLists] = useState<{ id: string; name: string }[]>([]);
  const [savedStatus, setSavedStatus] = useState<Record<string, string>>({});

  const handleDropdownToggle = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!user) {
      router.push('/auth?mode=login');
      return;
    }
    if (activeListDropdown === bookId) {
      setActiveListDropdown(null);
    } else {
      setActiveListDropdown(bookId);
      try {
        const res = await fetch(`/api/reading-lists?uid=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setReadingLists(data);
        }
      } catch (err) {
        console.error('Error fetching reading lists:', err);
      }
    }
  };

  const handleSaveToReadingList = async (e: React.MouseEvent, listId: string, rec: Recommendation) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const res = await fetch('/api/reading-lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          listId,
          book: {
            bookId: rec.id,
            title: rec.title,
            authors: Array.isArray(rec.authors) ? rec.authors : (rec.author ? [rec.author] : ['Unknown Author']),
            thumbnail: rec.thumbnail,
            infoLink: rec.infoLink || '',
          }
        })
      });

      if (res.ok) {
        setSavedStatus({ ...savedStatus, [rec.id]: 'Saved!' });
        setTimeout(() => {
          setSavedStatus(prev => {
            const updated = { ...prev };
            delete updated[rec.id];
            return updated;
          });
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving book:', err);
    } finally {
      setActiveListDropdown(null);
    }
  };

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

  // Sanctuary Background elements helper
  const renderSanctuaryBackground = () => (
    <>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* Cream background base with paper radial vignette */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, #FBFBF6 0%, #FAF8F0 60%, #F5EFE0 100%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Literary Whisper Words near page margins */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden font-playfair italic text-[#1a1a1a]">
        {/* Top-Left */}
        <span 
          className="absolute text-xs tracking-wider opacity-[0.14] select-none"
          style={{ top: '12%', left: '4%' }}
        >
          silence
        </span>

        {/* Left margin (Desktop only) */}
        <span 
          className="absolute text-[13px] tracking-widest opacity-[0.14] select-none hidden lg:block"
          style={{ top: '42%', left: '3%' }}
        >
          solitude
        </span>

        {/* Lower-Left */}
        <span 
          className="absolute text-xs tracking-wider opacity-[0.14] select-none"
          style={{ bottom: '15%', left: '5%' }}
        >
          memory
        </span>

        {/* Top-Right */}
        <span 
          className="absolute text-[13px] tracking-widest opacity-[0.14] select-none"
          style={{ top: '15%', right: '4%' }}
        >
          wonder
        </span>

        {/* Right margin (Desktop only) */}
        <span 
          className="absolute text-xs tracking-wider opacity-[0.14] select-none hidden lg:block"
          style={{ top: '48%', right: '3%' }}
        >
          longing
        </span>

        {/* Bottom-Right */}
        <span 
          className="absolute text-xs tracking-widest opacity-[0.14] select-none"
          style={{ bottom: '12%', right: '5%' }}
        >
          shadow
        </span>
      </div>
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
            <span className="text-xs text-[#1a1a1a] select-none font-serif">✦</span>
          </div>
          <div className="space-y-1 text-center animate-pulse">
            <h3 className="font-playfair text-base italic text-[#1a1a1a] font-medium">
              Attuning recommended coordinates...
            </h3>
            <p className="text-[10px] text-[#1a1a1a] font-inter tracking-wider uppercase font-semibold">
              Searching history shelves
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderSanctuaryBackground()}
      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 selection:bg-[#1a1a1a] selection:text-[#F8F4E9]">
        {/* Dashboard Back Link */}
        <div className="mb-4 text-left select-none">
          <Link
            href="/dashboard"
            className="text-xs text-[#1a1a1a] hover:underline transition-all inline-flex items-center gap-1 font-inter font-semibold"
          >
            ← Dashboard
          </Link>
        </div>
        {/* Title */}
        <div className="text-center mb-10 select-none space-y-4 max-w-2xl mx-auto">
          <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#1a1a1a] block font-inter">THE ORACLE&apos;S CHOICE</span>
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a] tracking-wide">The Curated Alcove</h1>
          <p className="font-playfair text-sm italic text-[#1a1a1a] mt-3 max-w-xl mx-auto leading-relaxed">
            Whisper your tastes to the oracle and receive volumes chosen for your temperament, mood, and literary longing.
          </p>
          <div className="h-[1px] w-24 bg-[#1a1a1a]/20 mx-auto mt-4" />
        </div>

        {/* Filter panel Form */}
        <form onSubmit={handleCuration} className="bg-[#FAF7F0] border border-[#1a1a1a]/15 rounded-xl p-6 sm:p-8 shadow-xs mb-12 max-w-4xl mx-auto select-none">
          <div className="text-center mb-6">
            <p className="font-playfair italic text-xs text-[#1a1a1a]/75 tracking-wide">
              Shape the mood of your next encounter.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Genre selection */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-2 font-inter">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg outline-none bg-white border border-[#1a1a1a]/20 focus:border-[#1a1a1a] text-xs font-semibold text-[#1a1a1a] cursor-pointer shadow-xs focus:ring-1 focus:ring-[#1a1a1a]/10 transition-all"
              >
                {genres.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#FAF7F0] text-[#1a1a1a] font-semibold">
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Era selection */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-2 font-inter">Era</label>
              <select
                value={selectedEra}
                onChange={(e) => setSelectedEra(e.target.value)}
                className="w-full px-3 py-2 rounded-lg outline-none bg-white border border-[#1a1a1a]/20 focus:border-[#1a1a1a] text-xs font-semibold text-[#1a1a1a] cursor-pointer shadow-xs focus:ring-1 focus:ring-[#1a1a1a]/10 transition-all"
              >
                {eras.map((era) => (
                  <option key={era.id} value={era.id} className="bg-[#FAF7F0] text-[#1a1a1a] font-semibold">
                    {era.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Author Vibe */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-2 font-inter">Author Vibe</label>
              <input
                type="text"
                placeholder="e.g. Orwell, Keats..."
                value={authorVibe}
                onChange={(e) => setAuthorVibe(e.target.value)}
                className="w-full px-3 py-2 rounded-lg outline-none bg-white border border-[#1a1a1a]/20 focus:border-[#1a1a1a] text-xs text-[#1a1a1a] placeholder-[#1a1a1a]/50 shadow-xs focus:ring-1 focus:ring-[#1a1a1a]/10 transition-all font-medium"
              />
            </div>

            {/* Language choice */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#1a1a1a] font-bold mb-2 font-inter">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg outline-none bg-white border border-[#1a1a1a]/20 focus:border-[#1a1a1a] text-xs font-semibold text-[#1a1a1a] cursor-pointer shadow-xs focus:ring-1 focus:ring-[#1a1a1a]/10 transition-all"
              >
                {languages.map((l) => (
                  <option key={l.id} value={l.id} className="bg-[#FAF7F0] text-[#1a1a1a] font-semibold">
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6 border-t border-[#1a1a1a]/10 pt-5 text-center">
            <button
              type="submit"
              disabled={curating}
              className="px-8 py-3 bg-[#1a1a1a] hover:bg-[#2b2b2b] text-white font-semibold uppercase tracking-widest rounded-lg text-xs font-inter transition-all shadow-xs active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
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
              <div className="relative w-16 h-16 flex items-center justify-center mx-auto">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.35, 0.15] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full border border-[#1a1a1a]"
                />
                <span className="text-xs text-[#1a1a1a] select-none font-serif">✦</span>
              </div>
              <div className="text-center animate-pulse">
                <span className="font-playfair text-[#1a1a1a] italic text-base block">Scribing poetic alignments...</span>
                <span className="text-[10px] text-[#1a1a1a] font-inter uppercase tracking-widest mt-2 block font-semibold">Consulting central literary indexes</span>
              </div>
            </motion.div>
          ) : recommendations.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#FAF7F0] border border-[#1a1a1a]/15 rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm select-none"
            >
              <span className="text-3xl block mb-3">🕯️</span>
              <p className="font-playfair text-lg text-[#1a1a1a] italic font-semibold">The Oracle is silent.</p>
              <p className="text-xs text-[#1a1a1a] mt-2.5 font-inter font-semibold">Modify your parameters and request a new alignment.</p>
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
                    className="bg-[#FAF7F0] border border-[#1a1a1a]/15 hover:border-[#1a1a1a]/30 hover:shadow-md hover:-translate-y-[3px] rounded-xl p-6 transition-all duration-300 flex flex-col md:flex-row gap-6 relative overflow-hidden group"
                  >
                    {/* Book cover left */}
                    <div className="w-full md:w-1/3 aspect-[3/4] bg-[#FAF7F0] rounded-lg overflow-hidden border border-[#1a1a1a]/20 shadow flex-shrink-0 relative select-none flex flex-col justify-between">
                      {(!rec.thumbnail || rec.thumbnail === '' || rec.thumbnail.includes('placeholder') || rec.thumbnail.includes('no-image')) ? (
                        <div className="w-full h-full bg-[#F8F4E9] p-4 flex flex-col justify-between border-4 border-[#FAF7F0] rounded-lg select-none relative">
                          {/* Inner elegant border */}
                          <div className="absolute inset-1.5 border border-[#1a1a1a]/15 pointer-events-none rounded-sm flex flex-col justify-between p-2">
                            <div className="text-[7px] uppercase tracking-widest text-[#1a1a1a]/50 font-bold font-inter text-center">
                              Versecraft Volume
                            </div>
                            <div className="my-auto text-center px-1">
                              <h4 className="font-playfair text-xs sm:text-[13px] font-bold text-[#1a1a1a] line-clamp-3 leading-relaxed">
                                {rec.title}
                              </h4>
                              <div className="h-[1px] w-8 bg-[#1a1a1a]/20 mx-auto mt-2 mb-1" />
                              <p className="font-inter text-[9px] italic text-[#1a1a1a]/60 line-clamp-1">
                                {rec.author || (rec.authors && rec.authors[0]) || 'Unknown Author'}
                              </p>
                            </div>
                            <div className="text-[7px] tracking-wider text-[#1a1a1a]/40 font-inter text-center uppercase font-medium">
                              Volume Selection
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={rec.thumbnail}
                          alt={rec.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Saved overlay alert */}
                      {savedStatus[rec.id] && (
                        <div className="absolute inset-0 bg-[#FAF7F0]/95 z-20 flex items-center justify-center rounded-lg border border-[#1a1a1a]/10 shadow-inner">
                          <span className="font-playfair text-[#1a1a1a] italic text-sm font-bold animate-pulse">
                            ✨ {savedStatus[rec.id]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Details and Poetic Reason right */}
                    <div className="flex-grow flex flex-col justify-between">
                      <div>
                        {/* Meta header */}
                        <div className="flex justify-between items-start gap-2 mb-2 select-none">
                          <span className="text-[10px] uppercase tracking-widest text-[#1a1a1a] font-bold font-inter">
                            Oracle Selection
                          </span>
                          
                          <div className="flex items-center gap-2 relative">
                            {/* Save to List Bookmark Button */}
                            <button
                              onClick={(e) => handleDropdownToggle(e, rec.id)}
                              className={`p-1.5 rounded-full border transition-all duration-300 ${
                                activeListDropdown === rec.id
                                  ? 'bg-[#1a1a1a]/10 border-[#1a1a1a] text-[#1a1a1a] shadow shadow-[#1a1a1a]/10'
                                  : 'bg-white/40 border-[#1a1a1a]/15 text-[#1a1a1a]/40 hover:text-[#1a1a1a] hover:border-[#1a1a1a]'
                              }`}
                              title="Save to List"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                />
                              </svg>
                            </button>

                            {/* Wishlist button */}
                            <button
                              onClick={() => toggleWishlist(rec)}
                              className={`p-1.5 rounded-full border transition-colors ${
                                inWishlist
                                  ? 'bg-red-500/20 border-red-500 text-red-500'
                                  : 'bg-white/40 border-[#1a1a1a]/15 text-[#1a1a1a]/40 hover:text-[#1a1a1a] hover:border-[#1a1a1a]'
                              }`}
                              title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            </button>

                            {/* Dropdown menu */}
                            {activeListDropdown === rec.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-8 z-20 w-48 bg-[#FAF7F0] border border-[#1a1a1a]/15 rounded-xl py-2 shadow-lg text-left"
                              >
                                <div className="px-3 py-1 border-b border-[#1a1a1a]/10 mb-1 text-[10px] uppercase tracking-wider text-[#1a1a1a] font-bold">
                                  Save to List
                                </div>
                                {readingLists.length === 0 ? (
                                  <div className="px-3 py-2 text-[11px] text-[#1a1a1a] italic flex flex-col gap-1 font-semibold">
                                    <span>Create a list first</span>
                                    <span 
                                      onClick={() => router.push('/reading-lists')}
                                      className="text-[#1a1a1a] hover:underline font-semibold font-inter cursor-pointer"
                                    >
                                      Create List →
                                    </span>
                                  </div>
                                ) : (
                                  <div className="max-h-36 overflow-y-auto">
                                    {readingLists.map((list) => (
                                      <button
                                        key={list.id}
                                        onClick={(e) => handleSaveToReadingList(e, list.id, rec)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-[#1a1a1a]/5 text-xs text-[#1a1a1a] font-semibold transition-colors font-inter truncate"
                                      >
                                        📁 {list.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] group-hover:underline transition-colors line-clamp-2 select-text">
                          {rec.title}
                        </h3>
                        <p className="font-inter text-xs text-[#1a1a1a] mt-1 mb-3 font-semibold select-text">
                          by{' '}
                          {rec.author ? (
                            <span
                              onClick={() => router.push(`/authors?name=${encodeURIComponent(rec.author!)}`)}
                              className="cursor-pointer hover:underline transition-colors duration-200"
                            >
                              {rec.author}
                            </span>
                          ) : rec.authors && rec.authors.length > 0 ? (
                            rec.authors.map((authorName, index) => (
                              <React.Fragment key={authorName}>
                                {index > 0 && ', '}
                                <span
                                  onClick={() => router.push(`/authors?name=${encodeURIComponent(authorName)}`)}
                                  className="cursor-pointer hover:underline transition-colors duration-200"
                                >
                                  {authorName}
                                </span>
                              </React.Fragment>
                            ))
                          ) : (
                            'Unknown Author'
                          )}
                        </p>

                        {/* Optional metadata chips if they exist */}
                        {(rec.genre || rec.era || rec.tone || rec.category) && (
                          <div className="flex flex-wrap gap-1.5 mb-3.5 select-none">
                            {rec.genre && (
                              <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider bg-[#FAF7F0] border border-[#1a1a1a]/15 text-[#1a1a1a] rounded font-inter font-medium">
                                {rec.genre}
                              </span>
                            )}
                            {rec.era && (
                              <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider bg-[#FAF7F0] border border-[#1a1a1a]/15 text-[#1a1a1a] rounded font-inter font-medium">
                                {rec.era}
                              </span>
                            )}
                            {rec.tone && (
                              <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider bg-[#FAF7F0] border border-[#1a1a1a]/15 text-[#1a1a1a] rounded font-inter font-medium">
                                {rec.tone}
                              </span>
                            )}
                            {rec.category && (
                              <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider bg-[#FAF7F0] border border-[#1a1a1a]/15 text-[#1a1a1a] rounded font-inter font-medium">
                                {rec.category}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Book Description block */}
                        <p className="font-inter text-[11.5px] text-[#1a1a1a] leading-relaxed font-medium mb-4 line-clamp-2 select-text">
                          {rec.description}
                        </p>

                        {/* POETIC MATCH CARD BLOCK (Curator's Note) */}
                        <div className="p-4 bg-[#EAE4D6]/30 border-l-2 border-[#1a1a1a]/30 rounded-r-lg mb-4 select-text shadow-xs">
                          <span className="text-[10px] uppercase tracking-wider text-[#1a1a1a] font-bold font-inter block mb-1">
                            A Curator’s Note
                          </span>
                          <p className="font-playfair italic text-xs text-[#1a1a1a] leading-relaxed font-semibold">
                            “{rec.poeticReason}”
                          </p>
                        </div>
                      </div>

                      {/* Acquisition links block */}
                      <div className="mt-6 pt-3 border-t border-[#1a1a1a]/10 select-none">
                        <a
                          href={rec.infoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 bg-white border border-[#1a1a1a]/30 hover:bg-[#1a1a1a] hover:text-[#FAF7F0] rounded-lg text-center text-xs font-bold uppercase tracking-widest font-inter text-[#1a1a1a] transition-all duration-300 flex items-center justify-center gap-1.5 w-full active:scale-98 shadow-xs"
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
    </>
  );
}
