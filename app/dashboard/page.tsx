'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import DailyVerse from '@/components/DailyVerse';
import MoodSelector from '@/components/MoodSelector';

interface ChatSession {
  id: string;
  type: 'simple' | 'advanced';
  mode: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  filters?: {
    genre: string;
    era: string;
    language: string;
  };
  messages: { role: string; content: string; timestamp?: Date | string | number | null }[];
}

interface BookTeaser {
  title: string;
  author: string;
  thumbnail: string;
  poeticReason: string;
  infoLink: string;
}

const defaultTeasers: BookTeaser[] = [
  {
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    thumbnail: 'https://books.google.com/books/content?id=bV5dAAAAMAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
    poeticReason: 'A dark Victorian mirror reflecting the delicate tragedy of aesthetic obsession and the decay of an untamed soul.',
    infoLink: 'https://books.google.com/books?id=bV5dAAAAMAAJ',
  },
  {
    title: 'Divan of Hafiz',
    author: 'Hafiz',
    thumbnail: 'https://books.google.com/books/content?id=h395DwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api',
    poeticReason: 'Ancient Sufi verses where divine ecstasy and longing intertwine like shadows dancing in a moonlit courtyard.',
    infoLink: 'https://books.google.com/books?id=h395DwAAQBAJ',
  },
  {
    title: 'Frankenstein',
    author: 'Mary Shelley',
    thumbnail: 'https://books.google.com/books/content?id=sz18AAAAMAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
    poeticReason: 'A chilling gothic inquiry into the hubris of creation, painted with the melancholic brush of romantic isolation.',
    infoLink: 'https://books.google.com/books?id=sz18AAAAMAAJ',
  },
];

const modeNames: Record<string, string> = {
  poetry: 'Poetry Mode',
  duel: 'Verse Duel',
  story: 'Story Seed',
  analysis: 'Literary Analysis',
  judgement: 'Judgement Mode',
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('Reader');
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [teasers, setTeasers] = useState<BookTeaser[]>(defaultTeasers);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(false);

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  // Fetch Firestore profile (first name) and recent chats
  useEffect(() => {
    if (!user) return;

    const fetchProfileAndChats = async () => {
      try {
        // 1. Fetch Profile Name
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          const dispName = profileData.displayName || user.displayName || '';
          if (dispName) {
            setFirstName(dispName.split(' ')[0]);
          }
          
          // If they have interested genres, try to fetch fresh teasers
          const genres = profileData.interestedGenres || [];
          if (genres.length > 0) {
            fetchTeasersFromAPI(genres[0]);
          }
        }

        // 2. Fetch Last 3 Chat Sessions
        const chatsRef = collection(db, 'users', user.uid, 'chats');
        const q = query(chatsRef, orderBy('createdAt', 'desc'), limit(3));
        const querySnap = await getDocs(q);
        const chatsList: ChatSession[] = [];
        querySnap.forEach((docSnap) => {
          const data = docSnap.data();
          chatsList.push({
            id: docSnap.id,
            type: data.type || 'simple',
            mode: data.mode || 'poetry',
            createdAt: data.createdAt,
            filters: data.filters,
            messages: data.messages || [],
          });
        });
        setRecentChats(chatsList);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setChatsLoading(false);
      }
    };

    fetchProfileAndChats();
  }, [user]);

  const fetchTeasersFromAPI = async (favoriteGenre: string) => {
    setRecsLoading(true);
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: favoriteGenre }),
      });
      if (response.ok) {
        const data = await response.json();
        const apiRecs = data.recommendations || [];
        if (apiRecs.length >= 3) {
          setTeasers(
            apiRecs.slice(0, 3).map((item: { title: string; author?: string; authors?: string[]; thumbnail: string; poeticReason: string; infoLink: string }) => ({
              title: item.title,
              author: item.author || item.authors?.join(', ') || 'Unknown Author',
              thumbnail: item.thumbnail,
              poeticReason: item.poeticReason,
              infoLink: item.infoLink,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Error fetching teasers from API:', err);
    } finally {
      setRecsLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Opening sanctuary gates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-28 flex flex-col gap-12">
      {/* Welcome Banner */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card p-8 sm:p-10 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
      >
        <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gold" />
        <div>
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-cream">
            Welcome back, <span className="text-gold italic gold-glow">{firstName}</span>
          </h1>
          <p className="font-inter text-sm sm:text-base text-cream/60 mt-3 font-light max-w-xl leading-relaxed">
            The candles are lit, and the ink is fresh. Which pathway shall your literary curiosity navigate today?
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/profile?tab=preferences"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold font-inter transition-all hover:text-gold"
          >
            Edit Preferences
          </Link>
        </div>
      </motion.section>

      <DailyVerse />

      <MoodSelector />

      {/* Quick Launch Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Simple Chat Launch */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -6 }}
          className="glass-card rounded-2xl border border-white/5 p-8 relative overflow-hidden group flex flex-col justify-between min-h-[300px]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 -z-10" />
          
          <div>
            <div className="text-4xl mb-6 p-3 bg-white/5 w-fit rounded-xl border border-white/10 group-hover:scale-110 transition-all duration-300">
              ✒️
            </div>
            <h2 className="font-playfair text-2xl font-bold text-cream group-hover:text-gold transition-colors tracking-wide">
              Simple Companion
            </h2>
            <p className="font-inter text-sm text-cream/60 mt-3 leading-relaxed font-light">
              Dive into an open-ended literary dialogue. Prompt the companion to craft custom poems, engage in witty verse duels, draft narrative story seeds, analyze prose, or critique your creative work in Judgement Mode.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/chat/simple"
              className="px-5 py-2.5 bg-gold hover:bg-gold-light text-navy font-bold rounded-lg text-xs tracking-wider uppercase font-inter transition-all shadow-md shadow-gold/5 flex items-center justify-center gap-1.5 w-fit"
            >
              Launch Chat
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* Advanced Chat Launch */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -6 }}
          className="glass-card rounded-2xl border border-white/5 p-8 relative overflow-hidden group flex flex-col justify-between min-h-[300px]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple/20 via-purple-light/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 -z-10" />

          <div>
            <div className="text-4xl mb-6 p-3 bg-white/5 w-fit rounded-xl border border-white/10 group-hover:scale-110 transition-all duration-300">
              🏰
            </div>
            <h2 className="font-playfair text-2xl font-bold text-cream group-hover:text-gold transition-colors tracking-wide">
              Advanced Chambers
            </h2>
            <p className="font-inter text-sm text-cream/60 mt-3 leading-relaxed font-light">
              Lock your companion into precise historical periods, languages, genres, and author personas. The interface visually transforms, wrapping you in candlestick Victorian fog, geometric Sufi purples, or modernist rainy streets.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/chat/advanced"
              className="px-5 py-2.5 bg-purple hover:bg-purple-light border border-white/10 hover:border-transparent text-cream font-bold rounded-lg text-xs tracking-wider uppercase font-inter transition-all shadow-md shadow-purple/10 flex items-center justify-center gap-1.5 w-fit"
            >
              Enter Chambers
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Main Panel grid: Recent Activity vs Recommendations */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Column: Recent Activity (3/5 width) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h3 className="font-playfair text-xl font-bold text-cream flex items-center gap-2">
              <span>⏱️</span> Recent Activity
            </h3>
          </div>

          {chatsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentChats.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-white/5 text-center text-cream/40 text-xs">
              📜 No recent sessions found. Launch a chat to begin scribing your anthology.
            </div>
          ) : (
            <div className="space-y-4">
              {recentChats.map((c) => (
                <Link
                  key={c.id}
                  href={`/chat/${c.type}?id=${c.id}`}
                  className="block glass-card p-5 rounded-xl border border-white/5 hover:border-gold/30 hover:bg-white/5 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider text-gold rounded font-inter font-bold">
                        {c.type === 'advanced' ? 'Advanced' : 'Simple'}
                      </span>
                      <h4 className="font-playfair text-base font-semibold text-cream group-hover:text-gold transition-colors mt-2">
                        {modeNames[c.mode] || c.mode}
                      </h4>
                      {c.type === 'advanced' && c.filters && (
                        <p className="text-[10px] text-cream/40 mt-1 font-inter">
                          Theme: {c.filters.genre} • {c.filters.era} • {c.filters.language}
                        </p>
                      )}
                      <p className="text-xs text-cream/50 mt-2 font-inter max-w-md truncate">
                        Last line: {c.messages[c.messages.length - 1]?.content || 'Session initialized.'}
                      </p>
                    </div>

                    <div className="text-[10px] text-cream/30 font-inter self-center">
                      {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      }) : 'Recent'}
                    </div>
                  </div>
                </Link>
              ))}
              <div className="pt-2">
                <Link
                  href="/chat/simple?sidebar=open"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-[#c9a84c]/10 border border-[#c9a84c]/30 hover:border-[#c9a84c]/60 rounded-lg text-xs font-semibold font-inter text-[#c9a84c] transition-all shadow shadow-gold/5"
                >
                  ⏱️ View All History
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recommendations Teaser (2/5 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <h3 className="font-playfair text-xl font-bold text-cream flex items-center gap-2">
              <span>📚</span> Recommended Reads
            </h3>
            <Link
              href="/recommendations"
              className="text-xs font-semibold text-gold hover:text-gold-light font-inter flex items-center gap-0.5"
            >
              Full Page
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {recsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {teasers.map((book) => (
                <div
                  key={book.title}
                  className="glass-card p-4 rounded-xl border border-white/5 flex gap-4 items-start"
                >
                  <img
                    src={book.thumbnail}
                    alt={book.title}
                    className="w-14 h-20 rounded border border-white/10 shadow object-cover flex-shrink-0"
                  />
                  <div className="flex-grow min-w-0">
                    <h4 className="font-playfair text-sm font-semibold text-cream truncate">{book.title}</h4>
                    <p className="font-inter text-[10px] text-gold mt-0.5">{book.author}</p>
                    <p className="font-inter text-[11px] text-cream/60 leading-relaxed font-light mt-1.5 line-clamp-3">
                      {book.poeticReason}
                    </p>
                    <a
                      href={book.infoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gold hover:text-gold-light mt-2 uppercase tracking-wider font-inter"
                    >
                      Acquire Link
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
