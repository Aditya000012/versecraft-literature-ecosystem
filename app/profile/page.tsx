'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, getDocs } from 'firebase/firestore';

interface AnthologyItem {
  id: string;
  mode: string;
  genre?: string;
  era?: string;
  prompt: string;
  response: string;
  savedAt: Date | string | { seconds: number; nanoseconds: number } | null;
}

interface WishlistItem {
  bookId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  infoLink?: string;
  addedAt: Date | string | { seconds: number; nanoseconds: number } | null;
}

interface ProfileData {
  displayName?: string | null;
  email?: string | null;
  timeSpent?: number;
  anthology?: AnthologyItem[];
  wishlist?: WishlistItem[];
  interestedGenres?: string[];
  interestedEras?: string[];
  preferences?: {
    favoriteGenre?: string;
    favoriteEra?: string;
    customNote?: string;
  };
}

const genresList = ['Fiction', 'Poetry', 'Gothic', 'Romance', 'Mystery', 'Fantasy', 'Classics', 'Sufi'];
const erasList = ['Victorian', 'Ancient', 'Renaissance', 'Modernist', 'Romantic Period', 'Contemporary'];

function ProfilePageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'anthology';

  const [activeTab, setActiveTab] = useState(tabParam);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  // Preference Form states
  const [interestedGenres, setInterestedGenres] = useState<string[]>([]);
  const [interestedEras, setInterestedEras] = useState<string[]>([]);
  const [favoriteGenre, setFavoriteGenre] = useState('');
  const [favoriteEra, setFavoriteEra] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);



  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  // Sync state with URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Fetch complete profile from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setLoadingData(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData(data);
          setInterestedGenres(data.interestedGenres || []);
          setInterestedEras(data.interestedEras || []);
          setFavoriteGenre(data.preferences?.favoriteGenre || '');
          setFavoriteEra(data.preferences?.favoriteEra || '');
          setCustomNote(data.preferences?.customNote || '');
          setTimeSpent(data.timeSpent || 0);

          if (data.timeSpent > 100) {
            await updateDoc(doc(db, 'users', user.uid), { timeSpent: 0 });
            setTimeSpent(0);
          }
        }
        
        // Fetch total count of chats
        const chatsSnapshot = await getDocs(collection(db, 'users', user.uid, 'chats'));
        setChatCount(chatsSnapshot.size);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setTimeSpent(data.timeSpent || 0);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [user, user?.uid]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        timeSpent: increment(1)
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [user, user?.uid]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/profile?tab=${tabId}`);
  };

  const handleRemoveFromWishlist = async (bookId: string) => {
    if (!user || !profileData) return;
    
    try {
      const updatedWishlist = (profileData.wishlist || []).filter(
        (w: WishlistItem) => w.bookId !== bookId
      );
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        wishlist: updatedWishlist,
      });

      setProfileData((prev: ProfileData | null) => prev ? {
        ...prev,
        wishlist: updatedWishlist,
      } : null);
    } catch (err) {
      console.error('Error removing from wishlist:', err);
    }
  };

  const handleRemoveFromAnthology = async (itemId: string) => {
    if (!user || !profileData) return;

    try {
      const updatedAnthology = (profileData.anthology || []).filter(
        (a: AnthologyItem) => a.id !== itemId
      );

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        anthology: updatedAnthology,
      });

      setProfileData((prev: ProfileData | null) => prev ? {
        ...prev,
        anthology: updatedAnthology,
      } : null);
    } catch (err) {
      console.error('Error removing from anthology:', err);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        interestedGenres,
        interestedEras,
        preferences: {
          favoriteGenre,
          favoriteEra,
          customNote,
        },
      });

      setProfileData((prev: ProfileData | null) => prev ? {
        ...prev,
        interestedGenres,
        interestedEras,
        preferences: {
          favoriteGenre,
          favoriteEra,
          customNote,
        },
      } : null);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
    }
  };

  const handleToggleGenre = (genre: string) => {
    setInterestedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleToggleEra = (era: string) => {
    setInterestedEras((prev) =>
      prev.includes(era) ? prev.filter((e) => e !== era) : [...prev, era]
    );
  };

  const handleAnthologyShareCard = async (content: string) => {
    const words = content.split(' ');
    const chunks: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).length > 1500) {
        chunks.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    for (let i = 0; i < chunks.length; i++) {
      const card = document.createElement('div');
      card.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        padding: 48px;
        background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%);
        border: 1px solid rgba(201, 168, 76, 0.3);
        border-radius: 16px;
        font-family: Georgia, serif;
        color: #f5f0e8;
      `;
      card.innerHTML = `
        <div style="color: #c9a84c; font-size: 12px; letter-spacing: 3px; margin-bottom: 24px; text-transform: uppercase;">✦ Versecraft ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}</div>
        <div style="font-size: 14px; line-height: 1.7; font-style: italic; color: #f5f0e8; margin-bottom: 32px;">${chunks[i]}</div>
        <div style="color: #c9a84c; font-size: 11px; letter-spacing: 2px; border-top: 1px solid rgba(201, 168, 76, 0.2); padding-top: 16px;">versecraft.app</div>
      `;
      document.body.appendChild(card);
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = chunks.length > 1 ? `versecraft-verse-${i + 1}.png` : 'versecraft-verse.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        document.body.removeChild(card);
      }
    }
  };

  const formatTimeSpent = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Opening secret profile archives...</span>
        </div>
      </div>
    );
  }

  const anthologyItems = profileData?.anthology || [];
  const wishlistItems = profileData?.wishlist || [];

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
      {/* Header Profile Info card */}
      <div className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl mb-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full border-2 border-gold flex items-center justify-center bg-purple-dark/40 text-gold font-playfair font-bold text-2xl tracking-widest shadow shadow-gold/25">
            {profileData?.displayName?.charAt(0).toUpperCase() || 'R'}
          </div>
          <div>
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-cream">
              {profileData?.displayName || 'Reader Sanctuary'}
            </h1>
            <p className="font-inter text-xs text-cream/40 mt-0.5">{profileData?.email}</p>
          </div>
        </div>

        {/* Live Explorer summary details */}
        <div className="flex gap-4 sm:gap-8 justify-around w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold font-inter block">Saved Verses</span>
            <span className="font-playfair text-xl sm:text-2xl text-cream block mt-0.5">{anthologyItems.length}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold font-inter block">Wishlist Volumes</span>
            <span className="font-playfair text-xl sm:text-2xl text-cream block mt-0.5">{wishlistItems.length}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold font-inter block">Time Active</span>
            <span className="font-playfair text-sm text-gold block mt-1.5 uppercase font-bold tracking-wider">
              {timeSpent} mins
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Toolbar */}
      <div className="flex border-b border-white/5 gap-6 mb-8 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'anthology', name: '📜 Personal Anthology' },
          { id: 'wishlist', name: '❤️ Wishlist' },
          { id: 'preferences', name: '⚙️ Preferences' },
          { id: 'timeSpent', name: '⏳ Exploration Timer' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`pb-3 text-xs uppercase font-bold tracking-wider font-inter border-b-2 transition-all flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-gold text-gold font-bold'
                : 'border-transparent text-cream/50 hover:text-cream'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Dynamic Tab content boxes */}
      <AnimatePresence mode="wait">
        {/* 1. PERSONAL ANTHOLOGY */}
        {activeTab === 'anthology' && (
          <motion.div
            key="anthology"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {anthologyItems.length === 0 ? (
              <div className="glass-card border-white/5 rounded-xl p-12 text-center max-w-lg mx-auto">
                <span className="text-3xl block mb-2">📜</span>
                <p className="font-playfair text-lg text-cream italic">Your anthology stands completely blank.</p>
                <p className="text-xs text-cream/40 mt-1 font-inter">
                  Consult the companion simple or advanced chats, and trigger the &quot;Save to Anthology&quot; prompt to write your path.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {anthologyItems.map((item: AnthologyItem) => (
                  <div
                    key={item.id}
                    className="glass-card border-white/5 hover:border-gold/15 rounded-2xl p-6 shadow-2xl relative flex flex-col justify-between group"
                  >
                    <div>
                      {/* Meta header */}
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5 text-[9px] font-bold uppercase tracking-wider text-gold">
                        <span>Mode: {item.mode} {item.genre && `• ${item.genre}/${item.era}`}</span>
                        <button
                          onClick={() => handleRemoveFromAnthology(item.id)}
                          className="text-red-400 hover:text-red-300 font-bold uppercase transition-colors"
                        >
                          Delete
                        </button>
                      </div>

                      {/* Prompt */}
                      <p className="text-[10px] text-cream/40 font-inter mb-2">
                        <strong className="text-cream/50 uppercase tracking-widest block text-[8px] font-bold">Invocation:</strong>
                        {item.prompt}
                      </p>

                      {/* Response */}
                      <div className="p-4 bg-purple-dark/15 border border-white/5 rounded-xl mt-3 shadow-inner">
                        <p className="font-playfair italic text-xs leading-relaxed text-cream/90 font-light">
                          “ {item.response} ”
                        </p>
                      </div>
                    </div>

                    {/* Exporter triggers */}
                    <div className="mt-6 pt-3 border-t border-white/5 flex justify-end">
                      <button
                        onClick={() => handleAnthologyShareCard(item.response)}
                        className="text-[10px] uppercase font-bold tracking-wider font-inter text-gold hover:text-gold-light transition-colors flex items-center gap-1"
                      >
                        🎨 Download Share Card
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 2. WISHLIST */}
        {activeTab === 'wishlist' && (
          <motion.div
            key="wishlist"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            {wishlistItems.length === 0 ? (
              <div className="glass-card border-white/5 rounded-xl p-12 text-center max-w-lg mx-auto">
                <span className="text-3xl block mb-2">❤️</span>
                <p className="font-playfair text-lg text-cream italic">Your wishlist catalog is empty.</p>
                <p className="text-xs text-cream/40 mt-1 font-inter">
                  Explore volumes inside the Grand Library or the Recommendations Alcove to catalog desired editions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {wishlistItems.map((book: WishlistItem) => (
                  <div
                    key={book.bookId}
                    className="glass-card border-white/5 hover:border-gold/15 rounded-xl overflow-hidden shadow flex flex-col group relative"
                  >
                    {/* Cover */}
                    <div className="relative aspect-[3/4] bg-black/40">
                      <img
                        src={book.thumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Delete cross absolute */}
                      <button
                        onClick={() => handleRemoveFromWishlist(book.bookId)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 border border-white/10 text-red-400 hover:text-red-300 transition-colors shadow"
                        title="Remove Volume"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Meta details */}
                    <div className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <h4 className="font-playfair font-bold text-cream text-xs line-clamp-2 leading-snug">
                          {book.title}
                        </h4>
                        <p className="font-inter text-[10px] text-cream/50 mt-1 line-clamp-1">
                          by {book.authors.join(', ')}
                        </p>
                      </div>

                      {/* Buy link */}
                      <div className="mt-4 pt-2 border-t border-white/5">
                        <a
                          href={book.infoLink || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 bg-gold hover:bg-gold-light text-navy text-[10px] font-bold uppercase tracking-wider rounded-lg block text-center font-inter transition-all"
                        >
                          Acquire
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 3. PREFERENCES */}
        {activeTab === 'preferences' && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-3xl mx-auto"
          >
            <form onSubmit={handleSavePreferences} className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <h3 className="font-playfair text-xl font-bold text-gold border-b border-white/5 pb-2">Attune Literary Preferences</h3>

              {/* Genre selections */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gold font-bold mb-2.5 font-inter">Interested Genres</label>
                <div className="flex flex-wrap gap-2">
                  {genresList.map((genre) => {
                    const active = interestedGenres.includes(genre.toLowerCase());
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleToggleGenre(genre.toLowerCase())}
                        className={`px-3 py-1.5 border rounded-full text-xs font-semibold font-inter transition-all ${
                          active
                            ? 'bg-gold border-transparent text-navy shadow shadow-gold/15'
                            : 'bg-white/5 border-white/5 text-cream/70 hover:border-gold/30'
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Era selections */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gold font-bold mb-2.5 font-inter">Interested Eras</label>
                <div className="flex flex-wrap gap-2">
                  {erasList.map((era) => {
                    const active = interestedEras.includes(era.toLowerCase());
                    return (
                      <button
                        key={era}
                        type="button"
                        onClick={() => handleToggleEra(era.toLowerCase())}
                        className={`px-3 py-1.5 border rounded-full text-xs font-semibold font-inter transition-all ${
                          active
                            ? 'bg-gold border-transparent text-navy shadow shadow-gold/15'
                            : 'bg-white/5 border-white/5 text-cream/70 hover:border-gold/30'
                        }`}
                      >
                        {era}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom teaser values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gold font-bold mb-2 font-inter">Primary Focus Genre</label>
                  <select
                    value={favoriteGenre}
                    onChange={(e) => setFavoriteGenre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl outline-none glass-input text-xs font-semibold text-cream"
                  >
                    <option value="" className="bg-navy text-cream">Select Primary Genre</option>
                    {genresList.map((g) => (
                      <option key={g} value={g.toLowerCase()} className="bg-navy text-cream">{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gold font-bold mb-2 font-inter">Primary Focus Era</label>
                  <select
                    value={favoriteEra}
                    onChange={(e) => setFavoriteEra(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl outline-none glass-input text-xs font-semibold text-cream"
                  >
                    <option value="" className="bg-navy text-cream">Select Primary Era</option>
                    {erasList.map((e) => (
                      <option key={e} value={e.toLowerCase()} className="bg-navy text-cream">{e}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom writer vibe */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-gold font-bold mb-2 font-inter">Vibe Notes / Writers of Interest</label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. I am seeking dense gothic metaphors combined with Urdu romantic poetry cadences. I love the style of Sylvia Plath and John Keats."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl outline-none glass-input text-xs text-cream placeholder-cream/25 resize-none leading-relaxed"
                />
              </div>

              {/* Action save */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gold hover:bg-gold-light text-navy font-bold uppercase tracking-wider rounded-xl text-xs font-inter transition-all"
                >
                  Save Attunements
                </button>
                {saveSuccess && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-gold font-bold tracking-wide animate-pulse"
                  >
                    ✨ Frequencies aligned!
                  </motion.span>
                )}
              </div>
            </form>
          </motion.div>
        )}

        {/* 4. EXPLORATION TIMER REGISTRY */}
        {activeTab === 'timeSpent' && (
          <motion.div
            key="timeSpent"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl mx-auto"
          >
            <div className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden space-y-6">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gold/60 block font-inter">THE CELESTIAL CLOCK</span>
              
              <div className="relative w-44 h-44 rounded-full border border-gold/15 mx-auto flex items-center justify-center bg-gradient-to-br from-[#0c0c24] to-[#04040a] shadow-2xl shadow-gold/5">
                {/* Clock hands animations mock */}
                <div className="absolute inset-2.5 rounded-full border border-dashed border-gold/10" />
                <div className="absolute w-0.5 h-14 bg-gold origin-bottom -mt-14 animate-spin [animation-duration:120s]" />
                <div className="absolute w-0.5 h-10 bg-gold/50 origin-bottom -mt-10 animate-spin [animation-duration:720s]" />
                
                {/* Text center */}
                <div className="relative z-10 text-center">
                  <span className="font-playfair text-3xl font-bold text-gold block">
                    {timeSpent}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-cream/40 block font-bold mt-0.5">minutes</span>
                </div>
              </div>

              <div>
                <h3 className="font-playfair text-xl font-bold text-cream">Living Library Registry</h3>
                <p className="font-inter text-xs text-cream/60 mt-2 max-w-md mx-auto leading-relaxed font-light">
                  Every second spent reading, dueling, and exploring inside the sanctuary is logged in our real-time visibility-aware database. You have dedicated:
                </p>
                <p className="font-playfair text-gold text-lg italic mt-3 font-semibold">
                  {formatTimeSpent(timeSpent * 60)}
                </p>
              </div>

              {/* Synthesized stats */}
              <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-6 text-center font-inter text-xs">
                <div>
                  <span className="text-gold font-bold block">{wishlistItems.length}</span>
                  <span className="text-[9px] text-cream/40 font-bold block uppercase tracking-wider mt-0.5">Books Cataloged</span>
                </div>
                <div>
                  <span className="text-gold font-bold block">{anthologyItems.length}</span>
                  <span className="text-[9px] text-cream/40 font-bold block uppercase tracking-wider mt-0.5">verses forged</span>
                </div>
                <div>
                  <span className="text-gold font-bold block">{chatCount}</span>
                  <span className="text-[9px] text-cream/40 font-bold block uppercase tracking-wider mt-0.5">Alchemical Fusions</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Opening secret profile archives...</span>
        </div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}
